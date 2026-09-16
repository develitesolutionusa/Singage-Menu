import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import type { LibraryItem } from "@/types/db";

const sortSchema = z.enum(["name", "size", "duration", "date"]);

export async function GET(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");
  const sort = sortSchema.parse(searchParams.get("sort") ?? "date");
  const order = searchParams.get("order") === "asc" ? true : false;

  const supabase = createServiceClient();

  let query = supabase
    .from("library_items")
    .select("*")
    .eq("clerk_org_id", ctx.orgId);

  if (folderId === "root" || !folderId) {
    query = query.is("folder_id", null);
  } else {
    query = query.eq("folder_id", folderId);
  }

  switch (sort) {
    case "name":
      query = query.order("name", { ascending: order || true });
      break;
    case "size":
      query = query.order("size_bytes", { ascending: order });
      break;
    case "duration":
      query = query.order("duration_seconds", {
        ascending: order,
        nullsFirst: false,
      });
      break;
    default:
      query = query.order("created_at", { ascending: order });
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const folderIdRaw = form.get("folderId");
  const folderId =
    typeof folderIdRaw === "string" && folderIdRaw && folderIdRaw !== "root"
      ? folderIdRaw
      : null;

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const uploaded: LibraryItem[] = [];

  for (const file of files) {
    const mime = file.type || "application/octet-stream";
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.name}` },
        { status: 400 },
      );
    }

    const ext = file.name.includes(".")
      ? file.name.split(".").pop()
      : isImage
        ? "jpg"
        : "mp4";
    const storagePath = `${ctx.orgId}/${crypto.randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(storagePath, buffer, {
        contentType: mime,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = supabase.storage
      .from("media")
      .getPublicUrl(storagePath);

    const durationRaw = form.get(`duration:${file.name}`);
    const duration =
      typeof durationRaw === "string" && durationRaw
        ? Number(durationRaw)
        : isImage
          ? 10
          : null;

    const { data, error } = await supabase
      .from("library_items")
      .insert({
        clerk_org_id: ctx.orgId,
        folder_id: folderId,
        name: file.name,
        mime_type: mime,
        file_type: isImage ? "image" : "video",
        storage_path: storagePath,
        public_url: publicData.publicUrl,
        size_bytes: file.size,
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

export async function DELETE(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = z
    .object({ ids: z.array(z.string().uuid()).min(1) })
    .parse(await request.json());

  const supabase = createServiceClient();
  const { data: items, error: fetchError } = await supabase
    .from("library_items")
    .select("id, storage_path")
    .eq("clerk_org_id", ctx.orgId)
    .in("id", body.ids);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const paths = (items ?? []).map((i) => i.storage_path);
  if (paths.length) {
    await supabase.storage.from("media").remove(paths);
  }

  const { error } = await supabase
    .from("library_items")
    .delete()
    .eq("clerk_org_id", ctx.orgId)
    .in("id", body.ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    orgId: ctx.orgId,
    actorId: ctx.userId,
    action: `Deleted ${body.ids.length} library item${body.ids.length === 1 ? "" : "s"}`,
    entityType: "library",
  });

  return NextResponse.json({ ok: true });
}
