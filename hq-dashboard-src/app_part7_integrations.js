/* ============================================================================
   Integrations launcher  (app_part7_integrations.js)
   Self-registers an "Integrations" collapsible group in NAV (same pattern as
   app_part6_admin.js: push into NAV/TITLES/VIEWS, then buildNav()).

   Every external service Gopher runs on, launchable without leaving the
   dashboard: each item opens an in-dashboard web view with the service's
   operating facts (what it does, layer, ~cost, standing notes) and an
   "Open in new tab" fallback — several consoles (Stripe, AWS, Google, Apple)
   send X-Frame-Options / frame-ancestors headers that refuse embedding, so
   the embedded pane stays blank for those by their design, not ours.
   Facts source: Gopher-Integrations-Dependencies.md (code-verified Jun 16
   2026) + the vendor consoles. Costs are the ~monthly run-rate at that date.
   ============================================================================ */
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof el === 'undefined') return; // loaded out of order — bail safely

  var INTEGRATIONS = [
    { id: 'int-stripe',    name: 'Stripe',              icon: 'dollar',   url: 'https://dashboard.stripe.com',            layer: 'FE + BE',      cost: 'per-transaction revenue cut',
      purpose: 'Payments, escrow (manual-capture), and Connect payouts.',
      note: 'The transaction model lives here — escrow holds, ITF, payouts. Key custody: rotate the live secret key (security item of record).' },
    { id: 'int-twilio',    name: 'Twilio',              icon: 'chat',     url: 'https://console.twilio.com',              layer: 'BE',           cost: '~$800/mo (usage)',
      purpose: 'SMS / phone OTP — the front door of signup on both apps.',
      note: 'A2P 10DLC registered & verified (brand: GOPHER LLC). Scales with signups; OTP delivery issues show up here first.' },
    { id: 'int-sendgrid',  name: 'SendGrid',            icon: 'doc',      url: 'https://app.sendgrid.com',                layer: 'BE',           cost: '~$35/mo (Essentials 100K)',
      purpose: 'Transactional email (receipts, OTP, lifecycle).',
      note: 'Domain-authenticated; separate from Google Workspace mailboxes.' },
    { id: 'int-firebase',  name: 'Firebase (FCM)',      icon: 'bolt',     url: 'https://console.firebase.google.com',     layer: 'FE + BE',      cost: 'inside GCP ~$450/mo',
      purpose: 'Push notifications to both apps.',
      note: 'serviceAccountKey.json was committed to the repo — rotate (security item of record).' },
    { id: 'int-gcp',       name: 'Google Cloud / Maps', icon: 'pin',      url: 'https://console.cloud.google.com',        layer: 'FE + BE',      cost: '~$450/mo (with Firebase)',
      purpose: 'Maps + the sole live geocoder (6 backend call sites).',
      note: 'Cost lever: cache repeat geocodes. The dead Bing geocoder is slated for removal.' },
    { id: 'int-idenfy',    name: 'iDenfy',              icon: 'shield',   url: 'https://dashboard.idenfy.com',            layer: 'FE + BE',      cost: '~$700/mo (≈$2.16/verification)',
      purpose: 'KYC identity verification — issues TrustShield.',
      note: 'Second-largest SaaS cost; rate-shop underway. Lever: who gets verified, not just the rate.' },
    { id: 'int-intercom',  name: 'Intercom',            icon: 'chat',     url: 'https://app.intercom.com',                layer: 'FE + BE',      cost: '~$300/mo',
      purpose: 'In-app messenger + lifecycle events.',
      note: 'Not drawn in the RFP architecture diagrams — add it.' },
    { id: 'int-yardstik',  name: 'Yardstik',            icon: 'shield',   url: 'https://app.yardstik.com',                layer: 'Portal',       cost: '~$34/mo (usage)',
      purpose: 'Worker background checks (Elite / Elite+ verification).',
      note: 'Logo-only in the app today; portal relabel planned (D-015).' },
    { id: 'int-sentry',    name: 'Sentry',              icon: 'alert',    url: 'https://sentry.io',                       layer: 'FE (mobile)',  cost: '~$29/mo',
      purpose: 'Error tracking in both mobile apps.',
      note: 'Cheap — "keep" is the low-cost default.' },
    { id: 'int-aws',       name: 'AWS Console',         icon: 'bank',     url: 'https://console.aws.amazon.com',          layer: 'Infra',        cost: '~$1,900/mo',
      purpose: 'Hosting: Elastic Beanstalk, RDS (Postgres), S3.',
      note: 'RDS-dominated bill. Levers: retire legacy DBs, cut Aurora min-ACU.' },
    { id: 'int-appflow',   name: 'Ionic Appflow',       icon: 'box',      url: 'https://dashboard.ionicframework.com',    layer: 'Build & ship', cost: '$499/mo (Basic, 5 seats)',
      purpose: 'Builds the iOS/Android binaries and delivers them to both stores.',
      note: 'Load-bearing: the signing certificates live here (custody / bus-factor). 3 of 5 admin seats are external DualBoot accounts — access-review item.' },
    { id: 'int-asc',       name: 'App Store Connect',   icon: 'phone',    url: 'https://appstoreconnect.apple.com',       layer: 'Store',        cost: '$99/yr dev program',
      purpose: 'iOS listings — Request 1438150218 · Go 1438128905. Install/units data lives here.',
      note: 'Confirm sole Account Holder = owner (account-ownership checklist).' },
    { id: 'int-play',      name: 'Google Play Console', icon: 'phone',    url: 'https://play.google.com/console',         layer: 'Store',        cost: 'one-time $25',
      purpose: 'Android listings — io.gophergoapp.* . Real install counts live here.',
      note: 'API-35 target requirement is the live update-blocker (G40-322). Publisher name reads "Gopher, LLC" vs Apple\'s "Gopher, Inc." — reconcile.' },
    { id: 'int-gitlab',    name: 'GitLab',              icon: 'doc',      url: 'https://gitlab.com',                      layer: 'Code',         cost: '—',
      purpose: 'The five production repos (backend, two mobile apps, admin, web).',
      note: '' },
    { id: 'int-jira',      name: 'Jira — G40 board',    icon: 'board',    url: 'https://id.atlassian.com',                layer: 'Execution',    cost: '—',
      purpose: 'The G40 backlog & epics driving the rebuild.',
      note: '' },
    { id: 'int-gws',       name: 'Workspace Admin',     icon: 'users',    url: 'https://admin.google.com',                layer: 'Ops',          cost: '~$94/mo',
      purpose: 'Company email seats + the gophergo.io domain (verified).',
      note: '' }
  ];

  function intView(d) {
    return function () {
      var v = el('div');

      var head = el('div', 'card');
      head.innerHTML =
        '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">'
        + '<div style="flex:1;min-width:240px">'
        +   '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">'
        +     '<h3 style="margin:0;font-size:17px">' + d.name + '</h3>'
        +     '<span class="tag t-grey">' + d.layer + '</span>'
        +     '<span class="tag t-grey">' + d.cost + '</span>'
        +   '</div>'
        +   '<div style="font-size:13px;color:var(--muted);margin-top:6px">' + d.purpose + '</div>'
        +   (d.note ? '<div style="font-size:12.5px;margin-top:8px;padding:8px 10px;border-left:3px solid ' + C.amber + ';background:rgba(232,146,12,.06);border-radius:0 8px 8px 0">' + d.note + '</div>' : '')
        + '</div>'
        + '<div style="display:flex;gap:8px;align-items:center">'
        +   '<a class="btn primary" href="' + d.url + '" target="_blank" rel="noopener" style="text-decoration:none">Open in new tab ↗</a>'
        +   '<button class="btn" id="int-copy">Copy link</button>'
        + '</div>'
        + '</div>';
      v.appendChild(head);

      var hint = el('div', 'note',
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5m0 3h.01"/></svg>'
        + 'Web view below — sign in as usual. If the pane stays blank, <b>' + d.name + '</b> refuses to load inside another page (most payment/cloud consoles block embedding for security). Use <b>Open in new tab ↗</b> instead.');
      v.appendChild(hint);

      var fr = el('div', 'card pad0');
      var ifr = document.createElement('iframe');
      ifr.src = d.url; ifr.title = d.name + ' console';
      ifr.setAttribute('referrerpolicy', 'no-referrer');
      ifr.style.cssText = 'width:100%;height:max(560px,calc(100vh - 340px));border:0;display:block;border-radius:0 0 12px 12px;background:#fff';
      fr.appendChild(ifr);
      v.appendChild(fr);

      var cp = head.querySelector('#int-copy');
      if (cp) cp.onclick = function () {
        (navigator.clipboard ? navigator.clipboard.writeText(d.url) : Promise.reject())
          .then(function () { if (typeof toast === 'function') toast('Link copied'); })
          .catch(function () { window.prompt('Copy the console URL:', d.url); });
      };
      return v;
    };
  }

  INTEGRATIONS.forEach(function (d) { VIEWS[d.id] = intView(d); });

  if (typeof TITLES !== 'undefined') {
    INTEGRATIONS.forEach(function (d) { TITLES[d.id] = ['Integrations', d.name, d.purpose]; });
  }
  if (typeof NAV !== 'undefined' && !NAV.some(function (g) { return g.grp === 'Integrations'; })) {
    NAV.push({ grp: 'Integrations', collapsible: true, collapsed: true,
      items: INTEGRATIONS.map(function (d) { return { id: d.id, name: d.name, icon: d.icon }; }) });
  }
  if (typeof buildNav === 'function') buildNav();
  if (location.hash && typeof go === 'function' && INTEGRATIONS.some(function (d) { return '#' + d.id === location.hash; })) {
    go(location.hash.slice(1));
  }
})();
