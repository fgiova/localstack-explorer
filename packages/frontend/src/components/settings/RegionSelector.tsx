import { Globe } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select } from "@/components/ui/select";
import { useConfigStore } from "@/stores/config";

const AWS_REGIONS = [
  // US
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  // Canada
  "ca-central-1",
  "ca-west-1",
  // Europe
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "eu-central-2",
  "eu-north-1",
  "eu-south-1",
  "eu-south-2",
  // Asia Pacific
  "ap-east-1",
  "ap-south-1",
  "ap-south-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ap-southeast-5",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  // South America
  "sa-east-1",
  // Middle East
  "me-south-1",
  "me-central-1",
  // Africa
  "af-south-1",
  // Israel
  "il-central-1",
] as const;

export function RegionSelector() {
  const region = useConfigStore((s) => s.region);
  const queryClient = useQueryClient();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newRegion = event.target.value;
    useConfigStore.getState().setRegion(newRegion);
    queryClient.invalidateQueries();
  }

  return (
    <div className="flex items-center gap-1.5">
      <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Select
        value={region}
        onChange={handleChange}
        className="h-8 w-[130px] border-0 bg-transparent px-1 py-0 text-sm shadow-none focus-visible:ring-0"
        aria-label="AWS Region"
      >
        {AWS_REGIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
    </div>
  );
}
