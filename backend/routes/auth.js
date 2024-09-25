const express = require("express");
const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const jwt = require("aws-jwt-verify");
const router = express.Router();

const userPoolId = process.env.COGNITO_POOL_ID;
const clientId = process.env.COGNITO_POOL_APP_ID;

if (!userPoolId) {
    throw new Error("COGNITO_POOL_ID is not defined");
  }

  if (!clientId) {
    throw new Error("COGNITO_POOL_APP_ID is not defined");
  }
  console.log("Cognito Pool ID:", process.env.COGNITO_POOL_ID);
  console.log("Cognito Client ID:", process.env.COGNITO_POOL_APP_ID);

const accessVerifier = jwt.CognitoJwtVerifier.create({
  userPoolId: userPoolId,
  tokenUse: "access",
  clientId: clientId,
});

const idVerifier = jwt.CognitoJwtVerifier.create({
  userPoolId: userPoolId,
  tokenUse: "id",
  clientId: clientId,
});

// Sign Up Route
router.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;
  const client = new Cognito.CognitoIdentityProviderClient({ region: "ap-southeast-2" });

  try {
    const command = new Cognito.SignUpCommand({
      ClientId: clientId,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
    });
    const signUpRes = await client.send(command);
    console.log(signUpRes);
    res.json(signUpRes);
  } catch (error) {
    console.error("Sign-up failed:", error);
    res.status(500).send("Sign-up failed");
  }
});

// Login Route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const client = new Cognito.CognitoIdentityProviderClient({ region: "ap-southeast-2" });

  try {
    const command = new Cognito.InitiateAuthCommand({
      AuthFlow: Cognito.AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
      ClientId: clientId,
    });

    const authRes = await client.send(command);
    const accessToken = await accessVerifier.verify(
        authRes.AuthenticationResult.AccessToken
    );
    const idToken = await idVerifier.verify(authRes.AuthenticationResult.IdToken);
    res.json({ accessToken, idToken });
  } catch (error) {
    console.error("Authentication failed:", error);
    res.status(500).send("Authentication failed");
  }
});

module.exports = router;
