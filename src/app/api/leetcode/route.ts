import { NextResponse } from "next/server";
import { fetchLeetCode, slugFromUrl } from "@/lib/leetcode";
import { supabaseServer } from "@/lib/supabase/server";

// Looks up a LeetCode problem (title, difficulty, topics, statement) from its URL.
export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(request.url).searchParams.get("url") ?? "";
  const slug = slugFromUrl(url);
  if (!slug) return NextResponse.json({ error: "That doesn't look like a LeetCode problem link." }, { status: 400 });

  try {
    const info = await fetchLeetCode(slug);
    if (!info) return NextResponse.json({ error: "Problem not found on LeetCode." }, { status: 404 });
    return NextResponse.json(info);
  } catch (e) {
    return NextResponse.json(
      { error: `Couldn't reach LeetCode (${(e as Error).message}). Fill the details in by hand.`, slug },
      { status: 502 },
    );
  }
}
