# G40-11 step 2 — watching `/users/add_card` for a caller

**Started 2026-09-09**, when `!540` (merge `8ce3d0f4`) made the route refuse with `410`.
**Clears on 2026-09-16** if nothing appears. Then step 3 deletes the handler and the route.

> **A hit is NOT a failure.** It is the entire point of this step. Zero traffic in seven days and no
> caller in any repo is strong, but a static search covers the machines we have. If something we do
> not know about calls this, the log line names it — by user, app, version and IP — and we migrate
> that caller instead of deleting under it.

## The query

CloudWatch Logs Insights, log group
`/aws/elasticbeanstalk/Gopher-Production/var/log/web.stdout.log`:

```
fields @timestamp, @logStream, @message
| filter @message like /RETIRED ENDPOINT CALLED/
| sort @timestamp desc
| limit 50
```

Or from a terminal:

```bash
aws logs start-query \
  --log-group-name "/aws/elasticbeanstalk/Gopher-Production/var/log/web.stdout.log" \
  --start-time $(($(date +%s) - 7*86400)) --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | filter @message like /RETIRED ENDPOINT CALLED/ | sort @timestamp desc | limit 50'
```

⚠️ **Prove the probe before believing a zero.** Run the same query with
`filter @message like /card verification started/` (or any string you know is emitted). If the
control returns nothing either, the query is wrong or the log group is empty — the zero means
nothing. Memory: `prove-the-probe-before-believing-a-zero`.
⚠️ CloudWatch lags roughly 20 minutes; do not read the last 20 minutes as quiet.

## What a hit looks like

```
[G40-11] RETIRED ENDPOINT CALLED: POST /users/add_card — user_id=… apptype=… appversion=…
os=… user_agent=… ip=… — refused 410. Use POST /users/cards/setup_intent or the payment sheet.
```

`appversion` and `user_agent` identify which build to fix. `user_id` says whether it is one stuck
client or many.

## If a caller appears

1. **Do not proceed to step 3.**
2. Identify the build from `appversion` / `apptype` / `user_agent`.
3. Point it at `POST /users/cards/setup_intent` or the native payment sheet.
4. If it is a shipped app build that cannot be changed quickly, **reverting `!540` is one line** and
   restores the old behaviour immediately — but note that doing so re-opens raw-PAN handling, so it
   is a stopgap, not a resolution.

## If nothing appears by 2026-09-16

Step 3: delete `add_card_and_attach_to_customer` and its route registration, and drop the
`add_card` block from `controllers/user/index.js`. The tests in
`test/g40-11-add-card-retired.test.js` then need retargeting — assert the route is **absent**
rather than refusing.
