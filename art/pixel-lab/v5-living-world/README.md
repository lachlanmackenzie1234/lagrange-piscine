# Lagrange Quest · Living world 05

A standalone interactive art simulator. Open `http://127.0.0.1:8014/art/pixel-lab/v5-living-world/` while the repository's static server is running. Alternatively serve the repository root with `python3 -m http.server 8000` and open the same path on port 8000.

The study explores a lush, lit, three-quarter pixel world around a small keeper. It runs in Canvas 2D at 512 × 384, with 32-pixel ground tiles and a finer navigation grid. Art, collision, shadows, ambience, and interface feedback are separate concerns. There is no build step or external runtime dependency.

## Explore

- Tap open ground to walk, or use the arrow keys / WASD.
- Tap trees and planting to rustle foliage and release leaves.
- Tap the pool to test water, skim, or add a simulated treatment. The keeper walks to its edge and an effect plays.
- Tap the pump shelter to backwash or use its watering hose on the border; tap the villa to open its door.
- Tap the green creature, then **Attack**, to enter a turn-based encounter. Four tools have different power. Retreat, victory, and defeat return to the garden.
- Tune daylight, lushness, breeze, water, light direction, keeper scale, and body height. Body height defaults to 50%, preserving the head's original size; use 100% to compare the previous proportions. Show the tile grid, hide shadows, or enable quiet motion.
- Tune **Dominant tree share** to vary the residence's preferred species. The default 70% produces 10 preferred trees out of 14, with a stable mixture of the other species.
- Switch sample gardens to compare five house/pump styles and matching grass palettes. **Explore the art sets** opens the complete 55-asset library and a downloadable PNG pack. Each map has three small, seven medium, and four large trees, independently of its species weights.
- **Enable sound** opens a mixer for music, ambience and effects. Three original themes follow garden/evening/battle; wind, water, rain and nature sounds follow the current appearance. Actions have small sound cues. **Listen to the sound library** opens the audition page and reusable audio exports. The page starts silent, suspends audio in the background, and keeps sound preferences separate from appearance.
- Switch **Pool water appearance** between clear, treated, algae, and murky palettes. Each has its own animated surface, clarity, highlights, and floating detail; weather continues to drive its movement.
- **Use Aperçu weather** follows the app's latest cached conditions. Switch it off to return to manual atmosphere controls.
- Compare five **sample garden schedules**, preview the next seven days, and use **Gardener visit** to cut the selected garden today. Its grass then regrows on a seven-day cycle, offset from the other gardens.
- **Save this atmosphere** downloads the look as JSON. Appearance settings persist under the simulator's own local-storage key, `lagrange-quest.living-world.v5`.

No real pool readings, tasks, chemistry, or game progress are read or changed. All pool care and battles are fictional simulator state. The simulator does not load the app's Store or Firebase Sync.

## Latest weather and weekly grass

The simulator reuses `../../../js/weather.js`, the same Weather module as Aperçu, and reads `lagrange-piscine.weather`. The existing module supplies the latest conditions, with its normal 30-minute cache. Weather changes in another same-origin app tab update the simulator through the storage event; the active simulator also checks once a minute and on focus. No daily weather history is collected.

Wind from 0–60 km/h maps to the 0–100 breeze control. Water motion uses a gentle base plus wind and current precipitation. Current Paris time sets the light direction and time-of-day appearance; weather code controls cloud shading, UV affects direct light, temperature adds a restrained warm/cool tint, and precipitation adds rain. These are visual mappings, not meteorological or pool-safety predictions. Missing measurements preserve the matching manual control. A cached or unavailable weather source is labelled in the interface.

Manual atmosphere choices stay in the original settings key. Live weather is applied at rendering time, so turning the connection off restores those choices. The new `lagrange-quest.living-world.context.v1` key holds only the simulator's weather mode, selected sample garden, and cut dates. Saved atmosphere exports now also record their weather and grass context.

Grass has a separate calendar clock: day 0 is freshly cut, day 6 is tall, and day 7 begins the next weekly cycle. Each example garden has a different cut weekday. The same fine-grass cells and accent clumps remain in place while their height changes; weather does not alter this schedule. A gardener visit records a new cut date for that garden, shifting only its cycle. Paris calendar dates avoid daylight-saving drift, and the correct phase is calculated when the page opens.

The five sample gardens share the same fictional building/pool layout, with distinct seeded grass distributions and residence-weighted tree species. Their cut schedules demonstrate per-pool offsets and are not real gardener schedules. The week preview advances only the grass clock; weather stays at the latest Aperçu conditions. Resetting the visual world leaves saved cut dates intact.

A future gardener NPC or connected tool can dispatch `lq-garden-cut` with a `detail` containing a known `poolId` and an ISO `at` timestamp/date. The study validates the event, ignores older/future cut dates, and persists it only in the sandbox context. No external gardener MCP has been connected. The in-page **Gardener visit** button exercises that same reset path.

## Art and references

Reference direction: `screenshots/screens/character_on_map.jpg` for small characters and light; `map_example.jpg` for varied, layered vegetation; `pokemon_2.webp` and `pokemon-3.webp` for buildings, paths, water, and readable map composition. `Pokemon-FireRed-LeafGreen-Screenshot-Battle-Gameplay.avif` informs the separate encounter layout.

