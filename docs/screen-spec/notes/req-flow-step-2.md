VERDICT: ADAPT — description + safety gates; the gates are canon and client+server.

BEHAVIOUR
- Describe the need (+ up to 3 photos). Cost-of-items input appears when items are
  purchased; must be > 0 to continue.
- AGE-RESTRICTED GATE: description scanned against the GENERATED keyword brain
  (gopher-age-keywords.js — never hand-edit the list). A hit without the
  age-restricted toggle → acknowledge prompt; age-restricted delivery requires ID
  verify (iDenfy) before continuing.
- CATEGORY-MISMATCH NUDGE: on continue, the shared classifier
  (GopherCategoryClassifier / gopher-category-classifier.js) suggests "Switch to
  ⟨category⟩" when the text scores clearly into another category. Loaded as a shared
  module — never re-implement inline (the inline-IIFE export trap already bit once).

ENDPOINTS / BACKEND SEAMS
- Live A/R gating is menu-level + title indexOf only — NO keyword scanning exists
  live; the keyword brain is the rebuild's replacement and must ALSO run server-side.
