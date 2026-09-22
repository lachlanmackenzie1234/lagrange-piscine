# Compact people · native 64×64

The current keeper uses [the bald/short/long hair pack](../quest-hair/README.md).
This atlas still supplies the NPCs and the fallback keeper.

Six regenerated characters: the basic keeper, Jojo, Karine, Matt, JP and PJ.
Each has south, east, north and west views. The other player uses the keeper
with their existing synced appearance and independently equipped items.

The short body, full head and nearly absent leg section are drawn into the art.
The runtime uses each whole frame; it does not stretch separate body bands.
Each 64×64 frame occupies 16×16 logical map units, with a ground anchor at
`[32, 63]`. Opaque artwork is at most 58 pixels tall. Combat uses double the
map display scale. The original map dimensions and navigation cells stay fixed.

- `people.png`: the runtime atlas, 1024×128, 105,767 bytes, 512 KiB decoded RGBA.
- `manifest.json`: rectangles, anchors, idle timings and source checksums.
- `exports/`: all 24 individual transparent native PNGs.
- `source/`: original generated sheets, preserved unchanged.
- [generation.json](generation.json): exact prompts and reference roles for the
  built-in `image_gen.imagegen` calls. No fallback CLI was used.

`python3 scripts/build-quest-people.py` rebuilds the atlas from these sources
(Pillow and NumPy required). It locates the transparent gutters, crops each
complete figure, fits its aspect ratio once, reduces the palette, thresholds
alpha and aligns the feet. It never compresses anatomical bands. Sources and
individual exports are kept out of the service-worker precache.

The keeper's eight equipment layers have their own 64×64 coordinates in
`js/keeper-art.js`. Hats replace the covered hair pixels. Skin/hair options,
mixed sets, rarity trim, curses and full-set auras remain available.

Maps and portraits allocate physical canvas pixels for the displayed CSS size,
up to DPR 3. Sprite frames are sampled once per output size and copied at whole
physical pixels during movement. This cache is limited to 192 frames / 8 MiB.
It prevents the eyes from changing shape at fractional screen scales. A low-DPI
screen still cannot show more detail than its available physical pixels.

See [the visual checks](../../docs/quest-people.md).
