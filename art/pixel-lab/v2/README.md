# Four ways to Lacanau · style studies v2

Four new art-direction PNG exports, made with the built-in ImageGen tool from the expanded references in `screenshots/screens/`. The gallery compares them with the first Lacanau field kit board. All work remains isolated from the game.

## Open

From the repository root, use the existing static server:

```sh
python3 -m http.server 8014 --bind 127.0.0.1
# http://127.0.0.1:8014/art/pixel-lab/v2/
```

The downloadable archive contains this gallery, the four new PNGs, the original concept board, prompts, provenance and notes. After extracting, serve the extracted directory with the same command and open `http://127.0.0.1:8014/`. The optional link back to the native v1 lab requires the original repository.

## What stays the same

Each prompt asks for the same rectangular pool courtyard, blue maintenance shed, pines, hose and lounger; a blue-capped keeper carrying a net; the wave-crested otter, algae crab and walking filter tank; five residence outfits; and the eight Pool Boy equipment pieces. The requested layout is consistent: world on the left, characters and equipment on the right. The generated boards interpret those instructions rather than enforcing exact registration between images.

The colour identities remain blue EC, green AG, amber EP, purple EPP and teal GP. These are shared colour cues, not a claim that every generated pixel belongs to the current code palette.

## Four directions

| Export | Reference principles | Trial |
|---|---|---|
| `01-pocket-coast.png` | Early colour handheld / Link's Awakening DX | Broad bodies, dark contours, coarse pixel clusters, graphic tiles and simple item silhouettes |
| `02-sunlit-adventure.png` | GBA Zelda environment, depot and inventory references | Rounded shapes, coloured outlines, warm materials and richer but organised pixels |
| `03-coastal-storybook.png` | Dofus Retro character creation, monsters, world and inventory | Tapering ink lines, asymmetric equipment, longer limbs, hand-drawn oblique scenery |
| `04-tideglass-tactics.png` | Waven characters, tactical arena and home island | Angular cel-shaded shapes, clean colour planes, sculptural tools and raised island terrain |

The first two are pixel-art directions. The latter two intentionally explore smooth, higher-resolution illustration because the new references include that range. They are not labelled as 16 × 16 icons or 24 × 32 sprites.

## Resolution and integration

These PNGs are **concept boards, not native sprite sheets**. The requested output canvas is 1536 × 1024; actual exported dimensions are recorded in `manifest.json`. They have not been downsampled, palette-quantised, cropped into icons, or claimed to be production-ready sprites.

The existing game budgets remain: stage 128 × 96; trainer 24 × 32; creatures 24 × 24; monsters 28 × 24; items 16 × 16. The original v1 native PNG pack is still available separately and unchanged.

My starting recommendation is Sunlit Adventure for a richer 2D game, subject to a native-resolution redraw to prove the small shapes. Pocket Coast explores a simpler direction with fewer details to preserve. Coastal Storybook offers more room for equipment personality if inventory portraits and illustrations can use a larger canvas. Tideglass Tactics is a separate 2.5D investigation: projection, tile masks, draw order and directional poses would need their own implementation.

## References and prompts

All fifteen newly added reference images were inspected, in addition to the existing first-study references. `prompts/references.json` lists the specific source inputs supplied to each generation. Each exact full prompt is saved as `prompts/<style-id>.txt`.

Reference images are used for art-direction principles, not copied characters, world layouts or game branding. The original v1 board was supplied as a reference for the keeper, creature identities and practical pool equipment, with instructions to change the visual style substantially.

The original screenshots are not included in the export archive. The saved original field-kit board is a baseline reference, not a fifth newly generated style. No browser automation writes to the actual app's local storage or game data during this task.
