# Pocket Coast · one stable map per pool

An isolated, deterministic map-generator trial for the 23 pools in the current public seed catalogue. The maps reuse the app's existing native pixel-art vocabulary, with softer map colours and five residence themes. They are layout prototypes, separate from the larger generated art exports and from the running game.

## Recommendation

Use a shared, art-directed tileset and a fixed seed per pool. Generate the 23 layouts once, review them, then keep each approved map. This gives consistent art, distinct places and reliable pathing. Selected landmarks can receive custom art later without making each whole map a separate illustration.

- **EC · 5 maps:** pine courtyards, blue roofs and stone terraces.
- **AG · 5 maps:** sandy paths, timber decks and a narrow water boundary.
- **EP · 8 maps:** open golfside lawns, warm roofs and stone terraces.
- **EPP · 3 maps:** compact holiday courts, violet accents and paved terraces.
- **GP · 2 maps:** shaded greens, teal roofs and timber terraces.

These are fictional game properties. Pool dimensions, house positions, vegetation and boundaries are not surveyed real-world plans. Real salt-system flags affect the pump detail, not the generated layout. The shared depot remains a separate location; each property has its own small service shed.

## Exports

- `exports/maps/`: 23 PNG backgrounds at **256 × 192 native pixels**.
- `exports/layouts/`: matching JSON with 16 × 12 terrain cells, blocked cells, object footprints, paths, pool/deck bounds, a clear encounter area and named interaction anchors.
- `exports/pool-maps-contact-sheet.png`: all 23 labelled maps.
- `exports/fixed-layout-changing-water.png`: EC 2 in three conditions, with the same property arrangement.
- `exports/EC-2-navigation.png`: blue access markers and a red encounter marker for reviewing the layout.
- `exports/tileset.png`: 16 × 16 ground tiles, with column names and variant rows in the manifest.
- `exports/palette.json` and `exports/manifest.json`: colours, identities, seeds, version, dimensions, paths and PNG checksums.

The stage in the current app is already 256 × 192, rather than the original 128 × 96 discussed at the beginning. These exports match that current stage. They have integer pixels and fully opaque backgrounds; they are not downsized generated concept images.

## Reproduce the maps

Run from this folder:

```sh
node verify.mjs
node export.mjs
```

Only Node's standard library is needed. `source/pixelart.js` is a frozen snapshot of the current app art source. The map renderer reuses its tile and prop shapes, and draws the map's overhead buildings and water in a compatible pixel language. The existing game files are not changed.

The snapshot of eligible pools is `pools.json`. It contains ids, residence codes, unit labels, types and salt flags, with no occupancy records. Winter status does not remove a property's map.

## Stable identity and rerolls

```js
import { generateMap } from './source/generator.mjs';

const pool = { id: 'EC-2', res: 'EC', unit: '2', salt: false };
const original = generateMap(pool);                 // default revision 0
const alternative = generateMap(pool, { revision: 1 });
```

The unsigned seed is `FNV-1a(version + '|' + pool.id + '|' + revision)`. The generator version is currently `pocket-coast-map-v1`. Catalogue order, visits, time, chemistry and encounter state do not determine the layout. Layout, decoration and terrain noise use separate deterministic streams.

Store an approved JSON layout with its seed, revision and generator version. Keep that version when adding new art. If a future generator algorithm changes, create a new version and deliberately migrate or retain existing layouts. A fixed seed by itself cannot preserve a map across arbitrary algorithm changes.

To choose a new variant, increment that pool's revision, review it and keep the new value. Do not reroll on every visit: recognition of familiar places is part of the game.

## Ground rules

Five layout archetypes vary the villa, basin, deck, shed, entrance and access lanes. Decoration is placed only after routes and a clear 3 × 3 encounter area are reserved. A flood-fill rejects placements that disconnect walkable ground.

Collision uses `0` for walkable and `1` for blocked. Coordinates are tile coordinates from the top left. A sprite's feet can be anchored at `(tileX * 16 + 8, tileY * 16 + 15)`. Buildings face south even when their positions are mirrored.

Named anchors are entrance, house door, shed door, ladder, skimmer, pump access, player spawn and encounter. The renderer draws water colour and debris separately from the layout. The native pixel art and the generated map geometry can be refined independently.

## Checks and integration limits

`verification.json` records 575 checked layouts: 23 pools × 25 revisions. Checks cover connected walkable ground, reachable interaction points, a clear encounter area, non-overlapping structures and water, open paths, deterministic rebuilding, catalogue-order independence, live-state independence, distinct default maps and meaningful rerolls. The 23 exported images also have distinct PNG hashes.

This is a reproducible export prototype. It does not add map movement or tactical combat to the app. The app's current animation coordinates assume one fixed courtyard. Integration should replace those coordinates with the map's named anchors, use the collision grid for movement, and draw actors by their feet position. AP, MP, spell ranges, timers and enemy turns remain a separate gameplay layer. The clear encounter area is reserved space, not a validated tactical-balance design.

The generator module itself is browser-independent JavaScript. This package's renderer uses a small Node-side pixel canvas for export; a future runtime adapter would draw the same layout through the app's browser canvas and tile art.
