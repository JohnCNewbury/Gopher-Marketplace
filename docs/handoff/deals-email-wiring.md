# deals@ email wiring — ⛔ DO NOT IMPLEMENT. The Apps Script is FROZEN.

> ## ⛔ OWNER RULING 2026-08-14: **freeze the Apps Script.**
>
> It stays at **exactly today's behaviour — lead capture, and notify `deals@` — and nothing is
> added to it, ever.** No welcome email, no inbox relay, no new `submission_type`. **Everything
> below this box is HISTORY, not instructions.** The paste-ready snippet in particular must not be
> pasted.
>
> **Why, in the order that matters:**
>
> 1. **It would open an email relay from your own domain.** The endpoint's Apps Script deployment is
>    *"Who has access: Anyone"*, and its URL sits in the public page source of `gopher-deals.html`.
>    Today that is safe **because it only ever mails one fixed address**. The moment it mails
>    whatever address arrives in the POST body, anyone who views source can send mail as gophergo.io
>    — with no rate limiting, no suppression list, and no bounce handling. That is a deliverability
>    and reputation problem, not just an abuse one.
> 2. **Production has no Apps Script** (owner, 2026-07-24). Anything built here is thrown away at
>    go-live, when the script is **deleted, not migrated** (`sp-deal-pipeline.md` §6).
> 3. **It is already scoped and paid for elsewhere.** SOW **Bucket F** covers "two registration
>    paths; full account creation", so building it here means paying twice.
>
> **Where this work actually goes:** the **G40-305 dispatcher (`sendEmail.js`)**, in production —
> not Apps Script, and never against the lead-capture endpoint. A tombstone comment at
> `gopher-deals.html:5554` says the same thing at the call site.
>
> ### ⚠️ Two corrections to the text below, because it reads as safe and is not
>
> * **"The front-end half is BUILT and deployed" — it is not. It was REVERTED** (`40fc4eb`, after
>   shipping in `f18cacb`). The composer sends nothing; verified 0 fetch calls on send.
> * **"these POSTs land in the lead sheet as `inbox_message` rows (harmless…)" — they were NOT
>   harmless.** That endpoint is the LIVE merchant-lead sheet. Each demo message **mutated the
>   Leads header with 5 new columns, appended a junk row, and fired a pre-registration alert.** The
>   relay half was never written script-side, so the feature was never functional end to end — it
>   was pure cost, and it ran live until the backout.
> * **The snippet keys on `data.email`. The merchant form's field is `owner_email`** (only the
>   worker/SP form uses `email`), so the merchant welcome email would have silently never fired.
>   Left unfixed deliberately — fixing it would make a frozen path look ready.

---

_Historical record below — retained so the reasoning is auditable, NOT as a work item._

**Status (2026-08-05, SUPERSEDED):** the front-end half was claimed BUILT and deployed. The Apps
Script half below was described as a single paste + redeploy, an **owner action** (the script runs
under the owner's Google account; the no-live-changes rule applies).

Owner-tabled 2026-07-22; owner directed completion 2026-08-05; **frozen 2026-08-14.**

## What was built (front end, `Final/gopher-deals.html`)

The merchant-portal **Inbox composer** now POSTs every sent text message to
`GOPHER_FORM_ENDPOINT` (the existing registration Apps Script) as:

```json
{ "submission_type": "inbox_message",
  "business": "My Way Tavern",
  "merchant_name": "Marcus Delgado",
  "merchant_email": "marcus.demo@gophergo.io",
  "message": "…the text they typed…",
  "sent_at": "2026-08-05T12:34:56.000Z" }
```

- Same `text/plain;charset=utf-8` body trick as `submitForm` — Apps Script cannot
  answer a CORS preflight, so the request must stay "simple".
- **Fire-and-forget.** The in-portal demo thread renders regardless; a network
  failure only means no email.
- **Photos are not relayed** — data-URIs exceed Apps Script POST limits. Text only.
- Until the script below is deployed, these POSTs land in the lead sheet as
  `inbox_message` rows (harmless, and still a usable signal).

## What the owner pastes (Apps Script side)

Open the existing registration script (the one serving `GOPHER_FORM_ENDPOINT`),
and merge this into `doPost(e)`. Keep the existing sheet-append behavior for
registration types.

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);

  // ── NEW: merchant Inbox → deals@ relay ─────────────────────────────
  if (data.submission_type === 'inbox_message') {
    MailApp.sendEmail({
      to: 'deals@gophergo.io',
      subject: '[Deals Inbox] ' + (data.business || 'Unknown business') +
               ' — ' + (data.merchant_name || 'Unknown merchant'),
      replyTo: data.merchant_email || 'deals@gophergo.io',
      body: (data.message || '') +
            '\n\n—\nSent from the merchant portal Inbox by ' +
            (data.merchant_name || '?') + ' <' + (data.merchant_email || '?') + '>' +
            '\nBusiness: ' + (data.business || '?') +
            '\nAt: ' + (data.sent_at || '?')
    });
    return ContentService.createTextOutput('ok');
  }

  // ── NEW: welcome email on merchant registration ────────────────────
  // Fires for the existing registration submission types. Requires deals@
  // as a Gmail send-as alias on the script's account (see checklist below);
  // replies then return to deals@ automatically.
  var REG_TYPES = ['restaurant', 'business', 'merchant', 'register'];  // match the modal ids actually in use
  if (REG_TYPES.indexOf(data.submission_type) !== -1 && data.email) {
    MailApp.sendEmail({
      to: data.email,
      subject: 'Welcome to Gopher Deals 🎉',
      from: 'deals@gophergo.io',        // only works once the alias exists
      name: 'Gopher Deals',
      body: 'Hi ' + (data.contact_name || data.name || 'there') + ',\n\n' +
            'Thanks for registering ' + (data.business_name || 'your business') +
            ' with Gopher Deals! Our team reviews every registration by hand — ' +
            'you\'ll hear from us shortly with next steps.\n\n' +
            'Questions in the meantime? Just reply to this email.\n\n' +
            '— The Gopher Deals team\ndeals@gophergo.io'
    });
  }
  // …existing sheet-append logic continues below unchanged…
}
```

### Owner checklist (in order)

1. **Gmail send-as alias first**: in the Gmail account that owns the script →
   Settings → Accounts → "Send mail as" → add `deals@gophergo.io` and verify it.
   Without this, the `from:` field throws and the welcome email fails.
2. Paste the snippet into the script, adjusting `REG_TYPES` to the modal ids the
   sheet actually receives (check the `submission_type` column of the lead sheet
   for real values — a wrong list silently skips the welcome email).
3. Redeploy **keeping the same URL**: Deploy → Manage deployments → edit →
   New version → Deploy. (Same-URL redeploy means no front-end change needed —
   the page's comment at `GOPHER_FORM_ENDPOINT` documents this.)
4. Test: portal Inbox → send a message → email arrives at deals@ with the
   merchant as Reply-To; submit a test registration → welcome email arrives
   from deals@.

### Why the welcome email has no front-end change

Registration already POSTs everything the email needs (`email`,
`business_name`, contact fields). The welcome email is purely script-side —
which is why the only remaining work is the paste above.
