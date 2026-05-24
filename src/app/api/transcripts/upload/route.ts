import { NextResponse } from "next/server";
import { splitTranscript } from "@/lib/chunking";
import { createEmbeddings } from "@/lib/embeddings";
import { rebuildTherapistProfile } from "@/lib/style-profile";
import { ensureUser, getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type UploadRequest = {
  userId?: string;
  title?: string;
  transcript?: string;
  transcripts?: Array<{
    title?: string;
    transcript?: string;
  }>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UploadRequest;
    const userId = body.userId?.trim() || "demo-user";
    const uploadItems = normalizeUploadItems(body);

    if (uploadItems.length === 0) {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }

    await ensureUser(userId);
    const supabase = getSupabaseAdmin();
    const savedTranscriptIds: string[] = [];
    const savedSegments = [];

    for (const item of uploadItems) {
      const segments = splitTranscript(item.transcript);
      if (segments.length === 0) {
        continue;
      }

      const { data: savedTranscript, error: transcriptError } = await supabase
        .from("transcripts")
        .insert({
          user_id: userId,
          title: item.title,
          raw_text: item.transcript,
        })
        .select("id")
        .single();

      if (transcriptError) {
        throw transcriptError;
      }

      savedTranscriptIds.push(savedTranscript.id);
      const embeddings = await createEmbeddings(segments.map((segment) => segment.content));

      const rows = segments.map((segment, index) => ({
        user_id: userId,
        transcript_id: savedTranscript.id,
        label: segment.label,
        speaker: segment.speaker,
        content: segment.content,
        embedding: embeddings[index],
        metadata: {
          ...segment.metadata,
          transcript_title: item.title,
        },
      }));

      const { data, error: segmentError } = await supabase
        .from("transcript_segments")
        .insert(rows)
        .select("id,label,speaker,content,metadata,created_at");

      if (segmentError) {
        throw segmentError;
      }

      savedSegments.push(...(data || []));
    }

    if (savedSegments.length === 0) {
      return NextResponse.json({ error: "No transcript segments generated" }, { status: 400 });
    }

    const profile = await rebuildTherapistProfile(userId);

    return NextResponse.json({
      transcriptIds: savedTranscriptIds,
      segments: savedSegments,
      count: savedSegments.length,
      profile,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown upload error" },
      { status: 500 },
    );
  }
}

function normalizeUploadItems(body: UploadRequest) {
  const batchItems =
    body.transcripts
      ?.map((item, index) => ({
        title: item.title?.trim() || `逐字稿 ${index + 1}`,
        transcript: item.transcript?.trim() || "",
      }))
      .filter((item) => item.transcript.length > 0) || [];

  if (batchItems.length > 0) {
    return batchItems;
  }

  const transcript = body.transcript?.trim();

  if (!transcript) {
    return [];
  }

  return [
    {
      title: body.title?.trim() || "未命名逐字稿",
      transcript,
    },
  ];
}
