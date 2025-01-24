// This focus on CPU intensive task
const express = require("express");
const app = express();
app.use(express.json());
const { getParameterFromStore } = require("./parameterCache.js");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

// Initialize SQS
const { SQSClient, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const sqsClient = new SQSClient({ region: "ap-southeast-2" });
const queueUrl =
  "https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11780100-assignment3";

// Initialize S3 bucket
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const bucketName = process.env.AWS_BUCKET_NAME;
const s3Client = new S3Client({
  region: "ap-southeast-2",
});

// Import and initialize DynamoDB
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoClient = new DynamoDBClient({ region: "ap-southeast-2" });
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

app.post("/generate-video", async (req, res) => {
  const { requestId, username, receiptHandle } = req.body;
  try {
    // Fetch photo URLs from S3
    const photoUrls = await fetchPhotoUrls(username);

    // Generate video from photos
    const outputFile = await generateVideo(photoUrls, username);
    const videoKey = `videos/${username}/output-video-${Date.now()}.mp4`;

    // Upload the generated video to S3
    await uploadVideoToS3(outputFile, videoKey);

    // Save metadata in DynamoDB
    await saveVideoMetadata(username, requestId, videoKey);

    console.log(`Video generation completed for requestId: ${requestId}`);

    // Delete SQS
    await sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      })
    );
    console.log("Deleted SQS message with requestId:", requestId); 
    res.status(200).send({ message: "Video generation completed." });
  } catch (error) {
    console.error(`Error processing video generation for ${requestId}:`, error);
    res.status(500).send({ message: "Failed to generate video." });
  }
});

async function fetchPhotoUrls(username) {
  const photoKeys = await listObjectsInS3Bucket(s3Client, username, "uploads/");
  if (photoKeys.length < 10) {
    return res.status(400).send("Please upload at least 10 photos.");
  }
  return Promise.all(
    photoKeys.map((key) =>
      getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: bucketName, Key: key }),
        { expiresIn: 3600 }
      )
    )
  );
}

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



async function uploadVideoToS3(outputFile, videoKey) {
  const fileStream = fs.createReadStream(outputFile);
  const uploadParams = {
    Bucket: bucketName,
    Key: videoKey,
    Body: fileStream,
    ContentType: "video/mp4",
  };
  await s3Client.send(new PutObjectCommand(uploadParams));
  fs.unlinkSync(outputFile);
}

async function saveVideoMetadata(username, requestId, videoKey) {
  const dynamoTableName = "n11780100-video-detail";
  const partitionKey = "qut-username";
  const sortKey = "video_id";
  const qutUsername = await getParameterFromStore(
    "/n11780100/dynamo/qut-username"
  );
  const videoMetadata = new PutCommand({
    TableName: dynamoTableName,
    Item: {
      [partitionKey]: qutUsername,
      [sortKey]: requestId,
      user: username,
      upload_timestamp: new Date().toISOString(),
      video_url: videoKey,
      format: "mp4",
    },
  });
  await dynamoDocClient.send(videoMetadata);
}

async function listObjectsInS3Bucket(s3Client, username, prefix) {
  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: `${prefix}${username}/`,
  });
  const data = await s3Client.send(command);
  return data.Contents ? data.Contents.map((item) => item.Key) : [];
}

const PORT = process.env.PORT || 8085;
app.listen(PORT, () => {
  console.log(`Videos Service running on port ${PORT}`);
});
