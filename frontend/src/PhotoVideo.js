import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import UploadComponent from "./UploadComponent";

function PhotoVideo({ token, username, backendURL }) {
  const [user, setUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userVideos, setUserVideos] = useState([]);

  const navigate = useNavigate();

  //Fetch and decode the idToken from sessionStorage
  useEffect(() => {
    const accessToken = sessionStorage.getItem("accessToken");
    if (accessToken) {
      const extractedUsername = accessToken["username"];
      console.log("Received username: ", extractedUsername);
      setUser(extractedUsername);
    } else {
      navigate("/login"); //if no idToken found
    }
  }, [navigate]);

  //Function to handle logout
  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("idToken");
    navigate("/login");
  };

  // Function to fetch the user's videos
  const fetchUserVideos = async (token, username) => {
    try {
      const response = await axios.get(`${backendURL}/catalog/list-videos`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Username: username,
        },
      });
      setUserVideos(response.data);
    } catch (error) {
      console.error("Error fetching user videos:", error);
    }
  };

  // Function to handle video generation
  const handleGenerateVideo = async () => {
    setIsLoading(true);
    try {
      await axios.get(`${backendURL}/catalog/generate-video`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Username: username,
        },
      });
      fetchUserVideos(token, username); // Refresh the list of videos after generating a new one
    } catch (error) {
      console.error("Error generating video:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle video deletion
  const handleDeleteVideo = async (filename) => {
    try {
      await axios.delete(`${backendURL}/catalog/delete-video/${filename}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Username: username,
        },
      });
      fetchUserVideos(token, username); // Refresh the list of videos after deleting
    } catch (error) {
      console.error("Error deleting video:", error);
    }
  };

  return (
    <Container
      fluid
      className="d-flex flex-column align-items-center justify-content-center vh-100"
    >
      <Row className="justify-content-md-center">
        <Col style={{ marginTop: "5px" }}>
          <h1 className="text-center mb-4 header-text">
            Photo to Video Generator
          </h1>
          <h2 className="text-center mb-4 header-text">Welcome, {user}</h2>
          <Button variant="secondary" onClick={handleLogout} className="mb-4">
            Logout
          </Button>
          <UploadComponent
            onUploadComplete={handleGenerateVideo}
            token={token}
            username={username}
          />

          {isLoading && (
            <div className="text-center mt-3">
              <Spinner animation="border" variant="primary" />
              <p>Generating video, please wait...</p>
            </div>
          )}

          {userVideos.length > 0 && !isLoading && (
            <div className="mt-1">
              <h2 className="text-center mb-4 header-text">Your Videos</h2>
              <Row>
                {userVideos.map((video, index) => (
                  <Col xs={12} md={6} lg={4} key={index} className="mb-4">
                    <Card className="h-100">
                      <Card.Body className="d-flex flex-column justify-content-between">
                        <video
                          src={`${backendURL}/videos/${video.path}`}
                          controls
                          width="100%"
                          className="mb-3"
                        ></video>
                        <Button
                          onClick={() => handleDeleteVideo(video.filename)}
                          variant="danger"
                          className="mt-auto"
                        >
                          Delete
                        </Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default PhotoVideo;