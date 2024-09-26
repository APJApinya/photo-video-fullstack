import React, { useState } from "react";
import { Form, Button, Container, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

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
      const { accessToken, idToken } = response.data;
      sessionStorage.setItem("username", username);
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
          </Form>
        </Row>
      </Container>
    </div>
  );
}

export default LoginPage;
