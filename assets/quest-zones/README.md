# Coastal zone foliage · Quest v0.105.0

The user's Pixel Lab v5 zone kit supplies the pool maps' trees, grass accents,
and fine lawn palettes. The game keeps its original house and filter-shelter
artwork, scale and perspective in `js/living-world.js`.

`zones.png` packs 45 native assets: 15 trees, 15 grass accents and 15 ground tiles.
It is 1024 × 193 pixels, 92,726 bytes compressed and 790,528 bytes decoded.
This replaces the old 124,549-byte tree atlas. The manifest retains each native
anchor, source rectangle, sampling metadata, and PNG/RGBA SHA-256 hashes.
Packing does not resample, recolour, trim, or redraw any supplied pixel.

All 55 original native PNGs remain in `native/`, including the ten alternative
buildings. The latter are listed under `references` in the runtime manifest
and are not included in the downloaded atlas. Native PNGs, high-resolution
source sheets and original ImageGen prompts are export/reference files;
only `zones.png` and `manifest.json` are precached by the application.

The preserved [source README](native/README.md) describes the simulator kit.
Its `../../meadow.mjs`, `../../zone-art.mjs` and `asset-library.html` links refer
to the original `art/pixel-lab/v5-living-world` location, not this runtime pack.
The source art and its prompts were supplied by the user; this integration
makes no new ImageGen request.

## Rebuild

Requires Python 3 and Pillow. From the repository root:

```sh
python3 scripts/build-quest-zones.py
```

To import a newer kit deliberately, supply its directory once:

```sh
python3 scripts/build-quest-zones.py --import-kit /absolute/path/to/zone-kit
```

The importer copies only the files listed by the native manifest and the
original source sheets/prompts. It never writes into the supplied kit.
Every packed atlas rectangle is checked against the native RGBA bytes.

## Live lawn

`js/quest-zones.js` adapts the simulator's deterministic meadow code. All 15
32 × 32 ground exports match `meadowTile(theme, growth)` byte for byte at
`.18`, `.59` and `1`. Live maps use the same floor pattern with the blades
separated into 8-pixel cells, allowing wind and temporary passage memory.

The compact keeper needs an eight-pixel maximum foreground band in the
512 × 384 world. Only roots ahead of the feet draw over that band. Distant
wind frames are cached at 8 Hz, and at most 768 tiny blade sprites are retained
per active pool scene. Grass accents remain sparse, while separately drawn
small/medium/large trees keep their native resolution and bottom anchors.

The weekly growth cycle is illustrative. It never creates gardener visits,
changes collision routes, or writes maintenance records.
