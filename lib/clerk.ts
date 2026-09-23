import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  hasTemplatePermission,
  permissionsForOrgRole,
  type TemplatePermission,
  type TemplatePermissionSet,
} from "@/lib/template-permissions";

export type OrgContext = {
  userId: string;
  orgId: string;
  orgRole: string | null | undefined;
  permissions: TemplatePermissionSet;
};

/**
 * Require a signed-in user who belongs to an active Clerk Organization.
 * Clerk Organizations are the tenant boundary for this app.
 */
export async function requireOrg(): Promise<
  OrgContext | { error: NextResponse }
> {
  const { userId, orgId, orgRole } = await auth();

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

  return {
    userId,
    orgId,
    orgRole,
    permissions: permissionsForOrgRole(orgRole),
  };
}

export function isOrgContext(
  value: OrgContext | { error: NextResponse },
): value is OrgContext {
  return "orgId" in value;
}

export function requirePermission(
  ctx: OrgContext,
  permission: TemplatePermission,
): NextResponse | null {
  if (hasTemplatePermission(ctx.orgRole, permission)) return null;
  return NextResponse.json(
    {
      error: `Missing permission: ${permission}`,
      permission,
    },
    { status: 403 },
  );
}
