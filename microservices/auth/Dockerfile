FROM node:18
WORKDIR /app
COPY . .
RUN npm install express @aws-sdk/client-cognito-identity-provider aws-jwt-verify memjs aws-sdk 
EXPOSE 8084
CMD ["node", "auth-service.js"]