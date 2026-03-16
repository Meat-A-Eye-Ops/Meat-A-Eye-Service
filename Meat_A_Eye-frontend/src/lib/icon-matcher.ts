/**
 * 아이콘 매칭 로직 (단순 랜덤 버전)
 * 카테고리(beef/pork)만 판별 후 해당 폴더에서 랜덤 아이콘 반환
 */

interface IconEntry {
  name: string;
  keywords: string[];
  url: string;
}

interface IconIndex {
  beef: IconEntry[];
  pork: IconEntry[];
}

// 캐시 — 한 번 fetch 후 메모리에 보관
let cachedIndex: IconIndex | null = null;

async function loadIndex(): Promise<IconIndex> {
  if (cachedIndex) return cachedIndex;
  try {
    const res = await fetch("/icons/icons_index.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cachedIndex = (await res.json()) as IconIndex;
    return cachedIndex;
  } catch (e) {
    console.warn("[icon-matcher] index 로드 실패:", e);
    return { beef: [], pork: [] };
  }
}

/**
 * 카테고리(beef|pork)에서 랜덤 아이콘 URL을 반환합니다.
 */
export async function getRandomIcon(
  category: "beef" | "pork" = "beef",
): Promise<string> {
  const index = await loadIndex();
  const entries = index[category] ?? [];

  if (entries.length === 0) {
    const fallback = index[category === "beef" ? "pork" : "beef"] ?? [];
    if (fallback.length === 0) return "";
    return fallback[Math.floor(Math.random() * fallback.length)].url;
  }

  return entries[Math.floor(Math.random() * entries.length)].url;
}

/**
 * 레시피 제목(한글)에서 카테고리를 추정합니다.
 */
export function guessCategory(title: string): "beef" | "pork" {
  const porkKeywords = [
    "돼지",
    "삼겹",
    "목살",
    "항정살",
    "돈까스",
    "족발",
    "보쌈",
    "pork",
  ];
  const lower = title.toLowerCase();
  for (const kw of porkKeywords) {
    if (lower.includes(kw)) return "pork";
  }
  return "beef";
}
