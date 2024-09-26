import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import UploadComponent from "./UploadComponent";

function PhotoVideo() {
  const [user, setUser] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userVideos, setUserVideos] = useState([]);

  const navigate = useNavigate();
  const backendURL = process.env.REACT_APP_BACKEND_URL;

  //Fetch username from session storage
  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    if (storedUsername) {
      setUser(storedUsername);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  //Function to handle logout
  const handleLogout = () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("idToken");
    sessionStorage.removeItem("username");
    navigate("/login");
  };

  // Function to fetch the user's videos
  const fetchUserVideos = async () => {
    try {
      const response = await axios.get(`${backendURL}/catalog/list-videos`, {
        headers: {
          Username: user
        },
      });
      setUserVideos(response.data);
      console.log("This is user video data from fetchUserVideos(): ", userVideos);
    } catch (error) {
      console.error("Error fetching user videos:", error);
    }
  };

  // Fetch user videos when the user state is set
  useEffect(() => {
    if(user){
        fetchUserVideos();
    }
  }, [user]);

  // Function to handle video generation
  const handleGenerateVideo = async () => {
    setIsLoading(true);
    try {
      await axios.get(`${backendURL}/catalog/generate-video`, {
        headers: {
          Username: user
        },
      });
      fetchUserVideos(); // Refresh the list of videos after generating a new one
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
          Username: user
        },
      });
      fetchUserVideos(); // Refresh the list of videos after deleting
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
          />

          {isLoading && (
            <div className="text-center mt-3">
              <Spinner animation="border" variant="primary" />
              <p>Generating video, please wait...</p>
            </div>
          )}

          {Array.isArray(userVideos) && userVideos.length > 0 && !isLoading && (
            <div className="mt-1">
              <h2 className="text-center mb-4 header-text">Your Videos</h2>
              <Row>
                {userVideos.map((video, index) => (
                  <Col xs={12} md={6} lg={4} key={index} className="mb-4">
                    <Card className="h-100">
                      <Card.Body className="d-flex flex-column justify-content-between">
                        <video
                          src={video.url}
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
