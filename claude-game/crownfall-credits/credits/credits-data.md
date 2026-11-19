# Crownfall credits (data for the end-credits video)

Compiled 8 November 2026, read-only, from all 13 remote branches of mylife-as-miles/Crownfall. Each entry's source branch and file are in `credits-data.json`. This file summarises it.

**Title check.** "Crownfall: Aethelgard" never appears in the repository. In-game copy says "Crownfall — King's Gambit", and Aethelgard is the internal name of the My Legacy world. Please confirm the title card.

## Created by
**Osita Miles** (GitHub mylife-as-miles)
- Game direction: approves lore, names and releases
- Game design direction: chess-first rules, the Chronicles directive and the village brief
- World canon and linguistic atlas (kept private)
- Art direction
- Music: "Music by Osita Miles" (all six soundtrack tracks)
- Supplied artwork: menu art, Home art, the Chronicles world map (creator-owned) and the four-armed sorcerer

## Development collaborators
- **Claude (Claude Code), Anthropic.** Built the eclipse arena look-development in Blender, the My Legacy foundations, the Bannerhold environment and Chronicles M0–M1. Fixed the source worlds. Built the 100-resident Ealdholt village population. It has 151 commits.
- **Codex, OpenAI.** Built the campaign vertical slice, the first arena scene, the sorcerer intake, the source-world ports, the Ealdholt village preview and Legacy UI, the soundtrack player, Showcase and settings, and the baked battlefields in Play. It also integrated the village population. Its commits use the creator's git identity.
- **Rork (rork.com), AI app builder.** Built the original King's Gambit 3D chess app and generated its chess figures, animations and in-match audio.
- **Generative tools.** Suno (soundtrack track 3, per its tag) and Meshy (organic arena models).

## Original King's Gambit chess game
- Upstream repository rork-medieval-3d-chess by **Alex Nguyen**, built with Rork. MIT, © King's Gambit contributors.

## Music: Crownfall soundtrack
**Music by Osita Miles.** The creator confirmed this credit for all six tracks on 8 November 2026. His alias "myles4miles" appears only as evidence: it is the artist tag in track 3's file.

| # | Title | Artist | Confirmed |
| --- | --- | --- | --- |
| 1 | Sanguis et Terra | Osita Miles | yes (creator, 8 Nov) |
| 2 | Le Roi Muet | Osita Miles | yes (creator, 8 Nov) |
| 3 | La Felure Demure ("La Fêlure Demeure") | Osita Miles (file tag: myles4miles; comment: "made with suno") | yes (tag + creator) |
| 4 | Krom Shahid | Osita Miles | yes (creator, 8 Nov) |
| 5 | Cyning Slieht | Osita Miles | yes (creator, 8 Nov) |
| 6 | Slay the Iron Slave | Osita Miles | yes (creator, 8 Nov) |

Tracks 1, 2, 4, 5 and 6 have no embedded tags, so their credit rests on the creator's confirmation.

## Character art (Ealdholt villagers)
- **MakeHuman team** (Data Collection AB, Joel Palmius, Jonas Hauquier): base bodies, rig and weights. CC0.
- **makehuman_system:** skin, eyes, teeth and lashes. CC0.
- **Mika Suominen:** faceunits01 and visemes02. CC0.
- **100STYLE** motion: CC BY 4.0. Required line:
  "100STYLE dataset by Ian Mason, Sebastian Starke and Taku Komura (2022), CC BY 4.0, doi:10.1145/3522618."
- **Poly Haven (CC0):**
  - Rico Cilliers and colormass: fabrics
  - Rob Tuytel: leather and bark
  - Tics: cross-pein hammer
  - Kuutti Siitonen: basket and stool
  - Oliver Harries: bowl
  - James Ray Cock: bucket
  - Ronnie Barter: spoon

