Assignment 1 - Web Server - Response to Criteria
================================================

Instructions
------------------------------------------------
- Keep this file named A2_response_to_criteria.md, do not change the name
- Upload this file along with your code in the root directory of your project
- Upload this file in the current Markdown format (.md extension)
- Do not delete or rearrange sections.  If you did not attempt a criterion, leave it blank
- Text inside [ ] like [eg. S3 ] are examples and should be removed


Overview
------------------------------------------------

- **Name:** Apinya Jaotawipart
- **Student number:** n11780100
- **Partner name (if applicable):**
- **Application name:** Photo to Video Generator
- **Two line description:** My application is a photo-to-video generator that allows users to upload photos and create personalized videos seamlessly. It features a front-end interface using React.js and a back-end processing pipeline using Node.js, Express, and FFmpeg for efficient video generation.
- **EC2 instance name or ID:** i-0736af1014688c60f

Core criteria
------------------------------------------------

### Core - First data persistence service

- **AWS service name:**  S3
- **What data is being stored?:** photo files and video files
- **Why is this service suited to this data?:** Amazon S3 is designed to handle massive amounts of data, making it perfect for storing large files like images and videos.
- **Why is are the other services used not suitable for this data?:** Other services like RDS and DynamoDB are not suitable for storing large files like photos and videos
- **Bucket/instance/table name:** n11780100-assignment2
- **Video timestamp:** 00.17, 01.00
- **Relevant files:**
    - catalog.js: 10, 37, 55, 63, 97, 106, 122, 143

### Core - Second data persistence service

- **AWS service name:**  DynamoDB
- **What data is being stored?:** generated videos metadata
- **Why is this service suited to this data?:** DynamoDB provides fast, scalable, and low-latency access to metadata, which typically consists of small, structured records.
- **Why is are the other services used not suitable for this data?:** videos metadata is not suitable to store in S3 as these data would be inefficient in query and frequent reads and writes.
- **Bucket/instance/table name:** n11780100-video-detail
- **Video timestamp:** 00.25, 01.22
- **Relevant files:**
    - catalog.js: 21, 165, 182

### Third data service

- **AWS service name:**  RDS
- **What data is being stored?:** uploaded photos metadata
- **Why is this service suited to this data?:** RDS offers structured data storage with support for complex relationships and queries, making it ideal for managing metadata with dependencies.
- **Why is are the other services used not suitable for this data?:** DynamoDB is not suitable because it lacks support for complex relationshops which are often required to link photo metadata with related data. and S3 is not suitable to store structured data.
- **Bucket/instance/table name:** n11780100-photodetail (table name: photos)
- **Video timestamp:** 00.37, 01.36
- **Relevant files:**
    -catalog.js: 38, 72
    -app.js: 27, 55

### S3 Pre-signed URLs

- **S3 Bucket names:** n11780100-assignment2
- **Video timestamp:** 01.43
- **Relevant files:**
    -catalog.js: 17, 118, 298

### In-memory cache

- **ElastiCache instance name:** 
- **What data is being cached?:**
- **Why is this data likely to be accessed frequently?:** 
- **Video timestamp:**
- **Relevant files:**
    -

### Core - Statelessness

- **What data is stored within your application that is not stored in cloud data services?:** Intermediate video files that have been partially generated but are not yet finalized or uploaded to S3.
- **Why is this data not considered persistent state?:** The intermediate video files are temporary and can be recreated from the original uploaded photos if they are lost.
- **How does your application ensure data consistency if the app suddenly stops?:** (Do not implement this functionality)
- **Relevant files:**
    - catalog.js: 132, 384

### Graceful handling of persistent connections

- **Type of persistent connection and use:** 
- **Method for handling lost connections:** 
- **Relevant files:**
    -


### Core - Authentication with Cognito

- **User pool name:**  n11780100-assignment-pool
- **How are authentication tokens handled by the client?:** Application handles the token by storing in client's session storage.
- **Video timestamp:** 02.35
- **Relevant files:**
    - LoginPage.js: 34-37

### Cognito multi-factor authentication

- **What factors are used for authentication:** 
- **Video timestamp:**
- **Relevant files:**
    -

### Cognito federated identities

- **Identity providers used:** Google
- **Video timestamp:** 02.41
- **Relevant files:**
    - auth.js: 85-137
    - LoginPage.js: 47

### Cognito groups

- **How are groups used to set permissions?:** "admin" user can view and delete videos of all users
- **Video timestamp:** 02.59, 03.15
- **Relevant files:**
    - catalog.js: 216, 330
    - PhotoVideo.js: 133

### Core - DNS with Route53

- **Subdomain**:  n11780100.cab432.com
- **Video timestamp:** 3.38


### Custom security groups

- **Security group names:** n11780100-www-dev
- **Services/instances using security groups:** i-0736af1014688c60f
- **Video timestamp:** 3.48
- **Relevant files:**
    -

### Parameter store

- **Parameter names:** "/n11780100/RDS", "/n11780100/cognito/domainUrl", "/n11780100/cognito/google/client_id", "/n11780100/cognito/google/secret_client_id", "/n11780100/cognito/pool_client_id", "/n11780100/cognito/pool_id", "/n11780100/dynamo/qut-username"
- **Video timestamp:** 04.04
- **Relevant files:**
    - app.js: 33
    - catalog.js: 166
    - auth.js: 16, 43, 46, 93, 96, 99

### Secrets manager

- **Secrets names:** n11780100-RDS
- **Video timestamp:** 06.13
- **Relevant files:**
    - app.js: 36

### Infrastructure as code

- **Technology used:**
- **Services deployed:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior approval only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -

### Other (with prior permission only)

- **Description:**
- **Video timestamp:**
- **Relevant files:**
    -
