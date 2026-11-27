export const meta = {
  name: 'stage-loop',
  description: 'Build each stage with an agent, then critique and fix it in a loop until it reaches a fern / professional bar (max 3 critiques)',
  phases: [
    { title: 'Build', detail: 'one builder agent per stage (renders queue through shoot.py)' },
    { title: 'Critique', detail: 'independent critic scores the final frames against the fern / pro bar' },
    { title: 'Fix', detail: 'fixer applies the critique and re-renders' },
  ],
}

const ROOT = '/home/user/cines-engine/claude-youtube/prize-that-became-a-prison'
const BRIEF = `${ROOT}/scenes/AGENT_BRIEF.md`
const MAX_CRITIQUES = 3
const STAGES = args.stages

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    cameras: { type: 'array', items: { type: 'object', properties: {
      name: { type: 'string' }, beat: { type: 'string' }, graded_path: { type: 'string' }, raw_path: { type: 'string' } },
      required: ['name', 'beat', 'graded_path'] } },
    changes: { type: 'string' },
    weaknesses: { type: 'array', items: { type: 'string' } },
    helper_issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['cameras', 'changes', 'weaknesses'],
}

const CRIT_SCHEMA = {
  type: 'object',
  properties: {
    scores: { type: 'object', properties: {
      composition: { type: 'number' }, lighting: { type: 'number' }, materials: { type: 'number' },
      set_dressing: { type: 'number' }, grounding_scale: { type: 'number' }, cast: { type: 'number' },
      story_read: { type: 'number' }, technical: { type: 'number' } },
      required: ['composition', 'lighting', 'materials', 'set_dressing', 'grounding_scale', 'cast', 'story_read', 'technical'] },
    pro_level: { type: 'boolean' },
    verdict: { type: 'string' },
    fixes: { type: 'array', items: { type: 'object', properties: {
      priority: { type: 'number' }, camera: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } },
      required: ['priority', 'problem', 'fix'] } },
  },
  required: ['scores', 'pro_level', 'verdict', 'fixes'],
}

function buildPrompt(s) {
  return `You are the stage agent for "${s.name}" in the documentary "The Prize That Became a Prison".
Read the shared brief first and follow it exactly, including its "Lessons from the first critiques": ${BRIEF}

Your stage: scenes/stages/${s.name}.py (under ${ROOT}). Create it; scenes/stages/inspection_room.py,
checkin_hall.py and departure_gate.py are working examples (read, do not edit them; you may copy useful code into your
own module).
What it must show: ${s.beats}
Cameras to deliver (you may add one): ${s.cameras}

Goal: frames that would sit in a fern documentary and read as professional CG, in this film's look (cinematic
investigative noir, desaturated blue institutional light, deep shadows, a lit island in the dark, matte stone statue
people). Work like the reference films' part agents: a complete, correct, good-looking version first, then realism:
bevels that catch light, believable materials with roughness variation and wear, contact shadows and grounding,
motivated practical lights, restrained set dressing that tells you where you are, clean silhouettes, and compositions
with a clear subject. Check every render critically against the brief and fix what you see.

Deliver final frames for every camera at --res 1280x720 --spp 64 named final_<cam>.png in out/stages/${s.name}/
(shoot.py writes final_<cam>_graded.png beside each). Return the structured report: for each camera its beat and the
graded and raw paths, what you built, known weaknesses, helper problems.`
}

