const DISCOVERY_PAGE_SIZE = 25;
const DISCOVERY_LIMIT = 120;
const RECENT_LIMIT = 250;

function steamText(value, limit) {
  if (typeof value !== "string" || !value) return "";
  const plain = value.slice(0, 12_000).replace(/<[^>]*>/g, " ").replace(/</g, "&lt;");
  const decoded = plain.includes("&")
    ? new DOMParser().parseFromString("<body>" + plain, "text/html").body.textContent : plain;
  return decoded.replace(/\s+/g, " ").trim().slice(0, limit);
}

function discoveryGame(value) {
  if (!Number.isSafeInteger(value?.id) || value.id <= 0 || typeof value.name !== "string") return null;
  const name = value.name.trim().slice(0, 200);
  return name ? { id: value.id, name } : null;
}

function discoveryPage(response) {
  const data = JSON.parse(response.body);
  const total = Number(data.total_count);
  if (!data.success || typeof data.results_html !== "string" || !Number.isSafeInteger(total) || total < 0) {
    throw new Error("Steam catalog unavailable");
  }
  const result = new Map();
  for (const [, attributes, row] of data.results_html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const id = Number(/\bdata-ds-appid="([1-9]\d*)"/i.exec(attributes)?.[1]);
    const title = /<span\b[^>]*\bclass="title"[^>]*>([\s\S]*?)<\/span>/i.exec(row)?.[1];
    const entry = discoveryGame({ id, name: steamText(title, 200) });
    if (entry) result.set(id, entry);
  }
  return { total, games: [...result.values()] };
}

function readDiscovery(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    const games = Array.isArray(saved?.games) ? saved.games.slice(0, DISCOVERY_LIMIT) : [];
    const recent = Array.isArray(saved?.recent) ? saved.recent.slice(-RECENT_LIMIT) : [];
    return {
      games: games.map(discoveryGame).filter(Boolean),
      recent: [...new Set(recent.filter((id) => Number.isSafeInteger(id) && id > 0))],
      total: Number.isSafeInteger(saved?.total) && saved.total > 0 ? saved.total : 0,
      nextAt: Number.isFinite(saved?.nextAt) ? Math.min(saved.nextAt, Date.now() + 600_000) : 0,
    };
  } catch {
    return { games: [], recent: [], total: 0, nextAt: 0 };
  }
}
