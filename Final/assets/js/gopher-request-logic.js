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
  var MIN_CONTENT_WORDS = 2;   // skip short/empty descriptions
  var STRONG_BAR        = 8;   // top category must be a confident match (= CAT_HIGH)
  var MARGIN            = 5;   // top must beat the selected category's score by this

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
    if(CLS.catWords(description || '').length < MIN_CONTENT_WORDS) return null;
    var scored = CLS.scoreCategories(description || '');
    if(!scored.length) return null;
    var top = scored[0], selectedScore = 0;
    for(var i = 0; i < scored.length; i++){
      if(scored[i].slug === selectedSlug){ selectedScore = scored[i].score; break; }
    }
    var strongTop = top.score >= STRONG_BAR && top.slug !== 'other';  // never suggest TO the catch-all
    /* Escape-the-catch-all: suggesting FROM Other TO a concrete category is helpful. */
    if(selectedSlug === 'other' && strongTop)
      return { suggestedSlug: top.slug, suggestedLabel: top.label,
               selectedScore: selectedScore, suggestedScore: top.score };
    /* Confident disagreement: strong top AND weak selected AND a clear margin. */
    if(strongTop && top.slug !== selectedSlug
       && (top.score - selectedScore) >= MARGIN && selectedScore < CLS.CAT_THRESH)
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
    OFFER_TABLE: OFFER_TABLE
  };
})();
