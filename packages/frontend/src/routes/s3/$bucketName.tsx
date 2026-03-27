import { createFileRoute } from "@tanstack/react-router";
import { ObjectBrowser } from "@/components/s3/ObjectBrowser";

export const Route = createFileRoute("/s3/$bucketName")({
  component: S3ObjectBrowserPage,
});

function S3ObjectBrowserPage() {
  const { bucketName } = Route.useParams();
  return <ObjectBrowser bucketName={bucketName} />;
}
