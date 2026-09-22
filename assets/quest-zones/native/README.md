# Coastal garden kit 02

40 transparent sprites and 15 opaque, seamless ground tiles for the Lagrange Quest living-world
simulator. Browse `../../asset-library.html` through the local static server.

| Zone | Roof | House style | Preferred tree |
| --- | --- | --- | --- |
| EC | Orange | Timbered cottage | Bouleau |
| AG | Green | Coastal veranda | Pin parasol |
| EP | Teal | Gabled garden villa | Chêne vert |
| EPP | Violet | Twin-gable lodge | Pin maritime |
| GP | Blue | Stone woodland cottage | Chêne |

- `houses-v2/`: five 150 × 126 house canvases and five 75 × 83 pool-filter shelters with electric pumps, PVC pipework, and coiled watering hoses.
- `trees/`: five species, each separately drawn as small, medium and large.
- `ground/`: five palettes × three growth stages, each a seamless 32 × 32 square.
  These are native Canvas exports from `../../meadow.mjs`, suitable for repetition.
- `grass/`: occasional detailed accent clumps in five zone palettes, each with cut (32 × 8), medium (32 × 16) and tall
  (32 × 24) canvases. Natural green foliage carries restrained zone accents.
- `manifest.json`: native dimensions, bottom-centre anchors, atlas rectangles
  and exact sampling offsets. Dimensions describe canvases; transparent margins
  keep the artwork aligned at its feet.
- `native-sprites.zip`: all 55 native PNGs, the manifest, this note and prompts.
  High-resolution source sheets are separate in `sources/`.

The source atlases were generated with the built-in ImageGen tool. Current
architecture uses `houses-cartoon-v2-prompt.txt` and `pool-sheds-v3-prompt.txt`;
trees and accent clumps use `trees-prompt.txt` and `grass-prompt.txt`. Earlier
house sheets and prompts remain available for comparison. Sources are copied
unchanged from their generated originals. `export.py` mechanically separates
connected cutouts, samples them at native resolution and makes alpha binary;
it does not generate replacement artwork. It requires Pillow, NumPy and SciPy.
Run `python3 export.py` to rebuild the 40 PNG sprites and manifest while retaining
any exported ground entries. Ground PNGs are snapshots of `meadowTile(theme,
growth)` in `../../meadow.mjs`, at growth .18, .59, and 1 for each zone.

The runtime repeats a 32px fine-grass pattern across all lawn ground. It renders
that pattern in 8px cells so nearby blades can bend and retain a short passage
memory. Blade height follows the seven-day cycle and the keeper's current body
proportions. Foreground roots redraw their blades over the legs, leaving the head
clear. A narrow pixel-dither fringe blends turf with sand and terrace edges.
The generated clumps are now sparse accents (roughly one in four decor patches),
placed above this continuous lawn alongside trees, rocks and clipped plants.

Trees have distinct small/medium/large drawings and species-specific wind
responses. All artwork uses nearest-neighbour rendering and a shared bottom
anchor. Building and canopy silhouettes cast dynamic shadows; the keeper also
projects a moving, body-proportioned shadow. No ground shadows are baked into
the source cutouts.

`../../zone-art.mjs` maps zone identity, native door/window rectangles, grass
floor colours, tree placements and filenames. The five sample maps keep their
shared layout; this kit is wired into the simulator, ahead of integration into
the main application's Pixel theme.
