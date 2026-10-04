/**
 * Harness configuration. Everything page-specific lives here so parity.mjs and
 * the flow specs stay generic.
 */

export default {
  // Where the two sites are. Override with --golden / --candidate or GOLDEN_URL / CANDIDATE_URL.
  golden: process.env.GOLDEN_URL ?? 'http://127.0.0.1:8140',
  candidate: process.env.CANDIDATE_URL ?? 'http://127.0.0.1:8000',

  // The inventory summary is the page list of record (kind === 'page', family !== E:stub).
  inventorySummary: '../docs/port-notes/inventory.summary.json',

  // How a golden path maps to a candidate path. Identity today; when Laravel
  // serves clean URLs, switch to `cleanUrls` (the .html → 301 redirect is
  // checked separately in flows/redirects.spec.mjs).
  urlMap: {
    identity: (p) => p,
    cleanUrls: (p) => (p === '/index.html' ? '/' : p.replace(/\.html$/, '')),
  },
  urlMapMode: process.env.URL_MAP ?? 'identity',

  viewports: [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 820, height: 1180 },
    { name: 'desktop', width: 1440, height: 900 },
  ],

  // Pixel diff threshold per viewport (fraction of pixels). Start loose; tighten
  // as the port matures. The golden-vs-golden run reports the noise floor.
  pixelThreshold: Number(process.env.PIXEL_THRESHOLD ?? 0.01),

  // Hosts that are never fetched by the harness (stubbed in-browser, see lib/stubs.mjs).
  stubbedHosts: ['maps.googleapis.com', 'maps.gstatic.com', 'api.gophergo.io', 'unpkg.com', 'script.google.com'],

  // Link check: same-origin only. External hosts are recorded, not resolved.
  linkCheck: { sameOriginOnly: true, ignore: [/^mailto:/, /^tel:/, /^javascript:/, /^#/, /^sms:/] },

  // Text normalization: collapse whitespace; strip strings that legitimately differ
  // between golden and candidate (build hashes, dates rendered client-side).
  textIgnore: [/© ?\d{4}/g],

  // Sections of <head> compared verbatim.
  seoKeys: ['title', 'description', 'canonical', 'og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'twitter:card', 'twitter:title', 'twitter:description', 'robots'],
};
