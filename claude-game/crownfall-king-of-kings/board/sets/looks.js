// The colour keys (bible pp.4-10, BREAKDOWN §6 key strips). One per scene key; sets pick one as their default and a
// shot may switch with state.look = 'name' or override any field with state.look = {base: 'name', fog: {...}}.
// All colours are sRGB hex from the bible's palette. Directions point FROM the scene TOWARD the light.
//   sky: zenith/mid/horizon gradient (+ ground below the horizon), optional sun disc and a sun-side sky lift
//   fog: exponential distance fog (colour = the horizon, so the world fades into the sky), sun in-scatter
//   haze: a ground layer that thickens toward the floor (amount per metre, base height, falloff in metres)
//   key: the one hard source; fill: the low hemisphere fill (sky colour, ground colour); rim: back-light edge
//   dust: falling motes ('fall'), falling streaks ('streak'), hanging motes ('drift'), or 'none'
export const LOOKS = {
  // 1 THE FOUNDRY (p.5): furnace glow from below, one violet seam; nine-tenths black; copper lit from one side
  foundry: {
    palette: ['#0C0907', '#3B2415', '#B66A35', '#B9BEC3', '#7C4DF0'],
    sky: { zenith: '#070504', mid: '#0c0806', horizon: '#160e09', ground: '#0a0705' },
    fog: { color: '#120b07', density: 0.03 },
    haze: { amount: 0.05, base: 0, falloff: 2.2, color: '#3B2415' },
    key: { color: '#ffa860', intensity: 1.1, dir: [-1, 0.2, 0.45], soft: 2 },
    fill: { sky: '#120c08', ground: '#5a2c12', intensity: 0.12 },
    rim: { color: '#B66A35', strength: 0.35, power: 3 },
    exposure: 1, grain: 0.035,
    dust: { mode: 'drift', color: '#6b4126', opacity: 0.35, px: 1.4, count: 700, size: [30, 14, 30] },
  },
  // 2 THE FALLEN GATE (p.5): pre-dawn sky, amber lamps, the white truce lamp; two-thirds sky; soft, low contrast
  predawn: {
    palette: ['#1C2731', '#374651', '#8D9797', '#E08A3A', '#F2F4F1'],
    sky: { zenith: '#1a242d', mid: '#2B3640', horizon: '#4f5c64', ground: '#1C2731', midAt: 0.12, topAt: 0.5,
      band: { color: '#8D9797', amount: 0.7, width: 0.004 } },
    fog: { color: '#4b5860', density: 0.00034 },
    haze: { amount: 0.0005, base: 0, falloff: 40, color: '#4f5c64' },
    key: { color: '#9aa9b4', intensity: 0.55, dir: [0.35, 0.55, -0.8], soft: 4 },
    fill: { sky: '#5d6d79', ground: '#141b21', intensity: 0.75 },
    exposure: 1, grain: 0.03,
    dust: { mode: 'none' },
  },
  // 3 THE HELD STONE (p.6): flat pre-dawn light through dust, no hard shadows; falling dust streaks
  heldStone: {
    palette: ['#474E56', '#787D7F', '#A9ABA4', '#1B1C1E', '#D7D8D2'],
    sky: { zenith: '#6f7477', mid: '#8f9291', horizon: '#A9ABA4', midAt: 0.1, topAt: 0.5 },
    fog: { color: '#9c9e99', density: 0.0105 },
    haze: { amount: 0.03, base: 0, falloff: 3, color: '#8b8e8b' },
    key: { color: '#c4c8c8', intensity: 0.25, dir: [0.25, 1, 0.4], soft: 10 },
    fill: { sky: '#b9bcba', ground: '#3d4247', intensity: 1.25 },
    exposure: 1, grain: 0.035,
    dust: { mode: 'streak', color: '#D7D8D2', opacity: 0.55, speed: 2.2, streak: 0.55, count: 1800, size: [14, 12, 12], drift: 0.05 },
  },
  // 4 THE GATEHOUSE (p.6): the breach is the only source, about two stops under; the envoy reads pale, Cael black
  gatehouse: {
    palette: ['#0A0A0C', '#424445', '#A3A9A9', '#8A8C88', '#D8CFB8'],
    sky: { zenith: '#868d90', mid: '#9aa0a0', horizon: '#A3A9A9', midAt: 0.15, topAt: 0.6 },
    fog: { color: '#a0a6a6', density: 0.00125 },
    haze: { amount: 0.012, base: 0, falloff: 5, color: '#8A8C88' },
    key: { color: '#c7cdce', intensity: 1.6, dir: [0.42, 0.42, -1], soft: 4 },
    fill: { sky: '#3a3d3f', ground: '#0c0c0e', intensity: 0.07 },
    exposure: 1, grain: 0.05,
    dust: { mode: 'fall', color: '#a3a9a9', opacity: 0.25, px: 1.2, speed: 0.25, count: 500, size: [10, 6, 10] },
  },
  // 5 "BREAK THE CROWN!" (p.7): sky and gun-flash that clips to white for a frame; slate
  breakCrown: {
    palette: ['#161D26', '#2E3A44', '#5D696E', '#FF8A2E', '#FFF3D0'],
    sky: { zenith: '#151c25', mid: '#26313b', horizon: '#56636a', ground: '#161D26', midAt: 0.1, topAt: 0.45 },
    fog: { color: '#4a565d', density: 0.0005 },
    haze: { amount: 0.0006, base: 0, falloff: 30, color: '#2E3A44' },
    key: { color: '#8b9aa6', intensity: 0.35, dir: [0.3, 0.5, -0.8], soft: 4 },
    fill: { sky: '#4c5964', ground: '#0e1318', intensity: 0.55 },
    exposure: 1, grain: 0.03,
    dust: { mode: 'none' },
  },
  // 6 THE OPEN HAND (p.7 and cover): gun-flash behind him, the fire in the Crown; pure silhouette, no fill
  burning: {
    palette: ['#050303', '#5B2C14', '#C96A25', '#E69A45', '#FFF6DD'],
    sky: { zenith: '#3e1d0e', mid: '#7a3a17', horizon: '#c06326', ground: '#5B2C14', midAt: 0.1, topAt: 0.42 },
    fog: { color: '#a9551f', density: 0.0011, sun: { amount: 0.45, color: '#E69A45' } },
    haze: { amount: 0.02, base: 0, falloff: 20, color: '#d07a35' },
    key: { color: '#ff9c50', intensity: 1.1, dir: [0.05, 0.25, -1], soft: 3 },
    fill: { sky: '#3a1a0c', ground: '#120805', intensity: 0.08 },
    rim: { color: '#E69A45', strength: 1.3, power: 3 },
    sun: { dir: [0, 0.22, -1] },
    exposure: 1, grain: 0.035,
    dust: { mode: 'drift', color: '#e0a060', opacity: 0.3, px: 1.3, count: 600 },
  },
  // 7 THE FALL (p.8): sky through rising dust; the cloud is lit from above; ochre enters the film
  fall: {
    palette: ['#3B4146', '#6F6D66', '#3A3227', '#8F7D5F', '#D9C69C'],
    sky: { zenith: '#3B4146', mid: '#5a5b57', horizon: '#8F7D5F', midAt: 0.12, topAt: 0.5 },
    fog: { color: '#857559', density: 0.0016 },
    haze: { amount: 0.006, base: 0, falloff: 40, color: '#8F7D5F' },
    key: { color: '#e6d2a4', intensity: 1.0, dir: [0.2, 1, 0.25], soft: 5 },
    fill: { sky: '#6F6D66', ground: '#2a241c', intensity: 0.6 },
    exposure: 1, grain: 0.035,
    dust: { mode: 'fall', color: '#B59A6A', opacity: 0.35, speed: 0.5, px: 1.6, count: 900 },
  },
  // 8 THE RUINS AT SUNRISE (p.8): low sun through dust, the first direct sunlight; long shadows, warm highlights
  sunrise: {
    palette: ['#4D5761', '#8B8A84', '#ECD29A', '#6C6557', '#1B1917'],
    sky: { zenith: '#465059', mid: '#77797a', horizon: '#b2a88e', ground: '#6C6557', midAt: 0.07, topAt: 0.42,
      sun: { dir: [0.12, 0.035, -1], disc: 1, size: 0.75, color: '#fff3d6', glow: 0.55, glowPow: 14 } },
    fog: { color: '#958f80', density: 0.00085, sun: { amount: 0.75, color: '#e8cf98' } },
    haze: { amount: 0.008, base: 0, falloff: 14, color: '#6C6557' },
    key: { color: '#ECD29A', intensity: 2.4, dir: [0.12, 0.06, -1], soft: 2 },
    fill: { sky: '#70757b', ground: '#2a2621', intensity: 0.5 },
    rim: { color: '#ECD29A', strength: 0.8, power: 3.5 },
    exposure: 1, grain: 0.03,
    dust: { mode: 'drift', color: '#d9c69c', opacity: 0.3, px: 1.3, count: 700, speed: 0.04 },
  },
  // 9 THE FIRST SHIP (p.9): the sun behind the ship; gold on its upper edge, shadow under it
  ship: {
    palette: ['#0D0E10', '#2B2D31', '#B9BEC3', '#F3C77A', '#CDB88C'],
    sky: { zenith: '#4a4c4e', mid: '#7a7468', horizon: '#c9b48a', ground: '#3a352d', midAt: 0.08, topAt: 0.45,
      sun: { dir: [-0.1, 0.03, -1], disc: 1, size: 0.75, color: '#fff2cf', glow: 0.6, glowPow: 12 } },
    fog: { color: '#9c907a', density: 0.0007, sun: { amount: 0.8, color: '#F3C77A' } },
    haze: { amount: 0.008, base: 0, falloff: 16, color: '#5f574a' },
    key: { color: '#F3C77A', intensity: 2.2, dir: [-0.1, 0.06, -1], soft: 2 },
    fill: { sky: '#615e58', ground: '#1e1b17', intensity: 0.45 },
    rim: { color: '#F3C77A', strength: 1.1, power: 4 },
    exposure: 1, grain: 0.03,
    dust: { mode: 'drift', color: '#CDB88C', opacity: 0.25, px: 1.3, count: 600, speed: 0.04 },
  },
  // 10 THE WARD (p.9): bars of sunrise through the rigging; violet from the keel on the survivors, gold elsewhere
  ward: {
    palette: ['#0A0A0D', '#7D7466', '#FFD48A', '#7C4DF0', '#FFFFFF'],
    sky: { zenith: '#5e5a52', mid: '#8a8170', horizon: '#c6b48c', ground: '#4a443b', midAt: 0.08, topAt: 0.45,
      sun: { dir: [0.05, 0.03, -1], disc: 0, size: 0.75, color: '#fff2cf', glow: 0.45, glowPow: 10 } },
    fog: { color: '#a09480', density: 0.0012, sun: { amount: 0.6, color: '#FFD48A' } },
    haze: { amount: 0.01, base: 0, falloff: 10, color: '#7D7466' },
    key: { color: '#FFD48A', intensity: 2.2, dir: [-0.45, 0.35, -1], soft: 2 },
    fill: { sky: '#5e5850', ground: '#1a1815', intensity: 0.35 },
    rim: { color: '#FFD48A', strength: 0.7, power: 4 },
    exposure: 1, grain: 0.03,
    dust: { mode: 'drift', color: '#e2cc98', opacity: 0.35, px: 1.4, count: 900, speed: 0.04 },
  },
  // 10 THE BANNERS (p.10): low sun under the fleet; amber points where the housings open; red at last
  banners: {
    palette: ['#0B0B0D', '#5A564E', '#ECD29A', '#8E1B1B', '#FFC070'],
    sky: { zenith: '#3e3c38', mid: '#6e695f', horizon: '#c7b58d', ground: '#3a362f', midAt: 0.08, topAt: 0.45,
      sun: { dir: [0.0, 0.03, -1], disc: 1, size: 0.7, color: '#fff2d2', glow: 0.55, glowPow: 12 } },
    fog: { color: '#958a76', density: 0.0005, sun: { amount: 0.8, color: '#ECD29A' } },
    haze: { amount: 0.008, base: 0, falloff: 14, color: '#5A564E' },
    key: { color: '#ECD29A', intensity: 2.2, dir: [0.0, 0.06, -1], soft: 2 },
    fill: { sky: '#5f5b55', ground: '#1a1815', intensity: 0.45 },
    rim: { color: '#ECD29A', strength: 0.9, power: 4 },
    exposure: 1, grain: 0.03,
    dust: { mode: 'drift', color: '#d9c69c', opacity: 0.25, px: 1.3, count: 600, speed: 0.04 },
  },
  // 9.3 INSIDE THE HULL: the foundry's framing, iron ribs, gold light through the plating
  hull: {
    palette: ['#0D0E10', '#2B2D31', '#B9BEC3', '#F3C77A', '#B66A35'],
    sky: { zenith: '#070708', mid: '#0b0b0c', horizon: '#141310', ground: '#08080a' },
    fog: { color: '#15130f', density: 0.035 },
    haze: { amount: 0.04, base: 0, falloff: 2.5, color: '#2B2D31' },
    key: { color: '#F3C77A', intensity: 2.0, dir: [-1, 0.35, 0.4], soft: 2 },
    fill: { sky: '#151619', ground: '#2a2116', intensity: 0.12 },
    rim: { color: '#F3C77A', strength: 0.35, power: 3 },
    exposure: 1, grain: 0.035,
    dust: { mode: 'drift', color: '#9a8058', opacity: 0.3, px: 1.3, count: 700, size: [30, 14, 30] },
  },
};
