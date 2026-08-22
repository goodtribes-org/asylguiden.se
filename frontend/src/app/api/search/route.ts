import { NextResponse } from "next/server";
import { searchArticles } from "@/lib/meilisearch";

// Server-side search proxy.
//
// The search box used to talk to Meilisearch straight from the browser, which
// could never have worked: Meilisearch is reachable only on a cluster-internal
// address, and its key was read from a NEXT_PUBLIC_* variable that is frozen
// into the bundle at build time. Routing through the server fixes both, and
// keeps the Meilisearch key on the server where it belongs.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const query = params.get("q") ?? "";
  const locale = params.get("locale");

  if (!locale) {
    return NextResponse.json({ error: "locale is required" }, { status: 400 });
  }

  // Mirrors the hook's own guard so a stray short query cannot turn into a
  // full-index scan from an unthrottled caller.
  if (query.trim().length < 2) {
    return NextResponse.json({
      hits: [],
      query,
      processingTimeMs: 0,
      estimatedTotalHits: 0,
      totalPages: 0,
      page: 1,
    });
  }

  const parsePositiveInt = (value: string | null, fallback: number) => {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  try {
    const results = await searchArticles(query, {
      locale,
      category: params.get("category") ?? undefined,
      page: parsePositiveInt(params.get("page"), 1),
      // Capped so a hand-crafted request cannot ask Meilisearch for the world.
      hitsPerPage: Math.min(parsePositiveInt(params.get("hitsPerPage"), 5), 50),
    });

    return NextResponse.json(results);
  } catch (error) {
    // Meilisearch being down or an index missing must not take the page with
    // it — the search box degrades to "no results" rather than throwing.
    console.error("search failed", error);
    return NextResponse.json({ error: "search unavailable" }, { status: 502 });
  }
}
