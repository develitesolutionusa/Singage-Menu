import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import type { LibraryItem } from "@/types/db";

const completeSchema = z.object({
  folderId: z.string().uuid().nullable().optional(),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        mimeType: z.string().trim().min(1).max(120),
        sizeBytes: z.number().int().nonnegative(),
        fileType: z.enum(["image", "video"]),
        storagePath: z.string().trim().min(1),
        publicUrl: z.string().url().nullable().optional(),
        durationSeconds: z.number().positive().max(36000).nullable().optional(),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = completeSchema.parse(await request.json());
  const supabase = createServiceClient();

  const folderId = body.folderId ?? null;
  if (folderId) {
    const { data: folder } = await supabase
      .from("library_folders")
      .select("id")
      .eq("clerk_org_id", ctx.orgId)
      .eq("id", folderId)
      .maybeSingle();
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const uploaded: LibraryItem[] = [];

  for (const item of body.items) {
    if (!item.storagePath.startsWith(`${ctx.orgId}/`)) {
      return NextResponse.json(
        { error: "Invalid storage path" },
        { status: 400 },
      );
    }

    const { data: publicData } = supabase.storage
      .from("media")
      .getPublicUrl(item.storagePath);

    const duration =
      item.durationSeconds ??
      (item.fileType === "image" ? 10 : null);

    const { data, error } = await supabase
      .from("library_items")
      .insert({
        clerk_org_id: ctx.orgId,
        folder_id: folderId,
        name: item.name,
        mime_type: item.mimeType,
        file_type: item.fileType,
        storage_path: item.storagePath,
        public_url: item.publicUrl ?? publicData.publicUrl,
        size_bytes: item.sizeBytes,
        duration_seconds: duration,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    uploaded.push(data);
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Uploaded ${uploaded.length} media item${uploaded.length === 1 ? "" : "s"}`,
    entityType: "library",
    metadata: { count: uploaded.length },
  });

  return NextResponse.json({ items: uploaded }, { status: 201 });
}
