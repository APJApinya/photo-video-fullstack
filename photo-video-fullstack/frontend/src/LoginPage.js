import React, { useState, useEffect } from "react";
import { Form, Button, Container, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // useEffect to handle Google OAuth code exchange for tokens
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const code = queryParams.get("code");

    // Only execute if there is an OAuth code present
    if (code) {
      exchangeCodeForTokens(code);
    }
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/auth/login`,
        {
          username,
          password,
        }
      );
      const { accessToken, idToken, groups } = response.data;
      console.log("Groups of this user is: ", groups);
      sessionStorage.setItem("username", username);
      sessionStorage.setItem("groups", JSON.stringify(groups)); // Store group as JSON string
      sessionStorage.setItem("accessToken", accessToken); // used in API calls that need authorization (in the header)
      sessionStorage.setItem("idToken", idToken); // used in frontend logic as it stores user info
      if (sessionStorage.getItem("accessToken")) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login failed. Please check your credentials.");
    }
  };

  const handleGoogleLogin = () => {
    const cognitoDomain = process.env.REACT_APP_GOOGLE_COGNITO_DOMAIN;
    const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
    const redirectUri = process.env.REACT_APP_GOOGLE_REDIRECT_URI;
    const googleLoginUrl = `${cognitoDomain}/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&identity_provider=Google`;

    window.location.href = googleLoginUrl;
  };

  const exchangeCodeForTokens = async (code) => {
    try {
      const redirectUri = process.env.REACT_APP_GOOGLE_REDIRECT_URI;
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}/auth/google-callback`,
        {
          code,
          redirectUri,
        }
      );

      const { accessToken, idToken, username } = response.data;
      sessionStorage.setItem("username", username);
      sessionStorage.setItem("accessToken", accessToken);
      sessionStorage.setItem("idToken", idToken);

      if (sessionStorage.getItem("accessToken")) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Failed to exchange code for tokens:", error);
      alert("Login failed. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <Container
        fluid
        className="d-flex flex-column align-items-center justify-content-center vh-100"
      >
        <Row className="justify-content-md-center">
          <h2 className="text-center mb-4">Sign In</h2>
          <Form
            onSubmit={handleLogin}
            className="bg-dark text-white p-4 rounded"
          >
            <Form.Group controlId="formUsername">
              <Form.Label>Username:</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Form.Group>
            <Form.Group controlId="formPassword" className="mt-3">
              <Form.Label>Password:</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Button variant="warning" type="submit" className="w-100 mt-3">
              Login
            </Button>
            <Button
              variant="secondary"
              className="w-100 mt-3"
              onClick={() => navigate("/signup")} // Redirect to signup page
            >
              Sign Up
            </Button>
            <Button
              variant="primary"
              className="w-100 mt-3"
              onClick={handleGoogleLogin} // Handle Google login
            >
              Login with Google
            </Button>
          </Form>
        </Row>
      </Container>
    </div>
  );
}

export default LoginPage;
