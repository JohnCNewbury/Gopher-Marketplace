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

  window.GopherRequestLogic = {
    detectCategoryMismatch: detectCategoryMismatch,
    emitCategoryCheck: emitCategoryCheck,
    uiToSlug: function(key){ return UI_TO_SLUG[key] || key; },
    slugToUi: function(slug){ return SLUG_TO_UI[slug] || slug; },
    MIN_CONTENT_WORDS: MIN_CONTENT_WORDS, STRONG_BAR: STRONG_BAR, MARGIN: MARGIN
  };
})();
