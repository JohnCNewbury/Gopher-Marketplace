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
   Still absent, and still deliberate: tier, rating and photo. Tier and
   rating live in the eligibility snapshot, which is reviewer-side — a
   customer-facing rating for a provider would need its own privacy call
   (see INV-RATING), not a quiet payload extension.
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
