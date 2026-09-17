# -*- coding: utf-8 -*-
"""Per-post metadata for the blog split.

Everything here is DERIVED from the post's own text in gopher-blog.html —
meta descriptions from the dek, takeaways from the post's H3s and lists, FAQ
answers quoted (or lightly trimmed) from sentences that are already in the
post. No new claims.

Banned words (Style Guide): ecosystem, seamlessly, platform, users, gig,
leverage, optimize, unlock, empower, utilize.  Pre-existing hits inside moved
post copy are reported, not edited.
"""

# id -> metadata
POSTS = {
  "how-it-fits": dict(
    slug="blog-gopher-marketplace-on-one-page",
    published="2026-09-12", modified="2026-09-12",
    desc="Four hats, not four kinds of people. How neighbors, Service Providers, "
         "businesses and merchants fit together on the Gopher Marketplace.",
    takeaways=[
      "Four hats, one account: neighbors on <b>Gopher Request</b>, Service Providers on <b>Gopher Go</b>, businesses on <b>Gopher Connect</b>, merchants on <b>Gopher Deals</b>.",
      "One person can wear every hat &mdash; a pizza place can post a Deal, hire a Friday-night driver, and run a $50 delivery, all in the same day.",
      "Nobody deals with a stranger directly: neighbors are identity-verified, and Gophers carry Elite, Elite+ and Pro badges on top.",
      "Gopher holds the payment until the job is confirmed, then pays the Gopher in full.",
      "Only someone who actually paid can leave a rating.",
    ],
    faq=[],
    related=["service-providers", "deals-for-merchants", "marketplace"],
  ),

  "deals-for-merchants": dict(
    slug="blog-merchant-deals-skip-the-delivery-app-cut",
    published="2026-09-12", modified="2026-09-12",
    desc="Gopher Deals is free to list, the customer buys from you directly, and a "
         "local Gopher delivers without taking a slice. How to get listed.",
    takeaways=[
      "Listing a Deal is free, and the customer buys from you directly &mdash; you keep the customer, the pricing and the profit.",
      "If the customer wants delivery, they pay the Gopher&rsquo;s trip price plus Gopher&rsquo;s small fee. You pay nothing on the order and nothing for the trip.",
      "Registration is one form: your business, your first Deal, and the owner details that become your Gopher login.",
      "Our team reviews every submission and gives you an activation date <b>within five business days</b>.",
      "Featured placement on the Request and Connect home pages is optional and bid-based &mdash; bidding is free, and only winning costs.",
    ],
    faq=[
      ("What does it cost a merchant to list a Deal on Gopher?",
       "Listing is free. You pay nothing on the order and nothing for the trip. Featured placement on the Request and Connect home pages is optional and bid-based: bidding is free, only winning costs, and you are charged on the closing day."),
      ("How long does it take to get a Deal activated?",
       "Our team reviews every submission and gives you an activation date within five business days."),
      ("How does a customer get a Deal delivered?",
       "If the customer wants it delivered, they tap once more and a local Gopher picks it up. The customer pays the Gopher's trip price plus Gopher's small fee."),
      ("Can a Service Provider post a Deal?",
       "Yes. Power washers, landscapers, handymen and every service business in between can post Deals. Eligibility is automatic and there is a bar: the form on the Deals page looks you up by your Gopher ID and comes back with terms."),
    ],
    related=["service-providers", "restaurant", "how-it-fits"],
  ),

  "service-providers": dict(
    slug="blog-service-provider-deals",
    published="2026-09-13", modified="2026-09-13",
    desc="Service Provider Deals: post a standing offer at your own price, free, "
         "and every neighbor, business and merchant on Gopher can book it.",
    takeaways=[
      "A Service Provider Deal is a standing offer: the service, the price you want to earn, and how far you&rsquo;ll travel.",
      "You post it free from the Gopher Go app, and it appears under <b>Local Service Provider Deals</b> up to 50 miles out.",
      "Eligibility is earned, not bought: a verified badge (Elite, Elite+ or Pro), 20 completed service jobs, and a 4.75-star average over the last 20.",
      "Gopher charges nothing to post and nothing per booking. The customer pays a small 10% Deal Boost on top of your price to find you.",
      "The number you set is the number that lands in your bank, the moment the customer confirms the job is done.",
    ],
    faq=[
      ("Who can post a Service Provider Deal on Gopher?",
       "You are eligible the moment you meet all three: a verified badge (Elite, Elite+ or Pro); 20 completed service jobs on Gopher Go, where delivery, ride-sharing and Other jobs do not count; and a 4.75-star average over your last 20 service jobs in the same categories."),
      ("What does a Service Provider Deal cost?",
       "Gopher charges you nothing to post and nothing per booking. The customer pays a small 10% Deal Boost on top of your price to find you."),
      ("How far does a Service Provider Deal reach?",
       "It appears under Local Service Provider Deals for every neighbor, business and merchant on Gopher, and for anyone browsing Deals on the web, up to 50 miles out."),
      ("How does a neighbor book a Service Provider Deal?",
       "When a neighbor wants it, they tap once and the request lands with you on Gopher Request. A business that likes what it sees can book you through Gopher Connect the same way."),
    ],
    related=["earn", "refer-yourself", "deals-for-merchants"],
  ),

  "marketplace": dict(
    slug="blog-the-marketplace-your-community-runs-on",
    published="2026-06-01", modified="2026-09-12",
    desc="One app, real local neighbors, and just about any task you can name "
         "&mdash; handled at a fair price you set, by someone down the street.",
    takeaways=[
      "Gopher is built around your community rather than a single job type, so almost anything you need can be handled by someone right down the street.",
      "Four sides, one neighborhood: <b>Request</b> for neighbors, <b>Go</b> for Service Providers, <b>Connect</b> for businesses, <b>Deals</b> for merchants.",
      "Because <i>you</i> set the price, there are no surprise markups for you and full take-home for the worker.",
      "Everyone is identity-verified with ratings you can see; Elite and Elite+ Gophers add a clean background check on top.",
      "Find a Gopher you love and save them as a <b>MY Gopher</b> to request that same trusted face by name next time.",
    ],
    faq=[],
    related=["how-it-fits", "bring-your-own", "seniors"],
  ),

  "realtors": dict(
    slug="blog-help-for-busy-realtors",
    published="2026-04-22", modified="2026-04-22",
    desc="Staging, awkward furniture moves and last-minute listing errands eat a "
         "realtor&rsquo;s day. One request, one vetted local, done before lunch.",
    takeaways=[
      "Real-estate tasks are hybrids &mdash; part move, part errand, part handyman, part judgment call &mdash; and almost always time-sensitive.",
      "The category-shaped tools break down one by one: movers price whole households, delivery apps won&rsquo;t lift or wait, handymen rarely haul.",
      "On Gopher you post <i>what you need done</i> in plain words and name a price that&rsquo;s fair.",
      "One request can be a move <i>and</i> a haul-off <i>and</i> a staging reset, handled by the one neighbor who shows up.",
      "Found someone sharp? Save them as a favorite and request that same person for every listing.",
    ],
    faq=[],
    related=["connect", "junk", "marketplace"],
  ),

  "bring-your-own": dict(
    slug="blog-no-gopher-nearby-yet",
    published="2026-04-15", modified="2026-04-15",
    desc="Saw &ldquo;no Gophers in your area&rdquo;? Here&rsquo;s the five-minute fix: bring a "
         "driver you already trust onto Gopher Go and your next request goes to them.",
    takeaways=[
      "A brand-new area can come to life fast &mdash; sometimes within a day of the first few sign-ups nearby.",
      "The quickest fix is to tell someone about <b>Gopher Go</b>, the app for Service Providers.",
      "On Gopher they make right around double per delivery compared to other services, and keep 100% of the posted price you offer.",
      "Where to look: a driver you already use elsewhere, a neighbor who&rsquo;s always hustling, or someone who has helped you before.",
      "Recruiting one seeds Gopher in your area &mdash; for you <i>and</i> your neighbors.",
    ],
    faq=[],
    related=["seniors", "age-restricted", "marketplace"],
  ),

  "connect": dict(
    slug="blog-on-demand-local-workforce",
    published="2026-03-30", modified="2026-03-30",
    desc="Slammed one week, quiet the next? Gopher Connect gives your business a "
         "vetted local crew for the heavy days, and nothing to pay on the quiet ones.",
    takeaways=[
      "Staffing for the busy days means paying through the slow ones; staffing for the slow days means scrambling when it counts.",
      "Post the work, set a fair price, and vetted local Gophers claim it &mdash; no lead fees, no contracts, no payroll running through the quiet weeks.",
      "It covers couriers and same-day delivery, bulk labor and moving crews, skilled trades, and event or overflow staffing.",
      "You scale up on the heavy days and down to nothing on the quiet ones, paying only for the work you actually need.",
    ],
    faq=[],
    related=["realtors", "restaurant", "marketplace"],
  ),

  "age-restricted": dict(
    slug="blog-age-restricted-deliveries",
    published="2026-03-18", modified="2026-03-18",
    desc="Alcohol, tobacco and other adult items at retail price, from whichever "
         "store actually has them, with a government ID verified at the door.",
    takeaways=[
      "Your Gopher buys the item the same way you would &mdash; off the shelf, at retail. You&rsquo;re paying for the run, not a markup on the bottle.",
      "There&rsquo;s no warehouse: choose <b>&ldquo;Gopher can purchase anywhere&rdquo;</b> and your driver goes to the closest spot that actually has it.",
      "No exclusive merchant deals means no tiny catalog &mdash; if a store sells it at retail, you can ask for it.",
      "Your government ID is verified at the door, and only after verification is the order complete.",
      "Use <b>Select My Gopher</b> to pick someone who has done this kind of run before.",
    ],
    faq=[
      ("How is age verified on an age-restricted delivery?",
       "Your government ID is verified at the door. Only after verification is the order complete."),
      ("Do I pay more than retail for an age-restricted delivery?",
       "No. Your Gopher buys the item the same way you would, off the shelf, at the store, at retail. If there is a better deal nearby, you get that instead. You are paying for the run, not a hidden tax on every bottle."),
      ("How fast is an age-restricted delivery?",
       "Choose “Gopher can purchase anywhere” and your driver grabs your order from the closest spot that actually has it, which is usually how it shows up in well under an hour."),
      ("Can I request a specific brand?",
       "Yes. No exclusive merchant deals means no tiny catalog. If a store sells it at retail, you can ask for it, and a real person picks it up."),
    ],
    related=["bring-your-own", "junk", "seniors"],
  ),

  "junk": dict(
    slug="blog-junk-removal-the-easy-way",
    published="2026-02-04", modified="2026-02-04",
    desc="One item or the whole garage: snap a photo, name a price that feels fair, "
         "and a neighbor with a truck hauls it off &mdash; often the same day.",
    takeaways=[
      "Renting a dumpster runs into the hundreds, and you still do all the lifting yourself.",
      "National haul-off services price by the truckload, so a single mattress can cost about what a half-full truck does.",
      "On Gopher you snap a photo, name a price that feels fair, and a neighbor with a truck and a strong back claims the job.",
      "They do the lifting, haul it off and sweep up after &mdash; often the same day.",
      "You can also ask for a hand sorting what&rsquo;s trash, what&rsquo;s donation, and what&rsquo;s worth selling.",
    ],
    faq=[],
    related=["realtors", "seniors", "age-restricted"],
  ),

  "seniors": dict(
    slug="blog-a-marketplace-seniors-can-trust",
    published="2026-01-09", modified="2026-01-09",
    desc="&ldquo;Senior-friendly&rdquo; should mean four things: easy to ask, trusted and safe, "
         "reliable, and respectful. No membership, no schedule, no commitment.",
    takeaways=[
      "&ldquo;Senior-friendly&rdquo; here means four concrete promises: <b>easy to ask</b>, <b>trusted &amp; safe</b>, <b>reliable</b>, <b>respectful</b>.",
      "Help is requested in a few taps, and you know exactly who&rsquo;s coming &mdash; background checks, real ratings, verified identities.",
      "There&rsquo;s no membership to sign, no schedule to keep and no commitment to wriggle out of later.",
      "You post what you need, set a price that feels fair, and a capable local person handles it &mdash; one task or once a week.",
      "Save a Gopher you click with as a favorite and request that same friendly face every time.",
    ],
    faq=[
      ("Is there a membership or contract for senior help on Gopher?",
       "No. There is no membership to sign, no schedule to keep and no commitment to wriggle out of later. You post what you need, set a price that feels fair, and a capable local person handles it."),
      ("How do I know the person coming is trustworthy?",
       "Background checks, real ratings and verified identities, so you know exactly who is coming."),
      ("Can I request the same helper again?",
       "Yes. When you find a Gopher you click with, save them as a favorite and request that same friendly face every time."),
      ("Can I arrange help for a parent or grandparent?",
       "Yes. You can set up help for yourself, or for a parent or grandparent you are keeping an eye on from afar."),
    ],
    related=["junk", "bring-your-own", "marketplace"],
  ),

  "earn": dict(
    slug="blog-worker-centric-way-to-earn",
    published="2025-12-02", modified="2025-12-02",
    desc="On Gopher Go you set the rate, you pick the jobs, and the customer&rsquo;s "
         "posted price is exactly what you take home. A 100% posted take rate.",
    takeaways=[
      "Every job shows exactly what it pays, up front &mdash; no mystery math, no fees nibbling at the edges.",
      "The customer&rsquo;s posted price is exactly what you take home: a <b>100% posted take rate</b>.",
      "If a listed price doesn&rsquo;t match your time and skill, send a counter-offer; for open requests, bid your own rate.",
      "You&rsquo;re never on the clock &mdash; no set schedules, no minimum hours, no penalty for logging off.",
      "You climb a status ladder your neighbors can see: <b>Standard &rarr; Elite &rarr; Elite+</b>, earned one solid job at a time.",
    ],
    faq=[],
    related=["a-gig", "refer-yourself", "service-providers"],
  ),

  "restaurant": dict(
    slug="blog-restaurant-delivery-without-the-30-percent-bite",
    published="2025-11-12", modified="2025-11-12",
    desc="Gopher charges restaurants nothing. The delivery price is agreed between "
         "the customer and the Gopher, and food trucks work exactly the same way.",
    takeaways=[
      "Gopher charges restaurants nothing &mdash; no commissions, no contract fees.",
      "The delivery cost is agreed directly between the customer placing the request and the Gopher who delivers it.",
      "Food trucks with no fixed address work the same way: the Gopher picks up wherever you&rsquo;re parked today.",
      "There&rsquo;s no tip baiting &mdash; delivery earnings are transparent, known up front, and paid immediately on completion.",
    ],
    faq=[
      ("What does Gopher charge a restaurant for delivery?",
       "Gopher charges restaurants nothing: no commissions and no contract fees."),
      ("Who sets the delivery price?",
       "The delivery cost is agreed directly between the customer placing the request and the Gopher who delivers it."),
      ("Does this work for food trucks?",
       "Yes. Food trucks with no fixed address work the same way: the Gopher picks up wherever you are parked today."),
      ("Is there tip baiting on Gopher?",
       "No. Delivery earnings are transparent and known up front, and paid immediately on completion."),
    ],
    related=["deals-for-merchants", "connect", "how-it-fits"],
  ),

  "refer-yourself": dict(
    slug="blog-refer-yourself",
    published="2025-10-28", modified="2025-10-28",
    desc="Referring an app usually pads the company&rsquo;s numbers. Refer Yourself sends "
         "the work to you: share your link and first requests come straight to you.",
    takeaways=[
      "Share your QR code or your personal <b>Refer yourself</b> link with your own contacts.",
      "Anyone who signs up through it gets the option to add you as one of their <b>MY Gophers</b>.",
      "The moment they make their first request, it can come straight to you instead of the open queue.",
      "Every person you refer yourself to instantly receives an inbox message to add you as a favorite.",
      "You&rsquo;re never obligated to accept a request that lands &mdash; it&rsquo;s simply another channel of work that&rsquo;s yours.",
    ],
    faq=[],
    related=["earn", "a-gig", "service-providers"],
  ),

  "a-gig": dict(
    slug="blog-a-job-you-ll-actually-dig",
    published="2025-09-16", modified="2025-09-16",
    desc="A side hustle on your own time and your own terms, and not just dropping "
         "off food. Fill your day with the work you&rsquo;re good at, and get paid fast.",
    takeaways=[
      "You&rsquo;re not boxed into one kind of job: personal shopping, food delivery, handyman work, furniture assembly, dog walking, landscaping, ride-sharing and more.",
      "Your first jobs pay within a couple of business days, then instant payouts open up the moment a job&rsquo;s done.",
      "Grab requests whenever you&rsquo;re free &mdash; no shifts, no minimums.",
      "Pick your requests: no quotas, no pressure.",
      "Name your price &mdash; send a counter-offer any time the pay doesn&rsquo;t match the work.",
    ],
    faq=[],
    related=["earn", "refer-yourself", "service-providers"],
  ),
}

# Order of the feed on the index (newest first), and therefore of feed.xml.
ORDER = [
  "how-it-fits", "deals-for-merchants", "service-providers", "marketplace",
  "realtors", "bring-your-own", "connect", "age-restricted", "junk",
  "seniors", "earn", "restaurant", "refer-yourself", "a-gig",
]
