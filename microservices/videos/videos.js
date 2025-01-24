const express = require("express");
const app = express();
app.use(express.json());
const { getParameterFromStore } = require("./parameterCache.js");

// Initialize SQS
const {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
} = require("@aws-sdk/client-sqs");
const sqsClient = new SQSClient({ region: "ap-southeast-2" });
const queueUrl =
  "https://sqs.ap-southeast-2.amazonaws.com/901444280953/n11780100-assignment3";

// Initialize S3 bucket
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const bucketName = process.env.AWS_BUCKET_NAME;
const s3Client = new S3Client({
  region: "ap-southeast-2",
});

// Import and initialize DynamoDB
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const dynamoClient = new DynamoDBClient({ region: "ap-southeast-2" });
const dynamoDocClient = DynamoDBDocumentClient.from(dynamoClient);

const { v4: uuidv4 } = require("uuid"); // for creating unique video id

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// Route to initiate video generation in queue
app.post("/initiate-video", async (req, res) => {
  const username = req.headers["x-username"];
  if (!username) {
    console.error("Username is missing in request headers");
    return res.status(400).send("Username is missing in request headers.");
  }

  const requestId = uuidv4();
  const messageParams = {
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify({ username, requestId }),
  };
  try {
    await sqsClient.send(new SendMessageCommand(messageParams));
    res.json({ requestId });
    console.log("Request queued in SQS with requestId:", requestId);
  } catch (error) {
    console.error("Error in /generate-video:", error);
    res.status(500).json({ error: "Error processing video request." });
  }
});

// Route to list videos
app.get("/list-videos", async (req, res) => {
  const username = req.headers["x-username"];
  const groups = JSON.parse(req.headers["x-groups"] || "[]");

  if (!username) {
    console.error("Username is missing in request headers");
    return res.status(400).send("Username is missing in request headers.");
  }
  if (!groups) {
    console.error("Groups is missing or undefined.");
    return res.status(400).send("Group information is missing.");
  }

  console.log("Username in /list-video:", username);
  console.log("Groups in /list-video:", groups);

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
        console.log(
          `Videos found in folder '${userPrefix}':`,
          userVideosData.Contents
        );

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
      console.log(
        `Regular user detected, attempting to list videos for user: ${username}`
      );

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

// Route to delete video
app.delete("/delete-video", async (req, res) => {
  const s3Client = req.app.get("s3Client");
  const path = req.body.path;
  const groups = JSON.parse(req.headers["x-groups"] || "[]");

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

// SQS-polling
app.get("/sqs-status/:requestId", async (req, res) => {
  const { requestId } = req.params;
  try {
    const params = {
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
    };

    const response = await sqsClient.send(new ReceiveMessageCommand(params));

    if (response.Messages) {
      const message = response.Messages.find(
        (msg) => JSON.parse(msg.Body).requestId === requestId
      );
      if (message) {
        console.log(`Found SQS message for requestId ${requestId}: PROCESSING`);
        return res.json({ status: "PROCESSING" });
      }
    }

    const isCompleted = await checkCompletionStatus(requestId);
    if (isCompleted) {
      console.log(`No SQS message found for requestId ${requestId}: COMPLETED`);
      res.json({ status: "COMPLETED" });
    } else {
      console.log(`RequestId ${requestId} still in processing state.`);
      res.json({ status: "PROCESSING" });
    }
  } catch (error) {
    console.error("Error checking SQS status:", error);
    res.status(500).send("Error checking SQS status");
  }
});

// Function to check if the video generation is marked as completed
async function checkCompletionStatus(requestId) {
  const dynamoTableName = "n11780100-video-detail";
  const partitionKey = "qut-username";
  const sortKey = "video_id";
  const qutUsername = await getParameterFromStore(
    "/n11780100/dynamo/qut-username"
  );
  const result = await dynamoDocClient.send(
    new GetCommand({
      TableName: dynamoTableName,
      Key: { 
        [partitionKey]: qutUsername,
        [sortKey]: requestId,
       },
    })
  );
  return !!result.Item; // If item exists, video generation is completed
}

const PORT = process.env.PORT || 8083;
app.listen(PORT, () => {
  console.log(`Videos Service running on port ${PORT}`);
});
