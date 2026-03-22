interface NitterIngestionItem {
  text: string;
  url: string | null;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchNitterTimeline(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "WaraqhurBot/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Nitter source: ${response.status}`);
  }

  const html = await response.text();

  const matches = Array.from(
    html.matchAll(/<div class="tweet-content media-body"[^>]*>([\s\S]*?)<\/div>/g)
  );

  const items: NitterIngestionItem[] = matches
    .map((match) => ({
      text: stripHtml(match[1] ?? ""),
      url: null,
    }))
    .filter((item) => item.text.length > 0)
    .slice(0, 10);

  return {
    items,
    fetchedAt: new Date().toISOString(),
  };
}
