# Crownfall arena skies

The two skies the Crownfall chess arenas stand under, painted in code with the cines drawing kit: **Eclipse** (a warm
eclipse at midday) and **Violet Night**. No image generators and no photographs: `film/skies.js` paints each one from
seeded noise, so the same sky comes out every time.

Each sky is a cylindrical panorama, 4096 x 1280:

- **Across:** the whole horizon, azimuth -180 to +180 degrees, with the eclipse at the centre (azimuth 0).
- **Down:** elevation +78 degrees (top row) to -12 degrees (bottom row); the horizon is at elevation 0.
- **The eclipse** hangs at elevation 20.3 degrees, where the game places it.

What is painted here: the fall of light from the eclipse, the ring of sunset light a total eclipse leaves all round the
horizon (or, at night, a teal airglow), far cloud in perspective, the river of stars and its nebula (Violet Night), and
a broken skyline in three ranges with arches, squat keeps and standing stones. The skyline has no tall thin towers:
one crossed by a streak of cloud read as a cross, and no real-world religious symbol belongs in this sky.

What the game adds in its own shader, because it must stay sharp or move: the stars, drifting cloud, the aurora and the
eclipse itself.

```sh
node tools/export.js            # out/sky-eclipse.webp, out/sky-violet.webp and 1600-wide previews; prints size and SHA-256
open film/index.html            # both skies in a browser
```

The game's copies live in `Crownfall/main game/src/play/sky/`, with their hashes in `SOURCES.md` there.
