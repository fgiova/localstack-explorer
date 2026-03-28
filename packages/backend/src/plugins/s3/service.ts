import {
  type S3Client,
  ListBucketsCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "../../shared/errors.js";

export class S3Service {
  constructor(private client: S3Client) {}

  async listBuckets() {
    const response = await this.client.send(new ListBucketsCommand({}));
    return {
      buckets: (response.Buckets ?? []).map((b) => ({
        name: b.Name ?? "",
        creationDate: b.CreationDate?.toISOString(),
      })),
    };
  }

  async createBucket(name: string) {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: name }));
      return { message: `Bucket '${name}' created successfully` };
    } catch (err) {
      const error = err as Error & { name: string };
      if (error.name === "BucketAlreadyOwnedByYou" || error.name === "BucketAlreadyExists") {
        throw new AppError(`Bucket '${name}' already exists`, 409, "BUCKET_EXISTS");
      }
      throw error;
    }
  }

  async deleteBucket(name: string) {
    try {
      await this.client.send(new DeleteBucketCommand({ Bucket: name }));
      return { success: true };
    } catch (err) {
      const error = err as Error & { name: string };
      if (error.name === "NoSuchBucket") {
        throw new AppError(`Bucket '${name}' not found`, 404, "BUCKET_NOT_FOUND");
      }
      if (error.name === "BucketNotEmpty") {
        throw new AppError(`Bucket '${name}' is not empty`, 409, "BUCKET_NOT_EMPTY");
      }
      throw error;
    }
  }

  async listObjects(
    bucket: string,
    prefix?: string,
    delimiter?: string,
    continuationToken?: string,
    maxKeys?: number
  ) {
    try {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix ?? undefined,
          Delimiter: delimiter ?? "/",
          ContinuationToken: continuationToken ?? undefined,
          MaxKeys: maxKeys ?? 100,
        })
      );

      return {
        objects: (response.Contents ?? []).map((obj) => ({
          key: obj.Key ?? "",
          size: obj.Size,
          lastModified: obj.LastModified?.toISOString(),
          etag: obj.ETag,
          storageClass: obj.StorageClass,
        })),
        commonPrefixes: (response.CommonPrefixes ?? []).map((cp) => ({
          prefix: cp.Prefix ?? "",
        })),
        nextContinuationToken: response.NextContinuationToken,
        isTruncated: response.IsTruncated ?? false,
      };
    } catch (err) {
      const error = err as Error & { name: string };
      if (error.name === "NoSuchBucket") {
        throw new AppError(`Bucket '${bucket}' not found`, 404, "BUCKET_NOT_FOUND");
      }
      throw error;
    }
  }

  async getObjectProperties(bucket: string, key: string) {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key })
      );
      return {
        key,
        size: response.ContentLength ?? 0,
        lastModified: response.LastModified?.toISOString() ?? "",
        contentType: response.ContentType ?? "application/octet-stream",
        etag: response.ETag ?? "",
      };
    } catch (err) {
      const error = err as Error & { name: string };
      if (error.name === "NotFound" || error.name === "NoSuchKey") {
        throw new AppError(`Object '${key}' not found in bucket '${bucket}'`, 404, "OBJECT_NOT_FOUND");
      }
      throw error;
    }
  }

  async uploadObject(bucket: string, key: string, body: Buffer | ReadableStream, contentType?: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body as PutObjectCommand["input"]["Body"],
        ContentType: contentType ?? "application/octet-stream",
      })
    );
    return { key, bucket };
  }

  async downloadObject(bucket: string, key: string) {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key })
      );
      return {
        body: response.Body,
        contentType: response.ContentType ?? "application/octet-stream",
        contentLength: response.ContentLength,
      };
    } catch (err) {
      const error = err as Error & { name: string };
      if (error.name === "NoSuchKey") {
        throw new AppError(`Object '${key}' not found in bucket '${bucket}'`, 404, "OBJECT_NOT_FOUND");
      }
      throw error;
    }
  }

  async deleteObject(bucket: string, key: string) {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key })
    );
    return { success: true };
  }

  async getPresignedUrl(bucket: string, key: string, expiresIn = 3600) {
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn }
    );
    return url;
  }
}
