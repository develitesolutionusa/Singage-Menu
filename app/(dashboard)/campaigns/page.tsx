import { PageHeader } from "@/components/ui";

export default function CampaignsPage() {
  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Scheduling and exceptions arrive in Phase 3."
      />
      <div className="rounded-lg border border-dashed border-zinc-200 px-6 py-16 text-center">
        <p className="text-sm font-medium text-zinc-800">
          Campaigns are not available yet
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          In Phase 1, assign a loop directly on each player. Campaign
          scheduling, chaining, and exceptions come next.
        </p>
      </div>
    </div>
  );
}
