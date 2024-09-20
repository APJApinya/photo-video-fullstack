import React, { useState } from "react";
import UploadComponent from "./UploadComponent";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Button,
  Form,
  Card,
  Spinner,
} from "react-bootstrap"; // Import React Bootstrap components
import "./App.css";

function App() {
  const [token, setToken] = useState(null);
  const [userVideos, setUserVideos] = useState([]); // State to hold the user's videos
  const [isLoading, setIsLoading] = useState(false);

  // Set the backend URL based on the environment
  const backendURL = process.env.REACT_APP_BACKEND_URL;

  const handleLogin = async (username, password) => {
    try {
      const response = await axios.post(`${backendURL}/users/login`, {
        username,
        password,
      });
      const token = response.data.token;
      console.log("Token received after login:", token); // Log the token after login
      setToken(token); // Store the token in state
      fetchUserVideos(token); // Fetch the user's videos after login
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please check your credentials.");
      console.log(process.env.REACT_APP_BACKEND_URL);
    }
  };

  const fetchUserVideos = async (token) => {
    try {
      const response = await axios.get(`${backendURL}/catalog/list-videos`, {
        headers: {
          Authorization: token,
        },
      });
      setUserVideos(response.data); // Store the list of videos in state
    } catch (error) {
      console.error("Error fetching user videos:", error);
    }
  };

  const handleGenerateVideo = async () => {
    setIsLoading(true);
    try {
      await axios.get(`${backendURL}/catalog/generate-video`, {
        headers: {
          Authorization: token,
        },
      });
      fetchUserVideos(token); // Refresh the list of videos after generating a new one
    } catch (error) {
      console.error("Error generating video:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // New function to handle video deletion
  const handleDeleteVideo = async (filename) => {
    try {
      await axios.delete(`${backendURL}/catalog/delete-video/${filename}`, {
        headers: {
          Authorization: token,
        },
      });
      fetchUserVideos(token); // Refresh the list of videos after deleting
    } catch (error) {
      console.error("Error deleting video:", error);
    }
  };

  const handleLoadTest = async () => {
    try {
      const response = await axios.get(`${backendURL}/load-test`);
      alert(response.data); // This will alert the message sent from the backend
    } catch (error) {
      console.error("Error during load test:", error);
      alert("An error occurred during the load test.");
    }
  };

  return (
    <Container
      fluid
      className="d-flex flex-column align-items-center justify-content-center vh-100"
    >
      <Row className="justify-content-md-center">
        <Col style={{ marginTop: "5px" }}>
          {!token ? (
            <LoginForm onLogin={handleLogin} handleLoadTest={handleLoadTest} />
          ) : (
            <>
              <h1 className="text-center mb-4 header-text">
                Photo to Video Generator
              </h1>
              <UploadComponent
                onUploadComplete={handleGenerateVideo}
                token={token}
              />

              {isLoading && ( // Show spinner when loading
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
            </>
          )}
        </Col>
      </Row>
    </Container>
  );
}

function LoginForm({ onLogin, handleLoadTest }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin(username, password);
  };

  return (
    <Form onSubmit={handleSubmit} className="bg-dark text-white p-4 rounded">
      <h2 className="text-center mb-4">Sign In</h2>
      <Form.Group controlId="formUsername">
        <Form.Label>Username:</Form.Label>
        <Form.Control
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </Form.Group>
      <Form.Group controlId="formPassword" className="mt-3">
        <Form.Label>Password:</Form.Label>
        <Form.Control
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Form.Group>
      <Button variant="warning" type="submit" className="w-100 mt-3">
        Login
      </Button>
      <Button onClick={handleLoadTest} variant="info" className="mt-3 w-100">
        Load Test
      </Button>
    </Form>
  );
}

export default App;