Keeper, companion, and monster art is sampled from the existing **larger source exports** in `../v3-complete/exports/large/`. The original files remain intact. Keeper sprites use 48 × 64 native canvases, the monster uses 56 × 48, and the companion uses 48 × 48. Their display scale can be smaller than their art canvas. This prototype poses existing artwork; it is not a complete newly drawn directional animation set or a full equipment-layer migration.

`assets/coastal-foliage.png` is a new eight-object foliage atlas generated with the built-in ImageGen tool. The exact prompt is in `assets/foliage-prompt.txt`. Transparent sprites are cropped and sampled in the renderer at native game sizes. Runtime alpha cleanup makes their edges binary. Plant forms include umbrella pine, tall maritime pine, broadleaf tree, young pine, shrub, fern, mossy stones, and flowering grass. The source PNG retains its original alpha and is never overwritten.

The earlier `assets/coastal-tree-species.png` contains ten ImageGen tree designs and remains available for comparison. The current renderer uses `assets/zone-kit/`: five cartoon house designs with angled, foreshortened walls, five matching pool pump/filter shelters with hoses, fifteen tree drawings (five species × three size classes), fifteen accent grass patches (five palettes × three weekly growth stages), and fifteen repeatable 32 × 32 ground tiles. Native PNGs are exported separately, with binary alpha and bottom-centre anchors. The folder retains the original ImageGen sheets, exact prompts, a reproducible sprite extraction script, and a manifest with source rectangles and native sizes. `asset-library.html` displays the full collection and links its PNG download pack.

| Residence | Roof colour | House style | Preferred tree |
|---|---|---|---|
| GP | Blue | Stone woodland cottage | Chêne |
| EPP | Violet | Twin-gable lodge | Pin maritime |
| AG | Green | Coastal veranda | Pin parasol |
| EP | Teal | Gabled garden villa | Chêne vert |
| EC | Orange | Timbered cottage | Bouleau |

The renderer allocates a quota before shuffling the stable tree positions, so small maps visibly reflect the requested percentage. These are art-direction weights, not a botanical survey of the real residences.

Terrain, pool coping, reflections, clipped border plants, shadows, ripples, and interface elements are authored in code. Houses, pump shelters, trees, and grass patches use generated art. Building shadows, door interactions and evening window light use each zone's own silhouette and native coordinates. The property layout is fictional.

The current grass surface is homogeneous fine grass. `meadow.mjs` defines a
32 × 32 repeatable pattern, rendered in 8px reactive cells across the entire lawn.
Each blade root is masked at material boundaries; the square is never treated as
an all-or-nothing stamp. A narrow pixel-dither fringe blends the lawn into sand
and terrace edges. Fifteen opaque PNG tile exports in `assets/zone-kit/ground/`
provide cut, medium and tall samples for all five zone palettes.

The weekly cycle controls blade height and fullness. Maximum height scales with
the keeper's body proportions. Grass roots in front of the feet redraw their
blades over the lower body, while the head remains clear; the character isn't
moved downward. Trees and buildings cast shade onto the grass and keeper, and
the keeper casts its own moving silhouette onto the ground. Quiet mode stills
the blades. Lower lushness thins the blades while keeping a continuous ground
surface.

The larger generated grass sprites now appear as occasional accent clumps, roughly
one per four eligible decor patches. They retain separate cut, medium and tall
artwork and passage animation. Rocks use the existing seeded placement plan;
trees, clipped shrubs and potted topiaries remain separate foreground elements.
The earlier 90/10 ground-cover allocator is retained as a sparse decor placement
plan rather than the main grass surface. Pool access and building approaches
stay clear.

Tufts use persistent spring state: they bend in response to the keeper's direction, briefly flatten, and recover after passage. Tracks fade over roughly two seconds. Lushness controls fine-blade and accent density while the independent seven-day cycle controls height. The character renderer shortens the region below the neck while retaining the original head pixels and keeping the feet anchored, in both map and battle views.

## Rendering

The ground and lawn underlay are cached. Water and grass animate separately. A tree's canopy and projected shadow use the same cached deformation pose; species differ in stiffness and sway timing while sharing the scene's gust pattern. A low-resolution sample of the shadow layer shades the keeper and grass clumps as they enter or leave shade. Small dappled highlights move within the projected shade. Tree canopies soften slightly when they cover the keeper, retaining visibility through layered scenery.

Props and actors share a ground-position depth sort. A single world loop pauses rendering in hidden tabs, and a separate battle loop runs only during encounters. Quiet motion follows the system setting initially and is adjustable; grass springs settle and transient tracks are hidden in that mode.

Navigation uses a collision grid; tapping an obstacle seeks a nearby reachable cell. The turn controller locks moves during resolution, applies each impact once, and cancels on retreat. Animation does not write maintenance records.

## Verification

Sound scores, synthesis recipes, performance notes and file provenance are documented in `audio/README.md`. The three MP3 music previews and sixteen WAV effects in `audio/exports/` are optional downloads; the simulator creates its sound locally and never preloads those recordings.

Run `node --test art/pixel-lab/v5-living-world/*.test.mjs` from the repository root. Tests cover obstacle routing, reachable tap targets, input locking, damage timing, victory, defeat, cancellation, weekly growth and cut events, per-garden offsets, Paris calendar boundaries, bounded weather mapping, missing weather measurements, tree quotas and repeatability, spring recovery, movement direction, deterministic canopy poses, foreground root masking, body-relative grass depth, and resolution of all 55 native PNG files through the zone and growth mappings.

Browser QA screenshots and results live in `qa/`. Art direction and phone-scale readability should be reviewed here before a separate integration into the live Pixel theme.
