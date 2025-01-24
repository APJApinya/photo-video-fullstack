const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const { getParameterFromStore } = require("../parameterCache");

// Import S3
const {
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const bucketName = process.env.AWS_BUCKET_NAME;

// Import and initialize DynamoDB
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid"); // for creating unique video id
const dynamoClient = new DynamoDBClient({ region: "ap-southeast-2" });
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);
const dynamoTableName = "n11780100-video-detail";
const partitionKey = "qut-username";
const sortKey = "video_id";

// Import Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).array("photos", 10);
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");

// TODO: Upload photos to S3 in 'uploads/{username}'
router.post("/upload", async (req, res) => {
  const s3Client = req.app.get("s3Client");
  const pool = req.app.get("mysqlPool");
  if (!pool) {
    console.error("MySQL pool is undefined!");
    return res.status(500).send("MySQL pool is not available.");
  }
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

        // Insert photo metadata into RDS
        const user = username;
        const file_name = file.originalname;
        const file_type = file.mimetype;
        const upload_timestamp = new Date();

        // Insert into MySQL RDS
        const result = await pool.query(
          `
          INSERT INTO photos (user, file_name, file_type, upload_timestamp)
          VALUES (?, ?, ?, ?)
        `,
          [user, file_name, file_type, upload_timestamp]
        );

        console.log("Photo metadata inserted successfully:", result);
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

    // Generate video and get the temporary file path
    const outputFile = await generateVideo(photoUrls, username);

    // Upload the video to S3
    const fileStream = fs.createReadStream(outputFile);
    const uploadParams = {
      Bucket: bucketName,
      Key: videoKey,
      Body: fileStream,
      ContentType: "video/mp4",
    };
    await s3Client.send(new PutObjectCommand(uploadParams));
    console.log("Video uploaded to S3 successfully.");

    // Delete the local temporary file after uploading
    fs.unlink(outputFile, (err) => {
      if (err) {
        console.error("Error deleting the temporary file:", err);
      } else {
        console.log("Temporary file deleted successfully.");
      }
    });

    // Send the video file URL as a response
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: videoKey,
      }),
      { expiresIn: 3600 }
    );
    // Generate unique video_id and record metadata in DynamoDB
    const videoID = uuidv4();
    const qutUsername = await getParameterFromStore(
      "/n11780100/dynamo/qut-username"
    );
    const videoMetadata = new PutCommand({
      TableName: dynamoTableName,
      Item: {
        [partitionKey]: qutUsername,
        [sortKey]: videoID,
        user: username,
        upload_timestamp: new Date().toISOString(),
        video_url: signedUrl,
        format: "mp4",
      },
    });
    // Save metadata to DynamoDB
    try {
      await dynamoDocClient.send(videoMetadata);
      console.log("Video metadata recorded in DynamoDB successfully.");
    } catch (error) {
      console.error("Error recording video metadata to DynamoDB:", error);
    }
    res.json({ videoUrl: signedUrl });
  } catch (error) {
    console.error("Error generating video:", error);
    res.status(500).send("Error generating video.");
  }
});

