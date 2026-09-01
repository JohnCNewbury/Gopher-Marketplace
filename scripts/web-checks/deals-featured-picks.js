#!/usr/bin/env node
/*
 * Does the Deals home crown the merchant who actually PAID for it?
 *
 * WHY THIS EXISTS. Until 2026-09-01 the hero and every category holder came
 * from a hand-edited map in each page:
 *
 *     const DEALS_HOME = { featured: 'r-myway', winners: { ... } };
 *
 * Every one of those ids is a SHOWROOM merchant, and both pages are live on
 * three hosts. So a real customer in the Triangle saw a demo business wearing
 * a crowned "FEATURED DEAL" badge above real merchants' real live deals, and
 * each category card credited a demo name as its holder. Meanwhile a merchant
 * who won the auction and was CHARGED appeared nowhere: `featured_month` had
 * zero consumers on the front end.
 *
 * This check runs the real dealsHomePicks() out of each page against fixture
 * data. It is not a source grep — the picks are computed, then asserted.
 *
 * ⚠ TWO TRAPS IT PINS, both of which silently misplace the crown by a month:
 *   · `featured_month` LABELS THE AUCTION, NOT THE RUN. §8.1 / Ruling 7:
 *     "Winners own that placement on app and web for the entire FOLLOWING
 *     month", and the Deals 101 agrees — bidding closes on the 20th, winners go
 *     live on the 1st of the next month. So the placement live right now
 *     carries LAST month's label. Matching the current calendar month would
 *     crown people during the month they are still bidding in, and show nothing
 *     during the month they paid for.
 *   · THE MONTH IS UTC, because the server computes placement months in UTC — a
 *     placement month is a billing period. A local-time client disagrees with
 *     settlement for part of every day around the boundary.
 *
 * Run: node scripts/web-checks/deals-featured-picks.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PAGES = ['Final/gopher-request.html', 'Final/gopher-connect.html'];

let pass = 0;
let fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log(`  ok    ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? `\n          ${detail}` : ''}`); }
};

/* Pull the real function text out of the page and build it with a controlled
   DEALS_DATA in scope. Building it here rather than copying the logic is the
   whole point: a copy would pass while the page was broken. */
function extractPicks(src, file) {
  const start = src.indexOf('function dealsHomePicks(){');
  if (start < 0) throw new Error(`${file}: dealsHomePicks() not found`);
  const end = src.indexOf('\n  }\n', start);
  if (end < 0) throw new Error(`${file}: could not find the end of dealsHomePicks()`);
  const body = src.slice(start, end + 4);
  // eslint-disable-next-line no-new-func
  return new Function('DEALS_DATA', `${body}\nreturn dealsHomePicks();`);
}

const utcMonth = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

const NOW = new Date();
/* The auction whose winners are LIVE now closed last month. */
const RUNNING = utcMonth(new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - 1, 1)));
/* The auction merchants are bidding in RIGHT NOW — its winners are NOT live yet. */
const BIDDING_NOW = utcMonth(NOW);
const OTHER_MONTH = '2000-01';

const deal = (id, month, slot) => ({ id, live: true, featuredMonth: month, featuredSlot: slot });

for (const rel of PAGES) {
  const file = path.join(ROOT, rel);
  const src = fs.readFileSync(file, 'utf8');
  console.log(`\n${rel}`);

  const picks = extractPicks(src, rel);

  /* 1 . an unsold month crowns NOBODY */
  {
    const data = [
      { key: 'restaurants', merchants: [{ id: 'r-showroom' }, deal('live-1', OTHER_MONTH, 'hero')] },
      { key: 'retail', merchants: [{ id: 'c-showroom' }] },
    ];
    const r = picks(data);
    check('1a  no winner this month => no hero', r.featured === null, JSON.stringify(r.featured));
    check('1b  ...and no category holder', Object.keys(r.winners).length === 0, JSON.stringify(r.winners));
    check('1c  a showroom merchant is never promoted into the crown',
      r.featured !== 'r-showroom', JSON.stringify(r.featured));
  }

  /* 2 . a settled month puts the paid winners in the right slots */
  {
    const data = [
      { key: 'restaurants', merchants: [deal('live-hero', RUNNING, 'hero'), deal('live-rest', RUNNING, 'category')] },
      { key: 'retail', merchants: [deal('live-retail', RUNNING, 'category')] },
    ];
    const r = picks(data);
    check('2a  the hero is the deal stamped "hero"', r.featured === 'live-hero', JSON.stringify(r.featured));
    check('2b  the category holder is the deal stamped "category"',
      r.winners.retail === 'live-retail', JSON.stringify(r.winners));
    check("2c  the hero's OWN category is held by the runner-up, not the hero",
      r.winners.restaurants === 'live-rest', JSON.stringify(r.winners.restaurants));
  }

  /* 3 . last month's winner retires itself, with nothing to clear */
  {
    const data = [{ key: 'restaurants', merchants: [deal('live-old', OTHER_MONTH, 'hero'), deal('live-oldc', OTHER_MONTH, 'category')] }];
    const r = picks(data);
    check('3a  a stale month is ignored for the hero', r.featured === null, JSON.stringify(r.featured));
    check('3b  ...and for category cards', Object.keys(r.winners).length === 0, JSON.stringify(r.winners));
  }

  /* 4 . the month is computed in UTC, matching the server */
  {
    const fnSrc = src.slice(src.indexOf('function dealsHomePicks(){'), src.indexOf('function dealsHomePicks(){') + 900);
    check('4a  the month is built from getUTC*, never local getMonth()',
      /getUTCFullYear\(\)/.test(fnSrc) && !/const month = now\.getFullYear/.test(fnSrc),
      'a local-time month disagrees with settlement around the boundary');
    check('4b  it steps BACK a month (the run is the month after the auction)',
      /getUTCMonth\(\) - 1/.test(fnSrc),
      'matching the current month crowns bidders and blanks the month they paid for');

    /* The real off-by-one, driven rather than grepped. */
    const bidding = picks([{ key: 'retail', merchants: [deal('live-x', BIDDING_NOW, 'hero')] }]);
    check('4c  a winner of the auction still OPEN is not live yet',
      bidding.featured === null, JSON.stringify(bidding.featured));
    const running = picks([{ key: 'retail', merchants: [deal('live-y', RUNNING, 'hero')] }]);
    check('4d  ...while last month\'s winner IS live now',
      running.featured === 'live-y', JSON.stringify(running.featured));
  }

  /* 5 . the badge is conditional on an actual holder.
     A source assertion, deliberately: the badge lives inside a large HTML
     string builder, and asserting the rendered markup would mean standing up
     the whole page. Narrow, but it fails if the badge is ever made
     unconditional again. */
  {
    check('5a  the FEATURED badge renders only when a holder exists',
      /\(wm \? '<span class="dh-cat-badge">FEATURED<\/span>' : ''\)/.test(src),
      'an unconditional badge credits a merchant nobody paid for');
    check('5b  no hand-edited picks remain',
      !/DEALS_HOME\.(featured|winners)/.test(src),
      'the hardcoded showroom map is back');
  }
}

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
