/* ===================================================================
   gopher-message-guard.js  —  shared in-app messaging guard (PROTOTYPE)

   ONE module, included by all four messaging surfaces (Connect, Request,
   Request App Prototype, Gopher Go Prototype) so the logic is identical
   everywhere and is tuned in exactly one file.

   SCOPE (G40-35, decisions locked by John 2026-07-02):
     Covers ALL in-app communication violations, in two families:
       • off-platform circumvention — payment terms (incl. a bare "$"/amount,
         the precursor to CashApp), phone numbers, EMAIL addresses,
         "cancel and pay outside". (A physical street/job-site address is
         NOT a violation — it's required to do the job.)
       • conduct — foul / abusive / threatening language.
     Escalation is PER USER across all threads. Admin@ email + account flag
     fire at level >= CONFIG.adminAlertAtLevel (level 1 is a silent nudge).

   WHAT THIS IS (prototype layer):
     A CLIENT-SIDE keyword/pattern check that mirrors the existing
     age-restricted pop-up in Request. On a match it shows an escalating
     modal (educate -> warn -> block) whose copy matches the tripped family.
     It is a UX deterrent, NOT enforcement. A determined user can bypass
     any client-side check.

   WHAT THE REAL VERSION DOES (production layer — for the paid dev):
     The same UI, but the verdict comes from POST /messages/precheck and
     the BLOCK is enforced by the send endpoint refusing to deliver.
     See docs/handoff/messaging-precheck.md. The check() return shape
     below intentionally matches that endpoint's response so swapping
     local -> server is a one-function change.
   =================================================================== */
