import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export type OrgContext = {
  userId: string;
  orgId: string;
};

/**
 * Require a signed-in user who belongs to an active Clerk Organization.
 * Clerk Organizations are the tenant boundary for this app.
 */
export async function requireOrg(): Promise<
  OrgContext | { error: NextResponse }
> {
  const { userId, orgId } = await auth();

  if (!userId) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!orgId) {
    return {
      error: NextResponse.json(
        { error: "Select or create an organization to continue." },
        { status: 403 },
      ),
    };
  }

  return { userId, orgId };
}

export function isOrgContext(
  value: OrgContext | { error: NextResponse },
): value is OrgContext {
  return "orgId" in value;
}
