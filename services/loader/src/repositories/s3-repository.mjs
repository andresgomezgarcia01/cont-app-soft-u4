import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand
} from "@aws-sdk/client-s3";

const client = new S3Client({});

export class S3Repository {
  constructor(bucketName, s3Client = client) {
    if (typeof bucketName !== "string" || bucketName.trim() === "") {
      throw new TypeError("A valid S3 bucket name is required.");
    }

    if (!s3Client || typeof s3Client.send !== "function") {
      throw new TypeError("A valid S3 client is required.");
    }

    this.bucketName = bucketName;
    this.client = s3Client;
  }

  async getObject(key) {
    if (typeof key !== "string" || key.trim() === "") {
      throw new TypeError("A valid S3 object key is required.");
    }

    return this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })
    );
  }

  async putObject(key, body, contentType) {
    if (typeof key !== "string" || key.trim() === "") {
      throw new TypeError("A valid S3 object key is required.");
    }

    if (body === undefined || body === null) {
      throw new TypeError("An object body is required.");
    }

    if (typeof contentType !== "string" || contentType.trim() === "") {
      throw new TypeError("A valid content type is required.");
    }

    return this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    );
  }
}
