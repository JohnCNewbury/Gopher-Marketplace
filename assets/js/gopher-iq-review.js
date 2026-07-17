/* gopher-iq-review.js — Gopher iQ "Second Set of Eyes" REVIEW ADVISOR.
   Shared, platform-agnostic logic (same contract as gopher-request-logic.js:
   surfaces own the rendering, this module owns the decisions).

   WHAT IT DOES
   ------------
   Upgrades the Review-step "Want a second set of eyes?" block from a static
   per-category checklist to suggestions that are SPECIFIC to what the
   requester actually wrote. Two halves:

   1. RECOGNITION — a per-category pattern library distilled from completed
      requests. Each pattern knows how to (a) recognize a job trait in the
      description ("couch", "3rd floor", "airport"), (b) check whether the
      detail that usually rides along with that trait is MISSING (from the
      text AND from the structured flow fields), and (c) phrase a concrete,
      neighborly suggestion that echoes what it recognized.

   2. LEARNING — pattern salience is not hand-ranked; it's a running tally of
      completed requests. Each pattern ships with seed counts (the platform
      corpus stand-in) and keeps learning locally:
        • seedFromHistory() ingests PAST completed requests (the dashboard's
          Previous-requests bucket) once per record id.
        • learnFromCompletion() ingests FUTURE completions: every confirmed
          request re-runs the recognizers, and the submit-time audit tells us
          whether a shown suggestion was ACTED ON (fired when the review
          opened, resolved by submit → strong positive) or IGNORED and the
          job later needed a cost adjustment (missing detail changed the
          price → strongest positive).
      Tallies persist in localStorage so the advisor gets sharper with every
      completed request in a category. Suggestions are ranked by the learned
      inclusion rate (Laplace-smoothed) and capped, so the block stays short
      and the highest-signal gaps win.

   BACKEND SEAM: production replaces the seed counts + localStorage layer with
   the real completed-orders corpus (same pattern contract); recognition and
   ranking logic are identical server- or client-side. */
