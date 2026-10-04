/**
 * The page list of record comes from bin/inventory.mjs's summary, so the
 * harness and the inventory can never disagree about what a "page" is.
 */

import fs from 'node:fs';

export function loadPages(summaryPath) {
  if (!fs.existsSync(summaryPath)) {
    throw new Error(`inventory summary not found at ${summaryPath} — run: node bin/inventory.mjs Final --out bin/out/inventory.json && cp bin/out/inventory.summary.json docs/port-notes/`);
  }
  const inv = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  return inv.files
    .filter((f) => f.kind === 'page' && !f.family.startsWith('E:'))
    .filter((f) => !/^(1-engine-css-block|2-engine-js-block|4-pill-markup|__maps-check|gopher-header|gopher-footer)\.html$/.test(f.file))
    .map((f) => ({ file: f.file, family: f.family, seo: f.seo, endpoints: f.endpoints, hasChangelog: !!f.changelog }))
    .sort((a, b) => a.family.localeCompare(b.family) || a.file.localeCompare(b.file));
}
