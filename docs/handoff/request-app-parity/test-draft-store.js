#!/usr/bin/env node
/* Tests for the request-draft kernel + store.
   Run: node docs/handoff/request-app-parity/test-draft-store.js   (exit 0 = pass)

   Everything time- or network-shaped is INJECTED (fake clock, fake timers, fake fetch),
   so these assert real behaviour deterministically instead of sleeping and hoping.
   The autosave pacing tests exist because the API has one global 30-req/sec limiter
   shared with live order traffic — pacing regressions there are a production risk, not
   a cosmetic one. */
'use strict';

var path = require('path');
var JS = path.join(__dirname, '..', '..', '..', 'Final', 'assets', 'js');
var K = require(path.join(JS, 'gopher-request-draft.js'));
var S = require(path.join(JS, 'gopher-request-draft-store.js'));

var pass = 0, fail = 0;
function ok(cond, label, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; console.log('  ✗ ' + label + (detail ? '  → ' + detail : '')); }
}
function section(t) { console.log('\n' + t); }

/* ── a controllable clock + timer queue ─────────────────────────────────────── */
function fakeEnv() {
  var t = 0, seq = 1, timers = {};
  return {
    now: function () { return t; },
    setTimeout: function (fn, ms) { var id = seq++; timers[id] = { at: t + ms, fn: fn }; return id; },
    clearTimeout: function (id) { delete timers[id]; },
    advance: function (ms) {
      var target = t + ms, guard = 0;
      while (guard++ < 1000) {
        var nextId = null, nextAt = Infinity;
        for (var id in timers) if (timers[id].at <= target && timers[id].at < nextAt) { nextAt = timers[id].at; nextId = id; }
        if (nextId === null) break;
        t = nextAt;
        var fn = timers[nextId].fn; delete timers[nextId];
        fn();
      }
      t = target;
    },
    pending: function () { return Object.keys(timers).length; }
  };
}
var flushMicro = function () { return new Promise(function (r) { setImmediate(r); }); };

function midRequestState() {
  return {
    step: 4, maxStepReached: 4, category: 'delivery',
    description: 'Pick up my grocery order from Harris Teeter and bring it to my door',
    picThumbs: [{ id: 1, src: 'data:image/jpeg;base64,' + 'A'.repeat(5000) }],
    idVerification: { idFrontCaptured: true, idFrontSrc: 'data:image/jpeg;base64,IDPHOTO',
                      selfieCaptured: true, selfieSrc: 'data:image/jpeg;base64,SELFIE',
                      savedOnFile: true, submittedAt: '2026-08-03T09:00:00Z' },
    pickupStops: ['218 Fayetteville St, Raleigh, NC'], dropoffStops: ['4101 NC-55, Apex, NC'],
    payAmount: '$25', payMode: 'set', waiverChecked: true, lowOfferAck: true,
    promoCode: 'SAVE10', promoApplied: true,
    scheduleType: 'scheduled', schedDate: '2026-12-01', timeSlot: '9:00 AM', scheduleConfirmed: true,
    ageRestricted: true, ageKeywordAck: true, osOpen: true, paymentPickerOpen: true, profileOpen: 2
  };
}

/* ═══ 1. KERNEL: what must never travel ═══════════════════════════════════════ */
section('1. Kernel — exclusion rules (PII / transient / size)');
(function () {
  var draft = K.toDraft(midRequestState(), { rev: 0, clientId: 'c1', origin: 'web' });
  var json = JSON.stringify(draft);

  ok(json.indexOf('IDPHOTO') === -1, 'ID front photo never enters the draft');
  ok(json.indexOf('SELFIE') === -1, 'selfie never enters the draft');
  ok(json.indexOf('data:image') === -1, 'no image data URL under any key');
  ok(!('idVerification' in draft.data), 'idVerification object absent entirely');
  ok(!('picThumbs' in draft.data), 'picThumbs bytes absent');
  ok(draft.data.picCount === 1, 'photo COUNT is carried so the user can be told');

  K.TRANSIENT_FIELDS.forEach(function (f) {
    if (f in draft.data) ok(false, 'transient excluded: ' + f);
  });
  ok(!('osOpen' in draft.data) && !('paymentPickerOpen' in draft.data) && !('profileOpen' in draft.data),
     'UI-open flags excluded');
  ok(!('ageKeywordAck' in draft.data), 'gate acknowledgement excluded (gates re-run on arrival)');

  ok(json.length < 2048, 'draft is small (' + json.length + ' bytes from a multi-MB state)');
  ok(K.validate(draft).ok, 'kernel validates its own output');

  /* A hand-edited / replayed payload must be caught, not trusted. */
  var tampered = K.toDraft(midRequestState(), {});
  tampered.data.idVerification = { idFrontSrc: 'data:image/jpeg;base64,X' };
  var v = K.validate(tampered);
  ok(!v.ok && v.errors.join(' ').indexOf('sensitive') !== -1, 'validate rejects an injected sensitive field');
})();

