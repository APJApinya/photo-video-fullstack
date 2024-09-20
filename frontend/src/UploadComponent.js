import React, { useState } from "react";
import axios from "axios";
import { Container, Row, Col, Button, Form } from "react-bootstrap"; // Import React Bootstrap components

function UploadComponent({ onUploadComplete, token }) {
  const [files, setFiles] = useState([]);
  
// Set the backend URL based on the environment
const backendURL = process.env.REACT_APP_BACKEND_URL

  const handleFileChange = (event) => {
    if (event.target.files.length !== 10) {
      alert("Please upload exactly 10 photos.");
      return;
    }
    setFiles(event.target.files);
  };

  const handleUpload = async () => {
    if (files.length !== 10) {
      alert("You must upload exactly 10 photos.");
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      const newFileName = `${files[i].name}`; // Create the new filename with the token
      formData.append("photos", files[i], newFileName);
    }

    try {
      await axios.post(`${backendURL}/catalog/upload`, formData, {
        headers: {
          Authorization: token, // Ensure token is passed in headers
        },
      });
      alert("Photos uploaded successfully!");
      onUploadComplete(); // Notify parent to generate video
    } catch (error) {
      console.error("Error uploading photos:", error);
      alert("Failed to upload photos.");
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center">
      <Row className="justify-content-center w-100">
        <Col xs={10} md={6} lg={4}> {/* Adjust column width for responsiveness */}
          <div className="upload-box p-4">
            <h2 className="text-center">Upload 10 Photos</h2>
            <Form.Control type="file" multiple onChange={handleFileChange} className="mb-3" />
            <Button onClick={handleUpload} variant="primary" className="w-100">Upload</Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default UploadComponent;
