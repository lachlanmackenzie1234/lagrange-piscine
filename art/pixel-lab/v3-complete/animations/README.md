# V3 motion and effects

347 clips, 2,028 native PNG frames, one atlas per clip and ten GIF previews. These are animation-design exports and optional playback helpers, not a modification to the live game.

## Preview

- [Walking per set](previews/walk-sets.gif)
- [Full-set idle auras](previews/full-set-auras.gif)
- [Common-to-legendary auras](previews/rarity-auras.gif)
- [Aura hides while walking](previews/aura-idle-rule.gif)
- [Seven combat actions](previews/combat-actions.gif)
- [Ten monsters](previews/monster-motion.gif)
- [23 pool creatures](previews/pool-creatures.gif)
- [Loot drop and opening](previews/loot.gif)
- [Pool service](previews/pool-service.gif)
- [Water tiles](previews/water-loops.gif)

GIFs are viewing aids with opaque backgrounds. PNG frame sheets have binary alpha. The GIF encoder may combine identical adjacent frames and retain their total time; `previews/manifest.json` records the actual GIF timings.

## Contents

| Family | Clips | Frame canvas |
|---|---:|---|
| Five outfits × four directions × nine motions | 180 | 24 × 32 |
| Ten base monsters × five motions | 50 | 28 × 24 |
| Five base creatures × idle/swim | 10 | 24 × 24 |
| 23 seeded pool creatures × idle/swim | 46 | 24 × 24 |
| Five full-set auras, two layers each | 10 | 48 × 48 |
| Six rarity auras, two layers each | 12 | 48 × 48 |
| Seven combat effects | 7 | 64 × 64 |
| Hit, heal, reward, emote and related effects | 11 | 64 × 64 |
| Five pool-service effects | 5 | 64 × 64 |
| Four water-condition tile loops | 4 | 16 × 16 |
| Six crate rarities × drop/open | 12 | 32 × 32 |

The nine keeper motions are idle, walk, cast, hit, victory, spawn, defeat, flee and crouch. Monster motions are idle, attack, hit, spawn and defeat. Seven action effects match `perche`, `balai`, `robot`, `choc`, `phm`, `floc` and `lavage`.

## Aura rules

`runtime.mjs` tests the actual eight game equipment slots. A full-set aura requires all eight to be present and share one valid residence ID. Seven pieces or mixed sets do not qualify. The aura colour and motif are blue bubbles (EC), green leaf/wind motes (AG), amber stars (EP), purple diamonds (EPP) and teal key-like runes (GP).

Monster rarity auras use the game's order and colours: grey common, green uncommon, blue rare, purple very rare, amber epic, red legendary. Common is quiet; the higher tiers add rings and more prominent particles. Friendly creatures only receive a rarity aura if an explicit rarity is supplied.

Both kinds are visible only when the entity is idle, alive, visible and not moving or resolving an action. Walking, attacking, casting, taking a hit, spawning, fleeing or defeat should suppress them. `activeAuras()` and `auraLayers()` implement the rule. Normal idle breathing does not count as map movement.

Draw the aura's back layer, then the actor, then the front layer. Aura layers share anchor `[24, 40]`, placed at the actor's foot position. Actor anchors vary by frame family because a long tool changes a sprite's canvas centre without changing its feet.

## Playback

Each clip has a frame list, durations, a looping flag, an atlas, source rectangles, an anchor and motion offsets. **Apply the offsets as well as advancing frames.** Casts, hits, victory and escape use these offsets to move the actor without clipping its native sprite canvas.

Frame and atlas paths resolve relative to this `animations/` folder. `sourceAsset` paths resolve relative to the pack's `exports/` folder.

```js
import { characterClip, frameAt, auraLayers } from './runtime.mjs';

const actorFrame = frameAt(manifest,
  characterClip('EC', 'north', 'walk'), elapsedMs);

const layers = auraLayers(manifest, {
  role: 'player', equipment, motion: 'idle', moving: false,
  action: null, alive: true, visible: true
}, elapsedMs);
```

The helpers select images and timing; the host app loads and draws those images. They do not fetch images, move entities through collision grids, roll damage, spend AP/MP, choose turns or run the 90-second timer.

Use `reducedMotion: true` for stable frames without cosmetic offsets or flashing. Finished non-looping effects select their empty ending frame. Spawning and defeat use intentional transparent frames; this is not missing art.

## Combat and pool service

Each combat timeline separates cast start, effect start, impact, target hit and settling. Impact is a hook for the host game's existing damage/log logic, not an instruction to apply damage multiple times as frames advance. Track dispatched events per action instance. Timelines use generic keeper and monster IDs that the app fills in.

Service effects cover testing, tablet drops, scattering, brushing and backwashing. Position them using the map's ladder, skimmer, pool-centre and pump-access coordinates. They are game visuals and do not alter real maintenance records or dosing.

Water loops are repeatable 16 × 16 tiles for calm, treated, wild and critical states. The `traite` file ID maps to the game's `traité` state. Keep the chosen property layout fixed when changing condition or animation frame.

## Coverage and limits

The frames are procedural animation studies made from the v3 native sprites. Walking articulates the lower legs and has a passing pose; idle uses a small body movement. Attacks use a brief lean and lunge; hit uses a local flash; spawn/defeat use pixel dithering. These are not a replacement for a later animator-authored expressive pose pass.

All five full outfits and all ten base monster species have their clips. The 23 individual pool creatures have their own idle/swim frames. The 230 pool-specific monster appearances and ten avatar presets remain static exports; `source/motion.py` exposes `pose(base, motion, index, direction)` so the same transforms can be applied when baking or integrating those variants. No combined cross-product of every rarity, curse, cosmetic seed and motion is exported.

Audio, composable clothing layers, new facial expressions, and live app integration are not part of this design pack.

## Rebuild and verify

From the parent pack folder:

```sh
python3 animations/build.py
python3 animations/previews.py
python3 animations/verify.py
```

Verification checks exact dimensions, binary alpha, atlas/frame equality, intentional transparent endings, visible frame changes, actual leg motion in every direction, reproducibility and GIF durations. The Node checks exercise full-set detection, idle/movement/action gating, every clip's frame boundaries and reduced-motion behaviour. Results are in `verification.json`.
