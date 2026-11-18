export function vakitUnavailableResponse(): Response {
  return Response.json(
    { error: "upstream_unavailable", fallback: "aladhan" },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}