/* ═══ 2. KERNEL: resume semantics ═════════════════════════════════════════════ */
section('2. Kernel — what is re-derived on arrival');
(function () {
  var draft = K.toDraft(midRequestState(), { rev: 2 });
  var r = K.sanitizeOnResume(K.applyDraft(draft, {}), new Date('2026-08-03T12:00:00Z'));
  var s = r.state;

  ok(s.description.indexOf('Harris Teeter') !== -1, 'typed description survives');
  ok(s.pickupStops[0].indexOf('Fayetteville') !== -1, 'addresses survive');
  ok(s.payAmount === '$25', 'offer survives');
  ok(s.category === 'delivery' && s.step === 4, 'flow position survives');

  ok(s.waiverChecked === false, 'liability waiver is re-consented, never inherited');
  ok(s.lowOfferAck === false, 'low-offer acknowledgement re-taken');
  ok(s.idVerification.idFrontSrc === null && s.idVerification.savedOnFile === false,
     'identity verification reset — re-verify on the submitting device');
  ok(s.picThumbs.length === 0 && s.hasPic === false, 'photos absent locally, UI must prompt');
  ok(s.promoCode === 'SAVE10' && s.promoApplied === false, 'promo code kept, applied verdict dropped');
  ok(r.notes.indexOf('promoRevalidate') !== -1, 'promo revalidation reported to the UI');

  /* A future date must survive; only a past one is cleared. */
  ok(s.schedDate === '2026-12-01', 'future scheduled date survives');
  var past = K.toDraft(Object.assign(midRequestState(), { schedDate: '2020-01-01' }), {});
  var pr = K.sanitizeOnResume(K.applyDraft(past, {}), new Date('2026-08-03T12:00:00Z'));
  ok(pr.state.schedDate === null && pr.state.scheduleConfirmed === false, 'past scheduled date cleared');
  ok(pr.notes.indexOf('scheduleExpired') !== -1, 'expiry reported to the UI');

  /* Forward-compat: an older client must not choke on a newer field. */
  var future = K.toDraft(midRequestState(), {});
  future.v = 99; future.data.someFutureField = 'x';
  var fs = K.applyDraft(future, {});
  ok(fs.description.length > 0 && fs.someFutureField === undefined,
     'unknown future field ignored, known fields still applied');
})();

/* ═══ 3. KERNEL: conflict + meaningfulness ════════════════════════════════════ */
section('3. Kernel — reconcile / isMeaningful');
(function () {
  var local = K.toDraft(midRequestState(), { rev: 3 });
  ok(K.reconcile(local, { rev: 3, data: {} }, 3).resolution === 'local', 'remote unchanged → keep local');
  ok(K.reconcile(local, { rev: 7, data: { description: 'other' } }, 3).resolution === 'conflict',
     'both moved → conflict, never a silent overwrite');
  ok(K.reconcile(K.toDraft({}, {}), { rev: 7, data: { description: 'x' } }, 0).resolution === 'remote',
     'no local edits → adopt remote (this IS cross-device resume)');
  ok(K.reconcile(local, null, 0).resolution === 'local', 'no remote → local');

  var c = K.reconcile(local, { rev: 7, data: { description: 'washed my car', step: 2 } }, 3);
  ok(c.local && c.remote && c.remote.description === 'washed my car',
     'conflict carries both summaries so the user can actually choose');

  ok(K.isMeaningful(K.toDraft({ category: 'delivery' }, {})) === false, 'category alone is not resumable');
  ok(K.isMeaningful(K.toDraft({ category: 'delivery', maxStepReached: 4 }, {})) === true,
     'category + real progress is resumable');
  ok(K.isMeaningful(K.toDraft({ description: 'ab' }, {})) === false, 'two characters is not resumable');
  ok(K.isMeaningful(K.toDraft({ description: 'move a couch' }, {})) === true, 'typed description is resumable');
})();

