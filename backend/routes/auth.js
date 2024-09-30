const express = require("express");
const router = express.Router();
const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const jwt = require("aws-jwt-verify");
const { getParameterFromStore } = require("../parameterCache");
const { getSecretCredentials } = require("../secretCache");

// const AWS = require("aws-sdk");
// const ssm = new AWS.SSM({ region: "ap-southeast-2" });

// async function getParameterFromStore(parameterName) {
//   const params = { Name: parameterName };
//   try {
//     const data = await ssm.getParameter(params).promise();
//     const parameterValue = data.Parameter.Value;
//     console.log(`Parameter fetched from Parameter Store: ${parameterValue}`);
//     return parameterValue;
//   } catch (error) {
//     console.error(`Error fetching parameter from Parameter Store: ${error}`);
//     throw error;
//   }
// }

// Sign Up Route
router.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;
  const client = new Cognito.CognitoIdentityProviderClient({
    region: "ap-southeast-2",
  });

  try {
    const clientId = await getParameterFromStore(
      "/n11780100/cognito/pool_client_id"
    );
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
  const client = new Cognito.CognitoIdentityProviderClient({
    region: "ap-southeast-2",
  });

  try {
    const userPoolId = await getParameterFromStore(
      "/n11780100/cognito/pool_id"
    );
    const clientId = await getParameterFromStore(
      "/n11780100/cognito/pool_client_id"
    );
    // Initialize the Cognito verifiers
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
    // Cognito authentication command
    const command = new Cognito.InitiateAuthCommand({
      AuthFlow: Cognito.AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
      ClientId: clientId,
    });

    const authRes = await client.send(command);
    // Verify the tokens
    const accessToken = await accessVerifier.verify(
      authRes.AuthenticationResult.AccessToken
    );
    const idToken = await idVerifier.verify(
      authRes.AuthenticationResult.IdToken
    );
    res.json({ accessToken, idToken });
  } catch (error) {
    console.error("Authentication failed:", error);
    res.status(500).send("Authentication failed");
  }
});

// Google Login Route
router.post("/google-login", async (req, res) => {
    const {code, redirectUri} = req.body;

    if (!code) {
        return res.status(400).json({ error: "Authorization code is missing." });
    }

    try {
        const googleClientId = await getParameterFromStore("/n11780100/cognito/google/client_id");
        const googleClientSecret = await getParameterFromStore("/n11780100/cognito/google/secret_client_id");
        const cognitoDomain = await getParameterFromStore("/n11780100/cognito/domainUrl");

        const tokenResponse = await axios.post(
            `${cognitoDomain}/oauth2/token`,
            new URLSearchParams({
              grant_type: "authorization_code",
              code,
              client_id: googleClientId,
              client_secret: googleClientSecret,
              redirect_uri: redirectUri,
            }),
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
          );
      
          const { access_token, id_token } = tokenResponse.data;
      
          // Extract user information from the ID token if needed
          const username = parseUsernameFromIdToken(id_token);
      
          // Return tokens and username to the frontend
          res.status(200).json({
            accessToken: access_token,
            idToken: id_token,
            username,
          });
    } catch (error) {
        console.error("Failed to exchange code for tokens:", error.response?.data || error);
        res.status(500).json({ error: "Failed to exchange code for tokens." });
      }
});

// Helper function to parse username from the ID token
function parseUsernameFromIdToken(idToken) {
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error("Invalid ID token format.");
    }
  
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    return payload["cognito:username"];
}

module.exports = router;
