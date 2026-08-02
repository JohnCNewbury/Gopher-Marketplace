VERDICT: ADAPT — personal-info capture is standard; ID verification reuses iDenfy.

BEHAVIOUR
- Personal info: name, DOB, address, referral. The Gopher ID is assigned at
  personal-info creation (owner canon) and doubles as the referral ID.
- DOB feeds age-restricted eligibility; address feeds coverage/radius.

ENDPOINTS / BACKEND SEAMS
- User create/update on the live backend. iDenfy identity verification carries
  (REUSE) — do not build a new ID-check vendor integration.
