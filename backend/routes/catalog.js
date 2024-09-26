const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const {
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const path = require("path");

const router = express.Router();
const bucketName = process.env.AWS_BUCKET_NAME;

// Configure Multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).array("photos", 10);

ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");

// TODO: Upload photos to S3 in 'uploads/{username}'
router.post("/upload", (req, res) => {
  const s3Client = req.app.get("s3Client");
  const username = req.username; // Get the username from the request
  if (!username) {
    console.error("Username is missing in request headers");
    return res.status(400).send("Username is missing in request headers.");
  }

  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError || err) {
      return res.status(500).send("Error uploading files.");
    }
    try {
      // Delete existing photos in 'uploads/{username}' folder before uploading new ones
      await deleteUserFilesInFolder(s3Client, username, "uploads/");

      for (const file of req.files) {
        const uploadParams = {
          Bucket: bucketName,
          Key: `uploads/${username}/${file.originalname}`, // Save photos in 'uploads/{username}' folder
          Body: file.buffer,
        };
        await s3Client.send(new PutObjectCommand(uploadParams));
      }
      res.send("Photos uploaded successfully.");
    } catch (error) {
      console.error("Error uploading to S3:", error);
      res.status(500).send("Error uploading photos to S3.");

      console.log(
        "Photos uploaded successfully:",
        req.files.map((file) => file.filename)
      );
    }
  });
});

// TODO: Generate Videos from photos stored in 'uploads/{username}' and save to 'videos/{username}'
router.get("/generate-video", async (req, res) => {
  const s3Client = req.app.get("s3Client");
  const username = req.username;
  console.log("username in generate-video is", username);
  if (!username) {
    console.error("Username is missing in request headers");
    return res.status(400).send("Username is missing in request headers.");
  }

  try {
    // List photo objects in 'uploads/{username}' folder
    const photoKeys = await listObjectsInS3Bucket(
      s3Client,
      username,
      "uploads/"
    );
    if (photoKeys.length < 10) {
      return res.status(400).send("Please upload at least 10 photos.");
    }
    console.log("Photo keys from S3:", photoKeys);

    const videoKey = `videos/${username}/output-video-${Date.now()}.mp4`;

    // Get presigned URLs for the photos in S3
    const photoUrls = await Promise.all(
      photoKeys.map(async (key) => {
        return await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
          }),
          { expiresIn: 3600 }
        );
      })
    );

    console.log("Photo URLs for video generation:", photoUrls);

    // Generate video using ffmpeg and obtain the video buffer
    const videoBuffer = await generateVideo(photoUrls);

    // Upload the video to S3
    const uploadResponse = await uploadGeneratedVideo(
      s3Client,
      videoKey,
      videoBuffer
    );
    console.log("Upload response:", uploadResponse);

    // Send the video file URL as a response
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: videoKey,
      }),
      { expiresIn: 3600 }
    );

    res.json({ videoUrl: signedUrl });
  } catch (error) {
    console.error("Error generating video:", error);
    res.status(500).send("Error generating video.");
  }
});

// TODO: List videos
router.get("/list-videos", async (req, res) => {
  const s3Client = req.app.get("s3Client");
  const username = req.username; // Use the username to identify the user's folder

  // Ensure the username is correctly set
  if (!username) {
    console.error("Username is missing.");
    return res.status(400).send("Username is missing.");
  }
  try {
    // List video objects in the 'videos/{username}' folder
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: `videos/${username}/`, // Prefix to list only this user's videos
    });
    const data = await s3Client.send(command);

    // If no files are found, return an empty array
    if (!data.Contents || data.Contents.length === 0) {
      return res.json([]);
    }

    // Map through the videos to generate presigned URLs for each video
    const videoFiles = await Promise.all(
      data.Contents.map(async (item) => {
        const signedUrl = await getSignedUrl(
          s3Client,
          new GetObjectCommand({
            Bucket: bucketName,
            Key: item.Key,
          }),
          { expiresIn: 3600 }
        );

        return {
          filename: item.Key.split("/").pop(), // Extract the filename
          path: item.Key, // Full path in S3
          url: signedUrl, // Presigned URL for downloading the video
        };
      })
    );

    res.json(videoFiles); // Return the list of video files
  } catch (error) {
    console.error("Error listing videos from S3:", error);
    res.status(500).send("Error listing videos from S3.");
  }
});

