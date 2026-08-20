// Build guides use /en/<slug>/. A roster slug may return 404 if upstream does not list
// that character. Upstream stores every Traveler kit as "traveler", but guide routes
// prefix the element, such as "anemo-traveler".
const BUILD_BASE = "https://genshin-impact-helper-team.github.io/genshin-builds/en/";

export function buildPageUrl(c) {
  if (!c.slug) return null;
  const slug = c.slug === "traveler" ? `${c.element.toLowerCase()}-traveler` : c.slug;
  return `${BUILD_BASE}${slug}/`;
}
