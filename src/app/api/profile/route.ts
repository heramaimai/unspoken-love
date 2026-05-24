import { NextResponse } from "next/server";
import { getTherapistProfile } from "@/lib/style-profile";
import { ensureUser, getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId")?.trim() || "demo-user";

    await ensureUser(userId);
    const supabase = getSupabaseAdmin();

    const [profile, transcriptsResult, segmentsResult] = await Promise.all([
      getTherapistProfile(userId),
      supabase
        .from("transcripts")
        .select("id,title,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("transcript_segments")
        .select("id,label,speaker,content,metadata,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (transcriptsResult.error) {
      throw transcriptsResult.error;
    }

    if (segmentsResult.error) {
      throw segmentsResult.error;
    }

    return NextResponse.json({
      profile,
      transcripts: transcriptsResult.data || [],
      segments: (segmentsResult.data || []).reverse(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown profile error" },
      { status: 500 },
    );
  }
}
