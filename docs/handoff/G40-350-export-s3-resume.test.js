const fs = require("fs");
const src = fs.readFileSync("scripts/trustshield-export-images.js", "utf8");
const m = src.match(/const s3_already_complete = async \(scan_ref\) => \{[\s\S]*?\n\};/);
if (!m) { console.log("⛔ extraction failed"); process.exit(1); }
console.log("  extracted " + m[0].split("\n").length + " lines\n");

const build = (keys, noResume, throws) => {
  const NO_S3_RESUME = noResume;
  const mirrored_keys = async () => { if (throws) throw new Error("denied"); return keys; };
  const console_ = { log: () => {} };
  // eslint-disable-next-line no-new-func
  return new Function("NO_S3_RESUME", "mirrored_keys", "console", "REQUIRED_TYPES",
    m[0] + "\nreturn s3_already_complete;")(NO_S3_RESUME, mirrored_keys, console_, ["FRONT","FACE"]);
};

(async () => {
  const cases = [
    ["FRONT + FACE present       -> skip",         {FRONT:"a",FACE:"b"},         false, false, true],
    ["FRONT + FACE + BACK        -> skip",         {FRONT:"a",FACE:"b",BACK:"c"},false, false, true],
    ["only FRONT (half-mirrored) -> FETCH",        {FRONT:"a"},                  false, false, false],
    ["only FACE                  -> FETCH",        {FACE:"b"},                   false, false, false],
    ["only BACK                  -> FETCH",        {BACK:"c"},                   false, false, false],
    ["nothing held               -> FETCH",        {},                           false, false, false],
    ["S3 listing THROWS          -> FETCH (safe)", {FRONT:"a",FACE:"b"},         false, true,  false],
    ["--no-s3-resume forced      -> FETCH",        {FRONT:"a",FACE:"b"},         true,  false, false],
  ];
  let p = 0, f = 0;
  for (const [name, keys, nr, th, want] of cases) {
    const got = await build(keys, nr, th)("ref");
    const ok = got === want; ok ? p++ : f++;
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `   got ${got} want ${want}`}`);
  }
  console.log(`\n  ${p} passed, ${f} failed`);
  process.exit(f ? 1 : 0);
})();
