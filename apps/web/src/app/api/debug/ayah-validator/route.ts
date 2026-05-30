export const dynamic = "force-dynamic";
import { getAyahDetail } from "@quran-app/core";
import { NextResponse } from "next/server";
import { resolveWordAnalysisSource } from "../../../../experimentalSources";
import { buildValidatorCopyPayload } from "../../../surah/[surahId]/ayah/[ayahNumber]/validatorDebug";

function parsePositiveInteger(value: string | null): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        issue_type: "DEBUG_ENDPOINT_DISABLED",
        details: "This endpoint is only available in development."
      },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const surahId = parsePositiveInteger(url.searchParams.get("surahId"));
  const ayahNumber = parsePositiveInteger(url.searchParams.get("ayahNumber"));

  if (surahId === null || ayahNumber === null) {
    return NextResponse.json(
      {
        issue_type: "INVALID_QUERY",
        details: "surahId and ayahNumber must be positive integers."
      },
      { status: 400 }
    );
  }

  try {
    const wordAnalysisSource = resolveWordAnalysisSource(
      url.searchParams.get("wa_source") ?? undefined,
      url.searchParams.get("debug") ?? undefined
    );
    const detail = await getAyahDetail(surahId, ayahNumber, { wordAnalysisSource });
    const copyForValidator = buildValidatorCopyPayload(detail);

    return NextResponse.json({
      ...copyForValidator,
      diagnostics: {
        wordAnalysisSource,
        detailStatus: detail.status,
        ayahStatus: detail.ayah.status,
        wordCount: detail.wordAnalyses.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        issue_type: "AYAH_DEBUG_BUILD_FAILED",
        surah_id: surahId,
        ayah_number: ayahNumber,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
