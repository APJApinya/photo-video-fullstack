const awsExports = {
    Auth: {
      region: "ap-southeast-2",
      userPoolId: process.env.COGNITO_POOL_ID, 
      userPoolWebClientId: process.env.COGNITO_POOL_APP_ID, 
    },
  };
  export default awsExports;