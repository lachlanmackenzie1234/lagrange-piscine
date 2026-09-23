# Pocket Coast · handheld exports v3

Standalone PNG exports guided by the five new handheld-game screenshots and the selected Pocket Coast direction. No comparison website or game changes.

## Files

| Export | Content |
|---|---|
| `01-pool-depot-overworld.png` | Overhead exterior: depot, sandy lane, pool terrace and coastal water. Environment only. |
| `02-depot-interior.png` | Compact maintenance room with racks, workbench, lockers and open floor. Environment only. |
| `03-trainer-directions.png` | Five outfit rows; actual columns are south/front, east/right, west/left, north/back. |
| `04-creatures-monsters.png` | Top row: Écume, Oyatin, Pignotte, Bouémitte. Bottom row: Clapot, Algue verte, Calcaire, Filtre saturé. |
| `05-equipment-icons.png` | Five sets × eight equipment slots. |

Trainer and equipment rows: EC Pool Boy, AG Surfer, EP Gardener, EPP Holidaymaker, GP Keeper.

The trainer generator reversed the two profile columns requested in the prompt. The order above records the delivered image.

Equipment columns: headwear, top, bottoms, footwear, charm, pole, robot, brush.

## Format

These are **enlarged generated source exports**. Actual PNG dimensions and transparency measurements are recorded in `manifest.json`. Native game budgets remain stage 128 × 96, trainer 24 × 32, creature 24 × 24, monster 28 × 24 and item 16 × 16. Those sizes guided the prompts; exact native grids, slice rectangles, walk cycles and collision maps have not been produced or validated here.

The overworld is a larger map composition with room for small characters; the depot interior is a single-room composition. Maps have no character or interface layer. All three sprite sheets have genuine transparent backgrounds. Their alpha includes intermediate values and is not binary pixel-game transparency. Keep the original PNGs for selecting, redrawing or preparing sprites later.

Made with the built-in ImageGen tool. Exact final prompts and input-reference paths are in `prompts/`. The reference screenshots themselves are not included in the archive. The selected Pocket Coast board supplies the original pool-working identities; the new gameplay screenshots supply the overhead perspective, tile language, softer colours and compact sprite proportions.
