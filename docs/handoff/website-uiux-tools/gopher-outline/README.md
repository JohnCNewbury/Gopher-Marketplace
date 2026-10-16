# Gopher outline frame — "Yes, we can Gopher that too." (Request page, v28, 10/15)

John picked, card by card (pick doc https://claude.ai/artifact/Y9Zxohy4k8zNo2kgxjYjb3, db `rulings`):
C1 beer clip · C2 his backpack clip · C3 couch · C4 the tour's movers clip · FR = the Gopher outline,
ears FILLED ("It needs to fit in the ears too"), line "just a little thinner" than his reference.

Site files: `Final/assets/img/gopher-outline-thin.svg` (navy line + dirt mound) and
`Final/assets/img/gopher-head-mask.svg` (the inside, ears included — masks the clip).
`.bite-clip`'s box in gopher-request.html (left 11.29% · top 3.607% · w 80.645% · h 83.607%) is the
mask's bounding box inside the 1240×1220 outline. Re-trace both together or the clip won't line up.

How they were made (from `john-outline-ref.png`, 310×305):
1. Upscale 4× (LANCZOS); navy = alpha>128 & B>40 & R<110.
2. Inside = flood-fill (scipy.ndimage.label) of non-navy from the body centre (160,150 @1x),
   largest component, dilated 8 px @4x so the clip tucks under the line.
3. Thinner line = binary_erosion of navy, 6 iterations @4x (12.5 → 9.5 px @1x).
4. `potrace -s --turdsize 4 --alphamax 1.0 --opttolerance 0.2` on each PBM; keep the `<g transform>`
   group, fill #002461 for the line, viewBox = the PBM size.
Clips: muted, `preload="none"`, played by the small IntersectionObserver script under the section;
prefers-reduced-motion keeps the poster (`assets/img/gopher-that-*.webp`).
