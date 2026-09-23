# v0.105.0 consolidation

This release brings the queued Quest work and the standalone art studies onto
`master`. App and service-worker versions are both v0.105.0. GitHub Pages serves
the repository root from `master`.

## Game changes since v0.103.0

- Equipment swaps preserve inventory; Matt handles equipment sales.
- The black Scénic offers a 200-coin remote Dépôt pass for the current visit.
- The Bureau has the revised desks, chairs, curtain, sunlight and furniture.
- NPCs stroll, pause for interaction and return to their home positions.
- Bald, short and long hairstyles preserve individual equipment layers.
- Defeats carry coin/XP penalties and possible bag-item loss, with one rematch
  to recover the held property and earn ordinary drops.
- Native foliage, residence palettes and reactive grass use the original
  building perspective.

Detailed behavior and earlier validation are in [hub and game changes](quest-v104.md)
and [zone foliage](quest-zones.md).

## Art checkpoint

[The art directory](../art/README.md) now contains the original v1–v5 studies,
complete v3 assets and animation exports, the seeded pool-map generator, the
living-world simulator and its sound sources/downloads. The original export
branch is merged with its history intact. Existing source files are preserved
byte for byte.

[Surface lab](../art/surface-lab/index.html) is committed separately with all five
materials, weather states, regional grain sizes and wear, seasonal colour and
lighting controls, white reflection masks, opt-in procedural audio, bounded
map memory, QA scripts and the saved **Late evening vibe** preset. The original
grass/terrain preview links still work. Shared grass helpers support the tall
grass study while production retains its 8px maximum.

The studies and source/export packs are outside the app's offline precache.
The next map rebuild will integrate selected surface-lab features deliberately;
this checkpoint does not replace the production map renderer with the lab.

## Consolidation checks

- 65 app tests and 26 living-world/audio tests pass.
- Both seeded-map packages validate 575 layouts each (23 pools × 25 revisions).
- The animation runtime validates 6,107 cases.
- Seven surface-lab browser suites pass: material models, directional wind,
  weather, climate, colour pipeline, regions/cache lifecycle and reflections/audio.
- 75 art/shared-helper JavaScript modules pass syntax checks; all 86 local HTML
  resource links in the art studies resolve.
- Isolated browser smoke checks render the Dépôt, Bureau, a pool map at
  320px/DPR 3, and the art studies. No JavaScript runtime errors were reported.
  These phone checks are emulated; the earlier v0.103.0 field testing is separate.

Run the app and simulator unit checks with:

```sh
npm test
node --test art/pixel-lab/v5-living-world/*.test.mjs
```

The [surface-lab README](../art/surface-lab/README.md#verify) lists its browser
verification commands. Art exports retain their own verification scripts and
results beside their source files.
