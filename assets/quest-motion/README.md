# Pocket Coast runtime motion

Seven PNG pages and a compact manifest, generated from the original
[v3 complete animation pack](https://github.com/lachlanmackenzie1234/lagrange-piscine/tree/245ef598c7b2b6a4362886bce6762f28ef6e7dce/art/pixel-lab/v3-complete/animations).
The manifest records the source manifest's SHA-256. PNGs retain exact integer
pixels and binary transparency. The seven pages and manifest total 266,911 bytes
and include 168 clips/scenes.

The live map uses monster idle/spawn clips, idle rarity and full-set auras,
animated water, and service effects. Pool status cards and the bestiary have
animated portraits. Combat plays tool/spell effects, monster
attacks/hits/defeat and keeper cast/hit/flee/victory/defeat motion. Extra event
and loot clips are included for subsequent reward screens.

The live keeper uses new composable 24×32 art in `PixelArt.keeper`: basic clothes,
chosen skin/hair, then separate headwear, torso, legs, shoes, amulet, robot, pole
and broom layers. Each item uses its own set, rarity and curse details.
`js/game-motion.js` applies the export timings, offsets and directional leg motion.
The exported whole outfits are retained in the source pack; they cannot express
mixed equipment or the user's hairstyle. An aura requires all eight slots from
the same set and disappears while moving or acting. Its strength/accent uses the
lowest rarity among those eight pieces, with the set's own motif underneath.

The depot uses the original illustrated interior at 256×192. `PoolMaps.depot()`
provides its floor collision and interaction anchors. Menus lead to the existing
workshop, reward and sale rules; the real depot location check still gates those
transactions. Walking and menu drafts survive ordinary page re-renders. Partial
reward collections are recorded per day so a full bag does not discard crates.
The depot is the default Quête page (`#/quest/depot`), alongside Bestiaire, Sac
and Dresseur. These pages have their own URLs and support refresh/back navigation.
The depot's lockers open Sac; pool navigation remains in Aperçu and Piscines.

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
Portraits share one clock, skip offscreen cards, and release detached canvases.

Map menus reuse the pool page's normal logging controls. Outside taps and Escape
dismiss the menu; draft notes/dates/readings are written only on submission.
Re-rendering for weather, sync or a log entry preserves the map canvas and queue.
