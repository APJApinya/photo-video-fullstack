FROM node:18
WORKDIR /app
COPY . .
RUN npm install express @aws-sdk/client-s3 @aws-sdk/lib-dynamodb uuid memjs aws-sdk @aws-sdk/s3-request-presigner @aws-sdk/client-dynamodb @aws-sdk/client-sqs
ENV AWS_BUCKET_NAME=n11780100-assignment2
EXPOSE 8083
CMD ["node", "videos.js"]

