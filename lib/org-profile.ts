import { clerkClient } from "@clerk/nextjs/server";
import type { OrgProfile } from "@/lib/dynamic-data";
import { mergeOrgProfileIntoDesign } from "@/lib/dynamic-data";
import type { DesignData } from "@/types/db";

/** Fetch restaurant profile from Clerk Organization (name + logo). */
export async function fetchOrgProfile(
  orgId: string | null | undefined,
): Promise<OrgProfile | null> {
  if (!orgId) return null;
  try {
    const client = await clerkClient();
    const org = await client.organizations.getOrganization({
      organizationId: orgId,
    });
    return {
      name: org.name ?? "",
      logo: org.imageUrl ?? null,
    };
  } catch {
    return null;
  }
}

/** Ensure design slides carry restaurant context for player resolution. */
export function enrichDesignForPlayback(
  design: DesignData | null,
  orgProfile: OrgProfile | null,
): DesignData | null {
  if (!design) return null;
  if (!orgProfile) return design;
  return mergeOrgProfileIntoDesign(design, orgProfile);
}
