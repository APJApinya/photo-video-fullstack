import React, { useState, useEffect } from "react";
import axios from "axios";
import { Container, Row, Col, Button, Form } from "react-bootstrap";

function UploadComponent({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [user, setUser] = useState("");
  const [accessToken, setAccessToken] = useState();

  const backendURL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    const storedAccessToken = sessionStorage.getItem("accessToken");
    if (storedUsername && storedAccessToken) {
      setUser(storedUsername);
      setAccessToken(storedAccessToken);
    }
  }, []);

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
      formData.append("photos", files[i], files[i].name);
    }

    console.log("Uploading photos to:", `${backendURL}/photos/upload`);
    console.log("Access token:", accessToken);
    for (let entry of formData.entries()) {
      console.log("formData: ", entry[0], entry[1]);
    }

    try {
      await axios.post(`${backendURL}/photos/upload`, formData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      alert("Photos uploaded successfully!");
      onUploadComplete(); // Notify parent to generate video
    } catch (error) {
      console.error("Error uploading photos:", error);
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
      }
      alert("Failed to upload photos.");
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center">
      <Row className="justify-content-center w-100">
        <Col xs={10} md={6} lg={4}>
          {" "}
          {/* Adjust column width for responsiveness */}
          <div className="upload-box p-4">
            <h2 className="text-center">Upload 10 Photos</h2>
            <Form.Control
              type="file"
              multiple
              onChange={handleFileChange}
              className="mb-3"
            />
            <Button onClick={handleUpload} variant="primary" className="w-100">
              Upload
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}

export default UploadComponent;
