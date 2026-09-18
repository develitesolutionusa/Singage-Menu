import { NextResponse } from "next/server";
import { z } from "zod";
import { isOrgContext, requireOrg } from "@/lib/clerk";
import { createServiceClient } from "@/lib/supabase";

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const signSchema = z.object({
  folderId: z.string().uuid().nullable().optional(),
  files: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(255),
        mimeType: z.string().trim().min(1).max(120),
        sizeBytes: z.number().int().positive(),
      }),
    )
    .min(1)
    .max(20),
});

export async function POST(request: Request) {
  const ctx = await requireOrg();
  if (!isOrgContext(ctx)) return ctx.error;

  const body = signSchema.parse(await request.json());
  const supabase = createServiceClient();

  if (body.folderId) {
    const { data: folder } = await supabase
      .from("library_folders")
      .select("id")
      .eq("clerk_org_id", ctx.orgId)
      .eq("id", body.folderId)
      .maybeSingle();
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const uploads: Array<{
    name: string;
    mimeType: string;
    sizeBytes: number;
    fileType: "image" | "video";
    storagePath: string;
    token: string;
    signedUrl: string;
    publicUrl: string;
  }> = [];

  for (const file of body.files) {
    const mime = file.mimeType || "application/octet-stream";
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.name}` },
        { status: 400 },
      );
    }

    const maxBytes = isImage ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.sizeBytes > maxBytes) {
      const maxLabel = isImage ? "20 MB" : "100 MB";
      return NextResponse.json(
        {
          error: `"${file.name}" is too large. Max ${maxLabel} for ${isImage ? "images" : "videos"}.`,
        },
        { status: 413 },
      );
    }

    const ext = file.name.includes(".")
      ? file.name.split(".").pop()
      : isImage
        ? "jpg"
        : "mp4";
    const storagePath = `${ctx.orgId}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from("media")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Could not create upload URL" },
        { status: 500 },
      );
    }

    const { data: publicData } = supabase.storage
      .from("media")
      .getPublicUrl(storagePath);

    uploads.push({
      name: file.name,
      mimeType: mime,
      sizeBytes: file.sizeBytes,
      fileType: isImage ? "image" : "video",
      storagePath,
      token: data.token,
      signedUrl: data.signedUrl,
      publicUrl: publicData.publicUrl,
    });
  }

  return NextResponse.json({
    folderId: body.folderId ?? null,
    uploads,
  });
}
