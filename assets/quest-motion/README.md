# Pocket Coast runtime motion

Five PNG pages and a compact manifest, generated from the original
[v3 complete animation pack](https://github.com/lachlanmackenzie1234/lagrange-piscine/tree/245ef598c7b2b6a4362886bce6762f28ef6e7dce/art/pixel-lab/v3-complete/animations).
The manifest records the source manifest's SHA-256. PNGs retain exact integer
pixels and binary transparency. The five pages and manifest total 145,302 bytes.

The live map uses monster idle/spawn clips, idle rarity and full-set auras,
animated water, and service effects. Combat plays tool/spell effects, monster
attacks/hits/defeat and keeper cast/hit/flee/victory/defeat motion. Extra event
and loot clips are included for subsequent reward screens.

The live keeper retains the existing 16×24 art, skin/hair choices and individual
equipment pieces. `js/game-motion.js` applies the export timings, offsets and
directional leg motion on a transparent 24×32 canvas. It does not replace mixed
equipment with a pre-rendered full-set sprite. An aura requires all eight slots
from the same set and disappears while the keeper moves or acts.

## Rebuild

Python 3 and Pillow are required only for repacking. The static app needs no build.
Pass a local copy of the published `v3-complete` export directory:

```sh
python3 scripts/build-quest-motion.py /path/to/v3-complete
npm test
```

`frameAt` uses milliseconds; the action `Timeline` uses seconds. A combat turn
locks commands for the player action, enemy response and any outcome animations.
Damage/rewards run once at impact; navigation cancels pending callbacks. Hidden
tabs pause animation time, and reduced-motion mode uses the export's quiet frames.

Map menus reuse the pool page's normal logging controls. Outside taps and Escape
dismiss the menu; draft notes/dates/readings are written only on submission.
Re-rendering for weather, sync or a log entry preserves the map canvas and queue.