function critiquePrompt(s, frames, round) {
  const list = frames.map(f => `- ${f.name} (${f.beat}): ${f.graded_path}`).join('\n')
  return `You are an independent, demanding reviewer of CG frames for a YouTube documentary. You did not make them.
Read ${BRIEF} (the film, the look, the hard rules, the lessons) and ${ROOT}/design/REFERENCES.md (what fern's films do).
For a professional CG bar, look at a few stills from the reference Blender films: /home/user/leonxlnx/koi-pond-keycap/out/stills/
and /home/user/leonxlnx/cube-to-cafe-racer/media/stills.jpg (a different, high-key look: judge craft, not style).

Stage: ${s.name} — ${s.beats}
Final graded frames to review (open every one with the Read tool; also open the raw .png beside each if colour or noise
is in doubt):
${list}

Score each 1-10 for the stage as a whole: composition (clear subject, framing, depth, camera grammar of the film),
lighting (motivated, contrast, falloff, no flat fill, no clipping, deep but readable shadows), materials (believable,
no plastic CG sheen, bevels, wear), set_dressing (believable density, tells the place, restrained), grounding_scale
(contact, no floating or intersecting, real sizes), cast (statue people posed believably, no clipping, clothes; if
the stage has no people, score how well the absence is staged), story_read (does each frame carry its beat), technical
(noise, fireflies, aliasing, haze speckle). Set pro_level true only if it would sit in a fern film without looking
amateur. Be specific and harsh; do not round up. Then list the fixes that would raise it most, highest priority first
(1 = must), each tied to a camera where it applies, with a concrete instruction a Blender Python author can act on
(what object, what change, roughly what values). This is critique round ${round}. Do not edit files or render.`
}

function fixPrompt(s, frames, crit, round) {
  const fixes = crit.fixes.map(f => `[P${f.priority}]${f.camera ? ' (' + f.camera + ')' : ''} ${f.problem} -> ${f.fix}`).join('\n')
  return `You are the stage agent for "${s.name}" in the documentary "The Prize That Became a Prison", round ${round} of fixes.
Read the shared brief first and follow it exactly: ${BRIEF}
Your module: scenes/stages/${s.name}.py (under ${ROOT}), plus any scenes/stages/${s.name}_*.py helpers. What it must show: ${s.beats}

An independent reviewer scored the current final frames ${JSON.stringify(crit.scores)} and said: ${crit.verdict}
Their fixes, highest priority first:
${fixes}

Apply them, the P1 items first, verifying each with preview renders (--res 960x540 --spp 24, --nocast where the cast
is not involved). Use your judgement where a fix conflicts with the brief or the look, and say so. Then re-render every
camera as final_<cam>.png at --res 1280x720 --spp 64 in out/stages/${s.name}/ (overwrite). Return the structured
report with the final graded paths.`
}

function passes(c) {
  const v = Object.values(c.scores)
  const mean = v.reduce((a, b) => a + b, 0) / v.length
  return { ok: c.pro_level && Math.min(...v) >= 6 && mean >= 7.5, mean: Math.round(mean * 10) / 10, min: Math.min(...v) }
}

async function runStage(s) {
  let rep = await agent(buildPrompt(s), { label: `build:${s.name}`, phase: 'Build', schema: BUILD_SCHEMA })
  if (!rep) return { stage: s.name, error: 'builder failed' }
  const history = []
  for (let round = 1; round <= MAX_CRITIQUES; round++) {
    const crit = await agent(critiquePrompt(s, rep.cameras, round), { label: `critique:${s.name}#${round}`, phase: 'Critique', schema: CRIT_SCHEMA, effort: 'high' })
    if (!crit) break
    const p = passes(crit)
    history.push({ round, scores: crit.scores, mean: p.mean, min: p.min, pro_level: crit.pro_level, verdict: crit.verdict, fixes: crit.fixes.length })
    log(`${s.name}: critique ${round} mean ${p.mean}, min ${p.min}, pro ${crit.pro_level}${p.ok ? ' — PASSED' : ''}`)
    if (p.ok) return { stage: s.name, passed: true, rounds: history, report: rep, last_critique: crit }
    if (round === MAX_CRITIQUES) {
      log(`${s.name}: stopped after ${MAX_CRITIQUES} critiques without passing; last fixes not applied`)
      return { stage: s.name, passed: false, rounds: history, report: rep, last_critique: crit }
    }
    const fixed = await agent(fixPrompt(s, rep.cameras, crit, round), { label: `fix:${s.name}#${round}`, phase: 'Fix', schema: BUILD_SCHEMA })
    if (fixed) rep = fixed
  }
  return { stage: s.name, passed: false, rounds: history, report: rep }
}

const results = await pipeline(STAGES, s => runStage(s))
return results