// TODO: Delete video
router.delete("/delete-video/:filename", async (req, res) => {
  const s3Client = req.app.get("s3Client");
  const username = req.username; // Use the username to identify the user's folder
  const filename = req.params.filename; // Get the filename from the request parameters

  // Ensure the username and filename are correctly set
  if (!username || !filename) {
    console.error("Username or filename is missing.");
    return res.status(400).send("Username or filename is missing.");
  }

  // Construct the path to the video in the S3 bucket
  const videoKey = `videos/${username}/${filename}`;

  try {
    // Send the delete command to S3
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: videoKey,
      })
    );

    console.log("Video deleted successfully:", videoKey);
    res.send("Video deleted successfully.");
  } catch (error) {
    console.error("Error deleting video from S3:", error);
    res.status(500).send("Error deleting video from S3.");
  }
});

// Helper function to list S3 objects in a specific folder
async function listObjectsInS3Bucket(s3Client, username, prefix) {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: `${prefix}${username}/`,
  });
  const data = await s3Client.send(command);
  return data.Contents ? data.Contents.map((item) => item.Key) : [];
}

// Helper function to delete user files in a specific folder (used for replacing photos)
async function deleteUserFilesInFolder(s3Client, username, folder) {
  const photoKeys = await listObjectsInS3Bucket(s3Client, username, folder);
  if (photoKeys.length > 0) {
    const deleteParams = {
      Bucket: bucketName,
      Delete: {
        Objects: photoKeys.map((key) => ({ Key: key })),
      },
    };
    await s3Client.send(new DeleteObjectsCommand(deleteParams));
  }
}

// Helper function to generate video using ffmpeg
async function generateVideo(photoUrls) {
  return new Promise((resolve, reject) => {
    const ffmpegCommand = ffmpeg();

    // Add inputs and options for FFmpeg command
    photoUrls.forEach((photoUrl) => {
      ffmpegCommand.input(photoUrl).inputOptions([`-loop 1`, `-t 2`]);
    });

    const filterComplexParts = photoUrls
      .map(
        (_, index) =>
          `[${index}:v]scale=1920:1080,setsar=1,fade=t=in:st=0:d=1,fade=t=out:st=1:d=1[v${index}]`
      )
      .join("; ");
    const concatInput = photoUrls.map((_, index) => `[v${index}]`).join("");
    const filterComplex = `${filterComplexParts}; ${concatInput}concat=n=${photoUrls.length}:v=1:a=0[v]`;
    const buffers = [];  // Initialize buffer to store video output

    ffmpegCommand
      .complexFilter(filterComplex)
      .outputOptions(["-map [v]", "-c:v libx264", "-pix_fmt yuv420p", "-movflags +faststart"])
      .on("start", function (commandLine) {
        console.log("Spawned Ffmpeg with command: " + commandLine);
      })
      .on("error", function (err) {
        console.error("Error generating the video:", err);
        reject(err);
      })
      .on("end", function () {
        console.log("Video generated successfully.");
        resolve(Buffer.concat(buffers));  // Resolve with the full buffer when done
      });
      ffmpegCommand
      .format("mp4")
      .output('pipe:1')  // Output to pipe
      .pipe()
      .on("data", function (chunk) {
        buffers.push(chunk);  // Collect the chunks
      });
  });
}
// Helper function to upload the generated video to S3
async function uploadGeneratedVideo(s3Client, videoKey, videoBuffer) {
  const uploadParams = {
    Bucket: bucketName,
    Key: videoKey,
    Body: videoBuffer, // Directly upload the buffer
    ContentType: "video/mp4",
  };
  return s3Client.send(new PutObjectCommand(uploadParams));
}

module.exports = router;
