VERDICT: ADAPT — scheduling; live cron machinery carries.

BEHAVIOUR
- "Need ASAP" (canon naming) vs "Schedule for later" (window/time picker).
- Scheduled requests broadcast at window open; expiry rules apply.

ENDPOINTS / BACKEND SEAMS
- REUSE the live scheduling/expiry/re-auth crons (in-process setTimeout broadcast
  timers live — the rebuild moves them to real scheduled jobs, same semantics).
