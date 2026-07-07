# G40-135 — Refer Yourself: SMS share isn't sending the app link

**Type:** Bug · **Priority:** High · **Label:** worker · **Status:** To Do
**Target design:** redesigned "Refer Yourself" screen (worker app) — hosted link pending publish
(per John's 2026-06-26 comment).

## Problem (confirmed)
The "Refer Yourself" share doesn't include the **app/referral link** in the SMS. Ticket: *"Feature
not fully implemented."* Evidence in the web prototype (`Final/gopher-go.html`): the referral tiles
(`.refer-tile`, incl. `data-rk="self"`) only fire a toast — `showToast('Sharing your self-referral
link…')` — with **no share sheet and no link**. The native worker app has the same gap.

## Fix
The share action must open the SMS composer with a body that **contains the referral link**. The
referral identity already exists in the prototype: referral code `#referCode` (e.g. `820083`) and the
public link form `gophergo.io/r/<code>`.

Reference implementation (pure, testable — the body always carries the link):

```js
function buildInviteMessage(kind, code){
  const base = 'https://gophergo.io';
  const links = {
    self:    base + '/r/' + code,          // Refer Yourself → adds referrer as a saved MY Gopher
    go:      base + '/go?ref=' + code,
    request: base + '/request?ref=' + code,
    connect: base + '/connect?ref=' + code,
  };
  const intro = {
    self:    'Add me as your saved Gopher! Download Gopher and use my link: ',
    go:      'Start earning on Gopher Go — download the app: ',
    request: 'Get anything done with Gopher — download the app: ',
    connect: 'Manage your workforce with Gopher Connect: ',
  };
  const link = links[kind] || links.self;
  return { body: (intro[kind] || intro.self) + link, link };
}

// share: native sheet when available, else SMS with the link IN THE BODY
const { body, link } = buildInviteMessage(kind, referralCode);
navigator.share ? navigator.share({ text: body, url: link })
                : (location.href = 'sms:?&body=' + encodeURIComponent(body));
```

Native app: use the platform share/SMS intent with the same body. The referral link should be a
**deep/universal link** so an install routes the new user to sign-up **with the referrer's code
attached** (so the referrer is auto-offered as a MY Gopher on first request — the point of Refer
Yourself). On Android open Play, on iOS open App Store, then resume the referral (the refer-signup
prototype `_prototypes/Go/gopher-go-refer-signup-flow-figma.html` already describes this store-routing
+ "referral link follows you into the app").

## Acceptance criteria
- Tapping **Refer Yourself** opens the share sheet / SMS composer pre-filled with a message that
  **includes** the referral link (`gophergo.io/r/<code>`).
- The link carries the referrer's code; a new install resolves it to sign-up with the referrer attached.
- Same behavior for the other refer tiles (Go / Request / Connect) with their respective links.
- Build the UI against the redesigned Refer Yourself screen once its design is published.

## Notes
- `Final/` is a blueprint (CLAUDE.md: no backend/auth here). The web prototype's refer tiles are
  demo stubs; this ticket is the native-app fix. If you want, I can also wire the prototype tiles to
  the `buildInviteMessage` share as a visual reference (directed-edit, flagged) — say the word.
