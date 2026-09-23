import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { fetchOrgProfile } from "@/lib/org-profile";

/**
 * Restaurant / business profile derived from the Clerk Organization.
 * Used as the real data source for {{restaurant.name}} and {{restaurant.logo}}.
 */
export async function GET() {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const profile = await fetchOrgProfile(ctx.orgId);
  return NextResponse.json({
    name: profile?.name ?? "",
    logo: profile?.logo ?? null,
    orgId: ctx.orgId,
  });
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
});

/**
 * Optional rename of the Clerk Organization (restaurant display name).
 * Logo remains managed via Clerk Organization settings.
 */
export async function PATCH(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!parsed.data.name) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    const client = await clerkClient();
    const org = await client.organizations.updateOrganization(ctx.orgId, {
      name: parsed.data.name,
    });
    return NextResponse.json({
      name: org.name ?? parsed.data.name,
      logo: org.imageUrl ?? null,
      orgId: ctx.orgId,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to update organization profile" },
      { status: 500 },
    );
  }
}
