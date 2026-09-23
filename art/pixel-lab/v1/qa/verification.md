# Visual and export review · 21 September 2026

The review flow was: select a set → inspect native sprites and item slots → change rarity → download a native PNG → compare the four scene studies. This lab is static and has no backend or game-state dependency.

- Native export checks: 291 PNGs; dimensions, non-empty content, allowed palette, binary alpha, PNG CRCs and decoded pixel round-trips all pass. Full results: `native-checks.json`.
- All 291 manifest asset URLs return successfully. All 52 other unique local links checked before packaging return successfully. The packaged ZIP was checked separately after creation.
- All five set buttons update the label, trainer and eight slots. All six rarity buttons update the selected name and accents. The three trainer poses per set export at 24 × 32.
- All four scene buttons render 128 × 96 canvases. Only the tactics view displays the static turn timer, AP and MP.
- Selected item download was exercised on the epic EP rake. The downloaded file decodes as a 16 × 16 PNG.
- Actual-size toggle changes creature display width to 24 pixels; dark-ground toggle applies correctly.
- Browser console and page error lists are empty. Local Pixelify font loads successfully.
- Visually reviewed at 1440 × 1120, 390 × 844 and 320 × 780. No document horizontal overflow. The 320-pixel layout fits the 256-pixel stage without clipping; the set selector and equipment table intentionally scroll within their own containers.
- Reviewed the native character gallery, the full equipment table, the tactical layout and the isometric composition. Screenshots in this directory are review artifacts, not native game assets.
- All changes are under `art/pixel-lab/v1/`; existing application files remain unchanged.

The generated concept board is judged visually and is intentionally excluded from native-palette and native-dimension checks. Seven existing monster types, avatar layering, directional movement, collision data and playable tactical combat remain future integration work.