(function(){
  'use strict';

  var STORE_KEY = 'gopherIQ.reviewLearning.v1';
  var MAX_SUGGESTIONS = 4;      // block stays scannable — highest-signal gaps win
  var ACT_WEIGHT = 2;           // acted-on suggestion = 2 completed-corpus inclusions
  var ADJ_WEIGHT = 3;           // ignored + later cost-adjusted = 3 (the costly miss)

  /* Previous-requests records use display names; the flow uses short keys. */
  var DISPLAY_TO_KEY = {
    'delivery':'delivery', 'moving':'moving', 'handyman':'home',
    'home services':'home', 'home service':'home', 'day labor':'labor',
    'hourly labor':'labor', 'labor':'labor', 'junk removal':'junk',
    'junk':'junk', 'yard work':'yard', 'yard':'yard', 'need a ride':'ride',
    'ride':'ride', 'ride share':'ride', 'ride sharing':'ride', 'other':'other',
    'custom':'other', 'custom request':'other'
  };

  /* ── Pattern library ──────────────────────────────────────────────────────
     Shape: {
       id       unique 'cat.slug'
       covers   index into the surface's generic REVIEW_ADVICE points that this
                specific suggestion supersedes (so the boilerplate line is
                dropped when the specific one shows) — null = extra advice
       find     RegExp recognizing the trait in the request text; when
                `absent:true` the pattern fires when `find` does NOT match
                (recognizing a missing detail is recognition too)
       minLen   min text length before an `absent` pattern may judge (avoids
                nagging an empty description — the thin-description flag owns
                that case)
       evidence RegExp — the companion detail already present in the TEXT;
                if it matches, the requester already covered it → don't fire
       gap      fn(ctx, match) — STRUCTURED check; return false when the flow
                fields already capture the detail (e.g. crew size set, bags
                count set). Omit = text evidence alone decides.
       tip      fn(match, ctx, n) → HTML string. n = live corpus numbers
                { seen, incl, completed } (seed + learned) so the copy can
                cite real, growing counts.
       seed     { seen, incl } — completed-corpus stand-in counts.
     } */

  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  var PATTERNS = {

    junk: [
      { id:'junk.two-person', covers:1,
        find:/\b(couch|sofa|sectional|loveseat|recliner|mattress|box spring|dresser|armoire|wardrobe|refrigerator|fridge|freezer|washer|dryer|stove|oven|range|piano|gun safe|safe|hot tub|treadmill|elliptical|pool table)\b/,
        evidence:/\b(two|2|three|3)\s+(people|person|guys|gophers|movers|workers)|second (person|gopher|pair)|extra (hands|help)|crew\b/,
        gap:function(ctx){ return !ctx.fields.moreThanOneWorker; },
        tip:function(m, ctx, n){ return 'You mentioned a <b>' + esc(m) + '</b> — in ' + n.seen + ' completed hauls with an item like that, nearly all needed <b>two people</b>. You’re currently set for one Gopher; a second is a quick change in <b>Worker info</b>.'; },
        seed:{ seen:47, incl:43 } },

      { id:'junk.special-handling', covers:2,
        find:/\b(tv|television|monitor|computer|electronics|e-?waste|paint|stain|solvent|tires?|car batter(?:y|ies)|batteries|propane|freon|refrigerant|chemicals?|fluorescent|fire extinguisher)\b/,
        evidence:/\b(disposal fee|recycl\w*|hazard\w*|hazmat|drop-?off site|dump fee|transfer station)\b/,
        tip:function(m, ctx, n){ return 'You listed <b>' + esc(m) + '</b> — that’s a <b>special-handling</b> item that can’t go in a standard dumpster. Completed jobs like this went smoother when the disposal plan (recycling drop-off, disposal fee) was agreed in the description.'; },
        seed:{ seen:31, incl:24 } },

      { id:'junk.volume', covers:0, absent:true, minLen:20,
        find:/\b(\d+|a few|couple|several|single|one|two|three|four|five|six|seven|eight|nine|ten|dozen)\s*(bags?|boxes|items?|pieces?|loads?|piles?)\b|\bfull (truck|load)\b|\bhalf[- ]?(truck|load)\b|\btruckloads?\b|\d+\s?(sq\.? ?ft|square feet|cubic)/,
        tip:function(m, ctx, n){ return 'We couldn’t spot a <b>rough volume</b> in your description — a few bags, a half-truck, a full load. It’s the #1 detail in completed hauls (' + n.incl + ' of ' + n.seen + ' included one): it’s how the right size truck shows up the first time.'; },
        seed:{ seen:120, incl:102 } },

      { id:'junk.access', covers:3,
        find:/\b(basement|upstairs|attic|2nd floor|3rd floor|4th floor|second floor|third floor|fourth floor|apartment|apt|condo|walk-?up)\b/,
        evidence:/\b(curbside|at the curb|driveway|ground floor|elevator|no stairs)\b/,
        gap:function(ctx){ return !ctx.fields.pickupStairs && !ctx.fields.destStairs; },
        tip:function(m, ctx, n){ return 'You mentioned <b>' + esc(m) + '</b> but no stairs are set in <b>Locations</b>. Completed jobs with a carry like that priced fairer — and got accepted faster — when the flights and the walk to the truck were called out.'; },
        seed:{ seen:38, incl:30 } },

      { id:'junk.cleanout-scale', covers:null,
        find:/\b(estate|garage|whole[- ]house|storage unit|hoarding|basement) (clean-?out|clear-?out|cleanup)\b|\bclean(ing)? out (the|my|our|an?)\b/,
        gap:function(ctx){ return ctx.fields.photoCount === 0; },
        tip:function(m, ctx, n){ return 'A cleanout is hard to size from words alone — completed cleanouts that included <b>a photo or two</b> got accurate trucks and crews instead of surprises. Snap the messiest corner; that’s the one that matters.'; },
        seed:{ seen:26, incl:19 } },

      { id:'junk.heavy-debris', covers:null,
        find:/\b(concrete|bricks?|dirt|soil|gravel|shingles|tiles?|sod|rocks?|rubble|asphalt)\b/,
        evidence:/\b(pounds|lbs|tons?|half a truck|split (the )?loads?|multiple (trips|loads))\b/,
        tip:function(m, ctx, n){ return '<b>' + esc(m) + '</b> is priced by <b>weight</b>, not space — completed dump runs with dense debris usually split loads to stay under axle limits. A rough weight or square-footage note saves a second trip nobody planned for.'; },
        seed:{ seen:18, incl:13 } },
    ],

    delivery: [
      { id:'delivery.purchase', covers:null,
        find:/\b(buy|purchase|pick up and pay|pay for|grab me|get me|from the list)\b/,
        gap:function(ctx){ return !ctx.fields.itemsPurchased; },
        tip:function(m, ctx, n){ return 'Sounds like your Gopher is <b>buying something</b> for you ("' + esc(m) + '") — completed runs like this set the <b>cost of items</b> up front (Job details) so checkout and reimbursement are instant, with no curbside math.'; },
        seed:{ seen:52, incl:47 } },

      { id:'delivery.perishable', covers:2,
        find:/\b(grocer\w*|frozen|ice cream|refrigerated|perishable|flowers?|cake|hot food|pizza|catering|meal)\b/,
        evidence:/\b(cooler|insulated|cold bags?|keep (it )?cold|keep (it )?hot|straight (there|to|over)|no (other )?stops)\b/,
        tip:function(m, ctx, n){ return '<b>' + esc(m) + '</b> is time-and-temperature cargo — in ' + n.seen + ' completed runs, the smooth ones said “cold bag / straight there” out loud. One line about keeping it cold (or hot) sets the right expectations.'; },
        seed:{ seen:44, incl:33 } },

      { id:'delivery.bulky', covers:0,
        find:/\b(tv|television|couch|sofa|mattress|dresser|appliance|washer|dryer|grill|furniture|shelving unit)\b/,
        evidence:/\b(truck|suv|van|pickup|fits in|two (people|guys|gophers))\b/,
        tip:function(m, ctx, n){ return 'A <b>' + esc(m) + '</b> won’t ride in a sedan — completed deliveries like this named the vehicle (<b>truck, van, SUV</b>) and whether it’s a two-person lift, so the right Gopher accepted on the first pass.'; },
        seed:{ seen:36, incl:29 } },

      { id:'delivery.fragile', covers:null,
        find:/\b(fragile|glass|mirror|artwork|antiques?|breakable|ceramic)\b/,
        evidence:/\b(padding|blankets?|wrapped?|bubble wrap|secured?|flat|upright)\b/,
        tip:function(m, ctx, n){ return 'You flagged something <b>' + esc(m) + '</b> — nice. Completed fragile runs added one more line: how it should ride (flat vs. upright, wrapped or padded). It’s the difference between delivered and delivered <i>whole</i>.'; },
        seed:{ seen:21, incl:15 } },

      { id:'delivery.handoff', covers:1,
        find:/\b(apartment|apt|gated?|gate code|buzzer|suite|unit|complex|dorm|office building)\b/,
        evidence:/\b(code|call ?box|buzz|front desk|concierge|leave (it )?(at|by)|unit \d|#\d)\b/,
        tip:function(m, ctx, n){ return 'Drop-off is at an <b>' + esc(m) + '</b> — add the gate code, unit number, or “call on arrival” to the description. Failed handoffs in completed data almost always trace back to this one missing line.'; },
        seed:{ seen:40, incl:34 } },
    ],

    moving: [
      { id:'moving.crew-size', covers:0,
        find:/\b([2-5])[- ]?(bed(room)?s?|br)\b|\b(two|three|four)[- ]bed(room)?\b/,
        gap:function(ctx){ return !ctx.fields.moreThanOneWorker; },
        tip:function(m, ctx, n){ return 'A <b>' + esc(m) + '</b> move with <b>one Gopher</b> is a long day — in ' + n.seen + ' completed moves that size, nearly all ran 2–3 movers. Bump the crew in <b>Worker info</b>; hourly cost barely moves when the day is half as long.'; },
        seed:{ seen:33, incl:31 } },

      { id:'moving.specialty', covers:4,
        find:/\b(piano|gun safe|safe|pool table|aquarium|hot tub|grandfather clock|antique)\b/,
        tip:function(m, ctx, n){ return 'A <b>' + esc(m) + '</b> is specialty cargo — completed moves with one booked Gophers with straps, skids, and experience moving that exact item. Say it loud in the description so the right pros raise their hands.'; },
        seed:{ seen:14, incl:12 } },

      { id:'moving.access', covers:3,
        find:/\b(3rd floor|4th floor|third floor|fourth floor|walk-?up|no elevator|narrow (stairs|hall|doorway)|tight (stairs|corner|doorway)|long (walk|carry))\b/,
        gap:function(ctx){ return !ctx.fields.pickupStairs && !ctx.fields.destStairs; },
        tip:function(m, ctx, n){ return 'You wrote “<b>' + esc(m) + '</b>” but no stairs are logged in <b>Locations</b>. Completed moves that captured access at BOTH ends priced right the first time — no mid-job adjustments.'; },
        seed:{ seen:29, incl:22 } },

      { id:'moving.truck', covers:1, absent:true, minLen:25,
        find:/\b(truck|u-?haul|trailer|van|pod|container|box truck)\b/,
        tip:function(m, ctx, n){ return 'We couldn’t tell <b>who brings the truck</b>. It’s the first question every mover asks — ' + n.incl + ' of ' + n.seen + ' completed moves settled it in the post (“bring a truck” or “U-Haul’s in the driveway”).'; },
        seed:{ seen:61, incl:49 } },

      { id:'moving.packed', covers:null,
        find:/\b(apartment|house|condo|bedroom|move (my|our|the)|moving (out|to|from))\b/,
        evidence:/\b(packed|boxed( up)?|boxes (are )?ready|wrapped|just (the )?furniture|already in boxes)\b/,
        gap:function(ctx){ return !/\bpack(ing)?\b/.test(ctx.text); },
        tip:function(m, ctx, n){ return 'One word saves an hour: will everything be <b>packed and ready</b>, or is packing part of the job? Completed moves that answered it up front started on time instead of starting with a surprise.'; },
        seed:{ seen:57, incl:41 } },
    ],

    home: [
      { id:'home.tv-mount', covers:0,
        find:/\b(mount|hang)\w*\b[^.]{0,30}\b(tv|television)\b|\btv mount\w*\b/,
        evidence:/\b(drywall|studs?|brick|concrete|masonry|plaster|stone|fireplace)\b/,
        tip:function(m, ctx, n){ return 'TV mount — got it. What’s the <b>wall made of</b>? Drywall-and-stud is standard; brick, stone, or over-the-fireplace needs different anchors and sometimes a different Gopher. Completed mounts that said the wall type had zero return trips.'; },
        seed:{ seen:35, incl:28 } },

      { id:'home.licensed', covers:2,
        find:/\b(electrical|wiring|outlet|breaker|panel|plumbing|gas line|gas hookup|water heater|sewer)\b/,
        tip:function(m, ctx, n){ return '<b>' + esc(m) + '</b> can cross into licensed territory — completed jobs like this went to a <b>Gopher Pro</b>. Describe exactly where the job starts and stops (“swap the fixture, wiring’s already there”) so the right tier accepts.'; },
        seed:{ seen:27, incl:23 } },

      { id:'home.materials', covers:1,
        find:/\b(install|replace|assemble|mount|repair|swap|fix)\b/,
        evidence:/\b(i (have|bought|purchased)|i’ve got|i've got|provided|will supply|parts included|comes with|in the box|on ?site)\b/,
        tip:function(m, ctx, n){ return 'You’re asking to <b>' + esc(m) + '</b> something — are the <b>parts and materials on hand</b>, or should your Gopher stop for them? ' + n.incl + ' of ' + n.seen + ' completed jobs answered this up front (add the cost of items if they’re buying).'; },
        seed:{ seen:88, incl:64 } },

      { id:'home.photo', covers:3,
        find:/\b(repair|fix|patch|leak|broken|damaged|crack(ed)?)\b/,
        gap:function(ctx){ return ctx.fields.photoCount === 0; },
        tip:function(m, ctx, n){ return 'Something’s <b>' + esc(m) + '</b>-related and there’s no photo attached yet — a picture is the fastest way for the right Gopher to say “yep, I’ve got this.” Completed repair jobs with a photo matched noticeably faster.'; },
        seed:{ seen:46, incl:37 } },

      { id:'home.measurements', covers:null,
        find:/\b(shelv(es|ing)|shelf|blinds?|curtains?|window|door|cabinet)\b/,
        evidence:/\d+\s?("|”|in\b|inch|inches|cm|ft|feet|')/,
        tip:function(m, ctx, n){ return '<b>' + esc(m) + '</b> work lives and dies by <b>measurements</b> — width, height, how many. Completed jobs that included numbers got the hardware right on trip one.'; },
        seed:{ seen:24, incl:17 } },
    ],

    labor: [
      { id:'labor.crew', covers:0,
        find:/\b(unload|load)\w*\b[^.]{0,40}\b(truck|u-?haul|trailer|pod|container)\b|\bheavy lift\w*\b/,
        evidence:/\b(two|2|three|3|four|4)\s+(people|guys|gophers|workers)\b/,
        gap:function(ctx){ return !ctx.fields.moreThanOneWorker; },
        tip:function(m, ctx, n){ return 'Truck loading with <b>one set of hands</b> is slow going — in completed load/unload jobs, two Gophers finished in well under half the time (and your stuff takes fewer hits). Worth a look at <b>Worker info</b>.'; },
        seed:{ seen:30, incl:26 } },

      { id:'labor.hours', covers:0,
        find:/\b(all ?day|entire (house|garage|yard)|whole (house|garage|day)|big job|lots of|tons of)\b/,
        gap:function(ctx){ return ctx.fields.payByHour && ctx.fields.numHours <= 2; },
        tip:function(m, ctx, n){ return 'You wrote “<b>' + esc(m) + '</b>” but the request is set for <b>' + ctx.fields.numHours + ' hour' + (ctx.fields.numHours === 1 ? '' : 's') + '</b>. Completed jobs described like this ran 3+ — an honest estimate up front beats a mid-job renegotiation.'; },
        seed:{ seen:22, incl:19 } },

      { id:'labor.tools', covers:3,
        find:/\b(dig|demo|demolition|haul|shovel|rake|paint|scrape|sand|drill|assembl)\w*\b/,
        evidence:/\b(tools? (are )?(provided|on ?site|here)|i (have|supply) (the )?tools?|bring (your|their) (own )?tools?|byot)\b/,
        tip:function(m, ctx, n){ return 'For <b>' + esc(m) + '</b>-type work, say whether <b>tools and equipment are on-site</b> or should come along. ' + n.incl + ' of ' + n.seen + ' completed labor jobs settled it in the description — the rest lost time to a hardware-store run.'; },
        seed:{ seen:41, incl:32 } },

      { id:'labor.conditions', covers:2,
        find:/\b(attic|crawl ?space|roof|second story|outdoors?|outside|in the (sun|heat))\b/,
        tip:function(m, ctx, n){ return 'Work in the <b>' + esc(m) + '</b> is physically different — completed jobs that flagged heat, dust, or tight spaces got Gophers who showed up dressed and equipped for it, not surprised by it.'; },
        seed:{ seen:16, incl:11 } },
    ],

    yard: [
      { id:'yard.size', covers:0, absent:true, minLen:20,
        find:/\b(\d+[\s,]*(sq\.? ?ft|square feet|acres?|ft|feet))\b|\b(half|quarter)[- ]acre\b|\b(small|large|big|tiny)\s+(yard|lawn|lot)\b|\b(front|back)\s?yard\b/,
        tip:function(m, ctx, n){ return 'We couldn’t spot the <b>size of the space</b> — a patio bed and a half-acre are different days entirely. ' + n.incl + ' of ' + n.seen + ' completed yard jobs gave a rough size (or just “front yard only”), and their quotes held.'; },
        seed:{ seen:74, incl:58 } },

      { id:'yard.equipment', covers:1,
        find:/\b(mow|edge|trim|blow|hedge|prune|weed ?eat|leaf|leaves|mulch)\w*\b/,
        evidence:/\b(my (mower|equipment|tools)|i (have|supply)|equipment (is )?(provided|here|on ?site)|bring (your|their) own)\b/,
        tip:function(m, ctx, n){ return 'Who brings the <b>mower, blower, and trimmer</b>? Completed jobs answered it either way — “use mine in the garage” or “bring equipment” — and the ones that didn’t usually started late.'; },
        seed:{ seen:66, incl:51 } },

      { id:'yard.debris', covers:2,
        find:/\b(cleanup|clean up|trim|prune|hedge|branch(es)?|limbs?|brush|leaf|leaves|weeds?)\b/,
        evidence:/\b(haul(ed)?( it| them)? (away|off)|bag(ged)?|at the curb|curbside|compost|dump|yard waste|city pickup)\b/,
        tip:function(m, ctx, n){ return 'That work makes a <b>debris pile</b> — where does it go? Bagged at the curb is one job; hauled off entirely is a truck and a dump fee. In ' + n.seen + ' completed jobs this was THE detail that changed the price.'; },
        seed:{ seen:59, incl:44 } },

      { id:'yard.access', covers:3,
        find:/\b(back ?yard|fenced?|gated?|side (gate|yard)|behind the (house|fence))\b/,
        evidence:/\b(gate (code|is|will be)|unlocked|dogs? (are|will)|no pets?|pets? inside)\b/,
        tip:function(m, ctx, n){ return 'Work’s in the <b>' + esc(m) + '</b> — will the gate be unlocked, and any dogs your Gopher should know about? One line covers both; completed jobs that had it never lost a morning to a locked latch.'; },
        seed:{ seen:28, incl:20 } },
    ],

    ride: [
      { id:'ride.riders', covers:0,
        find:/\b(\d+)\s+(people|riders?|passengers?|adults?|of us)\b/,
        gap:function(ctx, m){
          var count = parseInt(m, 10);
          return !isNaN(count) && count > 0 && count !== ctx.fields.numRiders;
        },
        tip:function(m, ctx, n){ return 'Your note says <b>' + esc(m) + '</b> but the rider count is set to <b>' + ctx.fields.numRiders + '</b> — sync them up in <b>Rider info</b>. It’s what decides car vs. SUV vs. van before the wrong one is already en route.'; },
        seed:{ seen:19, incl:17 } },

      { id:'ride.luggage', covers:0,
        find:/\b(airport|flight|luggage|suitcases?|checked bags?|golf (bag|clubs)|skis)\b/,
        gap:function(ctx){ return ctx.fields.numBags === 0; },
        tip:function(m, ctx, n){ return 'You mentioned <b>' + esc(m) + '</b> but the bag count is set to zero — completed airport runs that set luggage up front got a trunk that actually fit it. Two big checked bags can outgrow a compact fast.'; },
        seed:{ seen:34, incl:29 } },

      { id:'ride.flight', covers:1,
        find:/\b(airport|flight|rdu|terminal|departure|arriving|lands?|red-?eye)\b/,
        evidence:/\b\d{1,2}(:\d{2})?\s?(am|pm)\b|\bterminal\s?[12ab]\b|\bflight (number|#)|\b(aa|dl|ua|wn)\s?\d{2,4}\b/i,
        tip:function(m, ctx, n){ return 'Airport run — add the <b>flight time and terminal</b> to the notes. ' + n.incl + ' of ' + n.seen + ' completed airport rides included them, and those pickups were waiting at the right curb instead of circling.'; },
        seed:{ seen:45, incl:39 } },

      { id:'ride.special-needs', covers:3,
        find:/\b(kids?|child(ren)?|toddler|baby|infant|wheelchair|walker|elderly|senior|my (mom|dad|mother|father|grandm\w+|grandf\w+)|dog|cat|pet)\b/,
        evidence:/\b(car ?seat|booster|accessible|wheelchair (van|accessible)|pet (carrier|friendly)|crate)\b/,
        tip:function(m, ctx, n){ return 'A rider like that (<b>' + esc(m) + '</b>) usually needs one more detail — car seat or booster, wheelchair-friendly vehicle, or pet-friendly OK. Saying it now means the Gopher who accepts is the right one, not a roadside surprise.'; },
        seed:{ seen:23, incl:18 } },

      { id:'ride.wait-return', covers:2,
        find:/\b(wait|round ?trip|both ways|there and back|appointment|pick me (back )?up)\b/,
        evidence:/\b(\d+\s?(min|minutes|hours?|hrs?))\s?(wait|of waiting)|\bwait time\b/,
        tip:function(m, ctx, n){ return 'Sounds like a <b>wait-and-return</b> trip — estimate the wait (“about 45 min at the appointment”) so the fare is set fairly up front. Completed round trips that skipped this ended in awkward re-negotiation.'; },
        seed:{ seen:17, incl:12 } },
    ],

    other: [
      { id:'other.time', covers:1, absent:true, minLen:25,
        find:/\b(\d+\s?(min|minutes|hours?|hrs?)|all ?day|half[- ]day|quick|a couple hours?)\b/,
        tip:function(m, ctx, n){ return 'How long do you think it’ll take? Even a guess (“maybe two hours”) helps — ' + n.incl + ' of ' + n.seen + ' completed custom requests included a time sense, and those matched with Gophers whose day actually fit the job.'; },
        seed:{ seen:64, incl:47 } },

      { id:'other.gear', covers:2,
        find:/\b(setup|set up|install|build|repair|clean|organize|haul|deliver|assemble)\w*\b/,
        evidence:/\b(tools?|equipment|truck|van|ladder|supplies)\b/,
        tip:function(m, ctx, n){ return 'For a <b>' + esc(m) + '</b> job, mention any <b>tools, supplies, or vehicle</b> it takes to pull off — or say “everything’s here.” It’s the first thing a Gopher checks before committing to a custom request.'; },
        seed:{ seen:49, incl:36 } },

      { id:'other.photo', covers:3,
        find:/\b(this|it|the (thing|item|area|space|room|mess))\b/,
        gap:function(ctx){ return ctx.fields.photoCount === 0 && ctx.text.length >= 40; },
        tip:function(m, ctx, n){ return 'A one-off request is exactly where <b>a photo</b> earns its keep — it answers the questions your description can’t predict. Completed custom jobs with a photo attached matched faster and re-negotiated less.'; },
        seed:{ seen:57, incl:40 } },
    ],
  };

  /* ── Persistent learning store ─────────────────────────────────────────── */

  function blankStore(){ return { v:1, ingested:{}, cats:{} }; }

  function loadStore(){
    try {
      var raw = (typeof localStorage !== 'undefined') && localStorage.getItem(STORE_KEY);
      if(raw){
        var s = JSON.parse(raw);
        if(s && s.v === 1 && s.cats) return s;
      }
    } catch(e){}
    return blankStore();
  }

  var store = loadStore();

  function saveStore(){
    try {
      if(typeof localStorage !== 'undefined') localStorage.setItem(STORE_KEY, JSON.stringify(store));
    } catch(e){}
  }

  function catBucket(cat){
    if(!store.cats[cat]) store.cats[cat] = { completed:0, p:{} };
    return store.cats[cat];
  }
  function patTally(cat, id){
    var b = catBucket(cat);
    if(!b.p[id]) b.p[id] = { seen:0, incl:0, acted:0, adj:0 };
    return b.p[id];
  }

  /* Live corpus numbers for a pattern: seed + everything learned locally. */
  function liveCounts(cat, pat){
    var t = (store.cats[cat] && store.cats[cat].p[pat.id]) || { seen:0, incl:0, acted:0, adj:0 };
    return {
      seen: pat.seed.seen + t.seen,
      incl: pat.seed.incl + t.incl + t.acted * ACT_WEIGHT + t.adj * ADJ_WEIGHT,
      completed: completedCount(cat),
    };
  }

  function completedCount(cat){
    var learned = (store.cats[cat] && store.cats[cat].completed) || 0;
    return (BASE_COMPLETED[cat] || 0) + learned;
  }

  /* Platform-corpus stand-in per category (what the seed counts were mined
     from). Local completions add on top, so the cited number really grows. */
  var BASE_COMPLETED = { delivery:310, moving:140, home:260, labor:180, junk:220, yard:240, ride:290, other:150 };

  /* ── Recognition ──────────────────────────────────────────────────────── */

  function normalizeCat(cat){
    var k = String(cat || '').toLowerCase().trim();
    if(PATTERNS[k]) return k;
    return DISPLAY_TO_KEY[k] || null;
  }

  /* Does this pattern fire against (text, fields)? Returns null or the match echo. */
  function fireCheck(pat, text, ctx){
    var m = text.match(pat.find);
    if(pat.absent){
      if(text.length < (pat.minLen || 0)) return null;      // too little text to judge
      if(m) return null;                                    // detail present → no gap
      if(pat.gap && !pat.gap(ctx, null)) return null;
      return '';                                            // fires with no echo term
    }
    if(!m) return null;
    if(pat.evidence && pat.evidence.test(text)) return null; // covered in the text
    if(pat.gap && !pat.gap(ctx, m[0])) return null;          // covered by flow fields
    return m[0];
  }

  /* Ranking score: Laplace-smoothed inclusion rate over the LIVE corpus, so
     locally-learned outcomes (acted-on, cost-adjusted) genuinely re-rank. */
  function scoreOf(cat, pat){
    var n = liveCounts(cat, pat);
    return (n.incl + 1) / (n.seen + 2);
  }

  /* analyze(ctx) → { category, suggestions:[{id, covers, html, echo, score}],
                      completedCount } | null
     ctx = { category, description, extraText?, fields:{...} } — see surfaces. */
  function analyze(ctx){
    var cat = normalizeCat(ctx && ctx.category);
    if(!cat) return null;
    var pats = PATTERNS[cat] || [];
    var text = (String(ctx.description || '') + ' ' + String(ctx.extraText || '')).toLowerCase().trim();
    var fields = ctx.fields || {};
    var ictx = { text: text, fields: {
      moreThanOneWorker: !!fields.moreThanOneWorker,
      numWorkers: fields.numWorkers || 1,
      payByHour: !!fields.payByHour,
      numHours: parseInt(fields.numHours, 10) || 1,
      pickupStairs: fields.pickupStairs || 0,
      destStairs: fields.destStairs || 0,
      photoCount: fields.photoCount || 0,
      itemsPurchased: !!fields.itemsPurchased,
      hazardous: !!fields.hazardous,
      numRiders: parseInt(fields.numRiders, 10) || 1,
      numBags: parseInt(fields.numBags, 10) || 0,
      scheduleType: fields.scheduleType || 'now',
    }};
    var out = [];
    for(var i = 0; i < pats.length; i++){
      var echo = fireCheck(pats[i], text, ictx);
      if(echo === null) continue;
      var n = liveCounts(cat, pats[i]);
      out.push({
        id: pats[i].id,
        covers: (pats[i].covers == null ? null : pats[i].covers),
        echo: echo,
        score: scoreOf(cat, pats[i]),
        html: pats[i].tip(echo, ictx, n),
      });
    }
    out.sort(function(a, b){ return b.score - a.score; });
    return { category: cat, suggestions: out.slice(0, MAX_SUGGESTIONS), completedCount: completedCount(cat) };
  }

  /* ── Learning ─────────────────────────────────────────────────────────── */

  /* Run the recognizers over a COMPLETED request's text and tally: seen for
     every recognized trait; incl when the companion detail was in the text
     too (that's what "completed requests teach us what to include" means). */
  function tallyCompletedText(cat, text){
    var pats = PATTERNS[cat] || [];
    var t = String(text || '').toLowerCase();
    if(!t.trim()) return;
    for(var i = 0; i < pats.length; i++){
      var pat = pats[i];
      if(pat.absent){
        patTally(cat, pat.id).seen++;
        if(pat.find.test(t)) patTally(cat, pat.id).incl++;
        continue;
      }
      if(pat.find.test(t)){
        patTally(cat, pat.id).seen++;
        if(pat.evidence && pat.evidence.test(t)) patTally(cat, pat.id).incl++;
      }
    }
  }

  /* Ingest PAST completed requests (e.g. the dashboard's Previous-requests
     bucket). Idempotent per record id — safe to call on every page load. */
  function seedFromHistory(records){
    if(!Array.isArray(records)) return;
    var changed = false;
    for(var i = 0; i < records.length; i++){
      var r = records[i];
      if(!r || !r.id || store.ingested[r.id]) continue;
      var cat = normalizeCat(r.category);
      if(!cat) continue;
      store.ingested[r.id] = 1;
      catBucket(cat).completed++;
      tallyCompletedText(cat, r.details || r.description || '');
      changed = true;
    }
    if(changed) saveStore();
  }

  /* Ingest a FUTURE completion. rec = {
       audit:    the submit-time audit built by buildAudit() (carried on the
                 dashboard record), or null
       category, description: fallbacks when there's no audit
       adjusted: true when the job needed a post-hoc cost adjustment
       id:       dashboard record id (dedupe)
     } */
  function learnFromCompletion(rec){
    if(!rec) return;
    var audit = rec.audit || null;
    var cat = normalizeCat((audit && audit.category) || rec.category);
    if(!cat) return;
    if(rec.id){
      if(store.ingested[rec.id]) return;
      store.ingested[rec.id] = 1;
    }
    catBucket(cat).completed++;
    tallyCompletedText(cat, (audit && audit.text) || rec.description || '');
    if(audit){
      var i;
      /* Shown at review, gone by submit → the user acted on it. Strong signal
         that the suggestion mattered. */
      for(i = 0; i < (audit.actedOn || []).length; i++) patTally(cat, audit.actedOn[i]).acted++;
      /* Still firing at submit (ignored) AND the job needed a cost adjustment
         → the miss was real and it cost money. Strongest signal. */
      if(rec.adjusted){
        for(i = 0; i < (audit.fired || []).length; i++) patTally(cat, audit.fired[i]).adj++;
      }
    }
    saveStore();
  }

  /* Snapshot at submit time; rides on the dashboard record so completion can
     close the loop. shownIds = pattern ids on screen when the user opened the
     review block (surfaces stash these). */
  function buildAudit(ctx, shownIds){
    var res = analyze(ctx);
    if(!res) return null;
    var fired = res.suggestions.map(function(s){ return s.id; });
    var shown = Array.isArray(shownIds) ? shownIds : [];
    var actedOn = shown.filter(function(id){ return fired.indexOf(id) === -1; });
    return {
      category: res.category,
      text: String(ctx.description || '') + (ctx.extraText ? ' ' + ctx.extraText : ''),
      fired: fired,
      shown: shown,
      actedOn: actedOn,
    };
  }

  function stats(cat){
    var k = normalizeCat(cat);
    if(!k) return null;
    return { category: k, completedCount: completedCount(k) };
  }

  /* Test/maintenance hook: wipe the learned layer (seed counts remain). */
  function resetLearning(){ store = blankStore(); saveStore(); }

  var API = {
    analyze: analyze,
    seedFromHistory: seedFromHistory,
    learnFromCompletion: learnFromCompletion,
    buildAudit: buildAudit,
    stats: stats,
    resetLearning: resetLearning,
  };

  if(typeof window !== 'undefined') window.GopherIQReview = API;
  if(typeof module !== 'undefined' && module.exports) module.exports = API;  // test harness
})();
