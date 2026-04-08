import Type, { type Static } from "typebox";

export const BucketSchema = Type.Object({
	name: Type.String(),
	creationDate: Type.Optional(Type.String()),
});
export type Bucket = Static<typeof BucketSchema>;

export const BucketListResponseSchema = Type.Object({
	buckets: Type.Array(BucketSchema),
});

export const CreateBucketBodySchema = Type.Object({
	name: Type.String({ minLength: 3, maxLength: 63 }),
});

export const BucketParamsSchema = Type.Object({
	bucketName: Type.String(),
});

export const CreateFolderBodySchema = Type.Object({
	name: Type.String({ minLength: 1, maxLength: 1024 }),
});

export const ListObjectsQuerySchema = Type.Object({
	prefix: Type.Optional(Type.String()),
	delimiter: Type.Optional(Type.String()),
	continuationToken: Type.Optional(Type.String()),
	maxKeys: Type.Optional(Type.Number({ minimum: 1, maximum: 1000 })),
});

export const ObjectKeyQuerySchema = Type.Object({
	key: Type.String(),
});

export const S3ObjectSchema = Type.Object({
	key: Type.String(),
	size: Type.Optional(Type.Number()),
	lastModified: Type.Optional(Type.String()),
	etag: Type.Optional(Type.String()),
	storageClass: Type.Optional(Type.String()),
});

export const CommonPrefixSchema = Type.Object({
	prefix: Type.String(),
});

export const ListObjectsResponseSchema = Type.Object({
	objects: Type.Array(S3ObjectSchema),
	commonPrefixes: Type.Array(CommonPrefixSchema),
	nextContinuationToken: Type.Optional(Type.String()),
	isTruncated: Type.Boolean(),
});

export const ObjectPropertiesSchema = Type.Object({
	key: Type.String(),
	size: Type.Number(),
	lastModified: Type.String(),
	contentType: Type.String(),
	etag: Type.String(),
});

export const UploadResponseSchema = Type.Object({
	key: Type.String(),
	bucket: Type.String(),
});

export const DeleteResponseSchema = Type.Object({
	success: Type.Boolean(),
});

export const MessageResponseSchema = Type.Object({
	message: Type.String(),
});
