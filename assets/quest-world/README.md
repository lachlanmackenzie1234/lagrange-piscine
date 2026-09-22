# Living-world foliage

The eight foliage objects come from the user's `art/pixel-lab/v5-living-world`
study. The original built-in ImageGen output is preserved unchanged at
`source/coastal-foliage.png`; its original prompt is `foliage-prompt.txt`.
This integration does not generate replacement character or NPC artwork.

`foliage.png` is the native runtime atlas: 321×173, 49,278 bytes on disk and
222,132 decoded RGBA bytes. `foliage.json` records the eight rectangles and
the original source SHA-256. Only these two files are precached by the app.

Rebuild from the repository root with Python and Pillow:

```sh
python3 scripts/build-quest-world.py
```

The importer uses the study's eight source regions, fits their opaque bounds
to the same native sizes, makes alpha binary and removes small detached tree
fragments. It leaves the large source image intact. Buildings, paths, ground,
pool surfaces, grass and lighting are drawn in `js/living-world.js`.
