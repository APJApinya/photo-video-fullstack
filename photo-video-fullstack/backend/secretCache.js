const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
const secretClient = new SecretsManagerClient({ region: "ap-southeast-2" });

async function getSecretCredentials(secretName) {
    try {
      const response = await secretClient.send(
        new GetSecretValueCommand({ SecretId: secretName, VersionStage: "AWSCURRENT" })
      );
      const secret = JSON.parse(response.SecretString);
      return secret;
    } catch (error) {
      console.error("Error fetching secrets from Secrets Manager:", error);
      throw error;
    }
  }

  module.exports = { getSecretCredentials };
