FROM node:18
WORKDIR /app
COPY . .
RUN npm install express multer @aws-sdk/client-s3 mysql2 @aws-sdk/client-secrets-manager memjs aws-sdk @aws-sdk/s3-request-presigner
ENV AWS_BUCKET_NAME=n11780100-assignment2
EXPOSE 8082
CMD ["node", "photos.js"]
