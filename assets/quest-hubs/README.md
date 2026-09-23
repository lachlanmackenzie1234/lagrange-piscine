# Layered hubs and vehicle exports · v0.101

The current v0.104.1 layout is documented in [the hub/game update](../../docs/quest-v104.md).
The runtime atlas now contains 15 props (512×332, 135,317 bytes), including the
black Scénic, two chair views and a broad-leaf indoor plant. The Scénic is in use;
the Polo remains a spare. New prompts are in [chairs-generation.json](chairs-generation.json)
and [room-generation.json](room-generation.json). The earlier inventory below
describes the original v0.101 export.

Created with the **built-in ImageGen tool**. The final prompts and reference
roles are saved in [generation.json](generation.json); the full-resolution
transparent outputs are preserved in `source/`.

The active 512×256 atlas, [props.png](props.png), contains eleven independent props:
a vertical wooden desk, a white standing counter, a filing cabinet, a vertical
sofa, a square magazine table, a yellow gardener's van, two white Kangoo vans,
a workshop, a potion trolley and a storage rack. Its rectangles and source
hashes are in [manifest.json](manifest.json).

The runtime atlas is **116,149 bytes**, with 524,288 decoded RGBA bytes. Together
with the existing foliage atlas, the two files total 165,427 bytes. Only the
native atlas and manifest are downloaded for play; full sources and standalone
vehicle exports are excluded from the service-worker cache.

| Vehicle | Native export | Use |
|---|---|---|
| Matt's yellow gardener's van | [104×94 PNG](exports/gardener-van.png) | Dépôt sales |
| Karine's white Kangoo | [90×80 PNG](exports/karine-van.png) | Dépôt crafting |
| Jojo's white Kangoo | [90×80 PNG](exports/jojo-van.png) | Dépôt potions |
| Black Renault Scénic | [96×76 PNG](exports/scenic-black.png) | Saved for later |
| White Volkswagen Polo | [86×68 PNG](exports/polo-white.png) | Saved for later |

[exports/manifest.json](exports/manifest.json) lists the five individual exports.
Each has binary transparency, a consistent rear three-quarter view and a stable
foot baseline. They are static parked-vehicle art, not driving animation sheets.

Rebuild with Python and Pillow from the repository root:

```sh
python3 scripts/build-quest-hubs.py
```

`js/hub-art.js` draws the floor, walls, glass-front daylight and foreground. `js/maps.js`
places the independent sprites and collision cells. `js/living-world.js` shares
lighting, projected shadows, foreground grass and depth ordering with the pool
maps. The smaller Bureau uses 384×288 pixels; the Dépôt remains 512×384. Furniture
has its own display scale, calibrated against the keeper rather than baked into
a single background image.
