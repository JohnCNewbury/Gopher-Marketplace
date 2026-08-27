/* ============================================================================
   A PROVIDER'S JOB HISTORY, on the consumer card.

   The provider card has always shown three totals — jobs, rating, tier — above
   the words "Individual job records aren't shown here yet". Honest, and thin:
   the pitch of a Service Provider deal is "this person has done 52 jobs at
   5.0", and a customer could not see one of them.

   ⛔ ONE MODULE, BOTH PAGES. Request and Connect render the same provider card
   and have drifted apart before — the feed module was extracted for exactly
   this reason. A second copy of this logic would disagree with the first
   within a week.

   ⛔ KEYED ON THE DEAL CODE. The API is /deals/:code/provider-history, not
   /providers/:id. The feed never publishes owner_user_id, so a worker's
   primary key stays off a public page and no one can enumerate histories by
   counting.

   ⛔ WHAT A ROW SHOWS: category, month/year, rating. Never the past customer,
   what they paid, what they wrote, or the exact day — they never agreed to
   appear on someone else's sales card. The endpoint does not return those
   fields; this file could not render them if it tried.
   ========================================================================= */
(function () {
  'use strict';

  var MONTHS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function apiBase() {
    /* The pages already hold the base wherever they talk to the API; this
       module never invents one. Absent base means the surface is not wired to
       a live backend, and the card keeps its existing message. */
    var c = window.MSG_CONFIG || window.GOPHER_API || {};
    return c.base || window.GOPHER_API_BASE || '';
  }

  /* One row: "Home Services · Aug 2026 · ★5.0".
     ⛔ An unrated job says "Not rated", never 0 or a blank star — a zero is a
     claim about the work, and the customer did not make it. */
  function rowHtml(j) {
    var when = j.month && j.year ? MONTHS[j.month] + ' ' + j.year : '';
    var rating = j.rating == null
      ? '<span class="pjh-unrated">Not rated</span>'
      : '<span class="pjh-star">★ ' + esc(Number(j.rating).toFixed(1)) + '</span>';
    return '<div class="pjh-row">' +
      '<span class="pjh-cat">' + esc(j.category) + '</span>' +
      (when ? '<span class="pjh-when">' + esc(when) + '</span>' : '') +
      rating +
    '</div>';
  }

  function render(host, data, scope) {
    var jobs = (data.jobs && data.jobs[scope]) || [];
    var counts = data.counts || {};
    var other = scope === 'service' ? 'all' : 'service';

    if (!jobs.length) {
      /* A provider can genuinely have zero of one kind — an SP with no
         non-service work, or a brand-new one. Say which, rather than showing
         an empty box. */
      host.querySelector('.pjh-list').innerHTML =
        '<div class="pjh-empty">' +
        (scope === 'service'
          ? 'No completed service jobs yet.'
          : 'No completed jobs yet.') +
        '</div>';
    } else {
      host.querySelector('.pjh-list').innerHTML =
        jobs.map(rowHtml).join('') +
        (data.truncated
          ? '<div class="pjh-more">Showing the ' + jobs.length +
            ' most recent of ' + esc(counts[scope]) + '.</div>'
          : '');
    }
    host.querySelectorAll('[data-pjh-scope]').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-pjh-scope') === scope);
    });
    void other;
  }

  /**
   * Mount the history into a container.
   * @param {HTMLElement} host  the element to fill
   * @param {string} dealCode   the live deal's code
   */
  function mount(host, dealCode) {
    if (!host || !dealCode) return;
    var base = apiBase();
    if (!base) return;               // not wired to a backend: leave as-is

    host.innerHTML =
      '<div class="pjh-tabs">' +
        '<button type="button" class="pjh-tab on" data-pjh-scope="service">Service jobs</button>' +
        '<button type="button" class="pjh-tab" data-pjh-scope="all">All jobs</button>' +
      '</div>' +
      '<div class="pjh-list"><div class="pjh-empty">Loading…</div></div>';

    fetch(base.replace(/\/$/, '') + '/deals/' +
          encodeURIComponent(dealCode) + '/provider-history')
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d || !d.success) throw new Error('no history');
        var counts = d.counts || {};
        /* The COUNT goes in the tab, so the two numbers are visible together.
           They can differ wildly and legitimately — a provider with 3,666
           deliveries and 12 service jobs is one real case — and labelling them
           only "Service" and "All" makes that read as a bug rather than as two
           honest views of the same person. */
        host.querySelector('[data-pjh-scope="service"]').textContent =
          'Service jobs (' + (counts.service || 0) + ')';
        host.querySelector('[data-pjh-scope="all"]').textContent =
          'All jobs (' + (counts.all || 0) + ')';
        host.querySelectorAll('[data-pjh-scope]').forEach(function (b) {
          b.addEventListener('click', function () {
            render(host, d, b.getAttribute('data-pjh-scope'));
          });
        });
        render(host, d, 'service');
      })
      .catch(function () {
        /* ⛔ Silent, and back to the honest message. A red error on a sales
           card tells the customer nothing they can act on and makes a working
           provider look broken. */
        host.innerHTML =
          '<div class="pjh-empty">Individual job records aren’t shown here ' +
          'yet — the totals above are this provider’s Gopher history.</div>';
      });
  }

  function injectStyle() {
    if (document.getElementById('pjh-style')) return;
    var st = document.createElement('style');
    st.id = 'pjh-style';
    st.textContent =
      '.pjh-tabs{display:flex;gap:8px;margin:4px 0 10px}' +
      '.pjh-tab{font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;' +
        'border:1px solid rgba(0,36,97,.18);background:#fff;color:#002461;' +
        'padding:6px 14px;border-radius:999px}' +
      '.pjh-tab.on{background:#002461;color:#fff;border-color:#002461}' +
      '.pjh-tab:focus-visible{outline:2px solid #002461;outline-offset:2px}' +
      '.pjh-row{display:flex;align-items:baseline;gap:10px;padding:7px 0;' +
        'border-bottom:1px solid rgba(0,36,97,.08);font-size:13px}' +
      '.pjh-row:last-child{border-bottom:none}' +
      '.pjh-cat{font-weight:700;flex:1;min-width:0}' +
      '.pjh-when{color:#64748B;font-size:12px;white-space:nowrap}' +
      '.pjh-star{color:#002461;font-weight:700;white-space:nowrap}' +
      '.pjh-unrated{color:#94A3B8;font-size:12px;white-space:nowrap}' +
      '.pjh-empty{color:#64748B;font-size:12.5px;padding:6px 0}' +
      '.pjh-more{color:#64748B;font-size:11.5px;padding:8px 0 0}';
    document.head.appendChild(st);
  }

  /* ── SELF-WIRING ────────────────────────────────────────────────────────
     Both pages build the provider card from a template string, at different
     points in different flows, and the card is re-rendered whenever the modal
     re-opens. Hooking two render paths means two places to forget; marking the
     spot in the markup and watching for it means one.

     Cheap by construction: the observer only ever looks at ADDED nodes, acts
     only on [data-pjh] carrying a code, and stamps each one so a re-render
     mounts again but a re-observation does not. */
  var MOUNTED = 'pjhDone';

  function wire(root) {
    if (!root || !root.querySelectorAll) return;
    var hosts = [];
    if (root.matches && root.matches('[data-pjh]')) hosts.push(root);
    Array.prototype.push.apply(hosts, root.querySelectorAll('[data-pjh]'));
    hosts.forEach(function (h) {
      if (h.dataset[MOUNTED]) return;
      var code = h.getAttribute('data-pjh');
      if (!code) return;             // demo card, or a deal with no code
      h.dataset[MOUNTED] = '1';
      mount(h, code);
    });
  }

  injectStyle();
  if (typeof MutationObserver === 'function') {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes || [], function (n) {
          if (n.nodeType === 1) wire(n);
        });
      });
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState !== 'loading') wire(document.body);
  else document.addEventListener('DOMContentLoaded', function () { wire(document.body); });

  /* Exposed so a page can mount explicitly if it ever needs to. */
  window.GopherProviderHistory = { mount: mount, wire: wire };
}());
