# Lacanau field kit · visual trials v1

An isolated visual direction for Lagrange Quest. Open `index.html` through the existing static server. Nothing here is imported by the app, and the lab never reads or writes the app's game or maintenance data.

```sh
# From the repository root
python3 -m http.server 8014 --bind 127.0.0.1
# Open http://127.0.0.1:8014/art/pixel-lab/v1/
```

The ZIP is also self-contained. After extracting, run `python3 -m http.server 8014 --bind 127.0.0.1` inside the extracted folder and open `http://127.0.0.1:8014/`. To rebuild from that folder, run `node export.mjs`. The preview uses JavaScript modules, so serve it over HTTP instead of opening `index.html` with a `file://` URL.

## Direction

Sun-faded workwear and practical pool tools treated with the affection of fantasy equipment. Maritime pines, sand-coloured coping, blue water, striped loungers, old hoses and whitewashed maintenance sheds locate the world in Lacanau. Large headwear, short bodies, expressive faces and asymmetric tools carry character at tiny sizes.

The supplied Dofus equipment screenshot informs the paper-doll layout and identifiable item silhouettes. The Pokémon screenshots inform readable panels and an orthographic ground plane with small front faces. These are references for principles; the characters and assets in this folder are original studies.

References inspected: all five images in `screenshots/screens/`. The original reference files remain outside this pack.

`concepts/lacanau-field-kit.png` is a high-resolution art-direction board generated with the built-in image generation tool. Its exact prompt is in `concepts/prompt.txt`. It is **not** a pixel-accurate sheet, and its colours are not palette-validated. Do not crop it into production sprites. It explores the expressive target; the separately authored native assets simplify that direction to the actual game budgets.

## Native assets

`assets.mjs` is the editable, deterministic pixel source, extending the app's existing integer-pixel drawing approach. No dependencies or image-generation credentials are needed to rebuild these files. The native PNGs are drawn at their final size, without downsampling or antialiasing. All colours are taken from `js/game.js` or `css/styles.css` at the time of this study; `exports/palette.json` and `palette.gpl` record them.

| Asset | Native canvas | Included |
|---|---|---|
| Stages | 128 × 96 | 5 set palettes × courtyard / encounter / tactical compositions |
| Trainers | 24 × 32 | 5 sets × idle / left step / right step |
| Creatures | 24 × 24 | 5 original residence companions |
| Monsters | 28 × 24 | Algue verte, Calcaire, Filtre saturé |
| Item icons | 16 × 16 | 5 sets × 8 slots × 6 rarity variants = 240 |
| Tiles | 16 × 16 | Sand, paving, grass, water, hedge, deck, roof |
| Atlases | See manifest | Trainers, creatures, monsters, common equipment, tiles |
| Projection study | 128 × 96 | One illustrative 2.5D view |

291 PNGs total, including atlases and composed previews. This is **not 291 distinct designs**: the equipment has 40 silhouettes, and rarity changes their small accents. Transparent sprites have binary alpha. Stage images are opaque. Cast shadows belong to the stage so they can follow terrain later.

## Set identity

| Existing set | Keep recognisable | New companion trial |
|---|---|---|
| EC / Pool Boy | Backward cobalt cap, collared polo, cargo shorts, Crocs, square net | Écume, a wave-crested otter |
| AG / Surfeur des dunes | Floppy bob, neoprene, boardshort, bamboo, wave stripe | Oyatin, a leaf-tailed dune gecko |
| EP / Jardinier du golf | Wide straw hat, pocketed vest, boots, rake, clover | Pignotte, a pinecone sprite |
| EPP / Locataire | Large sunglasses, tank top, briefs, flip-flops, inflatable robot | Bouémitte, a swim-ring hermit |
| GP / Gardien du Green | Visor, striped windbreaker, trainers, key, hooked pole | Clapot, a reed frog |

The game currently has ten monster types. Only three are drawn here to establish different silhouette families; the other seven still need art. The five companions are proposed residence-family identities, not replacements for every pool's seeded procedural variation.

## Rarity language

Preserve the existing exact order and colours: common `#6b7a87`, uncommon `#2aa845`, rare `#2f4fdf`, very rare `#7b3fc4`, epic `#e39b12`, legendary `#d82f2f`. Legendary remains red, and epic remains amber.

Use set colours for cloth and silhouette; use rarity for the inventory corner, a clasp or rivet, and high-tier trim. The lab adds a written rarity label and a one-to-six notch marker, so colour is not the only cue. The unchanged outfit in the paper doll illustrates set identity; only the selected icons and frames preview rarity treatment.

The game catalogue and all existing French item names remain the source of truth. No item stats, drop rates, affixes, set bonuses or curse rules change in this exploration.

## 2D and 2.5D

**Recommended prototype:** orthographic 2D. At 128 × 96, 16-pixel cells make an 8 × 6 viewport. Feet occupy the cell; a 24 × 32 trainer extends into the cell above. Render entities by the Y coordinate of their feet. A larger or scrolling map would give movement and ranged attacks more breathing room.

A later tactical prototype can model alternating player/enemy turns, a 90-second deadline, AP costs, MP movement, blocked cells and spell ranges separately from the renderer. Keep AP, MP, the timer, health and action buttons in the surrounding DOM panels. This lets the map spend its pixel budget on characters and terrain.

The lab's tactical page is a **static layout study**: the 01:30 clock does not count down, and highlighted cells do not encode a legal movement or line-of-sight calculation. The encounter view is also a composition, not a playable fight.

**2.5D is feasible as a later view layer**, using 2:1 diamond tiles, feet anchors, Y/depth sorting and separate obstruction logic. The included 6 × 6 diamond study demonstrates the density cost at this resolution. It reuses front-facing sprites for comparison; it is not a complete isometric tileset or animation pack. Proper directional poses, tile masks and occlusion handling would be additional work.

## Rebuild and use later

```sh
node art/pixel-lab/v1/export.mjs
```

This regenerates `exports/` and `qa/native-checks.json`. It checks every PNG's dimensions, allowed colours, binary alpha, non-empty content, PNG checksums, and decoded RGBA bytes against the source raster. `exports/manifest.json` gives file paths, dimensions, set/slot/rarity metadata, feet anchors and atlas layout. The `file` paths in that manifest resolve relative to `exports/`.

Future integration points in `js/game.js`:

- `glyph(slot, rar)` currently caches by slot and rarity. Add the item's residence/set to the lookup and cache key to use the 40 distinct shapes.
- `drawAvatar` needs composable equipment layers and avatar customisation; these whole-character outfit studies are not a replacement for that logic.
- `spriteCanvas` could start from the five family silhouettes and apply deterministic pool variants.
- `monsterCanvas` can select the new species images once the whole bestiary has matching art.
- The stages and tiles are reference compositions, not collision maps. Add walkability data independently.

Use integer display scaling (2×, 3×, 4×) and `image-rendering: pixelated` in CSS. For a canvas renderer, set `imageSmoothingEnabled = false`. All native exports are static; three trainer poses are included as a starting point for walk animation, not a complete four-direction animation set.

## Review

Open the lab, select each set, inspect the eight slots and six rarities, compare creatures at 1×, try the dark ground, and toggle the four scene studies. Each equipment cell or creature links to its native PNG. The download arrow exports the currently selected icon. The ZIP contains the lab, source, concepts, notes and native exports.
