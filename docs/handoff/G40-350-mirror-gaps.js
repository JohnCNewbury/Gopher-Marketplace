#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * G40-350 §5 item 4 — mirror ONLY the holders we do not already hold.
 *
 * The full export (scripts/trustshield-export-images.js) resumes from a LOCAL
 * CSV manifest. There is no manifest on this instance, so a plain re-run would
 * refetch ~6,973 holders (~21,000 images) to recover the ~242 that are missing.
 *
 * This asks S3 what we already hold instead — authoritative, survives losing
 * the manifest, and is the same store the app serves from.
 *
 * SAFETY
 *   * DB: SELECT only
 *   * iDenfy: file reads only. No verification is created, nothing is billed
 *     (approved verifications are billed; file reads are not).
 *   * writes ONLY to our own S3 bucket, private ACL
 *   * idempotent: re-running skips anything already held
 *
 * "Already mirrored" = FRONT *and* FACE — the two the worker's at-door screen
 * renders. Skipping on "any object present" would strand a half-mirrored holder,
 * which is exactly the case this exists to close.
 *
 *   node scripts/mirror-gaps.js --dry-run     # report the gap, fetch nothing
 *   node scripts/mirror-gaps.js               # mirror the gap
 */
const db = require('../models');
const s3Actions = require('../shared/S3');
const axios = require('axios').default;
const { idenfy } = require('../lib/idenfy_trustshield');
const { mirrored_keys, detect_format } = require('../helpers/trustshield_files');

const DRY = process.argv.includes('--dry-run');
const REQUIRED = ['FRONT', 'FACE'];
const PREFIX = 'uploads/trustshield';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  const holders = await db.sequelize.query(
    `SELECT DISTINCT ON (t.user_id) t.idenfy_scan_ref
       FROM trust_shield_users t
       JOIN users u ON u.id = t.user_id
      WHERE t.active = true
        AND u.trust_shield_verified = true
        AND (t.capture_source IS NULL OR t.capture_source <> 'internal')
        AND t.idenfy_scan_ref IS NOT NULL
      ORDER BY t.user_id, t.id DESC`,
    { type: db.Sequelize.QueryTypes.SELECT }
  );
  console.log(`served legacy holders: ${holders.length}`);

  const gaps = [];
  for (let i = 0; i < holders.length; i++) {
    const ref = holders[i].idenfy_scan_ref;
    /* eslint-disable-next-line no-await-in-loop */
    const keys = await mirrored_keys(ref).catch(() => ({}));
    if (!REQUIRED.every((t) => keys[t])) gaps.push(ref);
    if ((i + 1) % 1000 === 0) console.log(`  … checked ${i + 1}`);
  }
  console.log(`already held: ${holders.length - gaps.length}`);
  console.log(`GAP to mirror: ${gaps.length}`);

  if (DRY) {
    console.log('\nDry run — nothing fetched, nothing written.');
    await db.sequelize.close();
    return;
  }

  const tally = { OK: 0, NO_FILES: 0, LOOKUP_FAILED: 0, FETCH_FAILED: 0 };
  for (let i = 0; i < gaps.length; i++) {
    const ref = gaps[i];
    let fileUrls = null;
    try {
      /* eslint-disable-next-line no-await-in-loop */
      const response = await idenfy.get_virified_document(ref);
      fileUrls = (response && response.fileUrls) || null;
    } catch (e) {
      tally.LOOKUP_FAILED += 1;
      console.log(`  LOOKUP_FAILED ${ref}: ${e.message}`);
      /* eslint-disable-next-line no-continue */
      fileUrls = null;
    }
    if (fileUrls && Object.keys(fileUrls).length) {
      const types = Object.keys(fileUrls).filter((t) => fileUrls[t]);
      let wrote = 0;
      for (let j = 0; j < types.length; j++) {
        try {
          /* eslint-disable no-await-in-loop */
          const resp = await axios.get(fileUrls[types[j]], {
            responseType: 'arraybuffer',
            timeout: 30000,
          });
          const body = Buffer.from(resp.data);
          const fmt = detect_format(body);
          await s3Actions.default
            .upload({
              Bucket: process.env.AWS_BUCKET,
              Key: `${PREFIX}/${ref}/${types[j]}.${fmt.ext}`,
              Body: body,
              ACL: 'private',
              ContentType: fmt.mime,
            })
            .promise();
          /* eslint-enable no-await-in-loop */
          wrote += 1;
        } catch (e) {
          console.log(`  FETCH_FAILED ${ref}/${types[j]}: ${e.message}`);
        }
      }
      if (wrote) tally.OK += 1;
      else tally.FETCH_FAILED += 1;
    } else if (fileUrls !== null) {
      tally.NO_FILES += 1;
      console.log(`  NO_FILES ${ref}`);
    }
    if ((i + 1) % 25 === 0) console.log(`  … ${i + 1}/${gaps.length}`);
    /* eslint-disable-next-line no-await-in-loop */
    await sleep(150);
  }
  console.log(`\nDone. ${JSON.stringify(tally)}`);
  await db.sequelize.close();
};

main().catch(async (e) => {
  console.error(e);
  try { await db.sequelize.close(); } catch (_) { /* closed */ }
  process.exit(1);
});
