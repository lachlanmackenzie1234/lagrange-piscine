# Pocket Coast HD · v0.99

Native runtime art for the Bureau, Dépôt and the cycling pool maps.

| Asset | Native size |
|---|---|
| Bureau / Dépôt backgrounds | 512×384 |
| Keeper and NPC frames | 48×64 |
| Pool creatures | 48×48 |
| Monsters | 56×48 |
| Equipment, resources, potions and crates | 32×32 |
| Ground and water tiles | 32×32 |

The two room/yard backgrounds, five NPCs and basic keeper were made with the
**built-in ImageGen tool**. Selected full-resolution outputs are in `source/`;
the exact final prompt set is in `generation.json`. Jojo sells healing potions,
Karine crafts equipment, Matt sells from the trailer, JP gives daily quests,
and PJ gives maintenance rewards. The sixth NPC uses the other player's actual
shared appearance instead of a fixed illustration.

The Bureau follows the requested grey-white tiled floor, full back-wall curtain,
front windows and bottom-right entrance. NPCs are separate from the backgrounds.
Character sheets use south/east/north/west in a two-by-two layout; the importer
extracts and aligns them to a common foot anchor and preserves shorter/taller
builds within a 48×64 frame.

Creature, monster and equipment pixels are re-exported from the **large source
slices** in the published v3 pack, rather than enlarged from the older tiny
exports. The keeper starts with a new illustrated base; `js/keeper-art.js` adds
skin/hair choices and independent visible equipment layers. Motion remains
procedural pose playback, not a claim of individually illustrated walk frames.

All runtime PNG alpha is binary. Backgrounds are palette-limited and opaque.
The `px: 2` manifest field maps native art onto the retained 256×192 logical
coordinate space, so collisions and map clicks keep their original meaning.
The visible canvas is 512×384. `js/maps.js` supplies authored hub collisions and
NPC approach points; the PNGs alone are not navigation maps.

## Build

Requires Python 3, Pillow and NumPy, plus a copy of the original
[v3-complete source pack](https://github.com/lachlanmackenzie1234/lagrange-piscine/tree/245ef598c7b2b6a4362886bce6762f28ef6e7dce/art/pixel-lab/v3-complete).

```sh
python3 scripts/build-quest-hires.py /path/to/v3-complete
npm test
```

`verification.json` records PNG bytes and raw decoded pixel bytes for this pack.
The legacy animation pack remains available for effects, auras and fallback art.
Only native runtime files are precached; the larger ImageGen source sheets are
development assets and are not downloaded by the game.
