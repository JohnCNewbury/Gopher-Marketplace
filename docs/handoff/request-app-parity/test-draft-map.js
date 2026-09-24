#!/usr/bin/env node
/* Tests for the canonical ⇄ live-app field map (gopher-request-draft-map.js).
   Run: node docs/handoff/request-app-parity/test-draft-map.js   (exit 0 = pass)

   The live Gopher Request app holds an in-progress request as per-screen Formik values
   with different names, different units, engine-generated UI flags mixed in, and live
   File objects for photos. This asserts the translation to and from the canonical draft
   contract is lossless where it can be, and LOUD where it cannot (unmapped categories
   are reported, never guessed).

   Field names verified against gopher-mobile-requester @ origin/production e0a56bb3b.
*/
'use strict';
var path = require('path');
var JS = path.join(__dirname, '..', '..', '..', 'Final', 'assets', 'js');
var M = require(path.join(JS, 'gopher-request-draft-map.js'));
var K = require(path.join(JS, 'gopher-request-draft.js'));

let pass=0,fail=0;
const ok=(c,l,d)=>{ c?(pass++,console.log('  ✓ '+l)):(fail++,console.log('  ✗ '+l+(d?'  → '+d:''))); };

console.log('\nlive Formik → canonical');
// realistic live values incl. engine noise + File objects
const live = {
  category_type:'Delivery', sub_category_type:'Groceries',
  description:'Pick up my grocery order from Harris Teeter',
  cost_of_goods:'45.00', gopher_offering:'25',
  has_age_restriction:true, special_instructions:'Leave at side door',
  number_of_items:3, multiple_item:true, gophers_needed:2, stair:1,
  need_purchase:true, purchase_anywhere:false, liability_waiver:true,
  pickup_:'218 Fayetteville St, Raleigh, NC',
  dropoff_address:{street_line1:'4101 NC-55', city:'Apex', state:'NC'},
  need:false, flexible:true, request_flexible_type:'24hr',
  select_gopher:false, notify_fav_gopher:true,
  attachment:[{name:'a.jpg',size:1234,type:'image/jpeg'},'https://cdn/x.jpg'],
  // engine noise that must not survive
  cost_of_goodsvisible:true, descriptiondisable:false, need_purchase_radio:'yes',
  pickup_visible:true
};
const r = M.fromLive(live);
ok(r.data.description===live.description,'description maps');
ok(r.data.category==='delivery','category_type "Delivery" → canonical delivery');
ok(r.data.categoryRaw==='Delivery','raw category preserved for round-trip');
ok(r.data.subCategoryRaw==='Groceries','sub-category preserved');
ok(r.data.costOfItems==='45.00','cost maps WITHOUT re-scaling units');
ok(r.data.payAmount==='25','offer maps');
ok(r.data.pickupStops[0].indexOf('Fayetteville')!==-1,'pickup text field maps');
ok(r.data.dropoffStops[0]==='4101 NC-55, Apex, NC','dropoff OBJECT (street_line1) composed');
ok(r.data.scheduleType==='flexible','schedule booleans → canonical enum');
ok(r.data.workerSelection==='my','favourite-gopher flag → workerSelection');
ok(r.data.picCount===2 && r.data.hasPic===true,'photos counted, not carried');
ok(r.unmapped.length===0,'nothing unmapped for a known category');

console.log('\nunknown category is preserved, never guessed');
const r2 = M.fromLive({category_type:'Mulch Project', description:'spread mulch'});
ok(r2.data.category===undefined,'no canonical category invented');
ok(r2.data.categoryRaw==='Mulch Project','raw value kept verbatim');
ok(r2.unmapped[0].indexOf('Mulch Project')!==-1,'unmapped is REPORTED, not silent');

console.log('\nthe draft that actually goes on the wire');
const draft = K.toDraft(Object.assign({step:3,maxStepReached:3}, r.data), {rev:0, origin:'app'});
const json = JSON.stringify(draft);
ok(json.indexOf('data:image')===-1,'no image data');
ok(!('attachment' in draft.data),'live File array never reaches the draft');
ok(json.length<2048,'small payload ('+json.length+' bytes)');
ok(K.validate(draft).ok,'kernel validates a map-produced draft');

console.log('\ncanonical → live (resume INTO the app)');
const back = M.toLive(r.data);
ok(back.description===live.description,'description returns');
ok(back.category_type==='Delivery','category round-trips via raw');
ok(back.sub_category_type==='Groceries','sub-category round-trips');
ok(back.pickup_.indexOf('Fayetteville')!==-1,'pickup returns to the flat field');
ok(back.flexible===true && back.need===false,'schedule enum → live booleans');
ok(back.notify_fav_gopher===true && back.select_gopher===false,'workerSelection → live flags');
ok(Array.isArray(back.attachment) && back.attachment.length===0,'photos deliberately empty on resume');

console.log('\nengine noise + File stripping');
const clean = M.stripEngineNoise(live);
ok(!('cost_of_goodsvisible' in clean) && !('descriptiondisable' in clean) && !('need_purchase_radio' in clean),
   'visible/disable/_radio siblings stripped');
ok(!('pickup_visible' in clean),'pickup_visible stripped');
ok(!('attachment' in clean),'array containing File objects dropped');
ok(clean.description===live.description,'real data survives stripping');
ok(JSON.stringify(clean).length>0 && (()=>{try{JSON.stringify(clean);return true}catch(e){return false}})(),'result is JSON-serializable');

console.log('\n'+(fail===0?'PASS':'FAIL')+' — '+pass+' passed, '+fail+' failed');
process.exit(fail?1:0);
