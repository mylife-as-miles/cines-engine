# The Weight of Heaven: sound credits

Every file made by `tools/sfx_make.py` for the opening (movement I). What each one is, how it was made (model, exact prompt, seed, steps, edits), its earshot check and its caveats are in `audio/sfx/manifest.json`. Nothing here was paid for. Status "candidate" means delivered to the mix and not yet approved by the author.

| File | Source | Terms | Attribution | Commercial use | Modified | Checked | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `audio/sfx/bell_body.flac` | made in code | original | none needed | yes | n/a | 2026-11-26 | candidate |
| `audio/sfx/hammer_whoosh.flac` | made in code | original | none needed | yes | n/a | 2026-11-26 | candidate |
| `audio/sfx/wind_altitude.flac` | made in code | original | none needed | yes | n/a | 2026-11-26 | candidate |
| `audio/sfx/hall_impulse.flac` | made in code | original | none needed | yes | n/a | 2026-11-26 | candidate |
| `audio/sfx/bell_landing.flac` | generated locally, with a sub layer made in code | Stability AI Community License + original | Stable Audio 3.0 Small (Stability AI) | yes, while annual revenue is under USD 1M | cut, slowed to 0.7 speed, layered, levelled | 2026-11-26 | candidate |
| `audio/sfx/chains_slack.flac` | generated locally, layered with an earshot catalogue design | Stability AI Community License + earshot (MIT) | Stable Audio 3.0 Small (Stability AI); earshot | yes, while annual revenue is under USD 1M | cut, both layers slowed, levelled | 2026-11-26 | candidate |
| `audio/sfx/rope_creak.flac` | CC0 recording, layered with a locally generated take | CC0 1.0 + Stability AI Community License | SholeColtis (Freesound 683416); Stable Audio 3.0 Small (Stability AI) | yes, while annual revenue is under USD 1M | cut, both layers slowed to 0.8 speed, levelled | 2026-11-26 | candidate |
| `audio/sfx/wax_press.flac` | generated locally | Stability AI Community License | Stable Audio 3.0 Small (Stability AI) | yes, while annual revenue is under USD 1M | cut, levelled | 2026-11-26 | candidate |
| `audio/sfx/ring_lift.flac` | generated locally | Stability AI Community License | Stable Audio 3.0 Small (Stability AI) | yes, while annual revenue is under USD 1M | cut, levelled | 2026-11-26 | candidate |
| `audio/sfx/paper_handling.flac` | earshot catalogue design, layered with a CC0 recording | earshot (MIT) + CC0 1.0 | earshot; Atrius1 (Freesound 470189) | yes | both layers slowed, levelled | 2026-11-26 | candidate |
| `audio/sfx/cloth_move.flac` | generated locally | Stability AI Community License | Stable Audio 3.0 Small (Stability AI) | yes, while annual revenue is under USD 1M | cut, levelled | 2026-11-26 | candidate |
| `audio/sfx/crowd_presence.flac` | generated locally, with one CC0 cough through the hall impulse | Stability AI Community License + CC0 1.0 | Stable Audio 3.0 Small (Stability AI); qubodup (Freesound 743360) | yes, while annual revenue is under USD 1M | cut, looped by cross-fade, one knock turned down | 2026-11-26 | candidate |
| `audio/sfx/gloved_applause.flac` | generated locally, through the hall impulse | Stability AI Community License | Stable Audio 3.0 Small (Stability AI) | yes, while annual revenue is under USD 1M | cut, clap peaks limited, reverb added, levelled | 2026-11-26 | candidate |
| `audio/choir/choir_1_mixed_sustained.flac` | generated locally | Stability AI Community License | Stable Audio 3.0 Small (Stability AI) | yes, while annual revenue is under USD 1M | cut, high-pass 30 Hz, levelled | 2026-11-26 | candidate |
| `audio/choir/choir_2_low_men_drone.flac` | generated locally | Stability AI Community License | Stable Audio 3.0 Small (Stability AI) | yes, while annual revenue is under USD 1M | cut, high-pass 30 Hz, levelled | 2026-11-26 | candidate |
| `audio/choir/choir_3_humming.flac` | generated locally | Stability AI Community License | Stable Audio 3.0 Small (Stability AI) | yes, while annual revenue is under USD 1M | cut, high-pass 30 Hz, levelled | 2026-11-26 | candidate |

## Sources and licences

- **Stable Audio 3.0 Small SFX** and **Stable Audio 3.0 Small Music** (Stability AI), q8_0 GGUF conversions from
  `audio-cpp/audio.cpp-gguf` on Hugging Face, run locally on CPU with audio.cpp (Apache-2.0, github.com/0xShug0/audio.cpp;
  weights fetched with Soundbox/Mirli, MIT, github.com/HamSanders/soundbox). Output is under the **Stability AI
  Community License** (https://stability.ai/license): free for commercial use while annual revenue is under
  USD 1M; above that an Enterprise licence is needed. No key, no credits, nothing paid.
- **Original synthesis** in `tools/sfx_make.py` (numpy/scipy): no third-party material; belongs to the production.
- **CC0 recordings from Freesound**, already committed in this repository at `claude-film/one-too-many/audio/sfx/`
  (credit not required, given anyway):
  - "House_Creak_2.wav" by SholeColtis, https://freesound.org/people/SholeColtis/sounds/683416/ (in `rope_creak`)
  - "55_Coger_Foto.wav (Sliding Paper)" by Atrius1, https://freesound.org/people/Atrius1/sounds/470189/ (in `paper_handling`)
  - "Strong Double Cough" by qubodup, https://freesound.org/people/qubodup/sounds/743360/ (in `crowd_presence`)
- **earshot** catalogue designs (`earshot make`, earshot 1.0.0, MIT, github.com/Leonxlnx/earshot): `chain/rattle`
  (in `chains_slack`) and `paper/page` (in `paper_handling`). earshot computes these from numbers learned from
  public-domain recordings; no audio file ships with it.
- The choir candidates are wordless and generated: no text and no existing work was given to the model. Whether any
  of them resembles an existing piece can only be judged by ear; earshot cannot name works.
- Not used: fal, Lyria, ElevenLabs or any other paid service. Freesound itself (the proxy refused the host) and the
  opus-sound-layer library (its GitHub repository could not be cloned) were not reachable from the build machine on
  25 November 2026, so the only recordings are the three above, taken from this repository.

- `audio/sfx/wind_vale.flac`: ground wind for Anvil Vale. Original, synthesized by `tools/sfx_make.py` (`synth_wind_altitude`, seed 31, resonances 170 to 700 Hz), 26 November 2026. No samples, no service.