## Environment textures (Ealdholt)
- Poly Haven (CC0):
  - eye-candy.xyz: Stony Dirt Path
  - Amal Kumar: Rock Surface
  - Charlotte Baglioni: Leafy Grass
  - Rob Tuytel and Dimitrios Savva: ground sets on Claude's branch, not yet integrated
- ambientCG: Grass001 (CC0)

## Source worlds and adapted code (all MIT)
- Leon Lin: Golden Temple, Athenaion
- Monolith Wilds contributors: Monolith Wilds
- SamG-Coder: BakedVoxelLighting
- ZyFou: ProceduralTerrains
- Remi Sebastian Kits: LAAS fable5-world-demo
- Meng To: ThreeUI
- three.js authors: geometry helpers

## Arena sources (Blender eclipse arena; not verified as shipped in the battlefield release)
- Required CC BY 4.0 lines:
  - "Hand Nadia" by 3dscanservice, licensed under CC BY 4.0, via Sketchfab.
  - "Capitoline Museum Courtyard" by artfletch, licensed under CC BY 4.0, via Sketchfab.
  - "Mercati Di Traiano Ruins" by artfletch, licensed under CC BY 4.0, via Sketchfab.
- CC0 courtesy credits:
  - Skull showing treponemal disease (syphilis): Northern Heritage Network (digitised by Open Virtual Worlds, University of St Andrews)
  - Cela, Ruins of a nuns' cell: Morbase / Museu Virtual
- ambientCG and Poly Haven CC0 materials (authors not recorded)
- KitBash3D "Secrets of the Luminara" (licence not recorded)
- Meshy-generated organic models

## Licensed private input
- Elderbloom village (Fab; Fab Standard License, NoAI; seller not recorded)

## References (reference only)
- Clair Obscur: Expedition 33 (Sandfall Interactive; Carla Devèze)
- Elden Ring, Crimson Desert, Avatar: Frontiers of Pandora, Black Myth (Steam screenshots)
- Winter Cats Studios settlement clip
- Osita Miles's Hello World repository
- Leon Lin's procedural-alpine-lake (not redistributed)
- Poly Haven "A Verdant Trail" and "Namaqualand" collections (not HDRIs; not integrated)
- ChuckCG, Ioannis Stamatelis and Gerald IR tutorials

## Fonts
- Barlow and Barlow Condensed: The Barlow Project Authors, OFL-1.1
- Noto Serif: Google LLC, OFL-1.1
- Geist Serif: The Geist Project Authors (Vercel), OFL-1.1
- Cinzel and Crimson Pro: used by the chess app through Google Fonts; designer and licence not recorded

## Open-source software
- three.js (MIT)
- Immersive Web SDK (MIT), with super-three (MIT)
- pmndrs uikit (MIT)
- React (MIT) and Vite (MIT)
- TypeScript (Apache-2.0)
- chess.js (BSD-2-Clause)
- three-mesh-bvh (MIT) and meshoptimizer (MIT)
- sharp (Apache-2.0) and Draco (Apache-2.0)
- Playwright (Apache-2.0) and tsx (MIT)
- In the chess app: Tailwind CSS, Radix UI / shadcn/ui, TanStack Query, React Router, React Hook Form, Zod, Recharts, Sonner, Vitest and ESLint (all MIT), and lucide-react (ISC)
- Tool, not shipped: Blender (licence not recorded)

## Unconfirmed (17 items, listed in the JSON)
- The title
- Whether to show a Suno note with the music credit (track 3's tag says "made with suno"; the other files say nothing)
- Who made the supplied artwork
- Who modelled the sorcerer, and whether Mixamo was used
- The Elderbloom listing
- What the battlefield release contains
- The KitBash3D licence
- Authors of the arena Poly Haven textures
- Whether the artfletch scans were used
- Alex Nguyen's exact role
- The services behind Rork's generated assets
- The generator of the Cael portrait
- Cinzel and Crimson Pro credits
- The individual Barlow designer
- Which creator-identity commits are Codex's
- Default Quest MSDF fonts
- Blender's licence
