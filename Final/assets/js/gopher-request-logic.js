/* gopher-request-logic.js — shared, platform-agnostic request DECISION LOGIC.
   Gopher Request (web), Gopher Connect, and the Gopher Request App prototype are
   one product on different platforms: the decisions must be identical everywhere,
   only the rendering differs. This module is the single source of truth for the
   pure logic; each surface keeps its own UI wiring (modals, toasts) and delegates
   the decisions here. The parity harness
   (docs/handoff/request-app-parity/run_parity_harness.py) asserts no surface
   re-implements this locally.

   Dependencies are resolved LAZILY at call time, because surfaces provide the
   category classifier differently:
     - Final/gopher-request.html inlines the full iQ engine (global scoreCategories)
     - gopher-connect.html + the app prototype load assets/js/gopher-category-classifier.js
       (window.GopherCategoryClassifier)
   Either satisfies the module. If neither is present, detection no-ops (fail-safe). */
(function(){
  'use strict';

  /* Tuned against the category-mismatch test matrix (run_category_tests.py).
     Do NOT lower without re-running it: the double condition (strong top AND weak
     selected AND a margin) is what stops genuinely dual-category jobs — "moving
     labor", "haul away branches", "move a couch to the dump" — from nagging. */
  var MIN_CONTENT_WORDS = 1;   // skip empty/all-filler descriptions ("I need an electrician"
                               // has exactly ONE content word and must still be judged)
  var STRONG_BAR        = 8;   // top category must be a confident match (= CAT_HIGH)
  var MARGIN            = 5;   // top must beat the selected category's score by this
  var UNAMBIG_RATIO     = 2.5; // modest-top path: top must dwarf the runner-up by this

  /* The submission UIs use short category keys; the classifier uses full slugs. */
  var UI_TO_SLUG = { junk:'junk_removal', ride:'ride_sharing', yard:'yard_work_outdoor_projects',
                     home:'home_services', labor:'hourly_day_labor',
                     delivery:'delivery', moving:'moving', other:'other' };
  var SLUG_TO_UI = {};
  Object.keys(UI_TO_SLUG).forEach(function(k){ SLUG_TO_UI[UI_TO_SLUG[k]] = k; });

  function resolveClassifier(){
    if(window.GopherCategoryClassifier) return window.GopherCategoryClassifier;
    /* Page with the inlined iQ engine: top-level function/const declarations are
       global lexical bindings, visible across scripts. */
    try {
      if(typeof scoreCategories === 'function' && typeof catWords === 'function'){
        return { scoreCategories: scoreCategories, catWords: catWords,
                 CAT_THRESH: (typeof CAT_THRESH !== 'undefined' ? CAT_THRESH : 4) };
      }
    } catch(e){}
    return null;
  }

  /* Pure. Returns null (no prompt) or
     { suggestedSlug, suggestedLabel, selectedScore, suggestedScore }. */
  function detectCategoryMismatch(selectedSlug, description){
    var CLS = resolveClassifier();
    if(!CLS) return null;                                   // no classifier — fail safe
    var contentWords = CLS.catWords(description || '');
    if(contentWords.length < MIN_CONTENT_WORDS) return null;
    /* One content word ("furniture", "boxes") is never STRONG evidence — such
       queries may only fire via the unambiguous no-rival path below, however
       high the single word scores across dual-use categories. */
    var single = contentWords.length === 1;
    var scored = CLS.scoreCategories(description || '');
    if(!scored.length) return null;
    var top = scored[0], selectedScore = 0;
    for(var i = 0; i < scored.length; i++){
      if(scored[i].slug === selectedSlug){ selectedScore = scored[i].score; break; }
    }
    var strongTop = !single && top.score >= STRONG_BAR && top.slug !== 'other';  // never suggest TO the catch-all
    /* Escape-the-catch-all: suggesting FROM Other TO a concrete category is helpful. */
    if(selectedSlug === 'other' && strongTop)
      return { suggestedSlug: top.slug, suggestedLabel: top.label,
               selectedScore: selectedScore, suggestedScore: top.score };
    /* Confident disagreement: strong top AND weak selected AND a clear margin. */
    if(strongTop && top.slug !== selectedSlug
       && (top.score - selectedScore) >= MARGIN && selectedScore < CLS.CAT_THRESH)
      return { suggestedSlug: top.slug, suggestedLabel: top.label,
               selectedScore: selectedScore, suggestedScore: top.score };
    /* Modest-but-UNAMBIGUOUS disagreement: a single strong signal word like
       "electrician" scores only ~4 (one hint) yet has no rival at all — the
       engine's own confidence rule treats an unrivaled modest match as high
       confidence. Fire when the selected category has essentially NO textual
       support and the top dwarfs every rival. This is what catches
       "I need an electrician" filed under Junk Removal. */
    var second = 0;
    for(var j = 0; j < scored.length; j++){
      if(scored[j].slug !== top.slug){ second = scored[j].score; break; }
    }
    if(top.slug !== selectedSlug && top.slug !== 'other'
       && top.score >= CLS.CAT_THRESH && selectedScore < 1
       && top.score >= UNAMBIG_RATIO * second)
      return { suggestedSlug: top.slug, suggestedLabel: top.label,
               selectedScore: selectedScore, suggestedScore: top.score };
    return null;
  }

  /* Telemetry for the category check. No analytics backend in the prototype: emits
     a window event + console debug with the exact payload; production points
     GopherTelemetry.track at its analytics util. */
  function emitCategoryCheck(action, r, requestId){
    var payload = { requestId: requestId || null,
      selectedSlug: r.selectedSlug, suggestedSlug: r.suggestedSlug,
      selectedScore: r.selectedScore, suggestedScore: r.suggestedScore, action: action };
    try { window.dispatchEvent(new CustomEvent('gopher:category_check', { detail: payload })); } catch(e){}
    try { if(window.GopherTelemetry && window.GopherTelemetry.track) window.GopherTelemetry.track('category_check', payload); } catch(e){}
    try { console.debug('[category_check]', payload); } catch(e){}
    return payload;
  }

  /* ── Age-restricted keyword detection ─────────────────────────────────────
     Scans free text against the GENERATED keyword brain (gopher-age-keywords.js,
     built from the canonical xlsx — regenerate, never hand-edit) plus the shared
     hand-maintained supplement (gopher-age-supplement.js: THC/lottery vocabulary,
     intent phrases, brands, misspellings). Whole-word/phrase match, case-
     insensitive, whitespace-flexible. Returns the matched term or null. */
  /* SMART PUNCTUATION HAS TO BE FOLDED FIRST, or 41 of the 1,658 keywords are
     dead on a phone. iOS and Android autocorrect a typed ' into a curly ’
     (U+2019), and the brain stores straight ASCII — so "I need some Tito's",
     typed on an iPhone, arrives as "Tito’s" and matches NEITHER "tito's"
     (different character) NOR "titos" (the ’ sits between the o and the s).
     Owner reproduced this live on 2026-08-05: the age-restricted toggle simply
     never fired. Every possessive brand was affected — Jack Daniel's, Maker's
     Mark, Mike's Hard, Bell's, Blanton's, Gordon's, Angel's Envy.

     Folded on BOTH sides, and the map is strictly 1 char -> 1 char so string
     offsets are preserved; that lets us match on the folded copy but slice the
     RETURN value out of the untouched original, so the operator still sees what
     the customer actually typed rather than a normalised rewrite.

     Dashes are folded for the same reason (keywords like "e-cig",
     "tobacco-free nicotine pouch"); an en dash never reaches them otherwise. */
  var SMART_PUNCT = /[‘’ʼʹ′´`]/g;   // -> '
  var SMART_DASH  = /[‐‑‒–—−]/g;         // -> -
  function foldPunct(s){
    return String(s).replace(SMART_PUNCT, "'").replace(SMART_DASH, '-');
  }

  function findAgeRestrictedKeyword(text){
    var orig = String(text || '');
    if(!orig.trim()) return null;
    var hay = foldPunct(orig);
    var lists = [ (window.GopherAgeKeywords || []), (window.GopherAgeSupplement || []) ];
    for(var li = 0; li < lists.length; li++){
      var list = lists[li];
      for(var i = 0; i < list.length; i++){
        var esc = foldPunct(list[i]).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
        var re = new RegExp('(?:^|[^A-Za-z0-9])(' + esc + ')(?:[^A-Za-z0-9]|$)','i');
        var m = hay.match(re);
        /* Offsets survive the fold, so report the customer's own characters. */
        if(m) return orig.substr(m.index + m[0].indexOf(m[1]), m[1].length);
      }
    }
    return null;
  }

  /* ── Suggested-offer model (delivery, cost-of-items based) ────────────────
     Data-calibrated against 9,147 real delivery orders (Suggested Pricing Model
     — Variance Analysis). Each row: item cost -> [NC suggested, US suggested].
     REGION POLICY (owner directive 2026-07-09): Gopher operates in NC — always
     price with the NC column. The US column and regionStateFromAddress are
     retained for future non-NC expansion. Above $200 the curve extrapolates on
     the table's own terminal slopes (NC +$0.40/$, US +$0.16/$ — the 195->200
     segment continued); this superseded an older flat-44.5 variant that
     contradicted the curve (drift caught by the parity harness 2026-07-14). */
  var OFFER_TABLE = {
    5:[10,10],10:[10,12.67],15:[10.5,15.33],20:[11,18],25:[11,19],30:[11.5,20],
    35:[12,22.5],40:[12.5,25],45:[13,27.5],50:[13.5,30],55:[14,30],60:[15,30],
    65:[15.5,30.67],70:[16,31.33],75:[16.5,32],80:[17.5,32.6],85:[18,33.2],
    90:[18.5,33.8],95:[19.5,34.4],100:[20.5,35],105:[21,35.7],110:[22,36.4],
    115:[23,37.1],120:[23.5,37.8],125:[24.5,38.5],130:[25.5,39.2],135:[26.5,39.9],
    140:[27.5,40.6],145:[29,41.3],150:[30,42],155:[31,42.8],160:[32.5,43.6],
    165:[33.5,44.4],170:[35,45.2],175:[36.5,46],180:[38,46.8],185:[39.5,47.6],
    190:[41,48.4],195:[42.5,49.2],200:[44.5,50]
  };
  var OFFER_PTS = Object.keys(OFFER_TABLE).map(Number).sort(function(a,b){return a-b;});
  function suggestedOffer(itemCost, isNC){
    var idx = isNC ? 0 : 1, s;
    if(itemCost <= OFFER_PTS[0]) s = OFFER_TABLE[OFFER_PTS[0]][idx];
    else if(itemCost >= OFFER_PTS[OFFER_PTS.length-1]) s = isNC ? 44.5 + (itemCost-200)*0.40 : 50 + (itemCost-200)*0.16;
    else {
      var lo = OFFER_PTS[0], hi = OFFER_PTS[OFFER_PTS.length-1];
      for(var i = 0; i < OFFER_PTS.length-1; i++){
        if(itemCost >= OFFER_PTS[i] && itemCost <= OFFER_PTS[i+1]){ lo = OFFER_PTS[i]; hi = OFFER_PTS[i+1]; break; }
      }
      var f = (itemCost-lo)/(hi-lo);
      s = OFFER_TABLE[lo][idx] + f*(OFFER_TABLE[hi][idx]-OFFER_TABLE[lo][idx]);
    }
    s = Math.round(s);
    return { low: Math.round(s*0.75), suggested: s, generous: Math.round(s*1.25) };
  }
  function regionIsNC(){
    /* Owner directive 2026-07-09: NC pricing platform-wide. Restore address-based
       detection (regionStateFromAddress over dropoff, fallback pickup) when
       non-NC expansion happens. */
    return true;
  }

  /* ── Suggested-offer model (Junk Removal, VOLUME-tier based) ──────────────────
     Junk has no clean "item cost" axis like Delivery, so it prices on how much
     stuff there is. Three tiers matching the flow's own vocabulary; the user can
     correct the iQ-detected tier with a button, and the offer slider re-ranges to
     the chosen tier (owner spec 2026-07-19).

     BASELINE anchors: the fair values ($40 / $60 / $100) are OWNER-SET (John,
     2026-07-19), informed by — and sitting on the upper half of — the real pay
     envelope calibrated OFFLINE from 715 Junk Removal orders in
     Dashboard/data/master/Orders.csv, keyed on GOPHER OFFER (worker pay — NOT the
     GOPHER EARNINGS column, which is platform net take). The whole-corpus envelope
     is p20 $23 / p50 $40 / p80 $100; the owner nudged single/half above their pure
     data anchors so the tiers spread cleanly and are MONOTONIC. We anchor to the
     distribution, NOT to volume-language back-fit from the free text — 467/715
     historical orders carry no parseable volume phrase, so a text back-fit came out
     noisy/non-monotonic. The clean per-tier curve is meant to be LEARNED FORWARD
     from completed requests, where the flow captures the tier as a structured field.

     THE LEARNING PROCESS (begins now): recordJunkOffer(tier, pay) accumulates the
     accepted worker-pay of completed Junk jobs per tier in localStorage; suggestedJunkOffer()
     blends the learned median into the baseline, weighted by how many real samples
     we have (so early on the baseline dominates and it sharpens as jobs complete —
     one outlier can't swing it). ingestJunkCompletions() seeds that store from a
     surface's existing completed-request history, idempotent by order id.
     BACKEND SEAM (production): swap the localStorage store for a query over completed
     orders grouped by tier behind the same suggestedJunkOffer()/recordJunkOffer() seam.
     Recalibration recipe + tier keyword list: docs/handoff/junk-suggested-pricing.md */
  var JUNK_TIERS = {
    // tier -> baseline suggested (the anchor). low/generous are derived as ±25%
    // of the (possibly learned) suggested in suggestedJunkOffer() — one rule, same
    // low=0.75x gate delivery uses — so they're not duplicated here.
    single: { label: 'Single item',            suggested: 40,
              hint: 'one couch, mattress, appliance, or a small pile' },
    half:   { label: 'Half-truck load',         suggested: 60,
              hint: 'a garage/room cleanout or several large pieces' },
    full:   { label: 'Full truck/trailer load', suggested: 100,
              hint: 'a whole-room-plus load, or a full pickup/trailer' }
  };
  var JUNK_TIER_ORDER = ['single','half','full'];

  /* Keyword detector — which tier the requester's words imply. Priority full >
     half > single; falls back to 'half' (the median tier) when nothing matches,
     so the slider still opens somewhere sensible and the user can re-pick. */
  function detectJunkVolumeTier(text){
    var t = ' ' + String(text || '').toLowerCase() + ' ';
    if(/\b(full (truck|trailer|load|pickup)|truck ?load|trailer ?load|whole (house|garage|basement|room)|entire (house|garage|basement|apartment)|10\+? ?bags|20 ?bags|dumpster|huge pile|massive|multiple rooms)\b/.test(t))
      return { tier: 'full', confidence: 'high' };
    if(/\b(half (a )?truck|half (a )?load|pickup truck|garage cleanout|basement cleanout|room cleanout|several (items|pieces|things|large)|multiple (items|large|big|pieces)|[5-9] ?bags|a (few|couple) (large|big) )\b/.test(t))
      return { tier: 'half', confidence: 'high' };
    if(/\b(single item|one (couch|item|chair|desk|table|mattress|appliance|piece)|an? (old )?(couch|chair|desk|mattress|dresser|tv|sofa|recliner|table|fridge|washer|dryer|appliance|bed frame)|old (couch|mattress|sofa|fridge|appliance|dresser)|just (a|one)|1 (item|couch|piece)|small pile|few bags|couple (of )?(bags|things|items)|1-?[0-4] ?bags)\b/.test(t))
      return { tier: 'single', confidence: 'high' };
    return { tier: 'half', confidence: 'low' };   // default to the median tier
  }

  /* ── Forward-learning store (localStorage; prototype layer) ───────────────────
     Shape: { <tier>: { sum, n, ids:{<id>:1} } }.  ids{} makes ingest/record
     idempotent so a reload or a re-seed never double-counts. */
  // v2 (2026-07-19): key bumped to DISCARD any store written while the tier detector
  // was reading a non-existent `state.describe` and therefore always returning the
  // median 'half' tier (fixed in 018280e). The shipped writer (ingestJunkCompletions)
  // always passed real completed-request text and tiered correctly, but stores written
  // during manual testing could be 'half'-skewed — and a skewed baseline is worse than
  // no history. Bumping the key orphans old data silently; learning restarts clean.
  var JUNK_LEARN_KEY = 'gopher_junk_pay_learn_v2';
  function junkLoadLearn(){
    try { var o = JSON.parse((window.localStorage||{}).getItem(JUNK_LEARN_KEY) || '{}'); return (o && typeof o==='object') ? o : {}; }
    catch(_){ return {}; }
  }
  function junkSaveLearn(o){ try { window.localStorage.setItem(JUNK_LEARN_KEY, JSON.stringify(o)); } catch(_){} }
  function junkTierBucket(store, tier){ if(!store[tier]) store[tier] = { sum:0, n:0, ids:{} }; return store[tier]; }

  /* Record one completed Junk job's accepted worker-pay against its tier. id (an
     order id) dedupes; pass a stable id for real completions, omit for anonymous
     nudges. Returns the running sample count for that tier. */
  function recordJunkOffer(tier, pay, id){
    if(JUNK_TIERS[tier] == null) return 0;
    var p = Number(pay); if(!(p > 0)) return 0;
    var store = junkLoadLearn(), b = junkTierBucket(store, tier);
    if(id != null){ if(b.ids[id]) return b.n; b.ids[id] = 1; }
    b.sum += p; b.n += 1; junkSaveLearn(store);
    return b.n;
  }
  /* Seed the learning store from a surface's existing completed-request history.
     Each item: { id, tier, pay }.  Idempotent (by id). This is how a real completed
     Junk job "teaches" the model without any backend. */
  function ingestJunkCompletions(list){
    (list || []).forEach(function(r){
      if(r && r.tier && r.pay != null) recordJunkOffer(r.tier, r.pay, r.id);
    });
  }

  /* Suggested offer for a Junk tier: baseline blended with the learned median,
     weighted by sample count (learnWeight = n/(n+K), K=8 — the baseline holds until
     ~8 real completions exist for the tier, then observed reality takes over). low/
     generous scale with the blended suggested to keep the ±25% band. */
  function suggestedJunkOffer(tier){
    var base = JUNK_TIERS[tier] || JUNK_TIERS.half;
    var suggested = base.suggested, learnedN = 0;
    var b = junkLoadLearn()[tier];
    if(b && b.n > 0){
      var learnedMean = b.sum / b.n, K = 8, w = b.n / (b.n + K);
      suggested = Math.round((base.suggested*(1-w) + learnedMean*w) / 5) * 5;   // round to $5
      learnedN = b.n;
    }
    var r5 = function(x){ return Math.round(x/5)*5; };
    return {
      tier: (JUNK_TIERS[tier] ? tier : 'half'),
      label: base.label, hint: base.hint,
      low: r5(suggested * 0.75), suggested: suggested, generous: r5(suggested * 1.25),
      learnedSamples: learnedN, baseline: base.suggested
    };
  }
  /* ── Moving suggested pricing (owner 2026-07-28, D1-D5) ─────────────────────
     Ladder is ITEMS/TRUCK, not home size: home size appears in 2% of real
     descriptions, named items in 47%, a vehicle in 38%. Anchors are evidenced
     against completed Moving orders keyed on GOPHER OFFER (worker pay — never
     GOPHER EARNINGS, which is platform take).
     ⚠️ CORPUS CORRECTED 2026-07-28 (discovery §4b): the original selector was
     TITLE startswith "moving", which swept in 38 legacy
     "Moving / Junk Removal - Junk Removal" rows (median $40 — those are JUNK
     jobs) and 22 "Store Pick Up & Delivery" rows. Clean corpus = 155, not 215.
       clean envelope: p25 $60 · median $100 · p90 $200
       clean tier medians: $80 / $100 / $200  (was $72 / $100 / $228)
     THE ANCHORS BELOW ARE UNCHANGED BY THAT CORRECTION — the clean data hits
     $100 and $200 exactly, and clean p25 lands exactly on $60. Still monotonic.

     ⛔ 'home' ($200) IS NOT SHIPPABLE AS CALIBRATED — DO NOT DEPLOY IT. Owner,
     2026-07-28: "There is no way a worker would take [a full house move] on for
     that low." He is right, and the evidence agrees: the ENTIRE platform history
     holds 6 whole-home Moving requests (4 completed). That is an anecdote, not a
     calibration — whole-home moves barely exist on Gopher today, so internal
     accepted-price data CANNOT price this tier at all. Revised anchors are
     coming from an external pricing-intelligence blueprint.
     ⚠️ AND A LIMIT ON ALL THREE: anchoring to accepted prices targets a ~50%
     MATCH RATE, not a fair price. Only 47-50% of Moving requests ever match, and
     the unmatched ones are the cheap ones — matched jobs clear 43-60% ABOVE
     unmatched. So 'few' $60 and 'truck' $100 are "what currently clears on
     Gopher", NOT "what the work is worth". They rest on 122 and 116 real
     requests and are defensible as the former; do not present them as the
     latter. Changing all of this is a one-table edit right here.
     Full calibration + audit trail: docs/handoff/moving-suggested-pricing-discovery.md
     §4b, and the workbook "Suggested Pricing Data - Moving.xlsx" (disk-only),
     whose "In Corpus" flag makes the exclusions auditable rather than invisible.

     ROUTE (D2/D4): the single- vs two-location route (state.noSpecificPickup)
     does NOT change the anchor — it gates which QUESTIONS are asked. Trip
     distance is context only and must never enter the arithmetic: same-ZIP
     moves run a median $115 vs $100 for different-ZIP, i.e. flat-to-inverted,
     so the ride-pricing model is the wrong template here despite being the
     obvious one.

     ⚠️ NO CREW-SIZE MODIFIER. Descriptions naming 2+ people show +88%, the
     largest effect measured — but the flow already collects workersNeeded as
     CREW SIZE and that field already drives pricing and totals (it is NOT the
     hire count; Request hires one lead worker who pays the crew). An iQ crew
     multiplier would pay for the same labour twice. Confirm where workersNeeded
     enters the total before revisiting. */
  /* ⚠️ D7 (owner, 2026-08-09) — REPRICED AND THE TOP TIER SPLIT. This SUPERSEDES
     D6 ("few holds at $60") entirely; D6 is dead, do not restore it.

     WHY THE NUMBERS MOVED, because the reasoning matters more than the values:
     the internal corpus was ACCEPTED prices only. Just 47-50% of Moving requests
     ever match, and unmatched jobs sit 43-60% BELOW matched ones — so "median
     accepted" was the price at which a coin flip clears, not a fair price.
     Compounding it, the lead worker is paid the offer and PAYS THE CREW, so the
     old $100 truck anchor was $25/labor-hour split two ways against a ~$63
     market. Gopher was sitting at roughly 40% OF MARKET.

     These anchors are benchmarked to EXTERNAL market data (U-Haul Moving Help
     NC average $254 for 2 movers/2hrs; HireAHelper Raleigh by home size), NOT to
     our own accepted prices. Sources: Dashboard/Gopher iQ/Suggested Pricing/
     Gopher_iQ_Moving_Price_Intelligence_Blueprint.docx + _Seed_Data.xlsx. */
  var MOVING_TIERS = {
    few:        { label: 'A few items',      suggested: 100,
                  hint: 'a couple of pieces \u2014 no truck needed' },
    truck:      { label: 'A truck-load',     suggested: 250,
                  hint: 'a U-Haul, trailer or pod \u2014 or enough to need one' },
    home_small: { label: '1\u20132 bedroom home', suggested: 325,
                  hint: 'studio, apartment, condo or small house' },
    home_large: { label: '3+ bedroom home',  suggested: 475,
                  hint: 'a larger house, or an office move' }
  };
  var MOVING_TIER_ORDER = ['few','truck','home_small','home_large'];

  /* Priority home_large > home_small > truck > few. Falls back to 'truck' so the slider
     still opens somewhere sensible and the requester can re-pick in one tap —
     that correction is what teaches the model.
     23% of real descriptions carry no scope signal (36 of the clean 155; the
     28% figure predates the corpus fix). ✅ RESOLVED 2026-07-28: the
     first draft flagged this default as an unconfirmed assumption because those
     descriptions looked like they sat at $75, nearer 'few' — but that $75 was
     purely the contaminated junk-side rows (§4b). On the CLEAN corpus they sit
     at $100 (n=36), exactly the median tier, so defaulting to 'truck' is
     empirically correct and not merely consistent-with-Junk. Do not "fix" it
     to 'few'.
     BARE-NOUN RULE (deliberate): bare "house" resolves LARGE and bare
     "apartment" resolves SMALL. Houses skew bigger in the market data (Raleigh
     2BR house $390 vs 2BR apt $331), and erring LOW is the exact failure this
     recalibration exists to fix. Do not "balance" these to the same tier. */
  function detectMovingTier(text){
    var t = ' ' + String(text || '').toLowerCase() + ' ';
    if(/\b([3-9]|1[0-9])\s*(bed|br|bedroom)s?\b|\b(three|four|five)[- ]bedroom\b|\b(whole|entire|full)\s+(house|home)\b|\bresidential relocation\b|\b(large|big)\s+(house|home|move)\b|\boffice move\b|\brelocate office\b|\bmove cubicles\b|\bmove (my|our) (house|home)\b|\bhouse to house\b/.test(t))
      return { tier: 'home_large', confidence: 'high' };
    if(/\b(studio|efficiency)\b|\b([12])\s*(bed|br|bedroom)s?\b|\b(one|two)[- ]bedroom\b|\b(whole|entire)\s+apartment\b|\bapartment to apartment\b|\bmove (my|our) (apartment|condo)\b|\bmove (in)?to (a |an )?(new )?(apartment|condo)\b|\bmove out of (my |the )?apartment\b|\bmoving across town\b/.test(t))
      return { tier: 'home_small', confidence: 'high' };
    if(/\b(u-?haul|uhaul|box truck|moving truck|trailer|pod|storage unit|storage|load(ing)?|unload(ing)?|need (a )?truck|truck required|will need (a )?truck|dorm|college move|student move|piano|appliances?|bedroom furniture|labor only)\b/.test(t))
      return { tier: 'truck', confidence: 'high' };
    if(/\b(couch|sofa|loveseat|mattress|dresser|desk|table|nightstand|chair|headboard|bookcase|tv|boxes?|rearrange|pack(ing)?|unpack|wrap furniture|small move|a few (items|things|pieces))\b/.test(t))
      return { tier: 'few', confidence: 'high' };
    return { tier: 'truck', confidence: 'low' };   // median-ish tier
  }

  /* Forward-learning store — same shape/seam as Junk, separate key so the two
     categories never cross-contaminate. */
  /* v2 (2026-08-09, D7): key bumped for TWO reasons. (1) The 'home' tier split
     into home_small/home_large, so any 'home' bucket is orphaned and would price
     a tier that no longer exists. (2) More importantly, every anchor moved (up
     to 2.5x) because the old ones tracked our own ACCEPTED prices — the ~40%-of-
     market data D7 exists to correct. Blending pre-D7 learned means against
     post-D7 baselines would drag the new anchors straight back down. Same
     reasoning as JUNK_LEARN_KEY v2: a skewed baseline is worse than no history. */
  var MOVING_LEARN_KEY = 'gopher_moving_pay_learn_v2';
  function movingLoadLearn(){
    try { var o = JSON.parse((window.localStorage||{}).getItem(MOVING_LEARN_KEY) || '{}'); return (o && typeof o==='object') ? o : {}; }
    catch(_){ return {}; }
  }
  function movingSaveLearn(o){ try { window.localStorage.setItem(MOVING_LEARN_KEY, JSON.stringify(o)); } catch(_){} }
  function movingTierBucket(store, tier){ if(!store[tier]) store[tier] = { sum:0, n:0, ids:{} }; return store[tier]; }

  function recordMovingOffer(tier, pay, id){
    if(MOVING_TIERS[tier] == null) return 0;
    var p = Number(pay); if(!(p > 0)) return 0;
    var store = movingLoadLearn(), b = movingTierBucket(store, tier);
    if(id != null){ if(b.ids[id]) return b.n; b.ids[id] = 1; }
    b.sum += p; b.n += 1; movingSaveLearn(store);
    return b.n;
  }
  function ingestMovingCompletions(list){
    (list || []).forEach(function(r){
      if(r && r.tier && r.pay != null) recordMovingOffer(r.tier, r.pay, r.id);
    });
  }

  /* Stairs modifier, sized against real pay: 'few' +11% (n=24), 'truck' +36%
     (n=16), +25% overall (n=57 vs 158) — consistent in direction and growing
     with tier, so one end +15%, both ends +25%.
     ⚠️ SERVICE ELEVATOR IS COLLECTED BUT NOT PRICED — n=2 in the historical
     data. Leave those fields alone until the volume exists. */
  function suggestedMovingOffer(tier, opts){
    opts = opts || {};
    var base = MOVING_TIERS[tier] || MOVING_TIERS.truck;
    var suggested = base.suggested, learnedN = 0;
    var b = movingLoadLearn()[tier];
    if(b && b.n > 0){                          // same shrinkage as Junk: K=8
      var learnedMean = b.sum / b.n, K = 8, w = b.n / (b.n + K);
      suggested = base.suggested * (1 - w) + learnedMean * w;
      learnedN = b.n;
    }
    /* Route A (single location) has no pickup end, so the caller gates
       pickupStairs on !noSpecificPickup — mirrored here defensively. */
    var ends = (opts.pickupStairs ? 1 : 0) + (opts.destStairs ? 1 : 0);
    if(ends === 1) suggested *= 1.15;
    else if(ends >= 2) suggested *= 1.25;
    var r5 = function(x){ return Math.round(x / 5) * 5; };
    suggested = r5(suggested);
    return {
      tier: (MOVING_TIERS[tier] ? tier : 'truck'),
      label: base.label, hint: base.hint,
      low: r5(suggested * 0.75), suggested: suggested, generous: r5(suggested * 1.25),
      learnedSamples: learnedN, baseline: base.suggested, stairsEnds: ends
    };
  }

  /* Item-count promotion (D3): structured item count may promote few -> truck,
     but the DESCRIPTION drives the base tier.
     ⚠️ THE THRESHOLD OF 8 IS AN UNVALIDATED DEFAULT — item count appears in only
     12% of historical descriptions, so there was nothing to calibrate against.
     Tune after ~20 real completions and record the change in the discovery doc. */
  var MOVING_ITEM_PROMOTE_AT = 8;
  function promoteMovingTierForItems(tier, itemCount){
    var n = Number(itemCount);
    if(tier === 'few' && n >= MOVING_ITEM_PROMOTE_AT) return 'truck';
    return tier;
  }

  function regionStateFromAddress(addr){
    if(!addr) return '';
    var m = String(addr).toUpperCase().match(/\b([A-Z]{2})\b(?:\s+\d{5})?\s*$/);
    return m ? m[1] : '';
  }

  window.GopherRequestLogic = {
    detectCategoryMismatch: detectCategoryMismatch,
    emitCategoryCheck: emitCategoryCheck,
    uiToSlug: function(key){ return UI_TO_SLUG[key] || key; },
    slugToUi: function(slug){ return SLUG_TO_UI[slug] || slug; },
    MIN_CONTENT_WORDS: MIN_CONTENT_WORDS, STRONG_BAR: STRONG_BAR, MARGIN: MARGIN,
    findAgeRestrictedKeyword: findAgeRestrictedKeyword,
    suggestedOffer: suggestedOffer,
    regionIsNC: regionIsNC,
    regionStateFromAddress: regionStateFromAddress,
    OFFER_TABLE: OFFER_TABLE,
    // Junk Removal volume-tier pricing + the forward-learning seam (owner 2026-07-19)
    JUNK_TIERS: JUNK_TIERS,
    JUNK_TIER_ORDER: JUNK_TIER_ORDER,
    detectJunkVolumeTier: detectJunkVolumeTier,
    suggestedJunkOffer: suggestedJunkOffer,
    recordJunkOffer: recordJunkOffer,
    ingestJunkCompletions: ingestJunkCompletions,
    // Moving suggested pricing + the same forward-learning seam (owner 2026-07-28)
    MOVING_TIERS: MOVING_TIERS,
    MOVING_TIER_ORDER: MOVING_TIER_ORDER,
    MOVING_ITEM_PROMOTE_AT: MOVING_ITEM_PROMOTE_AT,
    detectMovingTier: detectMovingTier,
    suggestedMovingOffer: suggestedMovingOffer,
    promoteMovingTierForItems: promoteMovingTierForItems,
    recordMovingOffer: recordMovingOffer,
    ingestMovingCompletions: ingestMovingCompletions
  };
})();
