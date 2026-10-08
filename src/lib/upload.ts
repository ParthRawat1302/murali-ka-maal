import { supabaseBrowser } from "./supabase/client";

export type Uploaded = { url: string; name: string; size: number; mime: string };

function safeName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_");
  return cleaned.slice(-80) || "file";
}

/** Uploads to the public `media` bucket under the user's folder and returns its public URL. */
export async function uploadFile(file: File, userId: string): Promise<Uploaded> {
  const supabase = supabaseBrowser();
  const month = new Date().toISOString().slice(0, 7);
  const path = `${userId}/${month}/${crypto.randomUUID()}-${safeName(file.name || "pasted")}`;
  const { error } = await supabase.storage.from("media").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "31536000",
  });
  if (error) throw error;
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return { url: data.publicUrl, name: file.name || "pasted file", size: file.size, mime: file.type };
}