// TODO: List videos
router.get("/list-videos", async (req, res) => {
  const s3Client = req.app.get("s3Client");
  const username = req.username;
  const groups = req.groups;

  console.log("Username in /list-video:", username);
  console.log("Groups in /list-video:", groups); 

  // Ensure the username is correctly set
  if (!username) {
    console.error("Username is missing.");
    return res.status(400).send("Username is missing.");
  }
  if (!groups) {
    console.error("Groups is missing or undefined.");
    return res.status(400).send("Group information is missing.");
  }


  try {
    let videoFiles = [];
    if (groups.includes("admin")) {
      // Admin user - list all videos in all user folders
      console.log("Admin user detected, attempting to list all videos.");
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `videos/`,
        Delimiter: "/", // To get folders inside 'videos/'
      });
      const data = await s3Client.send(command);

      console.log("ListObjectsV2Command executed for listing folders:");
      console.log("CommonPrefixes (folders found):", data.CommonPrefixes);

      // If no folders are found, log and return an empty array
      if (!data.CommonPrefixes || data.CommonPrefixes.length === 0) {
        console.log("No folders found under 'videos/'");
        return res.json([]);
      }

      // Loop through each user folder and fetch their videos
      // data.CommonPrefixes is all folders inside /videos
      for (const folder of data.CommonPrefixes) {
        const userPrefix = folder.Prefix; // e.g., 'videos/{username}/'
        console.log("Processing folder:", userPrefix);

        const userVideosCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: userPrefix,
        });

        const userVideosData = await s3Client.send(userVideosCommand);
        console.log(`Videos found in folder '${userPrefix}':`, userVideosData.Contents);

        if (userVideosData.Contents && userVideosData.Contents.length > 0) {
          const userVideos = await Promise.all(
            userVideosData.Contents.map(async (item) => {
              console.log("Generating signed URL for video:", item.Key);
              const signedUrl = await getSignedUrl(
                s3Client,
                new GetObjectCommand({
                  Bucket: bucketName,
                  Key: item.Key,
                }),
                { expiresIn: 3600 }
              );

              return {
                filename: item.Key.split("/").pop(),
                path: item.Key,
                url: signedUrl,
              };
            })
          );

          videoFiles.push(...userVideos);
          console.log("Videos added to the list from folder:", userPrefix);
        } else {
          console.log("No videos found in folder:", userPrefix);
        }
      }
    } else {
      // Regular user - list only their videos
      console.log(`Regular user detected, attempting to list videos for user: ${username}`);

      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: `videos/${username}/`,
      });

      const data = await s3Client.send(command);
      console.log(`Videos found for user '${username}':`, data.Contents);

      if (!data.Contents || data.Contents.length === 0) {
        console.log(`No videos found for user '${username}'.`);
        return res.json([]);
      }

      // Generate presigned URLs for each video
      videoFiles = await Promise.all(
        data.Contents.map(async (item) => {
          console.log("Generating signed URL for video:", item.Key);

          const signedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: bucketName,
              Key: item.Key,
            }),
            { expiresIn: 3600 }
          );

          return {
            filename: item.Key.split("/").pop(), 
            path: item.Key, 
            url: signedUrl, 
          };
        })
      );
    }
    console.log("Final list of videos to be sent in response:", videoFiles);
    res.json(videoFiles); // Return the list of video files
  } catch (error) {
    console.error("Error listing videos from S3:", error);
    res.status(500).send("Error listing videos from S3.");
  }
});

// TODO: Delete video
router.delete("/delete-video", async (req, res) => {
  const s3Client = req.app.get("s3Client");
  const path = req.body.path;
  const groups = req.groups;

  // Ensure user permission
  if (!groups.includes("admin")) {
    return res.status(403).send("Forbidden: Insufficient permissions");
  }

  // Ensure the username and filename are correctly set
  if (!path) {
    console.error("Path is missing.");
    return res.status(400).send("Path is missing.");
  }
  console.log("This is path of vid to remove: ", path);

  try {
    // Send the delete command to S3
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: path,
      })
    );

    console.log("Video deleted successfully:", path);
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
async function generateVideo(photoUrls, username) {
  return new Promise((resolve, reject) => {
    const outputFile = path.join("/tmp", `${username}_output.mp4`); // Temporary file

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

    ffmpegCommand
      .complexFilter(filterComplex)
      .outputOptions([
        "-map [v]",
        "-c:v libx264",
        "-pix_fmt yuv420p",
        "-movflags +faststart",
      ])
      .on("start", function (commandLine) {
        console.log("Spawned Ffmpeg with command: " + commandLine);
      })
      .on("error", function (err) {
        console.error("Error generating the video:", err);
        reject(err);
      })
      .on("end", function () {
        console.log("Video generated successfully.");
        resolve(outputFile); // Resolve with the file path when done
      })
      .save(outputFile); // Save to temporary file
  });
}

module.exports = router;
