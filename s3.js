const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

require("dotenv").config();

const s3 = new S3Client({
  region: process.env.AWS_REGION,

  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});


async function uploadImage(fileBuffer, fileName, mimeType) {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3.send(command);

  return {
    url: `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`,
    fileName,
  };
}

async function deleteImage(fileName) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_BUCKET,
    Key: fileName,
  });

  await s3.send(command);

  return {
    success: true,
    fileName,
  };
}


module.exports = {
  uploadImage,
  deleteImage,
};