Assignment 1 - Web Server - Response to Criteria
================================================

Overview
------------------------------------------------

- **Name:** Apinya Jaotawipart
- **Student number:** n11780100
- **Application name:** Photo to Video Generator
- **Two line description:** My application is a photo-to-video generator that allows users to upload photos and create personalized videos seamlessly. It features a front-end interface using React.js and a back-end processing pipeline using Node.js, Express, and FFmpeg for efficient video generation.

Core criteria
------------------------------------------------

### Docker image

- **ECR Repository name:** n11780100-assignment1
- **Video timestamp:** 00.22
- **Relevant files:**
    - /Dockerfile

### Docker image running on EC2

- **EC2 instance ID:** i-0736af1014688c60f
- **Video timestamp:** 00.28

### User login functionality

- **One line description:** Hard-coded username/password list. Using JWTs for sessions.
- **Video timestamp:** 00.41, 
- **Relevant files:**
    - backend/routes/users.js 

### User dependent functionality

- **One line description:** Files are stored by a user in their folder. Users can only see their own generated content.
- **Video timestamp:** 4.02
- **Relevant files:**
    - backend/uploads
    - backend/videos
    - backend/catalog.js:29, 111, 172

### Web client

- **One line description:** Single page application using React
- **Video timestamp:** didn't mention in the video
- **Relevant files:**
    - frontend/src/App.js
    - frontend/src/UploadComponent.js
    - frontend/public/index.js

### REST API

- **One line description:** REST API with endpoints (as nouns) and HTTP methods (GET, POST, DELETE), and appropriate status codes
- **Video timestamp:** 00.50
- **Relevant files:**
    - backend/routes/users.js
    - backend/routes/catalog.js
    - backend/routes/load-test.js
    - backend/app.js

### Two kinds of data

#### First kind

- **One line description:** User-uploaded image files
- **Type:** Unstructured
- **Rationale:** Images are too large for database storage. Only need to store files temporarily for video generation.
- **Video timestamp:** 2.04
- **Relevant files:**
    - backend/uploads
    - backend/routes/catalog.js 30, 52

#### Second kind

- **One line description:** Generated video files
- **Type:** Unstructured
- **Rationale:** Videos generated from user uploads are stored for download and viewing. Storing large video files in a database is inefficient.
- **Video timestamp:** 2.27
- **Relevant files:**
  - backend/videos
  - backend/routes/catalog.js 124, 159

### CPU intensive task

- **One line description:** Uses ffmpeg to generate videos from uploaded photos
- **Video timestamp:** 3.00
- **Relevant files:**
    - backend/routes/catalog.js 90

### CPU load testing method

- **One line description:** Node.js script to simulate a CPU-intensive task by generating load to test server performance.
- **Video timestamp:** 4.13
- **Relevant files:**
    - backend/routes/load-test.js
    - frontend/src/App.js 83, 187

Additional criteria
------------------------------------------------

### Extensive REST API features

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 


### Use of external API(s)

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 


### Extensive web client features

- **One line description:** single-page implementation, and styling by using React Bootstrap
- **Video timestamp:** not mention in the video
- **Relevant files:**
    - frontend/app.js
    - frontend/index.js 6


### Sophisticated data visualisations

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 


### Additional kinds of data

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 


### Significant custom processing

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 


### Live progress indication

- **One line description:** Implement Spinner from React Bootstrap while user waiting for generating video
- **Video timestamp:** 3.23
- **Relevant files:**
    - frontend/src/App.js 112


### Infrastructure as code

- **One line description:** Not attempted
- **Video timestamp:** 
- **Relevant files:**
    - 


### Other

- **One line description:** Not attempted
- **Video timestamp:**
- **Relevant files:**
    - 

