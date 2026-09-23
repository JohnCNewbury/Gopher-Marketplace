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
  function findAgeRestrictedKeyword(text){
    var orig = String(text || '');
    if(!orig.trim()) return null;
    var lists = [ (window.GopherAgeKeywords || []), (window.GopherAgeSupplement || []) ];
    for(var li = 0; li < lists.length; li++){
      var list = lists[li];
      for(var i = 0; i < list.length; i++){
        var esc = String(list[i]).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
        var re = new RegExp('(?:^|[^A-Za-z0-9])(' + esc + ')(?:[^A-Za-z0-9]|$)','i');
        var m = orig.match(re);
        if(m) return m[1];
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
  /* ── RIDE SHARING suggested-offer model (distance + time based) ───────────
     G40-535. LIFTED OUT OF `gopher-request.html`, where it was page-local
     while Delivery, Junk and Moving all lived here. That asymmetry is why the
     Ride model was the one nobody could import: porting it to the backend
     meant reading it out of a 20,000-line page.

     Calibrated against 1,226 real "Need a Ride" orders plus Uber/Lyft
     benchmarks (Gopher_RideShare_Suggested_Offer_Analysis_2.xlsx). This is the
     SAME model the live backend now runs in helpers/suggested_pricing.js; the
     two are kept identical on purpose, and the full write-up — including why
     the flat fee is the Request $2.99 and not the workbook's Connect $4.99 —
     is in docs/handoff/ride-suggested-pricing.md.

         Mileage Cost = sum of (miles in each tier x that tier's rate)
         Time Cost    = trip minutes x per-minute rate
         Average      = (Mileage Cost + Time Cost) / 2
         Base         = MAX(Flat Fee + Average, Minimum Ride Floor)
         if scheduled:  Base = Base x (1 + Scheduled Uplift)
         SUGGESTED    = Base x (1 + ITF)

     ⛔ The +/-25% band applies to the AVERAGED mile+time cost ONLY. The flat
     fee is identical across low/suggested/generous and the $8 floor is applied
     after the band, so it protects Low. `low = suggested * 0.75` is the
     obvious wrong implementation and it discounts the platform fee. */
  var RIDE_DEFAULTS = {
    fee: 2.99,          /* Request schedule — Gopher_Connect_Pricing "Gopher App" column */
    perMin: 0.55,
    itf: 0.08,
    minRide: 8.00,
    band: 0.25,
    schedUplift: 0.15
  };

  /* Tapered per-mile: more per mile close in, less far out. A FLAT rate ran
     $10-$19 above Uber/Lyft on 19-39 mile trips (workbook finding 4). */
  var RIDE_MILE_TIERS = [[0,5,2.40],[5,15,1.80],[15,40,1.35],[40,Infinity,1.05]];

  function rideMileageCost(miles){
    var m = Number(miles), c = 0;
    if(!isFinite(m) || m <= 0) return 0;
    for(var i = 0; i < RIDE_MILE_TIERS.length; i++){
      var lo = RIDE_MILE_TIERS[i][0], hi = RIDE_MILE_TIERS[i][1], rate = RIDE_MILE_TIERS[i][2];
      c += Math.max(0, Math.min(m, hi) - lo) * rate;
    }
    return c;
  }

  /* `opts` overrides any rate. The page passes its own GOPHER_FEE.ride and
     INSTANT_TRANSFER_RATE so the prototype's checkout fee table and this model
     cannot drift apart — the behaviour the page-local version had, preserved
     rather than replaced by a second hard-coded copy of the same two numbers. */
  function rideSuggestedOffer(miles, minutes, scheduled, opts){
    var r = {}, k;
    for(k in RIDE_DEFAULTS) if(Object.prototype.hasOwnProperty.call(RIDE_DEFAULTS,k)) r[k] = RIDE_DEFAULTS[k];
    if(opts) for(k in opts) if(Object.prototype.hasOwnProperty.call(opts,k) && opts[k] != null) r[k] = opts[k];

    var mins = Math.max(0, Number(minutes) || 0);
    var variable = (rideMileageCost(miles) + mins * r.perMin) / 2;
    function calc(mult){
      var base = Math.max(r.fee + variable * mult, r.minRide);
      if(scheduled) base *= (1 + r.schedUplift);
      return base * (1 + r.itf);
    }
    return {
      low:       Math.round(calc(1 - r.band)),
      suggested: Math.round(calc(1)),
      generous:  Math.round(calc(1 + r.band)),
      miles: miles, minutes: minutes
    };
  }

  function regionIsNC(){
    /* Owner directive 2026-07-09: NC pricing platform-wide. Restore address-based
       detection (regionStateFromAddress over dropoff, fallback pickup) when
       non-NC expansion happens. */
    return true;
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
    /* Ride Sharing (G40-535) — lifted out of gopher-request.html */
    RIDE_DEFAULTS: RIDE_DEFAULTS,
    RIDE_MILE_TIERS: RIDE_MILE_TIERS,
    rideMileageCost: rideMileageCost,
    rideSuggestedOffer: rideSuggestedOffer
  };
})();
