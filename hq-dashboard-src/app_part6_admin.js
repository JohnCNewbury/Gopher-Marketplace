/* ============================================================================
   Admin-Panel parity views  (app_part6_admin.js)  — G40-321 step 4
   Self-registers an "Admin" group in NAV (same pattern as app_part5_iq.js:
   push into NAV/TITLES/VIEWS, then buildNav()). No edits to app_part1..5.

   These are the operational features the old Active Admin panel had that the
   dashboard lacked. Every view here is LIVE-ONLY (no baked data): it calls the
   admin API via _hqReq() and shows a "connect window.MSG_CONFIG" notice until
   the serving shim injects it. Endpoints mirror gopher-admin-frontend.

   Design note: columns are INFERRED from the API response (union of row keys),
   so the tables keep working even if backend field names differ from our guess.
   Create/edit forms for Promo Codes infer their fields from an existing row.
   Gopher Offers + Addresses are intentionally NOT re-added here — they already
   exist as (now hourly-fresh) baked reports; see the parity audit.
   ============================================================================ */
(function () {
  'use strict';
  if (typeof VIEWS === 'undefined' || typeof el === 'undefined') return; // loaded out of order — bail safely

  function _id(r) { return r && (r.id != null ? r.id : r.user_id != null ? r.user_id : r._id); }
  function _asRows(d) {
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.rows)) return d.rows;
    if (d && typeof d === 'object') return [d];
    return [];
  }
  function _cols(rows) { // union of scalar-ish keys, first-seen order
    var seen = {}, cols = [];
    rows.slice(0, 50).forEach(function (r) {
      if (r && typeof r === 'object') Object.keys(r).forEach(function (k) {
        if (!(k in seen)) { seen[k] = 1; cols.push(k); }
      });
    });
    return cols;
  }
  function _cell(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return iaEsc(JSON.stringify(v));
    return iaEsc(String(v));
  }
  function _csv(rows, cols, name) {
    var esc = function (v) {
      if (v === null || v === undefined) v = '';
      if (typeof v === 'object') v = JSON.stringify(v);
      v = String(v);
      return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var text = cols.join(',') + '\n' + rows.map(function (r) {
      return cols.map(function (c) { return esc(r ? r[c] : ''); }).join(',');
    }).join('\n');
    var b = new Blob([text], { type: 'text/csv' }), u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = name + '_' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
    setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
  }

  // Generic live-admin list view. cfg: {key,title,sub,list(page)->path, listMethod, listBody(page),
  //   paginate, columns?, rowAction(r,td,ctx), create(ctx)}  ctx={reload,formHost,sample}
  function adminView(cfg) {
    return function () {
      var wrap = el('div');
      if (!_hqReady()) {
        wrap.appendChild(card(cfg.title, cfg.sub, el('div', null,
          '<div style="padding:14px;color:var(--muted);font-size:13px">'
          + _opEarmark('connect window.MSG_CONFIG to load live ' + cfg.title)
          + ' — this view reads and writes the admin API directly.</div>')));
        return wrap;
      }
      var state = { page: 0, rows: [], cols: [] };
      var bar = el('div'); bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px';
      var formHost = el('div'); formHost.style.marginBottom = '10px';
      var host = el('div');
      wrap.appendChild(bar); wrap.appendChild(formHost); wrap.appendChild(host);

      function load() {
        host.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:13px">Loading…</div>';
        _hqReq(cfg.listMethod || 'GET', cfg.list(state.page), cfg.listBody ? cfg.listBody(state.page) : undefined)
          .then(function (d) { state.rows = _asRows(d); state.cols = cfg.columns || _cols(state.rows); paint(); })
          .catch(function (e) { host.innerHTML = '<div style="padding:14px;color:#d4503a;font-size:13px">' + iaEsc('' + (e && e.message || e)) + '</div>'; });
      }
      function paint() {
        var t = el('table', 'tbl'); t.style.cssText = 'width:100%;border-collapse:collapse;font-size:12.5px';
        t.innerHTML = '<thead><tr>' + state.cols.map(function (c) {
          return '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid var(--line,#e6eaee)">' + iaEsc(c) + '</th>';
        }).join('') + (cfg.rowAction ? '<th style="padding:6px 8px"></th>' : '') + '</tr></thead>';
        var tb = el('tbody');
        if (!state.rows.length) {
          tb.innerHTML = '<tr><td colspan="' + (state.cols.length + 1) + '" style="padding:14px;color:var(--muted)">No rows.</td></tr>';
        }
        state.rows.forEach(function (r) {
          var tr = el('tr');
          tr.innerHTML = state.cols.map(function (c) {
            return '<td style="padding:6px 8px;border-top:1px solid var(--line-2,#eef1f4)">' + _cell(r[c]) + '</td>';
          }).join('');
          if (cfg.rowAction) {
            var td = el('td'); td.style.cssText = 'padding:6px 8px;border-top:1px solid var(--line-2,#eef1f4);white-space:nowrap';
            cfg.rowAction(r, td, { reload: load, formHost: formHost });
            tr.appendChild(td);
          }
          tb.appendChild(tr);
        });
        t.appendChild(tb);
        host.innerHTML = '';
        host.appendChild(card(cfg.title, cfg.sub + ' · ' + num(state.rows.length) + ' shown', t));
      }

      var refresh = el('button', 'btn', 'Refresh'); refresh.onclick = load; bar.appendChild(refresh);
      var csv = el('button', 'btn', 'Export CSV'); csv.onclick = function () { _csv(state.rows, state.cols, cfg.key); }; bar.appendChild(csv);
      if (cfg.paginate) {
        var prev = el('button', 'btn', '‹ Prev'), next = el('button', 'btn', 'Next ›'), lbl = el('span');
        lbl.style.cssText = 'font-size:12px;color:var(--muted)';
        function syncLbl() { lbl.textContent = 'Page ' + (state.page + 1); }
        prev.onclick = function () { if (state.page > 0) { state.page--; syncLbl(); load(); } };
        next.onclick = function () { state.page++; syncLbl(); load(); };
        bar.appendChild(prev); bar.appendChild(next); bar.appendChild(lbl); syncLbl();
      }
      if (cfg.create) {
        var add = el('button', 'btn primary', 'New');
        add.onclick = function () { cfg.create({ formHost: formHost, reload: load, sample: state.rows[0] }); };
        bar.appendChild(add);
      }
      load();
      return wrap;
    };
  }

  // ---- Promo Codes: /admin/coupons  (list ?pageNo · create POST · update POST/:id · delete DELETE/:id) ----
  function _couponForm(ctx, row) {
    var sample = row || ctx.sample || null;
    var f = el('div', 'card'); f.innerHTML = '<div style="font-weight:800;margin-bottom:8px">' + (row ? 'Edit promo code' : 'New promo code') + '</div>';
    var body = el('div'); f.appendChild(body);
    var inputs = {}, jsonMode = false, jsonTa = null;
    var fields = sample ? Object.keys(sample).filter(function (k) { return !/^(id|_.*|created_?at|updated_?at)$/i.test(k); }) : null;
    if (fields && fields.length) {
      fields.forEach(function (k) {
        var lbl = el('label', null, iaEsc(k)); lbl.style.cssText = 'display:block;font-size:11.5px;color:var(--muted);margin:8px 0 3px';
        var inp = el('input'); inp.value = (row && row[k] != null) ? String(row[k]) : '';
        inp.style.cssText = 'width:100%;padding:8px 10px;border:1px solid var(--line,#e6eaee);border-radius:8px;font-size:13px;box-sizing:border-box';
        inputs[k] = inp; body.appendChild(lbl); body.appendChild(inp);
      });
    } else {
      jsonMode = true;
      body.appendChild(el('div', null, '<div style="font-size:12px;color:var(--muted);margin-bottom:6px">No existing coupon to infer fields — enter the coupon as JSON.</div>'));
      jsonTa = el('textarea'); jsonTa.rows = 6; jsonTa.value = row ? JSON.stringify(row, null, 2) : '{\n  "code": "",\n  "discount": 0\n}';
      jsonTa.style.cssText = 'width:100%;padding:8px 10px;border:1px solid var(--line,#e6eaee);border-radius:8px;font-family:monospace;font-size:12px;box-sizing:border-box';
      body.appendChild(jsonTa);
    }
    var msg = el('div'); msg.style.cssText = 'font-size:12px;margin-top:8px';
    var save = el('button', 'btn primary', row ? 'Save' : 'Create'), cancel = el('button', 'btn', 'Cancel');
    var acts = el('div'); acts.style.cssText = 'display:flex;gap:8px;margin-top:10px'; acts.appendChild(save); acts.appendChild(cancel);
    f.appendChild(acts); f.appendChild(msg);
    cancel.onclick = function () { ctx.formHost.innerHTML = ''; };
    save.onclick = function () {
      var payload;
      if (jsonMode) { try { payload = JSON.parse(jsonTa.value); } catch (e) { msg.style.color = '#d4503a'; msg.textContent = 'Invalid JSON'; return; } }
      else { payload = {}; Object.keys(inputs).forEach(function (k) { payload[k] = inputs[k].value; }); }
      var id = row && _id(row);
      msg.style.color = 'var(--muted)'; msg.textContent = 'Saving…';
      _hqReq('POST', '/admin/coupons' + (id != null ? '/' + id : ''), payload)
        .then(function () { ctx.formHost.innerHTML = ''; toast(id != null ? 'Updated' : 'Created'); ctx.reload(); })
        .catch(function (e) { msg.style.color = '#d4503a'; msg.textContent = '' + (e && e.message || e); });
    };
    ctx.formHost.innerHTML = ''; ctx.formHost.appendChild(f);
  }
  VIEWS.promocodes = adminView({
    key: 'promocodes', title: 'Promo Codes', sub: 'Live discount coupons from the admin API.',
    paginate: true, list: function (p) { return '/admin/coupons?pageNo=' + p; },
    rowAction: function (r, td, ctx) {
      var edit = el('button', 'btn', 'Edit'); edit.style.marginRight = '6px';
      edit.onclick = function () { _couponForm({ formHost: ctx.formHost, reload: ctx.reload }, r); };
      var del = el('button', 'btn', 'Delete');
      del.onclick = function () {
        if (!confirm('Delete this promo code?')) return;
        _hqReq('DELETE', '/admin/coupons/' + _id(r)).then(function () { toast('Deleted'); ctx.reload(); })
          .catch(function (e) { toast('Error: ' + (e && e.message || e)); });
      };
      td.appendChild(edit); td.appendChild(del);
    },
    create: function (ctx) { _couponForm(ctx, null); }
  });

  // ---- Webhooks: /admin/webhook  (list · create POST · update PUT/:id · delete DELETE/:id) ----
  function _webhookForm(ctx, row) {
    var f = el('div', 'card'); f.innerHTML = '<div style="font-weight:800;margin-bottom:8px">' + (row ? 'Edit webhook' : 'New webhook') + '</div>';
    var ev = el('input'); ev.placeholder = 'event (e.g. order.completed)'; ev.value = (row && row.event) || '';
    var url = el('input'); url.placeholder = 'https://…'; url.value = (row && row.url) || '';
    [ev, url].forEach(function (i) { i.style.cssText = 'display:block;width:100%;margin:6px 0;padding:8px 10px;border:1px solid var(--line,#e6eaee);border-radius:8px;font-size:13px;box-sizing:border-box'; });
    f.appendChild(ev); f.appendChild(url);
    var msg = el('div'); msg.style.cssText = 'font-size:12px;margin-top:8px';
    var save = el('button', 'btn primary', row ? 'Save' : 'Create'), cancel = el('button', 'btn', 'Cancel');
    var acts = el('div'); acts.style.cssText = 'display:flex;gap:8px;margin-top:6px'; acts.appendChild(save); acts.appendChild(cancel);
    f.appendChild(acts); f.appendChild(msg);
    cancel.onclick = function () { ctx.formHost.innerHTML = ''; };
    save.onclick = function () {
      var id = row && _id(row);
      msg.style.color = 'var(--muted)'; msg.textContent = 'Saving…';
      _hqReq(id != null ? 'PUT' : 'POST', '/admin/webhook' + (id != null ? '/' + id : ''), { event: ev.value, url: url.value })
        .then(function () { ctx.formHost.innerHTML = ''; toast(id != null ? 'Updated' : 'Created'); ctx.reload(); })
        .catch(function (e) { msg.style.color = '#d4503a'; msg.textContent = '' + (e && e.message || e); });
    };
    ctx.formHost.innerHTML = ''; ctx.formHost.appendChild(f);
  }
  VIEWS.webhooks = adminView({
    key: 'webhooks', title: 'Webhooks', sub: 'Event → URL webhook subscriptions.',
    list: function () { return '/admin/webhook'; },
    rowAction: function (r, td, ctx) {
      var edit = el('button', 'btn', 'Edit'); edit.style.marginRight = '6px';
      edit.onclick = function () { _webhookForm({ formHost: ctx.formHost, reload: ctx.reload }, r); };
      var del = el('button', 'btn', 'Delete');
      del.onclick = function () {
        if (!confirm('Delete this webhook?')) return;
        _hqReq('DELETE', '/admin/webhook/' + _id(r)).then(function () { toast('Deleted'); ctx.reload(); })
          .catch(function (e) { toast('Error: ' + (e && e.message || e)); });
      };
      td.appendChild(edit); td.appendChild(del);
    },
    create: function (ctx) { _webhookForm(ctx, null); }
  });

  // ---- OTP Blocked: GET /admin/blocked_users · PUT /admin/blocked_users/:id to unblock ----
  VIEWS.otp_blocked = adminView({
    key: 'otp_blocked', title: 'OTP Blocked', sub: 'Users blocked after too many OTP attempts — unblock to restore access.',
    list: function () { return '/admin/blocked_users'; },
    rowAction: function (r, td, ctx) {
      var b = el('button', 'btn', 'Unblock');
      b.onclick = function () {
        b.disabled = true; b.textContent = '…';
        _hqReq('PUT', '/admin/blocked_users/' + _id(r)).then(function () { toast('Unblocked'); ctx.reload(); })
          .catch(function (e) { b.disabled = false; b.textContent = 'Unblock'; toast('Error: ' + (e && e.message || e)); });
      };
      td.appendChild(b);
    }
  });

  // ---- OOA Unsubscribed: GET /admin/broadcast/OOA?pageNo= (distinct from the 'ooa' demand report) ----
  VIEWS.ooa_unsub = adminView({
    key: 'ooa_unsub', title: 'OOA Unsubscribed', sub: 'Users who opted out of Out-of-Area broadcast emails.',
    paginate: true, list: function (p) { return '/admin/broadcast/OOA?pageNo=' + p; }
  });

  // ---- Connected Users: POST /admin/connected_users?pageNo= ----
  VIEWS.connected_users = adminView({
    key: 'connected_users', title: 'Connected Users', sub: 'Linked / connected user accounts.',
    paginate: true, listMethod: 'POST', list: function (p) { return '/admin/connected_users?pageNo=' + p; }, listBody: function () { return {}; }
  });

  /* ---------- register the Admin group (same pattern as app_part5_iq.js) ---------- */
  var ADMIN_ITEMS = [
    { id: 'promocodes', name: 'Promo Codes', icon: 'tag', sub: 'Live discount coupons from the admin API.' },
    { id: 'webhooks', name: 'Webhooks', icon: 'bolt', sub: 'Event → URL webhook subscriptions.' },
    { id: 'connected_users', name: 'Connected Users', icon: 'users', sub: 'Linked / connected user accounts.' },
    { id: 'otp_blocked', name: 'OTP Blocked', icon: 'shield', sub: 'Users blocked after too many OTP attempts.' },
    { id: 'ooa_unsub', name: 'OOA Unsubscribed', icon: 'pin', sub: 'Users who opted out of Out-of-Area broadcast emails.' }
  ];
  if (typeof TITLES !== 'undefined') {
    ADMIN_ITEMS.forEach(function (it) { TITLES[it.id] = ['Admin', it.name, it.sub]; });
  }
  if (typeof NAV !== 'undefined' && !NAV.some(function (g) { return g.grp === 'Admin'; })) {
    NAV.push({ grp: 'Admin', collapsible: true, collapsed: false, items: ADMIN_ITEMS.map(function (it) { return { id: it.id, name: it.name, icon: it.icon }; }) });
  }
  if (typeof buildNav === 'function') buildNav();
  if (location.hash && typeof go === 'function' && ADMIN_ITEMS.some(function (it) { return '#' + it.id === location.hash; })) {
    go(location.hash.slice(1));
  }
})();
