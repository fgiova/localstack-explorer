import { createFileRoute } from "@tanstack/react-router";
import { BucketList } from "@/components/s3/BucketList";

export const Route = createFileRoute("/s3/")({
	component: S3BucketsPage,
});

function S3BucketsPage() {
	return <BucketList />;
}
