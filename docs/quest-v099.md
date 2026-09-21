# Quest v0.99

Approved art budget: 512×384 scene, 48×64 keeper/NPCs, 48×48 creatures,
56×48 monsters, 32×32 item icons/ground tiles. Logical navigation remains a
16×12 grid. Active rendering targets 60 fps with an economy/slow-frame fallback;
sprite poses remain around 8–12 fps. Cache static scenery and equipped poses.

Six NPCs: the other player (Loki/Dodo), Jojo, Karine, Matt, JP and PJ.
Jojo is the cleaner and potion seller: short, round build, black hair.
Karine is the technician and equipment crafter: short, round build, short
salt-and-pepper hair. Matt is the gardener and trailer seller (workwear default).
JP is the receptionist and daily-quest giver: tall/thin, black beard, trucker hat.
PJ is the boss and reward giver: tall/slightly stocky, sunglasses, trucker hat,
joggers. PJ/JP/other player are in Bureau; Jojo/Karine/Matt in Dépôt.

Bureau: pale grey-white tiled floor, continuous curtain across the back wall,
windows along the front, entrance at bottom right. No NPCs baked into backgrounds.

Only appearance and equipped-item visual fields are shared through Team Sync.
Inventory, currency, potion counts, HP and daily-quest state remain local and
separate per selected operator. The other player's activity uses existing shared
maintenance records, with the latest outfit snapshot explicitly identified.

Daily quest prototype: accept JP's mission, defeat three green algae, claim once
for 25 coins, 16 XP and one small healing potion. Calendar date is device-local,
consistent with existing reward dates. A small potion restores 40 HP (8 coins),
a large potion 100 HP (20 coins). In combat, healing consumes an animated turn.

Matt's selling and Karine's crafting retain the existing real-location check.
Jojo's potion shop and Bureau quests/rewards work through their map dialogues.
PJ's crates retain the existing rules based on logged maintenance days; partial
claims leave the rest available when the bag is full.

The selected generated art and exact prompts are saved in `assets/quest-hires/`.
The original game save is retained under its old key as a backup. On first load
it is assigned once to the selected operator (or transferred from an unnamed
local save when the first player is chosen). Subsequent operator switches load
separate bags, currency, HP, potions and missions.

## Appearance sync

Both devices need this version, their own Loki/Dodo selection, and Team Sync
enabled for the same team. Open Quête once on each device to publish its outfit.
The new Firestore documents are `teams/{team}/players/{loki|dodo}`. Existing team
rules already cover this path; no rule or permission expansion is required.

The packet is strictly limited to version, operator, skin/hair settings,
equipped-item visual fields (set, rarity, curse), and update time. No bag, money,
HP, potion stock or quest progress is sent. The other player's recent activity
comes from the maintenance logs that were already shared.

Changed outfits queue locally when disconnected. A guarded transaction prevents
an older queued outfit from replacing a newer one. Acknowledgements only clear
the exact sent version; retries happen on reconnect/visibility and after transient
failures. An unknown outfit is shown as unreceived, without inventing equipment.
The NPC is a snapshot, not a live player position or online-presence indicator.

## Validation and limits

33 Node tests cover game rules, migration, packet privacy, queued writes, dual
device simulations, geometry and rendering clocks. Browser flows cover potion
purchases and healing, actual combat quest progress, NPC crafting/selling,
partial rewards, all 23 maps, 320px layout and offline use.

A local Chromium Bureau walking sample produced 60 render updates/second, with
0.12–0.77ms average JavaScript draw-call work in that sample. This excludes GPU
composition and does not establish a phone FPS guarantee. Validate on the oldest
target phone before treating 60fps as a supported-device promise. Economy mode
targets 30fps; idle scenery/poses use lower rates and offscreen stages pause.
