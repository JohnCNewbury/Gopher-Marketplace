# gophergo.io `/terms-and-conditions/` — correction worksheet

**Live, operative contract.** Ten surgical edits below. Each is a defect — a contradiction, an
impossible rule, or a typo — not a product change. Nothing here alters a policy.

**How to apply:** in the Elementor Text Editor widget, switch to the **Code** tab (or use the Visual
tab and browser find). Search the FIND string, replace with the REPLACE string. Work top to bottom.

⚠️ Do **not** regenerate the whole widget's HTML. Your headings are bold paragraphs
(`<p><strong>…</strong></p>`), not `<h3>` tags — rebuilding the markup would restyle the entire page.

---

### 1. ⚠️ Double negative reverses a liability clause — *Gopher Go Payout Account*

Two negatives make this say Gopher, Inc. **is** responsible for a wrong-item delivery. The **Dispute
Protocol** section states the same rule correctly, so the contract currently contradicts itself.

**FIND:** `that is not an issue that Gopher, Inc is not responsible for and nor is the customer`
**REPLACE:** `that is not an issue that Gopher, Inc is responsible for and nor is the customer`

### 2. ⚠️ Cosigner rule is impossible as written — *Age of Usage*

The floor is 16, so a rule for workers "under the age of 16" can never apply. 18 is both the intent
and what Stripe actually requires for a minor.

**FIND:** `If you are a worker on the Gopher Go app under the age of 16, when entering your payout account`
**REPLACE:** `If you are a worker on the Gopher Go app under the age of 18, when entering your payout account`

### 3. TrustShield heading — stray space, lowercase "identity"

**FIND:** `Gopher TrustShield (ID & identity Verification )`
**REPLACE:** `Gopher TrustShield (ID & Identity Verification)`

### 4. ⚠️ Platform count contradicts itself — opening paragraph (owner-confirmed 2026-09-07)

The sentence says **3 platforms** and names Gopher Pro as one of them; the very next sentence calls
Gopher "a **dual platform** … marketplace app." Owner confirms **Connect is not live**, so the live
set is two — Request and Go — and Gopher Pro is a worker badge, as this same document says everywhere
else. Fixing this resolves the contradiction *and* the "wed" typo in one edit.

**FIND:** `is the website associated with the mobile and wed app(s); Gopher Request, Gopher Go and Gopher Pro are the names of the 3 platforms used.`
**REPLACE:** `is the website associated with the mobile and web app(s); Gopher Request and Gopher Go are the names of the 2 platforms used.`

*(Start the search after the link text so you don't disturb the `<a>` markup around www.gophergo.io.)*

### 5. Typo — opening paragraph

**FIND:** `We require to you agree to the current version`
**REPLACE:** `We require you to agree to the current version`

### 6. Typo — *Gopher Request Fees*

**FIND:** `Gopher, Inc reservices the right to change any of the above fees`
**REPLACE:** `Gopher, Inc reserves the right to change any of the above fees`

### 7. Typo — *Suspended Access*

**FIND:** `suspends sign-up / sing-in access`
**REPLACE:** `suspends sign-up / sign-in access`

### 8. Duplicated word — appears TWICE (Payout Account, and Dispute Protocol)

Replace both occurrences.

**FIND:** `please pay close attention to this this dispute example`
**REPLACE:** `please pay close attention to this dispute example`

### 9. Payout sequence skips step 5 — *Gopher Go Payout Account*

The list runs 1, 2, 3, 4, 6.

**FIND:** `6) Lastly, update the request to “Completed” once finished.`
**REPLACE:** `5) Lastly, update the request to “Completed” once finished.`

### 10. Unclosed parenthesis — *Cost Adjustments*

The paragraph opens `(Ex: if $100 is the total…` and never closes, ending in trailing spaces.

**FIND:** `keep the original amount and only purchase what the amount can cover.`
**REPLACE:** `keep the original amount and only purchase what the amount can cover.)`

---

# NOT APPLIED — these need your answer first

I can correct defects on my own. I cannot make the document **current** without knowing what is
actually shipped, and guessing would put unshipped product into a contract real users are bound by.

### A. ✅ RESOLVED — Connect is not live (owner, 2026-09-07)

Live platform set is **two**: Gopher Request and Gopher Go. Folded into edit **#4** above. Do not add
a Gopher Connect clause to the live terms.

### B. ✅ RESOLVED — tiers stay Pro / Pro+ (owner, 2026-09-07)

The Elite / Elite+ rename is launch-gated and has **not** shipped. **No tier edits to the live terms.**
Leave every "Gopher Pro" and "Gopher Pro+" exactly as written. If a future session proposes renaming
them here to match the rebuild, that is wrong until the apps ship the rename.

### C. ✅ RESOLVED — keep "up to $5", and I was wrong to suggest otherwise

Owner, 2026-09-07: the fee is **discretionary and manually applied, and has never actually been
assessed to anyone.**

I previously suggested the rebuild's flat $5 was "more defensible." **Withdraw that.** Given the
process is manual and discretionary, "**may** be charged **up to** $5" is the accurate drafting and
the live text should stay exactly as it is — a flat mandatory $5 would describe automatic machinery
that does not exist, and a contract that overstates its own enforcement is the weaker document.
**No edit to either cancellation-fee clause.**

⚠️ **This points at a problem in the REBUILD, not here.** The rebuild's §17 states a flat $5 as
though it fires automatically, and the G40-81 subsystem behind it (fee ledger, strike counter,
auto-deactivation at −$10) is still unbuilt. So the rebuild currently promises enforcement it cannot
perform. Worth reconciling before launch — either build it or soften the language to match the live
document's discretionary wording.

### D. Should the live terms adopt the "No-Show Completion" name?

The live document already describes the age-restricted no-show protocol correctly — the 10-minute
timer, the alert, the full charge. It just never names the outcome. The rebuild names it **No-Show
Completion** so the contract matches the label users see in their request log. Adopting the name here
is low-risk and makes support conversations much easier, but it is a naming decision, not a fix.

### E. Two live clauses the rebuild lost — worth keeping, and worth copying back

Flagging so they are not "cleaned up" by mistake:

- **The device requirement.** *"Please do not engage in accepting a request if you do not have
  reliable service and/or reception. You must keep your device linked to the app always charged."*
  The rebuild had no device standard at all until 2026-08-19. Keep this.
- **The $100 chargeback assessment.** *"we will also assess you up to $100 to offset the dispute fees
  assessed by our payment merchant."* The rebuild threatens damages but names no figure, and a named
  figure is far easier to enforce. Keep this, and consider carrying it into the rebuild.

### F. Anything shipped in the last ~20 months

These terms are stamped **last updated Jan 15th, 2024**. Everything above is what I can see from the
text itself. I have no reliable view of what changed in the live product since then, so there may be
whole features live today with no clause at all. If you can tell me what shipped, I can draft the
missing sections.
