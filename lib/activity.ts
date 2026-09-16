import { createServiceClient } from "@/lib/supabase";

type LogActivityInput = {
  orgId: string;
  actorId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(input: LogActivityInput) {
  const supabase = createServiceClient();
  await supabase.from("activity_logs").insert({
    clerk_org_id: input.orgId,
    actor_id: input.actorId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}
