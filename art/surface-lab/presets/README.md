# Saved surface looks

Capture each look separately so later experiments keep their own settings.

| Look | Settings |
| --- | --- |
| Late evening vibe | [late-evening-vibe.json](late-evening-vibe.json) |

Each JSON contains typed field options, the final colour grade, playback
preferences and the original UI values. Reference weather values describe
what was visible at capture; they are distinct from initial dampness.
These presets save a reusable look, rather than live wear history or fluid state.

To restore through the renderer, pass `field` to `TerrainStudy.Field` or
`field.configure`, and `grade` to `SurfaceColour.filter`. When restoring through
the controls, use `controls`; its grain value is the UI multiplier, while
`field.grain` is the internal sand reference size.
