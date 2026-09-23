# Bald, short and long keeper hair

Three registered edits of the compact keeper, created with the built-in
`image_gen.imagegen` tool. The original 2×2 sources are in `source/`; the exact
prompts and reference are in [generation.json](generation.json).

`hair.png` packs twelve 64×64 views in a 768×64 atlas (51,766 bytes; 192 KiB
decoded). `exports/` contains the individual transparent PNGs. All use `[32,63]`
as their ground anchor. The original keeper's scale is reused for every edit,
so removing hair does not enlarge the bald head or change the body's footprint.

The runtime maps hair `1` to short, `2` to bald and `3` to long. The UI presents
them as “chauve, court, long”. The short views override `keeper/base/*`; the
other styles use `keeper/bald/*` and `keeper/long/*`. Equipment, colours and
animations are applied by the existing keeper renderer. The registered bald
reference distinguishes bright hair highlights from skin during recolouring.

Rebuild with `python3 scripts/build-quest-hair.py` (Pillow and NumPy required).
Only the atlas and manifest are precached, not source sheets or exports.
