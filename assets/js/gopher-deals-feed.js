/* =====================================================================
   gopher-deals-feed.js — the publication feed, on the consumer surfaces.

   ONE fetch, ONE mapping, shared by gopher-request.html and
   gopher-connect.html — the same discipline as gopher-bid-brain.js: both
   pages render real deals from THIS module so they can never drift apart
   again (the §9.5 bug was two inline copies of the same deal disagreeing
   on its address).

   HOW IT COMPOSES WITH THE INLINE DEALS_DATA
   The inline arrays STAY, as demo/offline content. This module fetches
   GET /api/v1/deals (live deals only, allowlisted payload) and PREPENDS
   real deals into the matching rail. If the endpoint is unreachable, not
   yet deployed, or returns nothing, the pages render exactly as before —
   the fallback is the absence of change. Real deals lead their rail
   because a real merchant's live deal outranks showroom content.

   KEY→LABEL BRIDGE (§9.1 / Ruling 1)
   The feed ships canonical KEYS (restaurants · favorites · age · retail ·
   providers). The pages' rails already use those keys — except the
   provider rail, which predates the canon as 'localpro'. That one bridge
   lives here and nowhere else. Display labels never travel over the API.

   WHAT A REAL CARD CANNOT SHOW YET (deliberate, not oversight)
   The provider's NAME now arrives as `title` — resolved server-side at
   submit (business name when the worker shows as a business, else their
   first name) and stored on the deal row, so this stays a single-source
   read with no join. Owner decision 2026-08-12.
   TIER now arrives too, as `provider_tier` (2026-08-24). It is resolved
   LIVE server-side from the worker's current tier — NOT from the deal's
   submit-time eligibility snapshot, which goes stale on a deal that stays
   live for months. It is absent when the provider holds no public tier, and
   `tier` is then left UNSET on the card so the page renders no badge.
   ⚠️ That last part is the whole fix. The card template reads
   `m.tier || 'Gopher Elite'`, so anything that puts a falsy tier on a live
   card makes the page invent a credential. Never set `tier` to a
   placeholder here; leave it off entirely.

   PERFORMANCE HISTORY arrives too, as of 2026-08-25 (owner ruling: customers
   see both) — `provider_jobs`, `provider_rating` and `provider_reviews`. Also
   resolved live server-side, from the same evaluate() the eligibility bar uses,
   so a card's job count means the same jobs the gate counted.
   ⚠️ Each is set only when the server actually sent it. A missing job count is
   NOT zero and a missing rating is NOT 5.0 — the card must render nothing.
   `reviews` is the sample size behind `rating`; never show the average without
   it. All of this is service-scoped: Delivery / Ride / Other count toward
   neither figure (owner, 2026-07-23).
   ===================================================================== */
(function () {
  var API = 'https://api.gophergo.io/api/v1/deals';
  var RAIL_FOR_KEY = {
    providers: 'localpro',
    restaurants: 'restaurants',
    favorites: 'favorites',
    age: 'age',
    retail: 'retail'
  };
  var dollars = function (cents) {
    return cents == null ? null : Math.round(cents) / 100;
  };
  var titleCase = function (s) {
    return String(s || '').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  };

  /* One live row -> the consumer card shape the pages already render.
     ids are prefixed 'live-' so they can never collide with demo ids. */
  function toCard(d) {
    var base = {
      id: 'live-' + (d.deal_code || d.id),
      live: true,                        // marks a real deal; demo cards lack it
      offer: d.deal_text || '',
      dealSpecifics: d.deal_text || '',
      promo: d.promo_code || undefined
    };
    /* The merchant's logo. `deal_img` has been published by the feed all along —
       toPublicDeal() includes it — but nothing ever WROTE it and nothing here ever
       read it, so every live card rendered with no mark while the demo cards had one.
       Both halves landed 2026-08-21 (backend !354). Absent on older deals, so the
       card's own no-logo fallback still applies. */
    if (d.deal_img) base.logo = d.deal_img;
    if (d.track === 'dlp') {
      base.kind = 'service';
      /* `name` is the SERVICE, `pro` is who provides it — the shape the demo
         cards already use. `title` carries the provider's display name, chosen
         server-side at submit: business name when they show as a business,
         else their first name. It was NULL until 2026-08-12, which is why this
         used to read "Verified Service Provider" for everyone; that string is
         now only the fallback for a deal that predates the fix. */
      base.name = titleCase((d.keywords && d.keywords[0]) || 'Service Deal');
      base.pro = d.title || 'Verified Service Provider';
      base.price = dollars(d.customer_price);
      base.normalRate = dollars(d.normal_price);
      base.verified = true;
      /* The feed speaks the platform's tier vocabulary ('Elite' / 'Elite+');
         the cards have always displayed it prefixed ('Gopher Elite'). That
         bridge lives HERE and nowhere else, the same discipline as the
         category key bridge above — a display string must never travel over
         the API. Set only when the server actually resolved a tier: leaving
         the key absent is what makes the card render no badge instead of
         falling back to a hardcoded one. */
      if (d.provider_tier) base.tier = 'Gopher ' + d.provider_tier;
      /* Only when told. `!= null` rather than a truthiness test on purpose:
         a genuine 0 jobs or a 0.0 rating from the server is data and should
         show, whereas undefined is "we were not told" and must not. */
      if (d.provider_jobs != null) base.jobs = d.provider_jobs;
      if (d.provider_rating != null) base.rating = Number(d.provider_rating);
      if (d.provider_reviews != null) base.reviews = d.provider_reviews;
    } else {
      base.kind = 'merchant';
      base.name = d.title || 'Local Merchant';
      base.sub = (d.keywords || []).map(titleCase).join(' · ');
      base.mobile = !!d.mobile_address;
      base.noOrdering = !!d.no_online_ordering;
      if (d.order_url) base.portalUrl = d.order_url;
    }
    return base;
  }

  /* Fetch and prepend into the page's DEALS_DATA. Failure is silent BY
     DESIGN — the inline data is the fallback, so an unreachable feed must
     look like "no real deals yet", never like a broken page. */
  function merge(dealsData, done) {
    var finish = function (added) { if (typeof done === 'function') done(added); };
    if (!window.fetch || !Array.isArray(dealsData)) { finish(0); return; }
    fetch(API)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (body) {
        var deals = (body && body.deals) || [];
        var added = 0;
        deals.forEach(function (d) {
          var railKey = RAIL_FOR_KEY[d.category];
          if (!railKey) return; // unknown category: skip, never throw
          var rail = null;
          for (var i = 0; i < dealsData.length; i += 1) {
            if (dealsData[i].key === railKey) { rail = dealsData[i]; break; }
          }
          if (!rail || !Array.isArray(rail.merchants)) return;
          var card = toCard(d);
          var exists = rail.merchants.some(function (m) { return m.id === card.id; });
          if (!exists) { rail.merchants.unshift(card); added += 1; }
        });
        finish(added);
      })
      .catch(function () { finish(0); });
  }

  window.GopherDealsFeed = { merge: merge, toCard: toCard, RAIL_FOR_KEY: RAIL_FOR_KEY, API: API };
})();
