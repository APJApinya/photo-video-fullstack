const express = require("express");
const { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand } = require("@aws-sdk/client-cognito-identity-provider");
const app = express();
app.use(express.json());
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { getParameterFromStore } = require("./parameterCache.js");

const client = new CognitoIdentityProviderClient({ region: "ap-southeast-2" });

// Auth Routes (signup, login, etc.)
app.post("/signup", async (req, res) => {
    const { username, password, email } = req.body;
  
    try {
      const clientId = await getParameterFromStore(
        "/n11780100/cognito/pool_client_id"
      );
      const command = new SignUpCommand({
        ClientId: clientId,
        Username: username,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }],
      });
      const signUpRes = await client.send(command);
      console.log(signUpRes);
      res.json(signUpRes);
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).send("An error occurred during signup.");
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Fetch clientId and userPoolId from parameter store
      const clientId = await getParameterFromStore(
        "/n11780100/cognito/pool_client_id"
      );
      const userPoolId = await getParameterFromStore(
        "/n11780100/cognito/pool_id"
      );

      // Initialize the authentication command
      const authCommand = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
        ClientId: clientId,
      });
  
      const authRes = await client.send(authCommand);
      const accessToken = authRes.AuthenticationResult.AccessToken;
      const idToken = authRes.AuthenticationResult.IdToken;
  
      // Create a verifier instance for ID token verification
      const idTokenVerifier = CognitoJwtVerifier.create({
        userPoolId: userPoolId,
        clientId: clientId,
        tokenUse: "id",
      });
  
      // Verify and decode the ID token
      const verifiedToken = await idTokenVerifier.verify(idToken);
      // Extract group information from the verified token
      const groups = verifiedToken["cognito:groups"] || [];
      console.log("This is groupData from AWS Cognito: ", groups);
  
      // Return tokens and group information to core.js
      res.json({ accessToken, idToken, groups });
    } catch (error) {
      console.error("Authentication failed:", error);
      res.status(500).send("Authentication failed");
    }
});

const PORT = process.env.PORT || 8084;
app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
