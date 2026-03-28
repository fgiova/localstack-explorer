# S3 Service Guide

S3 is the fully implemented reference service in LocalStack Explorer. It supports bucket management and full object operations including folder navigation, upload, download, and deletion.

## Features

- List, create, and delete buckets
- Browse objects with folder-style navigation (prefix/delimiter)
- Upload files (multipart, up to 100 MB)
- Download objects as file attachments
- View object properties (size, content type, last modified, ETag)
- Delete individual objects
- Search/filter buckets by name

## API Endpoints

All endpoints are prefixed with `/api/s3`.

### Buckets

| Method | Path            | Description    | Request            | Response               |
|--------|-----------------|----------------|--------------------|------------------------|
| GET    | `/`             | List buckets   | —                  | `{ buckets: [...] }`   |
| POST   | `/`             | Create bucket  | `{ name: string }` | `{ message: string }`  |
| DELETE | `/:bucketName`  | Delete bucket  | —                  | `{ success: boolean }` |

### Objects

| Method | Path                                 | Description       | Query Params                                          |
|--------|--------------------------------------|-------------------|-------------------------------------------------------|
| GET    | `/:bucketName/objects`               | List objects      | `prefix`, `delimiter`, `continuationToken`, `maxKeys` |
| GET    | `/:bucketName/objects/properties`    | Object metadata   | `key` (required)                                      |
| POST   | `/:bucketName/objects/upload`        | Upload file       | Multipart form: `file`, optional `key` field          |
| GET    | `/:bucketName/objects/download`      | Download file     | `key` (required)                                      |
| DELETE | `/:bucketName/objects`               | Delete object     | `key` (required)                                      |

### Request/Response Examples

**List buckets:**

```bash
curl http://localhost:3001/api/s3
```

```json
{
  "buckets": [
    { "name": "my-bucket", "creationDate": "2024-01-01T00:00:00.000Z" }
  ]
}
```

**Create bucket:**

```bash
curl -X POST http://localhost:3001/api/s3 \
  -H "Content-Type: application/json" \
  -d '{"name": "my-new-bucket"}'
```

**List objects with folder navigation:**

```bash
# List root of bucket (shows folders and files)
curl "http://localhost:3001/api/s3/my-bucket/objects?delimiter=/"

# Browse into a folder
curl "http://localhost:3001/api/s3/my-bucket/objects?prefix=images/&delimiter=/"
```

```json
{
  "objects": [
    { "key": "images/photo.jpg", "size": 204800, "lastModified": "2024-01-15T10:30:00.000Z" }
  ],
  "commonPrefixes": [
    { "prefix": "images/thumbnails/" }
  ],
  "isTruncated": false
}
```

**Upload a file:**

```bash
curl -X POST "http://localhost:3001/api/s3/my-bucket/objects/upload" \
  -F "file=@photo.jpg" \
  -F "key=images/photo.jpg"
```

**Download a file:**

```bash
curl -O "http://localhost:3001/api/s3/my-bucket/objects/download?key=images/photo.jpg"
```

## Error Handling

The S3 service maps AWS SDK errors to appropriate HTTP status codes:

| Scenario                 | Status | Error Code         |
|--------------------------|--------|--------------------|
| Bucket already exists    | 409    | `BUCKET_EXISTS`    |
| Bucket not found         | 404    | `BUCKET_NOT_FOUND` |
| Bucket not empty         | 409    | `BUCKET_NOT_EMPTY` |
| Object not found         | 404    | `OBJECT_NOT_FOUND` |
| No file in upload        | 400    | `NO_FILE`          |
| Validation error         | 400    | `VALIDATION_ERROR` |

All errors return a consistent JSON shape:

```json
{
  "error": "BUCKET_NOT_FOUND",
  "message": "Bucket 'missing-bucket' not found",
  "statusCode": 404
}
```

## Backend Implementation

The S3 plugin consists of four files in `packages/backend/src/plugins/s3/`:

| File           | Purpose                                                                                 |
|----------------|-----------------------------------------------------------------------------------------|
| `index.ts`     | Plugin registration — creates the S3 client and service, registers multipart and routes |
| `service.ts`   | `S3Service` class — business logic wrapping AWS SDK calls                               |
| `routes.ts`    | Fastify route definitions with TypeBox validation schemas                               |
| `schemas.ts`   | TypeBox schemas for all request inputs and response outputs                             |

### S3Service Methods

| Method                     | AWS SDK Command         | Description                     |
|----------------------------|-------------------------|---------------------------------|
| `listBuckets()`            | `ListBucketsCommand`    | Returns all buckets             |
| `createBucket(name)`       | `CreateBucketCommand`   | Creates a new bucket            |
| `deleteBucket(name)`       | `DeleteBucketCommand`   | Deletes an empty bucket         |
| `listObjects(...)`         | `ListObjectsV2Command`  | Lists objects with pagination   |
| `getObjectProperties(...)` | `HeadObjectCommand`     | Returns object metadata         |
| `uploadObject(...)`        | `PutObjectCommand`      | Uploads a file                  |
| `downloadObject(...)`      | `GetObjectCommand`      | Returns object body as stream   |
| `deleteObject(...)`        | `DeleteObjectCommand`   | Deletes an object               |
| `getPresignedUrl(...)`     | S3RequestPresigner      | Generates a time-limited URL    |

## Frontend Components

The S3 frontend is in `packages/frontend/src/components/s3/` and `packages/frontend/src/routes/s3/`.

| Component               | Description                                              |
|-------------------------|----------------------------------------------------------|
| `BucketList`            | Table of buckets with search, create, and delete         |
| `BucketCreateDialog`    | Modal dialog for creating a new bucket                   |
| `ObjectBrowser`         | File manager-style object browser with folder navigation |
| `ObjectUploadDialog`    | Drag-and-drop file upload with optional custom key       |

### Routes

| Route              | Component         | Description                 |
|--------------------|-------------------|-----------------------------|
| `/s3`              | `BucketList`      | List and manage buckets     |
| `/s3/:bucketName`  | `ObjectBrowser`   | Browse objects in a bucket  |

### React Query Hooks

All hooks are in `packages/frontend/src/api/s3.ts`:

| Hook                       | Type     | Query Key                               |
|----------------------------|----------|-----------------------------------------|
| `useListBuckets()`         | Query    | `["s3", "buckets"]`                     |
| `useListObjects(...)`      | Query    | `["s3", "objects", bucketName, prefix]` |
| `useObjectProperties(...)` | Query    | `["s3", "object-properties", ...]`      |
| `useCreateBucket()`        | Mutation | Invalidates `["s3", "buckets"]`         |
| `useDeleteBucket()`        | Mutation | Invalidates `["s3", "buckets"]`         |
| `useUploadObject(...)`     | Mutation | Invalidates `["s3", "objects", ...]`    |
| `useDeleteObject(...)`     | Mutation | Invalidates `["s3", "objects", ...]`    |

Mutations automatically invalidate the relevant query cache, so the UI refreshes after every create, delete, or upload operation.
