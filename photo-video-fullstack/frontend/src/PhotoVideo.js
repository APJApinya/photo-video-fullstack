import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import UploadComponent from "./UploadComponent";

function PhotoVideo() {
  const [user, setUser] = useState("");
  const [groups, setGroups] = useState([]);
  const [accessToken, setAccessToken] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const [userVideos, setUserVideos] = useState([]);

  const navigate = useNavigate();
  const backendURL = process.env.REACT_APP_BACKEND_URL;

  //Fetch from session storage
  useEffect(() => {
    const storedUsername = sessionStorage.getItem("username");
    const storedGroups = sessionStorage.getItem("groups");
    const storedAccessToken = sessionStorage.getItem("accessToken");
    console.log("Stored Groups in frontend:", JSON.parse(storedGroups) || []);

    if (storedUsername && storedAccessToken) {
      setUser(storedUsername);
      setGroups(JSON.parse(storedGroups) || []); // Parse groups and provide default value if null
      setAccessToken(storedAccessToken);
    } else {
      navigate("/login");
    }
  }, [navigate]);

  //Function to handle logout
  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
    window.location.reload();
  };

  // Function to fetch the user's videos
  const fetchUserVideos = async () => {
    try {
      const response = await axios.get(`${backendURL}/videos/list-videos`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      setUserVideos(response.data);
      console.log(
        "This is user video data from fetchUserVideos():",
        response.data
      );
    } catch (error) {
      console.error("Error fetching user videos:", error);
    }
  };

  // Fetch user videos when the user state is set
  useEffect(() => {
    if (user && accessToken) {
      fetchUserVideos();
    }
  }, [user, accessToken]);

  // Function to initiate video generation
  async function handleGenerateVideo() {
    setIsLoading(true);
    try {
      const response = await axios.post(
        `${backendURL}/videos/initiate-video`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      const requestId = response.data.requestId;
      console.log("This is requestId from SQS: ", requestId);
      // Initiate polling
      checkSQSDeletion(requestId);
    } catch (error) {
      console.error("Error initiating video generation:", error);
      setIsLoading(false);
    }
  }

  // FIXME: Polling mechanism for SQS deletion status
  async function checkSQSDeletion(requestId, attempt = 1) {
    try {
      const response = await axios.get(
        `${backendURL}/videos/sqs-status/${requestId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.data.status === "COMPLETED") {
        console.log("SQS message has been deleted. Video is ready.");
        fetchUserVideos();
        setIsLoading(false);
      } else {
        // Exponential backoff: delay time increases with each attempt
        const delay = Math.min(5000 * attempt, 30000);
        setTimeout(() => checkSQSDeletion(requestId, attempt + 1), delay);
      }
    } catch (error) {
      console.error("Error checking SQS deletion status:", error);
      setIsLoading(false);
    }
  }

  // Function to handle video deletion
  const handleDeleteVideo = async (path) => {
    try {
      await axios.delete(`${backendURL}/videos/delete-video`, {
        data: {
          path: path,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
          <UploadComponent onUploadComplete={handleGenerateVideo} />

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
                        {Array.isArray(groups) && groups.includes("admin") && (
                          <Button
                            onClick={() => handleDeleteVideo(video.path)} // Pass the full path to handleDeleteVideo
                            variant="danger"
                            className="mt-auto"
                          >
                            Delete
                          </Button>
                        )}
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
