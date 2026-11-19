/* Which sound plays each score cue. "code" = the engine plays it (sounds that are synthetic in life, or score; with
   "engine" the engine plays that recording at the film's designed level instead: story beats the mixer's
   just-audible levelling would bury, the scream and the kitchen crashes);
   anything else is placed by the opus-sound-layer mixer from tools/cuesheet.py: "sfx:NAME" = audio/sfx/NAME.flac (CC0
   recordings, credits in audio/CREDITS.md), "lib:TYPE/ID" = the opus-sound-layer library, "a+b" layers, a list rotates.
   "none" = left out of the film everywhere. weight: support | hero (hero_from: only from that level up). Expansion rules (n / gap repeats, landings per word, swell / whoosh alignment) are in tools/cuesheet.py. */
window.FILM_SFX = {
  // beds taken out of the film: the party crowd's walla read as people chanting; the music carries the room instead
  beds_off: ["walla", "Q04.walla", "Q05.walla", "Q06.walla", "Q07.tail"],
  cues: {
  "ping": { "sound": "code" }, "dtmf": { "sound": "code" }, "ringback": { "sound": "code" }, "whine": { "sound": "code" },
  "buzz": { "sound": "code" }, "Q07.ring": { "sound": "code" }, "Q09.die": { "sound": "code" }, "Q08.seventh": { "sound": "code" },
  "Q12.pickup": { "sound": "code" }, "Q10.fridge": { "sound": "code" }, "Q02.out": { "sound": "code" }, "Q12.siren": { "sound": "code" },
  "land.voice": { "sound": "code" },

  "land.scott":      { "sound": ["lib:key/fs-194795-vintage-keyboard-1-1", "lib:key/fs-194797-vintage-keyboard-3-1", "lib:key/fs-194795-vintage-keyboard-1-2", "lib:key/fs-194796-vintage-keyboard-2-1"], "per": "once" },
  "land.angelo":     { "sound": ["sfx:tap1", "sfx:tap2", "sfx:tap3"] },
  "land.deena":      { "sound": ["sfx:stamp2", "sfx:stamp1"] },
  "land.kay":        { "sound": ["lib:chime/fs-404104-glass-ding-1", "lib:chime/fs-404104-glass-ding-2"], "at": "dur0.8" },
  "land.christof":   { "sound": ["lib:tick/fs-130388-clock-ticking-1", "lib:tick/fs-130388-clock-ticking-2", "lib:tick/fs-130388-clock-ticking-3"], "at": "dur0.5" },
  "land.marina":     { "sound": ["lib:chime/fs-127149-ding-wav-1"], "at": "dur1" },
  "land.dispatcher": { "sound": ["sfx:latch2"] },

  "lub": { "sound": ["sfx:beat+lib:thump/fs-496187-light-body-thud-on-clothing-1", "sfx:beat2+lib:thump/fs-496187-light-body-thud-on-clothing-1"] },
  "Q05.lub": { "sound": ["sfx:beat+lib:thump/fs-496187-light-body-thud-on-clothing-1"] }, "Q07.lub": { "sound": ["sfx:beat2+lib:thump/fs-496187-light-body-thud-on-clothing-1"] },
  "slap": { "sound": ["sfx:card_slap1", "sfx:card_slap2", "sfx:card_slap3"] },
  "flick": { "sound": ["sfx:card_flick1", "sfx:card_flick2", "sfx:card_flick3", "sfx:card_flick4", "sfx:card_flick5"] },
  "Q05.dealq": { "sound": ["sfx:card_flick1", "sfx:card_flick2", "sfx:card_flick4"], "then": { "dt": 0.3, "sound": ["sfx:card_slap1", "sfx:card_slap2", "sfx:card_slap3"] } },
  "riffle": { "sound": ["sfx:riffle"], "align": "start" },
  "Q09.step": { "sound": ["sfx:step1", "sfx:step2", "sfx:step3", "sfx:step4"] }, "Q06.step": { "sound": ["sfx:step2", "sfx:step4", "sfx:step1", "sfx:step3"] },
  "Q11.step": { "sound": ["sfx:step3", "sfx:step1", "sfx:step4"] }, "Q02.step": { "sound": ["sfx:step4", "sfx:step2"] },
  "Q02.crisp": { "sound": ["sfx:crisp1", "sfx:crisp2", "sfx:crisp3"] }, "Q02.rustle": { "sound": ["sfx:rustle"], "align": "start" },
  "Q02.tink": { "sound": ["sfx:clink4", "sfx:clink3"] }, "Q02.clink": { "sound": ["sfx:clink1"] }, "Q04.clink": { "sound": ["sfx:clink1", "sfx:clink2", "sfx:clink3"] }, "Q05.clink": { "sound": ["sfx:clink2", "sfx:clink4"] },
  "Q02.tick": { "sound": ["sfx:tick1", "sfx:tock1", "sfx:tick2"] }, "Q04.tick": { "sound": ["sfx:tick2"] }, "Q04.tock": { "sound": ["sfx:tock1"] },
  "Q02.stamp": { "sound": ["sfx:stamp2+sfx:stamp1"], "weight": "hero" },
  "Q02.slide": { "sound": ["sfx:slide"] }, "Q02.burn": { "sound": ["sfx:burn"], "align": "start" },
  "Q02.type": { "sound": ["sfx:typeburst"], "align": "start" },
  "Q03.laugh": { "sound": "none" }, "Q04.laugh": { "sound": "none" },
  "Q05.laugh": { "sound": "none" }, "Q06.laugh": { "sound": "none" },
  "Q05.chair": { "sound": ["sfx:chair1", "sfx:chair2"], "align": "start" }, "Q06.chair": { "sound": ["sfx:chair2"], "align": "start" }, "Q08.chair": { "sound": ["sfx:chair1", "sfx:chair2"], "align": "start" },
  "Q05.press": { "sound": ["sfx:tap2", "sfx:tap3"] }, "Q05.tap": { "sound": ["sfx:tap1", "sfx:tap3"] },
  "Q09.cloth": { "sound": ["sfx:cloth1", "sfx:cloth2"] }, "Q11.scuff": { "sound": ["sfx:cloth2", "sfx:cloth1"] },
  "Q11.cough": { "sound": ["sfx:cough1", "sfx:cough2"] }, "Q11.sob": { "sound": ["sfx:sob"], "align": "start" },
  "Q11.wheel": { "sound": ["sfx:wheel1", "sfx:wheel2"] }, "Q11.flare": { "sound": ["sfx:flare"], "align": "start" },
  "Q11.smother": { "sound": ["sfx:bodyfall"] },
  "Q04.wipe": { "sound": ["sfx:wipe"], "repeat": true },
  "latch": { "sound": ["sfx:latch1", "sfx:latch2"] }, "Q06.farLatch": { "sound": ["sfx:latch1"] }, "click2": { "sound": ["sfx:latch2"] },
  "knock": { "sound": ["sfx:knock1", "sfx:knock2", "sfx:knock3"], "repeat": true },
  "doorbell": { "sound": ["sfx:doorbell"], "weight": "hero" },
  "Q07.cork": { "sound": ["sfx:cork"] }, "Q07.pour": { "sound": ["sfx:pour"], "align": "start" },
  "glass": { "sound": ["sfx:glass1", "sfx:glass2"] },
  "crash": { "sound": "code", "engine": "sfx:crash1+sfx:glass2" },
  "boom": { "sound": ["sfx:explosion+lib:boom/fs-636624-deep-hit-2"], "weight": "hero", "hero_from": -3 },
  "gasp": { "sound": ["sfx:gasp"] }, "scream": { "sound": "code", "engine": "sfx:scream" },
  "tear": { "sound": ["sfx:tear"] }, "drip": { "sound": ["sfx:drip1", "sfx:drip2"] }, "shutter": { "sound": ["sfx:shutter"] },
  "stove": { "sound": ["sfx:stove"], "align": "start" }, "ovendoor": { "sound": ["sfx:oven_door+lib:thump/fs-675927-s03-22-two-body-falls-on-woo-2"], "weight": "hero" },
  "Q10.knife": { "sound": ["sfx:knife"] }, "Q10.flutter": { "sound": ["sfx:flutter"], "align": "start" }, "Q12.creak": { "sound": ["sfx:creak"], "align": "start" },
  "scrape": { "sound": ["sfx:wheel2", "sfx:wheel1"] }, "spark": { "sound": ["sfx:lighter_on"] },
  "Q01.smash": { "sound": ["lib:thump/fs-389665-thump-close-wav-2+lib:hit/fs-558238-distorted-impact-short-wav-1"], "weight": "hero" },
  "Q01.slice": { "sound": ["lib:paper/fs-484920-page-slides-1-3"] },
  "Q08.slip": { "sound": ["sfx:card_flick3"] }, "Q08.release": { "sound": ["sfx:card_slap2"] },
  "hit": { "sound": ["lib:hit/fs-113748-kl-ex1c-wav-3"], "small": ["lib:thump/fs-389665-thump-close-wav-2"], "weight": "hero" },
  "thump": { "sound": ["lib:thump/fs-389665-thump-close-wav-2", "lib:thump/fs-496187-light-body-thud-on-clothing-1"] },
  "whoosh": { "sound": ["lib:whoosh/fs-30240-swoop1-flac-1", "lib:whoosh/fs-30241-swoop2g-flac-1"], "at": "dur0.8" },
  "swell": { "sound": ["lib:reverse/fs-148930-cymbal-hits-reversed-wav-1"], "long": ["lib:reverse/fs-244837-rev-cymb-23-wav-1"], "align": "end", "at": "dur1" },
  "tally": { "sound": ["lib:tick/fs-188033-ticking-clock-1"] }, "Q03.tally": { "sound": ["lib:tick/fs-130388-clock-ticking-1", "lib:tick/fs-130388-clock-ticking-2"] },
  "Q07.tally": { "sound": ["lib:tick/fs-130388-clock-ticking-1", "lib:tick/fs-130388-clock-ticking-3"] }, "Q09.tally": { "sound": ["lib:tick/fs-130388-clock-ticking-2"] },
  "Q12.tally": { "sound": ["lib:tick/fs-130388-clock-ticking-1"] }
} };
