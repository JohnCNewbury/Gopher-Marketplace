/* ─── Gopher featured-placement bidding brain (shared) ───────────────────────
   One auction, two windows onto it:
     • gopher-deals.html — merchant portal, "Feature my business" board
     • gopher-go.html    — worker dashboard (planned; not wired yet)
   Both pages must render from THIS module so the standings, badge rules and
   category lock never drift apart.

   Rules encoded here (owner spec, 2026-07-22):
     • "Projected Featured Deal" is always badged on the single highest bid
       across ALL categories.
     • "You're leading!" applies only to the viewer's OWN category, and only
       when the viewer actually holds that category's top bid. The featured
       card never doubles up with the sticker — featured already implies it.
     • A business can only bid in its own category (a restaurant cannot bid
       on Retail Merchants). canBid()/placeBid() enforce this; UIs must not
       offer a bid control where canBid() is false.
     • The category holding the top overall bid also appears as its own card
       showing its second-highest bid, so that category shows twice.

   Prototype data layer: the demo seed below stands in for the auction API.
   Production swaps these tables for live queries behind the same
   window.GopherBidBrain seam (and settles auctions server-side — never trust
   client math for money). `mine` is a single-viewer demo flag; production
   keys placements by merchantId and compares against the signed-in account. */
(function(){
  'use strict';

  var CATS = ['Service Providers','Restaurants & Food Trucks','Local Favorites','Retail Merchants','Age-Restricted'];

  /* Demo seed — viewer is My Way Tavern (Restaurants & Food Trucks).
     Service Providers holds the top overall bid (featured) so its card
     appears twice per the board rule; the viewer leads their own category. */
  var placements = [
    { category:'Service Providers',           amount:500, holder:'Carolina Green Lawns',     mine:false },
    { category:'Restaurants & Food Trucks', amount:410, holder:'You · My Way Tavern', mine:true  },
    { category:'Local Favorites',             amount:300, holder:'A nearby merchant',        mine:false },
    { category:'Service Providers',           amount:260, holder:'A nearby merchant',        mine:false },
    { category:'Retail Merchants',          amount:225, holder:'A nearby merchant',        mine:false },
    { category:'Age-Restricted',              amount:125, holder:'A nearby merchant',        mine:false }
  ];

  function sorted(){ return placements.slice().sort(function(a,b){ return b.amount-a.amount; }); }

  function topOverall(){ return sorted()[0] || null; }

  function catTop(cat){
    var top=null;
    placements.forEach(function(p){ if(p.category===cat && (!top || p.amount>top.amount)) top=p; });
    return top; /* null = no bids yet this month */
  }

  function canBid(viewerCat, cat){ return !!viewerCat && viewerCat===cat; }

  function isLeading(viewer){
    var t = catTop(viewer.category);
    return !!(t && t.mine);
  }

  /* Render-ready board for a viewer {name, category}, amount desc:
     the top overall bid (featured), then each category's top bid — which for
     the featured category is its second-highest, so ONLY that category shows
     twice. Lower placements stay off the board. */
  function board(viewer){
    var list = sorted();
    if(!list.length) return [];
    var cards=[list[0]], seen={};
    list.slice(1).forEach(function(p){
      if(seen[p.category]) return;
      seen[p.category]=true;
      cards.push(p);
    });
    return cards.map(function(p, i){
      var featured = (i===0);
      var own = (p.category===viewer.category);
      var t = catTop(p.category);
      var leads = own && p.mine && t && t.amount===p.amount;
      return {
        category: p.category,
        amount:   p.amount,
        holder:   p.holder,
        mine:     p.mine,
        featured: featured,
        leading:  leads && !featured, /* featured already implies it */
        own:      own,
        canBid:   canBid(viewer.category, p.category)
      };
    });
  }

  /* Category-locked bid. Replaces the viewer's category-top entry when the
     bid takes the lead; otherwise records it as a non-leading placement.
     TODO(backend): POST { dealId, category, amount, month } and settle the
     monthly auction server-side. */
  function placeBid(viewer, category, amount){
    amount = parseInt(amount,10);
    if(!canBid(viewer.category, category)) return { ok:false, reason:'category-locked' };
    if(!amount || amount<1) return { ok:false, reason:'amount' };
    var t = catTop(category);
    var beatsTop = !t || amount > t.amount;
    var entry = { category:category, amount:amount, holder:'You · '+viewer.name, mine:true };
    if(beatsTop){
      var idx=-1, mx=-1;
      placements.forEach(function(p,i){ if(p.category===category && p.amount>mx){ mx=p.amount; idx=i; } });
      if(idx>=0){ placements[idx]=entry; } else { placements.push(entry); }
    }
    /* Non-leading bids still win a featured slot this month (guaranteed-win
       copy) — the demo board only tracks category tops, so nothing to move. */
    return { ok:true, beatsTop:beatsTop };
  }

  /* Bidding closes on the 20th of each month — label the next close. */
  function closeLabel(){
    var MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
    var now=new Date(), m=now.getMonth(), y=now.getFullYear();
    if(now.getDate()>20){ m++; if(m>11){ m=0; y++; } }
    return 'Bidding closes '+MONTHS[m]+' 20th, '+y;
  }

  window.GopherBidBrain = {
    CATS: CATS.slice(),
    board: board,
    catTop: catTop,
    topOverall: topOverall,
    canBid: canBid,
    isLeading: isLeading,
    placeBid: placeBid,
    closeLabel: closeLabel
  };
})();
