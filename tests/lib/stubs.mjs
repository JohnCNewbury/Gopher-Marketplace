/**
 * Network stubs applied to every page the harness opens — golden AND candidate.
 *
 * Rules:
 *   - api.gophergo.io is NEVER reached. gopher-deals writes real merchant leads
 *     (the 2026-08-06 "one click, four leads" bug is exactly that path).
 *   - Google Maps is replaced by a tiny in-page stub that satisfies the classes
 *     the pages touch (Places Autocomplete, Geocoder, DistanceMatrixService,
 *     Map/Marker/Circle) and calls the `callback=` function the loader URL names.
 *   - Everything stubbed is logged, so a flow can assert "exactly one POST to
 *     /users/deals" instead of hoping.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.join(here, '..', 'fixtures', 'api');

/** Minimal google.maps that doesn't throw. Extend as flows need it. */
const MAPS_STUB = (callbackName) => `
(function(){
  function Evented(){ this._l = {}; }
  Evented.prototype.addListener = function(ev, fn){ (this._l[ev] = this._l[ev] || []).push(fn); return { remove(){} }; };
  Evented.prototype.setMap = function(){}; Evented.prototype.setCenter = function(){}; Evented.prototype.setZoom = function(){};
  Evented.prototype.setPosition = function(){}; Evented.prototype.setRadius = function(){}; Evented.prototype.getPlace = function(){ return window.__gmStubPlace || {}; };
  Evented.prototype.setFields = function(){}; Evented.prototype.setComponentRestrictions = function(){}; Evented.prototype.setTypes = function(){}; Evented.prototype.bindTo = function(){};
  function Klass(){ Evented.call(this); }
  Klass.prototype = Object.create(Evented.prototype);
  const g = window.google = window.google || {};
  g.maps = {
    Map: Klass, Marker: Klass, Circle: Klass, Point: function(x,y){ this.x=x; this.y=y; }, LatLng: function(a,b){ this.lat=()=>a; this.lng=()=>b; },
    LatLngBounds: Klass, InfoWindow: Klass, Size: function(w,h){ this.width=w; this.height=h; },
    SymbolPath: { CIRCLE: 0 }, UnitSystem: { IMPERIAL: 1, METRIC: 0 }, Animation: { DROP: 1, BOUNCE: 2 },
    MapTypeId: { ROADMAP: 'roadmap' }, ControlPosition: { TOP_LEFT: 1, RIGHT_BOTTOM: 9 },
    event: { addListener(){ return { remove(){} }; }, addListenerOnce(){ return { remove(){} }; }, removeListener(){}, clearInstanceListeners(){}, trigger(){} },
    Geocoder: function(){ this.geocode = function(req, cb){ cb && cb(window.__gmStubGeocode || [], 'OK'); }; },
    DistanceMatrixService: function(){ this.getDistanceMatrix = function(req, cb){ cb && cb(window.__gmStubDistance || { rows: [{ elements: [{ status: 'OK', distance: { text: '3.1 mi', value: 4989 }, duration: { text: '9 mins', value: 540 } }] }] }, 'OK'); }; },
    places: {
      Autocomplete: Klass,
      AutocompleteSessionToken: function(){},
      AutocompleteService: function(){ this.getPlacePredictions = function(req, cb){ cb && cb(window.__gmStubPredictions || [], 'OK'); }; },
      PlacesService: function(){ this.getDetails = function(req, cb){ cb && cb(window.__gmStubPlace || {}, 'OK'); }; },
      PlacesServiceStatus: { OK: 'OK', ZERO_RESULTS: 'ZERO_RESULTS' },
    },
    importLibrary: async function(){ return g.maps.places; },
  };
  window.__gmStubLoaded = true;
  ${callbackName ? `setTimeout(function(){ if (typeof window['${callbackName}'] === 'function') window['${callbackName}'](); }, 0);` : ''}
})();`;

/** Load a JSON fixture for an API path, falling back to a generic OK body. */
function apiFixture(method, pathname) {
  const key = `${method}_${pathname.replace(/^\/api\/v1/, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')}.json`;
  const file = path.join(FIXTURES, key);
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  return JSON.stringify({ ok: true, stub: true, method, path: pathname });
}

/**
 * Install stubs on a page. Returns a log you can assert on:
 *   log.api   → [{ method, url, body }]   every call that would have hit api.gophergo.io
 *   log.maps  → number of Maps loader requests
 */
export async function installStubs(page, { apiOverrides = {} } = {}) {
  const log = { api: [], maps: 0, other: [] };

  // NOTE: Playwright matches routes LAST-registered-first, so the broad catch-all
  // goes in before the specific loader stub.
  await page.route(/https?:\/\/(maps\.gstatic\.com|maps\.googleapis\.com)\//, (route) => route.fulfill({ status: 204, body: '' }));
  await page.route(/https?:\/\/maps\.googleapis\.com\/maps\/api\/js/, async (route) => {
    log.maps++;
    const u = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: 'text/javascript', body: MAPS_STUB(u.searchParams.get('callback')) });
  });

  await page.route(/https?:\/\/api\.gophergo\.io\//, async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const method = req.method();
    let body = null;
    try { body = req.postDataJSON(); } catch { body = req.postData(); }
    log.api.push({ method, url: u.pathname, body });
    const override = apiOverrides[`${method} ${u.pathname}`];
    if (override) return route.fulfill({ status: override.status ?? 200, contentType: 'application/json', body: JSON.stringify(override.body ?? {}) });
    if (/^\/self-referral\//.test(u.pathname)) return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' });
    /* The app reads the bearer token from the `access-token` RESPONSE HEADER (apiCall in
       gopher-deals/gopher-go), not from the body. A fixture carrying only a body `token`
       leaves _authToken null, which silently blocks every authenticated step after
       sign-in — on deals that is the logo upload, and the logo gate then refuses the
       submit. So mirror a fixture's token into the header. */
    const fixture = apiFixture(method, u.pathname);
    /* `access-control-expose-headers` is not optional here. api.gophergo.io is cross-origin to
       every page that calls it, and a cross-origin response's custom headers are invisible to JS
       unless the server exposes them by name. Without it `res.headers.get('access-token')` returns
       null, _authToken stays null, and every authenticated step after sign-in silently no-ops —
       which looks exactly like a product bug and is not one. The real API exposes it. */
    const headers = { 'access-control-allow-origin': '*', 'access-control-expose-headers': 'access-token' };
    try { const t = JSON.parse(fixture).token; if (t) headers['access-token'] = t; } catch { /* non-JSON fixture */ }
    return route.fulfill({ status: 200, contentType: 'application/json', headers, body: fixture });
  });

  // Leaflet from unpkg (customer-deals) and the retired Apps Script endpoint: never load, never post.
  await page.route(/https?:\/\/unpkg\.com\//, (route) => route.fulfill({ status: 200, contentType: route.request().url().endsWith('.css') ? 'text/css' : 'text/javascript', body: '' }));
  await page.route(/https?:\/\/script\.google\.com\//, (route) => { log.other.push(route.request().url()); return route.fulfill({ status: 200, body: '{}' }); });

  return log;
}
