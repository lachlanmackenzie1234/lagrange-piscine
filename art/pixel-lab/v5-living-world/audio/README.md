# Lagrange Quest · Sound study 01

A small original sound palette for the living-world simulator. Open
`../sound-library.html` through the local server to audition it. The simulator's
**Sound of the garden** panel has independent music, ambience and effects levels.
Audio is off at page load and starts only after **Enable sound**.

## Direction

The reference roles are the compact melodic identity and responsive cues of old
Pokémon, and the breathing room, warmer instruments and nature bed associated
with Stardew Valley. These are original sketch compositions and procedural
sounds. No game recordings, melodies, transcriptions or extracted samples are
included. This first pass is a palette to audition alongside the art; its nature
sounds are synthesized rather than field recordings.

| Layer | First library |
| --- | --- |
| Music | A keeper’s morning (84 BPM), After the last round (68 BPM), Trouble at the waterline (116 BPM) |
| Atmosphere | Quiet coast, Through the trees, A passing shower, Garden after dark |
| Effects | 16 cues for selection, grass/stone steps, rustling, water, door, pool pump, hose, encounter tools, impacts and outcomes |

`catalog.mjs` contains the editable note scores, cue descriptions and environment
presets. `engine.mjs` contains the synthesis recipes and mixer. `controls.mjs`
connects them to the map. `library.mjs` is the standalone audition page.

## Runtime and weight

The three runtime modules total about 26 KB before compression (about 9 KB with
gzip). No music or sample files are fetched by the simulator. One two-second mono
noise buffer is shared by the ambient layers and effects: 384,000 bytes at the
tested 48 kHz sample rate. That figure describes the sample buffer, not all
browser/audio-engine memory. Music uses short scheduled oscillator voices; the
runtime caps transient voices at 32 and cleans up completed nodes. Three filtered
noise beds supply wind, water and rain.

The audio context is created on the first explicit enable gesture. Muting fades
out, removes sources/timers and suspends it. Hiding the page suspends playback;
returning resumes only if the user had enabled it. Leaving closes the context.
Saved preferences hold levels and music selection, never autoplay permission.

Wind, water movement, rain and time of day follow the simulator's current weather
appearance. Birds appear by day and sparse crickets by night. Automatic music
changes between garden/evening and battle, with a short fade; ambience ducks
during battle. An outcome clears the music for its short cue. Returning restores
the garden selection. Grass and terrace footsteps, foliage, pool care, the depot
door, pump and hose use semantic cues from world actions. Motion preferences are
independent of sound preferences.

## Reusable files

- `exports/music/`: three 96 kbps MP3 previews plus lossless WAV render masters.
- `exports/effects/`: sixteen stereo 22.05 kHz PCM WAV effects.
- `exports/manifest.json`: duration, file weight, peak and RMS for each deliverable.
- `exports/sound-library-v1.zip`: the MP3s, effect WAVs, editable source scores,
  synthesis recipes, manifest and these notes. WAV music masters are separate.

These exports are optional downloads; opening the map does not preload them.
Music masters capture a complete loop after a warm-up loop, preserving sustained
notes at the boundary. Effects include their release tails. The runtime remains
the exact, continuous loop reference; MP3 decoder padding may differ by player.

To regenerate, run the static server, open the simulator in an agent-browser
session, then run `python3 audio/export-assets.py --session SESSION` from the
simulator directory. This uses local OfflineAudioContext rendering and ffmpeg,
with no external service or API key.

## Next production pass

Keep short interactive cues in small decoded buffers, and stream longer
compressed music when replacing these sketches with produced recordings. This
follows [MDN's Web Audio guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
on media elements for longer tracks, buffers for short sounds, user activation,
and independent playback/volume controls.

We can expand the same catalogue with a few variations per footstep, occasional
residence motifs, and locally recorded wind, leaves and water. Keep music sparse
enough that the environment and task feedback remain easy to hear.
