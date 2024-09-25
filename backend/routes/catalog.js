const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Set the path to the ffmpeg binary (adjust this as per your environment)
// ffmpeg.setFfmpegPath(
//   "C:/Users/poppi/Documents/Coding/CAB432/ffmpeg-master-latest-win64-gpl/ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe"
// );
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");

// Ensure the videos directory exists
const outputDir = path.join(__dirname, "../videos");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Handle POST request to upload photos
router.post("/upload", (req, res) => {
  const username = req.username; // Get the username from the request
  if (!username) {
    console.error("Username is missing in request headers");
    return res.status(400).send("Username is missing in request headers.");
  }

  // Define the user's upload directory
  const userUploadDir = path.join(__dirname, "../uploads", username);

  // Check if the user's upload directory exists
  if (fs.existsSync(userUploadDir)) {
    // Delete all files in the user's directory synchronously
    try {
      fs.readdirSync(userUploadDir).forEach((file) => {
        fs.unlinkSync(path.join(userUploadDir, file));
      });
      console.log("All files deleted successfully from the user's directory.");
    } catch (err) {
      console.error("Error deleting files:", err);
      return res.status(500).send("Error deleting old files.");
    }
  } else {
    // If the directory does not exist, create it
    fs.mkdirSync(userUploadDir, { recursive: true });
  }

  // Configure Multer to upload files to the user's directory
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, userUploadDir);
    },
    filename: function (req, file, cb) {
      const newFileName = `${file.originalname}`; // Correctly create the filename
      cb(null, newFileName);
    },
  });

  const upload = multer({ storage: storage }).array("photos", 10);

  // Handle the file upload

  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // A Multer error occurred when uploading.

      console.error("Multer error during file upload:", err);

      return res.status(500).send("Multer error during file upload.");
    } else if (err) {
      // An unknown error occurred when uploading.

      console.error("Unknown error during file upload:", err);

      return res.status(500).send("Unknown error during file upload.");
    }

    // Log successful upload

    console.log(
      "Photos uploaded successfully:",
      req.files.map((file) => file.filename)
    );

    res.send("Photos uploaded successfully.");
  });
});
// Handle GET request to generate video from selected photos
router.get("/generate-video", (req, res) => {
  const username = req.username; // get the username

  // Define the user's upload directory
  const userUploadDir = path.join(__dirname, "../uploads", username);

  // Check if the user's upload directory exists
  if (!fs.existsSync(userUploadDir)) {
    console.error("User's upload directory does not exist:", userUploadDir);
    return res.status(400).send("No photos found. Please upload photos first.");
  }

  // Read all files in the user's upload directory
  const photoFiles = fs.readdirSync(userUploadDir);
  console.log("Photos found for user:", photoFiles);

  if (photoFiles.length < 10) {
    console.error("Insufficient photos received:", photoFiles);
    return res.status(400).send("Please provide at least 10 photos.");
  }

  // Create a user-specific directory inside the 'videos' directory
  const userVideoDir = path.join(outputDir, username);
  if (!fs.existsSync(userVideoDir)) {
    fs.mkdirSync(userVideoDir, { recursive: true });
  }

  // Set the output path to the user's specific directory
  const now = new Date();
  const timestamp = now
    .toISOString()
    .slice(0, 16)
    .replace("T", "-")
    .replace(":", "-");
  const outputVideoPath = path.join(userVideoDir, `${timestamp}-output.mp4`);

  const ffmpegCommand = ffmpeg();

  // Add inputs and options for FFmpeg command
  photoFiles.forEach((photo) => {
    const inputPath = path.join(userUploadDir, photo).replace(/\\/g, "/");
    ffmpegCommand.input(inputPath).inputOptions([`-loop 1`, `-t 2`]);
  });

  const filterComplexParts = photoFiles
  .map((_, index) => `[${index}:v]scale=1920:1080,setsar=1,fade=t=in:st=0:d=1,fade=t=out:st=1:d=1[v${index}]`)
    .join("; ");
  const concatInput = photoFiles.map((_, index) => `[v${index}]`).join("");
  const filterComplex = `${filterComplexParts}; ${concatInput}concat=n=${photoFiles.length}:v=1:a=0[v]`;

  ffmpegCommand
    .complexFilter(filterComplex)
    .outputOptions("-map [v]")
    .outputOptions("-pix_fmt yuv420p")
    .on("start", function (commandLine) {
      console.log("Spawned Ffmpeg with command: " + commandLine);
    })
    .on("end", function () {
      console.log("Video generated successfully.");
      res.download(outputVideoPath, (err) => {
        if (err) {
          console.error("Error downloading the video:", err);
        }
      });
    })
    .on("error", function (err) {
      console.error("Error generating the video:", err);
      res.status(500).send("Error generating the video.");
    })
    .save(outputVideoPath);
});

// Handle GET request to list all videos created by the user
router.get("/list-videos", (req, res) => {
  const username = req.username; // Use the username to identify the user's folder

  // Ensure the username is correctly set
  if (!username) {
    console.error("Username is missing.");
    return res.status(400).send("Username is missing.");
  }

  // Path to the user's video directory
  const userVideoDir = path.join(outputDir, username);

  // Check if the user's video directory exists
  if (!fs.existsSync(userVideoDir)) {
    return res.json([]); // Return an empty array if no directory found
  }

  // Read all files in the user's video directory
  fs.readdir(userVideoDir, (err, files) => {
    if (err) {
      console.error("Error reading video directory:", err);
      return res.status(500).send("Error reading video directory.");
    }

    // Return the list of video files including the username to construct full paths
    const videoFiles = files.map((file) => ({
      filename: file,
      path: `${username}/${file}`, // Include the username in the path
    }));

    res.json(videoFiles);
  });
});

// New route to delete a video
router.delete("/delete-video/:filename", (req, res) => {
  const username = req.username; // Use the username to identify the user's folder
  const filename = req.params.filename; // Get the filename from the request parameters

  // Ensure the username and filename are correctly set
  if (!username || !filename) {
    console.error("Username or filename is missing.");
    return res.status(400).send("Username or filename is missing.");
  }

  // Path to the video file to be deleted
  const videoPath = path.join(outputDir, username, filename);

  // Check if the video file exists
  if (!fs.existsSync(videoPath)) {
    console.error("Video file not found:", videoPath);
    return res.status(404).send("Video file not found.");
  }

  // Delete the video file
  fs.unlink(videoPath, (err) => {
    if (err) {
      console.error("Error deleting video file:", err);
      return res.status(500).send("Error deleting video file.");
    }

    console.log("Video deleted successfully:", videoPath);
    res.send("Video deleted successfully.");
  });
});


module.exports = router;