(function (global) {
  'use strict';

  /* ---- CONFIG (edit freely) -------------------------------------- */
  var CONFIG = {
    policyUrl: 'gopher-terms.html',   // relative + case-exact (GitHub Pages/Linux)
    // "In-App Messaging Terms" link on the transaction-protection alert — points directly
    // at the Terms of Service (absolute so it works from the site AND the _prototypes tree).
    termsUrl: 'https://gophergo.io/gopher-terms-of-service.html',
    learnMoreUrl: 'gopher-faqs.html#staying-in-app',
    // Escalation is PER USER (across all threads). 1st hit -> level 1,
    // 2nd -> level 2, 3rd and beyond -> level 3 (blocked). Tune to taste.
    blockAtLevel: 3,
    // Production only: at this level and above the server emails
    // admin@gophergo.io and flags the account. Level 1 stays a silent nudge
    // (no email/flag) so admin@ isn't flooded by first-time educationals.
    // The prototype can't send email — see maybeAdminAlert() for the seam.
    adminAlertAtLevel: 2
  };

  /* ---- KEYWORDS / PATTERNS (this is the part your dev will grow) --
     Grouped by policy so the modal + future server log can say WHY.
     Keep each entry a RegExp; word boundaries avoid false hits.       */
  var PATTERNS = {
    payment: [
      /\bcash\s?app\b/i, /\bvenmo\b/i, /\bzelle\b/i, /\bpay\s?pal\b/i,
      /\bapple\s?pay\b/i, /\bgoogle\s?pay\b/i, /\bg-?pay\b/i,
      /\bwire\s?transfer\b/i, /\b(bit\s?coin|btc|crypto)\b/i,
      /\bpay(?:ing)?\s+(?:you|me|in)\s+cash\b/i, /\bcash\s+only\b/i,
      /\bpay\s+(?:me|you)?\s*direct(?:ly)?\b/i, /\bpay\s+outside\b/i,
      // A bare dollar figure is the precursor to CashApp circumvention
      // (John, 2026-07-02). Price is shown transparently in-app, so there's
      // no legitimate reason to type an amount in chat — flag it.
      /\$\s?\d/, /\b\d{1,6}(?:[.,]\d{2})?\s?(?:dollars|bucks)\b/i
    ],
    contact: [
      // phone: optional +1, area code, 7-digit body, common separators
      /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
      // EMAIL address (the ticket's "Address" meant email — a physical/
      // job-site address is required and is NOT flagged).
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
      /\b(?:call|text|reach|hit)\s+(?:me|you|u)\b/i,
      /\bmy\s+(?:number|cell|phone|email|digits)\b/i,
      // REQUESTING contact info is flagged the same as sharing it — there is
      // ZERO reason to ask for a customer's number before being connected
      // (owner, 2026-07-16: "What is your number?" pre-connection = TOP red
      // flag). Adjacency keeps "your order number" / "your unit number"
      // from false-positives ("your" must sit right next to the noun).
      /\b(?:your|ur)\s+(?:number|phone|cell|mobile|digits|email|whats\s?app)\b/i,
      /\bnumber\s+to\s+(?:call|text|reach)\b/i
    ],
    off_platform: [
      /\boutside\s+(?:of\s+)?gopher\b/i, /\boff\s+(?:the\s+)?(?:app|platform)\b/i,
      /\bcancel\s+(?:the\s+)?(?:request|order|job)\b/i,
      /\bcancel\s+and\s+pay\b/i, /\bmeet\s+up\s+and\s+pay\b/i,
      /\bdeal\s+outside\b/i, /\bpay\s+in\s+person\b/i
    ],
    // Foul / abusive / threatening language (family = 'conduct', not
    // circumvention — gets the "keep it respectful" copy). STARTER LIST,
    // conservative on purpose to limit false positives; John to review/grow.
    // Repeated letters tolerated (fuuuck); heavier obfuscation is dev work.
    conduct: [
      /\bf+u+c+k+\w*/i, /\bmother\s?f\w+/i, /\bs+h+i+t+\b/i,
      /\bbull\s?shit\w*/i, /\bb+i+t+c+h+\w*/i, /\bass\s?hole\w*/i,
      /\bc+u+n+t+\b/i, /\bdick\s?head\w*/i, /\bbastard\w*/i, /\bretard\w*/i,
      /\bpiss(?:ing|ed)?\s?(?:off|on you)\b/i, /\bscrew\s+(?:you|u)\b/i,
      // low-effort threats
      /\b(?:i'?ll|i(?:'?m| am)?\s+(?:gonna|going to)|gonna|going to)\s+(?:kill|beat|hurt|f\w+)\s+(?:you|u|ya)\b/i
    ]
  };

  /* Which copy family a tripped policy uses. Conduct gets respectful-tone
     copy; everything else gets the stay-in-app circumvention copy. */
  function familyOf(policy) { return policy === 'conduct' ? 'conduct' : 'offplatform'; }

  /* ---- MODAL COPY ----------------------------------------------------
     OFF-PLATFORM family (owner revision 2026-07-16): ONE alert, in TWO
     variants keyed by CONNECTION STATE — is this thread attached to a
     request the two parties are already matched on? Both variants offer
     "Edit message" (green) and "Send as-is" (blue, red pulsing shadow —
     the message goes out FLAGGED for human review), with an
     "In-App Messaging Terms" link underneath. No hard block: a real
     human reviews flags instead ("we'll always have a real human remove
     any flags that had the best intentions").
     CONDUCT family keeps the original three escalation levels.           */
  var COPY = {
    offplatform: {
      notConnected: {
        title: 'Keep Your Transaction Protected',
        body: 'It looks like this conversation may be encouraging communication ' +
              'and/or transactions outside of Gopher. Keeping everything in the ' +
              'app protects both parties with secure payments, dispute ' +
              'resolution, ratings, and fraud protection. You can edit your ' +
              'message to avoid it being sent as-is, which is currently flagged. ' +
              'Once a customer and a worker are connected, communication alerts ' +
              'are relaxed considering exchanging personal info may be part of ' +
              'the request.'
      },
      connected: {
        title: 'Keep Your Transaction Protected',
        body: 'It looks like this conversation may be encouraging communication ' +
              'and/or transactions outside of Gopher. Keeping everything in the ' +
              'app protects both parties with secure payments, dispute ' +
              'resolution, ratings, and fraud protection. You can edit your ' +
              'message to avoid it being sent as-is, which is currently flagged. ' +
              'Please keep in mind we might flag a message incorrectly, so ' +
              'apologies in advance — we’ll always have a real human remove ' +
              'any flags that had the best intentions.'
      },
      editLabel: 'Edit message',
      sendLabel: 'Send as-is',
      termsLabel: 'In-App Messaging Terms'
    },
    conduct: {
      1: {
        verdict: 'warn',
        title: 'Keep It Respectful',
        body: 'Please keep messages professional and respectful. Abusive, ' +
              'threatening, or harassing language goes against our Community ' +
              'Guidelines and helps no one get the job done.',
        primary: 'Got It',
        secondary: 'View Guidelines',
        secondaryUrl: function () { return CONFIG.policyUrl; }
      },
      2: {
        verdict: 'warn',
        title: 'Conduct Warning',
        body: 'Abusive, threatening, or harassing language violates our Terms ' +
              'of Service. Continued violations may result in account ' +
              'restrictions.',
        primary: 'I Understand',
        secondary: 'View Policy',
        secondaryUrl: function () { return CONFIG.policyUrl; }
      },
      3: {
        verdict: 'block',
        title: 'Message Not Sent',
        body: 'This message contains language that violates our Community ' +
              "Guidelines, so it wasn't delivered. Please revise it to continue.",
        primary: 'Edit Message',
        secondary: null
      }
    }
  };
  // Verdict-by-level mapping (1,2 = warn; 3 = block) now lives on the conduct
  // family only — off-platform hits are ALWAYS 'warn' (the user can Send as-is;
  // the message just goes out flagged for human review).
  var LEVELS = COPY.conduct;

  /* ---- escalation state — PER USER across all threads (in-memory;
     resets on reload). Prototype has one simulated user, so a single key
     accumulates across every conversation. Production keys by real user id. */
  var counts = Object.create(null);
  var USER_KEY = '_user';

  /* ---- detection -------------------------------------------------- *
     Returns a verdict object whose shape matches /messages/precheck:
       { verdict:'allow'|'warn'|'block', policy, level, matched }      */
  function check(text, threadId, opts) {
    opts = opts || {};
    var hits = [];
    for (var policy in PATTERNS) {
      // Connected relaxation (owner, 2026-07-16): once a customer and a worker
      // are CONNECTED on a request, exchanging personal info may be part of the
      // job (call on arrival, gate codes, etc.) — the 'contact' patterns are
      // skipped. Payment / off-platform / conduct stay checked.
      if (opts.connected && policy === 'contact') continue;
      var list = PATTERNS[policy];
      for (var i = 0; i < list.length; i++) {
        if (list[i].test(text)) { hits.push(policy); break; }
      }
    }
    if (!hits.length) return { verdict: 'allow', policy: null, level: 0, matched: [] };

    // Escalate PER USER, not per thread — a repeat offender can't reset by
    // opening a new conversation (John, 2026-07-02). threadId is still passed
    // for the production log/telemetry; the prototype just counts per user.
    counts[USER_KEY] = (counts[USER_KEY] || 0) + 1;
    var level = Math.min(counts[USER_KEY], CONFIG.blockAtLevel);
    var family = familyOf(hits[0]);
    return {
      // Off-platform is never hard-blocked anymore — the alert offers Send
      // as-is and the message goes out FLAGGED. Conduct keeps its block level.
      verdict: family === 'offplatform' ? 'warn' : LEVELS[level].verdict,
      policy: hits[0],          // first category that tripped (log/telemetry)
      family: family,
      connected: !!opts.connected,
      flagged: true,            // production: message delivers with a `flagged` field for human review
      level: level,
      threadId: threadId || null,
      matched: hits
    };
  }

  /* ---- admin-alert seam ------------------------------------------- *
     PROTOTYPE: a console breadcrumb only. PRODUCTION: at level >=
     CONFIG.adminAlertAtLevel the server emails admin@gophergo.io, flags the
     account, and logs the event (ActiveAdmin). Level 1 stays silent.       */
  function maybeAdminAlert(result) {
    if (result.level < CONFIG.adminAlertAtLevel) return;
    if (global.console && console.info) {
      console.info('[message-guard] PROD would email admin@ + flag account:', {
        policy: result.policy, level: result.level, threadId: result.threadId
      });
    }
  }

  /* ---- the public entry point ------------------------------------ *
     guard(text, threadId, { connected, onAllow, onBlocked })
       connected  -> TRUE when this thread belongs to a request the two
                     parties are already matched on. Picks the alert
                     variant AND relaxes the 'contact' patterns.
       onAllow    -> called when the message may be sent (no hit, OR the
                     user chose "Send as-is" — flagged — OR acknowledged
                     a conduct warn). Wire your real send here.
       onBlocked  -> called when the message is held back ("Edit message"
                     on the transaction alert, or a conduct level-3 block). */
  function guard(text, threadId, handlers) {
    handlers = handlers || {};
    var pass = handlers.onAllow || function () {};
    var stop = handlers.onBlocked || function () {};
    var result = check(text, threadId, { connected: !!handlers.connected });

    if (result.verdict === 'allow') { pass(); return result; }

    maybeAdminAlert(result);  // prod: email admin@ + flag at level >= 2

    showModal(result.level, {
      family: result.family,
      connected: result.connected,
      onPrimary: function () {
        // Off-platform: primary = "Edit message" -> hold the message.
        if (result.family === 'offplatform') { stop(result); return; }
        if (result.verdict === 'block') { stop(result); }  // conduct block -> hold
        else { pass(); }                                    // acknowledged conduct warn -> send
      },
      onSendAsIs: function () { pass(result); }  // flagged send — human review removes good-faith flags
    });
    return result;
  }

  /* ---- modal rendering (themed to the site, accessible) ---------- */
  var STYLE_ID = 'gmg-style';
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css =
    '.gmg-overlay{position:fixed;inset:0;background:rgba(17,24,28,.55);' +
      'display:flex;align-items:center;justify-content:center;z-index:9999;' +
      'padding:20px;animation:gmg-fade .15s ease-out}' +
    '.gmg-card{background:#fff;max-width:440px;width:100%;border-radius:16px;' +
      'box-shadow:0 20px 60px rgba(0,0,0,.25);padding:28px 26px 22px;' +
      'font-family:inherit;color:#1b2227}' +
    '.gmg-card h2{margin:0 0 10px;font-size:1.2rem;line-height:1.3;font-weight:700}' +
    '.gmg-card p{margin:0 0 22px;font-size:.95rem;line-height:1.55;color:#3a444b}' +
    '.gmg-actions{display:flex;flex-direction:column;gap:10px}' +
    '.gmg-btn{appearance:none;border:0;border-radius:10px;padding:12px 16px;' +
      'font:inherit;font-weight:600;cursor:pointer}' +
    '.gmg-btn-primary{background:var(--green,#33D975);color:#08130b}' +
    '.gmg-btn-primary:hover{filter:brightness(.95)}' +
    '.gmg-btn-secondary{background:transparent;color:#3a444b;text-decoration:underline}' +
    // "Send as-is" — blue, with a reddish PULSING shadow (a visual "are you
    // sure" without blocking the choice; the message goes out flagged).
    '.gmg-btn-sendas{background:#002461;color:#fff;animation:gmg-pulse 1.6s ease-out infinite}' +
    '.gmg-btn-sendas:hover{filter:brightness(1.12)}' +
    '.gmg-terms{display:block;text-align:center;margin-top:14px;font-size:.85rem;' +
      'color:#3a444b;text-decoration:underline;cursor:pointer}' +
    '.gmg-btn:focus-visible{outline:3px solid #1b73e8;outline-offset:2px}' +
    '@keyframes gmg-fade{from{opacity:0}to{opacity:1}}' +
    '@keyframes gmg-pulse{0%{box-shadow:0 0 0 0 rgba(224,74,61,.55)}' +
      '70%{box-shadow:0 0 0 11px rgba(224,74,61,0)}100%{box-shadow:0 0 0 0 rgba(224,74,61,0)}}' +
    '@media (prefers-reduced-motion:reduce){.gmg-overlay{animation:none}' +
      '.gmg-btn-sendas{animation:none;box-shadow:0 0 0 3px rgba(224,74,61,.4)}}';
    var s = document.createElement('style');
    s.id = STYLE_ID; s.textContent = css;
    document.head.appendChild(s);
  }

  function showModal(level, handlers) {
    injectStyle();
    handlers = handlers || {};
    // Pick the copy family (defaults to off-platform so legacy 2-arg callers
    // that pass no family keep working unchanged).
    var fam = (handlers.family && COPY[handlers.family]) ? handlers.family : 'offplatform';
    // Off-platform: ONE alert in two connection-state variants (not leveled).
    var offp = (fam === 'offplatform');
    var L = offp
      ? COPY.offplatform[handlers.connected ? 'connected' : 'notConnected']
      : COPY[fam][level];
    var lastFocus = document.activeElement;

    var overlay = document.createElement('div');
    overlay.className = 'gmg-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'gmg-title');

    var card = document.createElement('div');
    card.className = 'gmg-card';

    var h = document.createElement('h2');
    h.id = 'gmg-title'; h.textContent = L.title;

    var p = document.createElement('p');
    p.textContent = L.body;

    var actions = document.createElement('div');
    actions.className = 'gmg-actions';

    var primary = document.createElement('button');
    primary.className = 'gmg-btn gmg-btn-primary';
    primary.textContent = offp ? COPY.offplatform.editLabel : L.primary;

    function close() {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    primary.addEventListener('click', function () {
      close();
      if (handlers.onPrimary) handlers.onPrimary();
    });

    actions.appendChild(primary);

    if (offp) {
      // "Send as-is" — blue with the reddish pulsing shadow. Sends flagged.
      var sendAs = document.createElement('button');
      sendAs.className = 'gmg-btn gmg-btn-sendas';
      sendAs.textContent = COPY.offplatform.sendLabel;
      sendAs.addEventListener('click', function () {
        close();
        if (handlers.onSendAsIs) handlers.onSendAsIs();
      });
      actions.appendChild(sendAs);
    } else if (L.secondary) {
      var secondary = document.createElement('button');
      secondary.className = 'gmg-btn gmg-btn-secondary';
      secondary.textContent = L.secondary;
      secondary.addEventListener('click', function () {
        var url = L.secondaryUrl && L.secondaryUrl();
        if (url) window.open(url, '_blank', 'noopener');
      });
      actions.appendChild(secondary);
    }

    card.appendChild(h); card.appendChild(p); card.appendChild(actions);

    if (offp) {
      // "In-App Messaging Terms" — sits below the buttons, points directly
      // at the Terms of Service.
      var terms = document.createElement('a');
      terms.className = 'gmg-terms';
      terms.textContent = COPY.offplatform.termsLabel;
      terms.href = CONFIG.termsUrl;
      terms.target = '_blank'; terms.rel = 'noopener';
      card.appendChild(terms);
    }
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    primary.focus();

    // Esc = the safe choice: acknowledge warn / edit on block (same as primary)
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); primary.click(); }
      // crude focus trap: keep Tab inside the card
      if (e.key === 'Tab') {
        var f = card.querySelectorAll('button');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);
  }

  /* ---- expose ----------------------------------------------------- */
  global.GopherMessageGuard = {
    check: check,
    guard: guard,
    showModal: showModal,
    familyOf: familyOf,
    // Escalation is per-user now, so reset clears the whole counter (the
    // optional arg is accepted for back-compat but no longer thread-scoped).
    reset: function () { counts = Object.create(null); },
    config: CONFIG,
    patterns: PATTERNS,
    copy: COPY,
    levels: LEVELS   // back-compat alias (now the conduct family — offplatform is variant-keyed, not leveled)
  };
})(window);
