// Build the default source slug by lowercasing, removing apostrophes and periods, and
// replacing whitespace with hyphens. portraits.js and roster.js provide source-specific
// overrides.
export const slugify = (name) => name.toLowerCase().replace(/['.]/g, "").replace(/\s+/g, "-");
