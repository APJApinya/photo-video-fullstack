const express = require("express");
const multer = require("multer");
const app = express();
app.use(express.json({ limit: '150mb' })); 

// Initialize MySQL connection
const mysql = require("mysql2/promise");
const { getSecretCredentials } = require("./getSecret.js");
const { getParameterFromStore } = require("./parameterCache.js");

// S3 Setup
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const bucketName = process.env.AWS_BUCKET_NAME;

// Initialize S3 Client
const s3Client = new S3Client({ region: "ap-southeast-2" });
app.set("s3Client", s3Client);

async function createPool(app) {
  try {
    const secretName = await getParameterFromStore("/n11780100/RDS");
    const credentials = await getSecretCredentials(secretName);
    const pool = mysql.createPool({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      database: credentials.dbInstanceIdentifier,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    app.set("mysqlPool", pool);
    console.log("MySQL pool created successfully.");
  } catch (error) {
    console.error("Error creating MySQL pool:", error);
    throw error;
  }
}

// Set up the MySQL pool globally
createPool(app).catch((error) => {
  console.error("Error during pool creation:", error);
});


// Set up multer for file handling
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }).array("photos", 10);

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// Route for photo uploads
app.post("/upload", async (req, res) => {
  const username = req.headers["x-username"];
  console.log("This is username in /upload", username);
  if (!username) {
    console.error("Username is missing in request headers");
    return res.status(400).send("Username is missing in request headers.");
  }

  const files = req.body.files; // Expecting files to be sent as JSON payload
  if (!files || files.length === 0) {
    return res.status(400).send("No files were uploaded.");
  }

    try {
      // Delete existing photos in 'uploads/{username}' folder before uploading new ones
      await deleteUserFilesInFolder(s3Client, username, "uploads/");

      for (const file of files) {
        // Convert file buffer from JSON (assumes it's sent as a base64-encoded string)
        const fileBuffer = Buffer.from(file.buffer.data, 'base64');
        const uploadParams = {
          Bucket: bucketName,
          Key: `uploads/${username}/${file.originalname}`, // Save photos in 'uploads/{username}' folder
          Body: fileBuffer,
          ContentType: file.mimetype,
        };
        await s3Client.send(new PutObjectCommand(uploadParams));

        const pool = app.get("mysqlPool");
        if(!pool){
          console.error("MySQL pool is undefined!");
          return res.status(500).send("MySQL pool is not available");
        }

        // Insert photo metadata into RDS
        const upload_timestamp = new Date();

        // Insert into MySQL RDS
        const result = await pool.query(
          `
          INSERT INTO photos (user, file_name, file_type, upload_timestamp)
          VALUES (?, ?, ?, ?)
        `,
          [username, file.originalname, file.mimetype, upload_timestamp]
        );

        console.log("Photo metadata inserted successfully:", result);
      }
      res.send("Photos uploaded successfully.");
    } catch (error) {
      console.error("Error uploading to S3:", error);
      res.status(500).send("Error uploading photos to S3.");
    }
  });

  async function deleteUserFilesInFolder(s3Client, username, folder) {
    try {
      const listParams = {
        Bucket: bucketName,
        Prefix: `${folder}${username}/`, // Define the prefix for the user’s folder
      };
  
      const listedObjects = await s3Client.send(new ListObjectsV2Command(listParams));
  
      if (!listedObjects.Contents || listedObjects.Contents.length === 0) return;
  
      const deleteParams = {
        Bucket: bucketName,
        Delete: { Objects: listedObjects.Contents.map(({ Key }) => ({ Key })) },
      };
  
      await s3Client.send(new DeleteObjectsCommand(deleteParams));
      console.log(`Deleted files in folder uploads/${username}/ from S3.`);
    } catch (error) {
      console.error("Error deleting files from S3:", error);
      throw error;
    }
  }

const PORT = process.env.PORT || 8082;
app.listen(PORT, () => {
  console.log(`Photos Service running on port ${PORT}`);
});