/* ═══ 4. STORE: autosave pacing (the rate-limiter budget) ═════════════════════ */
section('4. Store — debounce, coalescing, dedupe, min interval');
(function () {
  var env = fakeEnv(), saves = [];
  var adapter = {
    name: 'probe',
    load: function () { return Promise.resolve(null); },
    save: function (d) { saves.push(JSON.parse(JSON.stringify(d))); return Promise.resolve(Object.assign({}, d, { rev: saves.length, updatedAt: 'T' + saves.length })); },
    clear: function () { return Promise.resolve(); }
  };
  var store = S.createStore({
    adapter: adapter, kernel: K, clientId: 'c1', origin: 'web',
    now: env.now, setTimeout: env.setTimeout, clearTimeout: env.clearTimeout,
    debounceMs: 2500, minIntervalMs: 8000
  });

  var st = midRequestState();
  for (var i = 0; i < 20; i++) { st.description = 'typing ' + i; store.touch(st); }
  ok(saves.length === 0, '20 keystrokes produce 0 immediate writes');
  env.advance(2499);
  ok(saves.length === 0, 'nothing written before the debounce elapses');
  env.advance(2);
  return flushMicro().then(function () {
    ok(saves.length === 1, 'a burst of 20 edits coalesces into exactly 1 write');
    ok(saves[0].data.description === 'typing 19', 'the write carries the LATEST value');

    /* A change SOON after a save must wait out the min interval. Order matters here:
       this has to run before any long clock advance, or the interval has already
       elapsed and there is nothing left to throttle. */
    st.description = 'changed again'; store.touch(st);
    env.advance(2600);
    return flushMicro().then(function () {
      ok(saves.length === 1, 'min interval throttles a fast follow-up write');
      env.advance(6000);
      return flushMicro().then(function () {
        ok(saves.length === 2, 'the throttled write lands after the interval');

        /* Identical content must not be re-sent, even once pacing allows it. */
        store.touch(st); env.advance(10000);
        return flushMicro().then(function () {
          ok(saves.length === 2, 'unchanged state is not re-sent');

          /* flush() bypasses pacing — step change / app backgrounding. */
          st.description = 'flushed';
          return store.flush(st).then(function () {
            ok(saves.length === 3, 'flush() writes immediately');
            ok(store._debug().rev === 3, 'server rev adopted from the save response');
          });
        });
      });
    });
  });
})().then(function () {

/* ═══ 5. STORE: nothing meaningless or unsafe is ever written ═════════════════ */
section('5. Store — refuses to write junk or unsafe payloads');
  var env = fakeEnv(), saves = [];
  var adapter = { name: 'p', load: function () { return Promise.resolve(null); },
                  save: function (d) { saves.push(d); return Promise.resolve(d); },
                  clear: function () { return Promise.resolve(); } };
  var store = S.createStore({ adapter: adapter, kernel: K, now: env.now,
                              setTimeout: env.setTimeout, clearTimeout: env.clearTimeout });
  store.touch({ category: 'delivery' });        // not meaningful
  env.advance(10000);
  return flushMicro().then(function () {
    ok(saves.length === 0, 'an untouched form never clobbers a real draft elsewhere');

    var blocked = null;
    var store2 = S.createStore({
      adapter: adapter, kernel: K, now: env.now, setTimeout: env.setTimeout, clearTimeout: env.clearTimeout,
      onStatus: function (s, x) { if (x && x.blocked) blocked = x.blocked; }
    });
    /* Kernel-level guarantee: even a caller that hands us raw state cannot leak, because
       toDraft whitelists. Prove the store also refuses if validate ever fails. */
    var badKernel = Object.assign({}, K, {
      toDraft: function (s, m) { var d = K.toDraft(s, m); d.data.idVerification = { idFrontSrc: 'data:image/x' }; return d; }
    });
    var store3 = S.createStore({ adapter: adapter, kernel: badKernel, now: env.now,
      setTimeout: env.setTimeout, clearTimeout: env.clearTimeout,
      onStatus: function (s, x) { if (x && x.blocked) blocked = x.blocked; } });
    store3.touch(midRequestState());
    env.advance(10000);
    return flushMicro().then(function () {
      ok(saves.length === 0, 'a payload failing validation is never sent');
      ok(blocked && String(blocked).indexOf('sensitive') !== -1, 'the block reason is reported');
    });
  });
}).then(function () {

/* ═══ 5b. STORE: the device id is minted only by a real write ═════════════════
   Regression guard. The web wiring originally created and persisted a per-device id
   at init, so anyone who merely LOADED the page was given a permanent identifier
   whether or not they ever started a request. Harmless while the id stays in the
   browser — but this module is the reference the rebuild copies, and the remote tier
   is one config line from active, at which point that id travels with every sync.
   `clientId` therefore accepts a function and is resolved only once a save is certain:
   not on construction, not on load(), and not on a touch that is discarded as
   unmeaningful, unchanged or invalid. */
section('5b. Store — clientId is resolved lazily, only when a draft is really written');
  var env5 = fakeEnv(), mints = 0, saved5 = [];
  var probe5 = { name: 'p', load: function () { return Promise.resolve(null); },
                 save: function (d) { saved5.push(d); return Promise.resolve(Object.assign({}, d, { rev: 1 })); },
                 clear: function () { return Promise.resolve(); } };
  var lazyStore = S.createStore({
    adapter: probe5, kernel: K, origin: 'web',
    clientId: function () { mints++; return 'device-' + mints; },
    now: env5.now, setTimeout: env5.setTimeout, clearTimeout: env5.clearTimeout
  });
  ok(mints === 0, 'constructing the store does not mint an id');

  return lazyStore.load().then(function () {
    ok(mints === 0, 'load() does not mint an id (a fresh visitor has no draft to find)');

    lazyStore.touch({ category: 'delivery' });      // not meaningful → not a write
    env5.advance(10000);
    return flushMicro();
  }).then(function () {
    ok(mints === 0, 'a touch that is not worth saving does not mint an id');
    ok(saved5.length === 0, 'and nothing was written');

    lazyStore.touch(midRequestState());             // a real edit
    env5.advance(10000);
    return flushMicro();
  }).then(function () {
    ok(mints === 1, 'the first real write mints exactly one id');
    ok(saved5.length === 1 && saved5[0].clientId === 'device-1', 'and stamps it on the envelope');

    var st5 = midRequestState(); st5.description = 'changed once more';
    return lazyStore.flush(st5);
  }).then(function () {
    ok(mints === 1, 'later writes reuse it — the id is minted once, not per save');
    ok(saved5[1].clientId === 'device-1', 'same id on the second envelope');

    /* A plain string must still work — the contract widened, it did not change. */
    var envA = fakeEnv(), got = [];
    var plain = S.createStore({
      adapter: { name: 'p', load: function () { return Promise.resolve(null); },
                 save: function (d) { got.push(d); return Promise.resolve(d); },
                 clear: function () { return Promise.resolve(); } },
      kernel: K, clientId: 'literal-id', now: envA.now,
      setTimeout: envA.setTimeout, clearTimeout: envA.clearTimeout
    });
    return plain.flush(midRequestState()).then(function () {
      ok(got.length === 1 && got[0].clientId === 'literal-id', 'a literal clientId still works unchanged');
    });
  }).then(function () {

/* ═══ 6. STORE: conflict + offline ════════════════════════════════════════════ */
section('6. Store — 409 conflict and offline retry');
  var env = fakeEnv(), conflicts = [], statuses = [];
  var adapter = {
    name: 'c', load: function () { return Promise.resolve(null); },
    save: function () { var e = new Error('conflict'); e.code = 'conflict';
                        e.remote = K.toDraft({ description: 'edited on my phone', category: 'moving' }, { rev: 9 });
                        return Promise.reject(e); },
    clear: function () { return Promise.resolve(); }
  };
  var store = S.createStore({
    adapter: adapter, kernel: K, now: env.now, setTimeout: env.setTimeout, clearTimeout: env.clearTimeout,
    onStatus: function (s) { statuses.push(s); },
    onConflict: function (local, remote) { conflicts.push({ local: local, remote: remote }); }
  });
  store.touch(midRequestState()); env.advance(3000);
  return flushMicro().then(function () {
    ok(conflicts.length === 1, 'a 409 raises a conflict callback');
    ok(conflicts[0].remote.data.description === 'edited on my phone', 'the other device\'s draft is handed over');
    ok(statuses.indexOf('conflict') !== -1, 'status reports conflict');

    /* Offline: soft-fail + backoff, never data loss. */
    var env2 = fakeEnv(), attempts = 0, st2 = [];
    var flaky = { name: 'f', load: function () { return Promise.resolve(null); },
      save: function (d) { attempts++; return attempts < 3 ? Promise.reject(new Error('network')) : Promise.resolve(Object.assign({}, d, { rev: 1 })); },
      clear: function () { return Promise.resolve(); } };
    var store2 = S.createStore({ adapter: flaky, kernel: K, now: env2.now,
      setTimeout: env2.setTimeout, clearTimeout: env2.clearTimeout,
      retryBaseMs: 1000, onStatus: function (s) { st2.push(s); } });
    store2.touch(midRequestState());
    env2.advance(3000);
    return flushMicro().then(function () {
      ok(st2.indexOf('offline') !== -1, 'a network failure reports offline, not an error');
      env2.advance(1000); return flushMicro();
    }).then(function () { env2.advance(2000); return flushMicro(); })
      .then(function () { env2.advance(4000); return flushMicro(); })
      .then(function () {
        ok(attempts >= 3, 'retries with backoff until it lands (attempts=' + attempts + ')');
        ok(st2.indexOf('saved') !== -1, 'eventually reports saved');
      });
  });
}).then(function () {

/* ═══ 7. TIERED adapter: local-first, remote wins when newer ══════════════════ */
section('7. Tiered adapter — offline-safe local, cross-device remote');
  var local = S.memoryAdapter();
  var remoteStore = { d: null };
  var remote = { name: 'remote',
    load: function () { return Promise.resolve(remoteStore.d); },
    save: function (d) { remoteStore.d = Object.assign({}, d, { rev: (d.rev || 0) + 1 }); return Promise.resolve(remoteStore.d); },
    clear: function () { remoteStore.d = null; return Promise.resolve(); } };
  var tier = S.tieredAdapter(local, remote);

  var laptop = K.toDraft({ description: 'started on the laptop', category: 'delivery' }, { rev: 0 });
  return tier.save(laptop).then(function () {
    ok(remoteStore.d && remoteStore.d.rev === 1, 'write-through reaches the server');
    return local.load();
  }).then(function (l) {
    ok(l && l.rev === 1, 'the server rev is adopted locally after save');
    /* Phone edits later → remote is newer → remote wins on load. */
    remoteStore.d = K.toDraft({ description: 'continued on the phone', category: 'delivery' }, { rev: 5 });
    return tier.load();
  }).then(function (d) {
    ok(d.data.description === 'continued on the phone', 'newer remote draft wins on load');
    /* Server unreachable must never block local resume. */
    var brokenRemote = { name: 'r', load: function () { return Promise.reject(new Error('down')); },
      save: function (x) { return Promise.reject(new Error('down')); }, clear: function () { return Promise.resolve(); } };
    var tier2 = S.tieredAdapter(local, brokenRemote);
    return tier2.load();
  }).then(function (d) {
    ok(d !== null, 'a dead server still resumes from the local tier');
  });
}).then(function () {

/* ═══ 8. Round trip: laptop → server → phone ══════════════════════════════════ */
section('8. End-to-end — the scenario this feature exists for');
  var server = { d: null };
  var remote = { name: 'remote',
    load: function () { return Promise.resolve(server.d); },
    save: function (d) { server.d = Object.assign({}, d, { rev: (server.d ? server.d.rev : 0) + 1, updatedAt: '2026-08-03T10:00:00Z' }); return Promise.resolve(server.d); },
    clear: function () { server.d = null; return Promise.resolve(); } };

  var envA = fakeEnv();
  var laptop = S.createStore({ adapter: S.tieredAdapter(S.memoryAdapter(), remote), kernel: K,
    clientId: 'laptop', origin: 'web', now: envA.now, setTimeout: envA.setTimeout, clearTimeout: envA.clearTimeout });

  var st = midRequestState();
  st.description = 'Pick up 4 catering trays and drinks, deliver across town';
  return laptop.flush(st).then(function () {
    ok(server.d !== null, 'laptop autosaved to the server');
    ok(JSON.stringify(server.d).indexOf('IDPHOTO') === -1, 'no PII on the server');

    var envB = fakeEnv();
    var phone = S.createStore({ adapter: S.tieredAdapter(S.memoryAdapter(), remote), kernel: K,
      clientId: 'phone', origin: 'app', now: envB.now, setTimeout: envB.setTimeout, clearTimeout: envB.clearTimeout });
    return phone.load().then(function (found) {
      ok(found !== null, 'phone finds the laptop\'s draft');
      ok(found.summary.description.indexOf('catering trays') !== -1, 'resume prompt has a human summary');
      ok(found.summary.origin === 'web', 'prompt can say where it came from');
      ok(found.summary.picCount === 1, 'prompt can say a photo needs re-attaching');

      var resumed = phone.resumeInto(found.draft, {}, new Date('2026-08-03T12:00:00Z'));
      ok(resumed.state.description.indexOf('catering trays') !== -1, 'phone continues the same request');
      ok(resumed.state.step === 4, 'at the same step');
      ok(resumed.state.waiverChecked === false, 'and must re-consent before submitting');
      ok(resumed.state.idVerification.idFrontSrc === null, 'and must re-verify identity');

      /* Finishing on the phone clears it for both devices. */
      return phone.discard().then(function () {
        ok(server.d === null, 'submitting clears the draft everywhere');
      });
    });
  });
});   // closes the 5b lazy-clientId wrapper, which sections 6-8 run inside
}).then(function () {
  console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + ' — ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
}).catch(function (e) {
  console.error('\nHARNESS ERROR:', e && e.stack || e);
  process.exit(1);
});
