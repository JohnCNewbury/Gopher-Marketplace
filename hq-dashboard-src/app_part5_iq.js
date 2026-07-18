/* ============================================================================
   Gopher iQ — upload & triage portal  (app_part5_iq.js)
   Self-registers a "Gopher iQ" section in the Tools group. No edits to
   app_part1..4 — it pushes into NAV/TITLES/VIEWS and re-renders the nav.

   Flow: upload a keyword file + structured notes -> triage each term against
   the seeded iQ stores (baked as M._iqcore) -> recognized / partial / new ->
   stage PROPOSED entries (localStorage + export) and, when new logic is needed,
   generate a developer ticket. Nothing here changes live behavior; a human
   promotes proposed -> active (promote_iq.py), then a refresh bakes it in.
   ============================================================================ */
(function () {
  'use strict';

  /* ---------- PURE triage core (no DOM; unit-tested headlessly) ---------- */
  function iqParseTerms(text) {
    if (!text) return [];
    var out = [], seen = {};
    String(text).split(/\r?\n/).forEach(function (line, i) {
      var cell = line.split(',')[0];            // first column if CSV
      var t = (cell || '').trim().replace(/^["']|["']$/g, '').toLowerCase();
      if (!t) return;
      if (i === 0 && /^(term|word|keyword|phrase)s?$/.test(t)) return;  // header
      if (!seen[t]) { seen[t] = 1; out.push(t); }
    });
    return out;
  }

  function iqTriage(terms, domain, bucket, core) {
    core = core || {};
    var routing = core.routing || { slugs: [], word2slugs: {} };
    var mod = core.moderation || { policies: [], term2policies: {} };
    var rows = [], known = 0, collision = 0, fresh = 0;
    var checkable = (domain === 'routing' || domain === 'moderation');
    var bucketKnown =
      domain === 'routing' ? routing.slugs.some(function (s) { return s.slug === bucket; }) :
      domain === 'moderation' ? mod.policies.indexOf(bucket) >= 0 : false;

    terms.forEach(function (raw) {
      var term = String(raw || '').trim().toLowerCase();
      if (!term) return;
      var status = 'new', detail = '', owners = null;

      if (domain === 'routing') {
        owners = routing.word2slugs[term] || null;
        if (!owners && /\s/.test(term)) {            // multiword: token-level
          var hit = {};
          term.split(/\s+/).forEach(function (w) {
            if (w.length >= 3) (routing.word2slugs[w] || []).forEach(function (s) { hit[s] = 1; });
          });
          owners = Object.keys(hit); if (!owners.length) owners = null;
        }
      } else if (domain === 'moderation') {
        owners = mod.term2policies[term] || null;
      }

      if (!checkable) { status = 'new'; detail = 'domain not keyword-checkable — needs developer'; }
      else if (!owners) { status = 'new'; detail = 'not in any ' + (domain === 'routing' ? 'category' : 'policy'); }
      else if (owners.indexOf(bucket) >= 0) { status = 'known'; detail = 'already in ' + bucket; }
      else { status = 'collision'; detail = 'also maps to ' + owners.join(', '); }

      if (status === 'known') known++; else if (status === 'collision') collision++; else fresh++;
      rows.push({ term: term, status: status, detail: detail });
    });

    var total = rows.length, verdict;
    if (!checkable || !bucketKnown) verdict = 'new';            // target logic doesn't exist
    else if (collision / Math.max(1, total) > 0.15) verdict = 'partial';
    else verdict = 'recognized';
    return { verdict: verdict, total: total, known: known, collision: collision, neu: fresh,
             bucketKnown: bucketKnown, checkable: checkable, rows: rows };
  }

  // expose for headless tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { iqParseTerms: iqParseTerms, iqTriage: iqTriage };
    return;
  }

  /* ---------- staging (localStorage + export), house pattern ---------- */
  function propLoad() { try { return JSON.parse(localStorage.getItem('gopher_iq_proposals') || '[]'); } catch (e) { return []; } }
  function propSave(a) { try { localStorage.setItem('gopher_iq_proposals', JSON.stringify(a)); return true; } catch (e) { return false; } }
  function download(name, text, mime) {
    var b = new Blob([text], { type: mime || 'application/json' });
    var u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = name; a.click(); setTimeout(function () { URL.revokeObjectURL(u); }, 1500);
  }

  /* ---------- the view ---------- */
  var STATE = { terms: [], fileName: '', result: null };

  function bucketOptions(domain) {
    var core = (typeof M!=='undefined' && M._iqcore) || {};
    if (domain === 'routing') return ((core.routing || {}).slugs || []).map(function (s) { return [s.slug, s.label]; });
    if (domain === 'moderation') return ((core.moderation || {}).policies || []).map(function (p) { return [p, p]; });
    return [['__na__', '(not applicable — routes to developer)']];
  }

  function renderResult(host) {
    host.innerHTML = '';
    var r = STATE.result; if (!r) return;
    var vColor = r.verdict === 'recognized' ? '#1CB061' : r.verdict === 'partial' ? '#d9952f' : '#3f2c8a';
    var vText = r.verdict === 'recognized' ? 'Recognized — target logic exists; new terms can be staged as proposals'
              : r.verdict === 'partial' ? 'Partial — bucket exists but collisions need a human decision'
              : 'New — no matching logic; route to a developer to build it';

    var banner = el('div', null,
      '<div style="padding:12px 14px;border-radius:10px;border:1px solid ' + vColor + '33;background:' + vColor + '0d;color:' + vColor + ';font-weight:700">'
      + r.verdict.toUpperCase() + ' &nbsp;·&nbsp; ' + vText + '</div>');
    host.appendChild(banner);

    var k = el('div', 'row g2'); k.style.marginTop = '12px';
    k.appendChild(kpi('Terms', num(r.total), STATE.fileName || 'uploaded'));
    k.appendChild(kpi('New', num(r.neu), 'not seen before', { dot: '#3f2c8a' }));
    k.appendChild(kpi('Already known', num(r.known), 'in target bucket', { dot: '#1CB061' }));
    k.appendChild(kpi('Collisions', num(r.collision), 'map elsewhere', { dot: '#d9952f' }));
    host.appendChild(k);

    // sample table (cap rows for big files)
    var cap = 250, shown = r.rows.slice(0, cap);
    var t = el('table', 'tbl'); t.style.cssText = 'width:100%;border-collapse:collapse;margin-top:10px;font-size:13px';
    t.innerHTML = '<thead><tr><th style="text-align:left;padding:6px 8px">Term</th>'
      + '<th style="text-align:left;padding:6px 8px">Status</th>'
      + '<th style="text-align:left;padding:6px 8px">Detail</th></tr></thead>';
    var tb = el('tbody');
    shown.forEach(function (row) {
      var c = row.status === 'known' ? '#1CB061' : row.status === 'collision' ? '#d9952f' : '#3f2c8a';
      var tr = el('tr');
      tr.innerHTML = '<td style="padding:6px 8px;border-top:1px solid var(--line-2,#eee)">' + row.term + '</td>'
        + '<td style="padding:6px 8px;border-top:1px solid var(--line-2,#eee);color:' + c + ';font-weight:700">' + row.status + '</td>'
        + '<td style="padding:6px 8px;border-top:1px solid var(--line-2,#eee);color:#667">' + row.detail + '</td>';
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    var tcard = card('Per-term triage', r.rows.length > cap ? ('Showing first ' + cap + ' of ' + num(r.rows.length) + '.') : ('All ' + num(r.rows.length) + ' terms.'), t);
    host.appendChild(tcard);

    // actions
    var acts = el('div', null); acts.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap;margin-top:12px';
    var stage = el('button', 'btn primary', 'Stage as proposals');
    var exp = el('button', 'btn', 'Export proposals JSON');
    acts.appendChild(stage); acts.appendChild(exp);
    var ticket = null;
    if (r.verdict === 'new') { ticket = el('button', 'btn', 'Generate developer ticket'); acts.appendChild(ticket); }
    host.appendChild(acts);

    function batch() {
      return {
        id: 'iqp_' + Date.now(), ts: new Date().toISOString(),
        domain: STATE.domain, bucket: STATE.bucket, behavior: STATE.behavior, context: STATE.context,
        verdict: r.verdict, counts: { total: r.total, neu: r.neu, known: r.known, collision: r.collision },
        status: 'proposed',
        terms: r.rows.map(function (x) { return { term: x.term, status: x.status }; })
      };
    }
    stage.onclick = function () {
      var all = propLoad(); all.push(batch()); propSave(all);
      toast('Staged ' + r.neu + ' new + ' + r.collision + ' collisions as proposals (not live until promoted)');
    };
    exp.onclick = function () {
      var payload = { _kind: 'iq_proposals', generated_at: new Date().toISOString(), batches: [batch()] };
      download('iq_proposals_' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(payload, null, 2));
      toast('Exported — drop into data/incoming/ and refresh to stage; promote_iq.py to make active');
    };
    if (ticket) ticket.onclick = function () {
      var b = batch();
      var md = '# Gopher iQ — new logic request\n\n'
        + '- **When:** ' + b.ts + '\n- **Target domain:** ' + b.domain + '\n- **Target bucket:** ' + b.bucket
        + '\n- **Intended behavior:** ' + (b.behavior || '(none given)') + '\n- **Verdict:** ' + b.verdict + '\n\n'
        + '## Context\n' + (b.context || '(none given)') + '\n\n'
        + '## Counts\n- total: ' + b.counts.total + '\n- new: ' + b.counts.neu + '\n- already known: ' + b.counts.known
        + '\n- collisions: ' + b.counts.collision + '\n\n'
        + '## Why this is a build (not just an add)\n'
        + (r.checkable ? 'The target bucket isn\u2019t part of current logic, so terms can\u2019t be auto-routed.\n'
                       : 'This domain (' + b.domain + ') isn\u2019t keyword-checkable in iQ today; it needs implementation.\n')
        + '\n## Sample terms (first 50)\n' + b.terms.slice(0, 50).map(function (x) { return '- ' + x.term + ' (' + x.status + ')'; }).join('\n') + '\n';
      download('iq_dev_ticket_' + new Date().toISOString().slice(0, 10) + '.md', md, 'text/markdown');
      toast('Developer ticket generated');
    };
  }

  VIEWS.iq_portal = function () {
    var wrap = el('div');

    // Owner-only — like Pricing Control. In Admin mode this is closed off: admins see a
    // lock, not the uploader, because the portal writes to the keyword brain behind
    // routing, moderation, and pricing.
    if (typeof ROLE !== 'undefined' && ROLE !== 'owner') {
      wrap.appendChild(card('Owner access required',
        'Gopher iQ feeds the keyword brain behind routing, moderation, and pricing — so, like Pricing Control, only an Owner can use it. Switch your role to Owner in the bottom-left to upload and triage.',
        (function () {
          var d = el('div'); d.style.marginTop = '16px';
          var b = el('button', 'btn primary', 'Switch to Owner');
          b.onclick = function () { if (typeof setRole === 'function') setRole('owner'); };
          d.appendChild(b); return d;
        })()));
      return wrap;
    }

    var core = (typeof M!=='undefined' && M._iqcore) || null;

    if (!core) {
      wrap.appendChild(card('Gopher iQ', 'The iQ knowledge index isn\u2019t baked into this build yet.',
        el('div', null, '<div style="padding:10px;color:#667">Run a refresh after seeding the iq_*.json stores (build.py bakes M._iqcore). Until then, triage can\u2019t run.</div>')));
      return wrap;
    }

    // intro
    wrap.appendChild(card('Upload & triage', 'Upload a keyword file and describe where it should go. Each term is checked against the live iQ stores — already known, collides with another bucket, or new. Nothing changes live behavior; you stage proposals and a human promotes them.', (function () {
      var f = el('div'); f.style.cssText = 'display:grid;gap:16px';
      var LBL = 'font-weight:700;font-size:12px;color:var(--text);display:block;margin-bottom:6px';
      var INP = 'width:100%;border:1px solid var(--line);border-radius:9px;padding:9px 11px;font-family:inherit;font-size:13px;color:var(--text);background:#fff;outline:none;box-sizing:border-box';
      function focusable(n) { n.addEventListener('focus', function () { n.style.borderColor = 'var(--green)'; }); n.addEventListener('blur', function () { n.style.borderColor = 'var(--line)'; }); }

      // file — styled drop zone, matching the dashboard's .placeholder pattern
      var fileWrap = el('div', null, '<label style="' + LBL + '">Keyword file</label>');
      var zone = el('div', 'placeholder');
      zone.style.cssText = 'padding:22px;cursor:pointer;transition:border-color .12s,background .12s';
      zone.innerHTML = '<div class="pi" style="width:44px;height:44px;margin:0 auto 10px">'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:22px;height:22px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div>'
        + '<div style="font-weight:700;color:var(--text);font-size:13px">Click to choose a file, or drop it here</div>'
        + '<div style="font-size:11.5px;color:var(--muted);margin-top:3px">.csv or .txt — one term per line, or the first CSV column</div>';
      var file = el('input'); file.type = 'file'; file.accept = '.csv,.txt,text/csv,text/plain'; file.style.display = 'none';
      var fileNote = el('div', null, ''); fileNote.style.cssText = 'font-size:12px;font-weight:700;color:var(--green);margin-top:8px';
      function handleFile(fl) {
        var rd = new FileReader();
        rd.onload = function () { STATE.terms = iqParseTerms(rd.result); STATE.fileName = fl.name; fileNote.textContent = '✓ ' + STATE.terms.length + ' unique terms parsed from ' + fl.name; };
        rd.readAsText(fl);
      }
      zone.onclick = function () { file.click(); };
      zone.ondragover = function (e) { e.preventDefault(); zone.style.borderColor = 'var(--green)'; zone.style.background = 'var(--green-soft)'; };
      zone.ondragleave = function () { zone.style.borderColor = ''; zone.style.background = ''; };
      zone.ondrop = function (e) { e.preventDefault(); zone.style.borderColor = ''; zone.style.background = ''; if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); };
      fileWrap.appendChild(zone); fileWrap.appendChild(file); fileWrap.appendChild(fileNote); f.appendChild(fileWrap);

      // domain + bucket — design-system .fl pills, same as every filter in the app
      var dom = el('select'); [['routing', 'Routing keyword'], ['moderation', 'Moderation policy'], ['pricing', 'Pricing'], ['other', 'Other']].forEach(function (o) { var op = el('option'); op.value = o[0]; op.textContent = o[1]; dom.appendChild(op); });
      var buck = el('select');
      function fillBuckets() { buck.innerHTML = ''; bucketOptions(dom.value).forEach(function (o) { var op = el('option'); op.value = o[0]; op.textContent = o[1]; buck.appendChild(op); }); }
      fillBuckets(); dom.onchange = fillBuckets;
      var domFl = el('div', 'fl'); domFl.appendChild(el('label', null, 'Target domain')); domFl.appendChild(dom);
      var buckFl = el('div', 'fl'); buckFl.appendChild(el('label', null, 'Target bucket')); buckFl.appendChild(buck);
      var grid = el('div'); grid.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap'; grid.appendChild(domFl); grid.appendChild(buckFl); f.appendChild(grid);

      // behavior + context
      var beh = el('input'); beh.type = 'text'; beh.placeholder = 'e.g. flag as age-restricted; add $2.99 fee; route to Delivery'; beh.style.cssText = INP + ';font-weight:600'; focusable(beh);
      var bhWrap = el('div', null, '<label style="' + LBL + '">Intended behavior</label>'); bhWrap.appendChild(beh); f.appendChild(bhWrap);
      var ctx = el('textarea'); ctx.rows = 3; ctx.placeholder = 'Anything the developer/reviewer should know: source of the list, edge cases, why now.'; ctx.style.cssText = INP + ';resize:vertical'; focusable(ctx);
      var cWrap = el('div', null, '<label style="' + LBL + '">Context / notes</label>'); cWrap.appendChild(ctx); f.appendChild(cWrap);

      // run — primary (green) call-to-action, matching the app's button style
      var run = el('button', 'btn primary', 'Run triage'); run.style.cssText = 'justify-self:start';
      f.appendChild(run);

      file.onchange = function (e) { var fl = e.target.files[0]; if (fl) handleFile(fl); };
      run.onclick = function () {
        if (!STATE.terms.length) { toast('Upload a keyword file first'); return; }
        STATE.domain = dom.value; STATE.bucket = buck.value; STATE.behavior = beh.value; STATE.context = ctx.value;
        STATE.result = iqTriage(STATE.terms, STATE.domain, STATE.bucket, core);
        renderResult($('#iqResult'));
        $('#iqResult').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      return f;
    })()));

    var res = el('div'); res.id = 'iqResult'; res.style.marginTop = '14px'; wrap.appendChild(res);

    // staged proposals summary
    var staged = propLoad();
    if (staged.length) {
      var s = el('div', null, '<div style="color:#667;font-size:13px">' + staged.length + ' proposal batch(es) staged locally. Use “Export proposals JSON” to hand them to the pipeline.</div>');
      var clear = el('button', 'btn', 'Clear staged'); clear.style.marginTop = '6px';
      clear.onclick = function () { propSave([]); toast('Cleared staged proposals'); go('iq_portal'); };
      var sc = el('div'); sc.appendChild(s); sc.appendChild(clear);
      wrap.appendChild(card('Staged proposals', 'Local only — never live until promoted.', sc));
    }
    return wrap;
  };

  /* ---------- register the section (runs after init()) ---------- */
  if (typeof ICONS !== 'undefined') ICONS.iqupload = '<path d="M12 16V4m0 0 4 4m-4-4-4 4"/><path d="M5 20h14"/>';
  if (typeof TITLES !== 'undefined') TITLES.iq_portal = ['Tools', 'Gopher iQ', 'Upload keywords, triage them against the iQ brain, and stage proposals for review.'];
  if (typeof NAV !== 'undefined') {
    var tools = NAV.filter(function (g) { return g.grp === 'Tools'; })[0];
    if (tools && !tools.items.some(function (i) { return i.id === 'iq_portal'; })) {
      tools.items.push({ id: 'iq_portal', name: 'Gopher iQ', icon: 'iqupload', pill: { t: 'iQ', c: 'new' } });
    }
  }
  if (typeof buildNav === 'function') buildNav();
  if (location.hash === '#iq_portal' && typeof go === 'function') go('iq_portal');
})();
