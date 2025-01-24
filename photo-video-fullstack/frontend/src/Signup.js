import React, { useState } from "react";
import { Form, Button, Alert, Container, Row } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const navigate = useNavigate();

  const backendURL = process.env.REACT_APP_BACKEND_URL;


  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (password === confirmPassword) {
      try {
        const response = await axios.post(`${backendURL}/auth/signup`, {
          username,
          password,
          email,
        });
  
        const { UserConfirmed, CodeDeliveryDetails } = response.data;
  
        if (UserConfirmed) {
          alert("Signup successful! Your account is confirmed. You can log in.");
          setTimeout(() => {
            navigate("/login"); // Redirect to login page after successful signup
          }, 3000);
        } else if (CodeDeliveryDetails) {
          alert("Signup successful! A confirmation code has been sent to your email.");
          setTimeout(() => {
            navigate("/login"); // Redirect to login page after successful signup
          }, 3000);
        } else {
          alert("Signup successful! Please wait for your account to be confirmed.");
          setTimeout(() => {
            navigate("/login"); // Redirect to login page after successful signup
          }, 3000);
        }
  
      } catch (error) {
        alert(`Error during signup: ${error.response?.data || error.message}`);
      }
    } else {
      alert("Passwords do not match");
    }
  };

  return (
    <div className="signup-container">
    <Container
      fluid
      className="d-flex flex-column align-items-center justify-content-center vh-100"
    >
      <Row className="justify-content-md-center">
      <h2 className="text-center mb-4">Sign Up</h2>
      {alertMessage && <Alert variant="info">{alertMessage}</Alert>}
      <Form onSubmit={handleSignup} className="bg-light p-4 rounded">
        <Form.Group controlId="formUsername">
          <Form.Label>Username:</Form.Label>
          <Form.Control
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </Form.Group>
        <Form.Group controlId="formEmail" className="mt-3">
          <Form.Label>Email:</Form.Label>
          <Form.Control
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            minLength="8"
          />
        </Form.Group>
        <Form.Group controlId="formConfirmPassword" className="mt-3">
          <Form.Label>Confirm Password:</Form.Label>
          <Form.Control
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength="8"
          />
        </Form.Group>
        <Button variant="primary" type="submit" className="w-100 mt-4">
          Sign Up
        </Button>
      </Form>
      </Row>
      </Container>
    </div>
  );
}

export default Signup;
