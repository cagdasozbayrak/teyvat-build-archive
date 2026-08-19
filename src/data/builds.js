// Link out to a character's guide on the community build site. Characters have a static
// page at /en/<slug>/, though a row upstream doesn't list, dropped there or added here
// early, keeps its slug and links to a 404. The Traveler is the other exception. Upstream
// stores it as
// "traveler" under every element directory but routes each kit to its own page, so the
// slug needs the element prefixed back on ("anemo-traveler").
const BUILD_BASE = "https://genshin-impact-helper-team.github.io/genshin-builds/en/";

// URL of the character's build page. Returns null for user-created characters, which
// have no slug and so no page.
export function buildPageUrl(c) {
  if (!c.slug) return null;
  const slug = c.slug === "traveler" ? `${c.element.toLowerCase()}-traveler` : c.slug;
  return `${BUILD_BASE}${slug}/`;
}
