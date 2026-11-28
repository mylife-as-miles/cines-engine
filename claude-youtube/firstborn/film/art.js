/* FIRSTBORN IN AN AFRICAN HOME — the art adapter (global ART). Sequences never call the kits directly: they call c.set /
   c.setFront / c.fig / c.prop, which use the real art when it is loaded (SETS from kit/sets.js, POV.figure from kit/pov.js) and
   draw clean, labelled stand-ins when it is not, so the timeline always scrubs and the real art drops in without edits.

   c.set(name, opts)   -> SETS[name](g, opts) when the kit has it; else ART.PH_SETS[name] (film/fb.js: a labelled placeholder room
                          with the furniture the staging needs) or a kit set standing in (ART.SET_STANDIN, e.g. home -> living).
                          The shot's camera (c.camera) is handed to the set as opts.cam. Its anchors: c.anchor(set, name).
   c.setFront(name, o) -> SETS[name + 'Front'](g, o): what stands in front of the characters.
   c.fig(role, opts)   -> POV.figure(g, id, ...). role: hero | mum | dad | sister | brother | auntie | auntie2 | auntie3 | uncle |
                          uncle2 | cousin | cousin2 | neighbour, or any POV.CAST id. ART.ROLES maps a role to the kit's id (the first
                          candidate POV.CAST has, or POV.ROLES[role] when the kit exports that map); until the kit has one, a
                          stand-in of the same rig in the role's colours with a small name tag. opts.age: newborn | baby | toddler |
                          kid | teen (adult when absent): passed to the kit when it draws ages (ART.kitAges), else a smaller figure
                          (a swaddled bundle for newborn and baby). (x, y) is the ground point between the feet (the bundle's
                          bottom for a baby); s = 1 is an 800 px tall adult. Any option the engine does not know is passed through to
                          POV.figure unchanged (new kit options need no engine edit).
                          opts: x, y, s, face (1 right, -1 left), pose, expr, walk, phase, mouth, talk: [t0, t1], blink, blinks, nod,
                          look, turn (look/turn are relative to facing), hold, mode, seat, view, tint, shadow, alpha, dx, dy, tremble,
                          rot, marks, override, age, tag (false hides a stand-in's name tag). Returns the opts with A = the figure's
                          anchors in world space (head, headR, headTop, mouth, handL, handR).
                          poses: POV.POSES plus the engine's run, handup, stomach, peace, type, no, finger_up, push_away, hold_card,
                          sit_front/phone/laptop/stomach/handup, cheer, clap, carry, swoon, arms_up, load. */
(function (global) {
  'use strict';
  const FILM = global.FILM, W = FILM.WIDTH, H = FILM.HEIGHT;
  const setsKit = () => (typeof global.SETS !== 'undefined' && global.SETS) || null;
  const pov = () => (typeof global.POV !== 'undefined' && global.POV && typeof global.POV.figure === 'function') ? global.POV : null;
  const FONT = (global.SETS && global.SETS.FONT) || "'Nunito', 'Inter', 'Liberation Sans', system-ui, sans-serif";
  const INK = '#1c1c1c';
  const PAL = () => (global.POV && global.POV.C) || {};
  const ART = global.ART = { FONT, INK, placeholders: { set: {}, fig: {} } };

  // ---------------------------------------------------------------- anchors (world px): the kits' names, these values until a set reports its own
  const A = (x, y, s) => ({ x, y, s: s || 1 });
  ART.ANCHORS = {
    office: { left: A(318, 962), right: A(1618, 962), center: A(900, 962), desk: A(1186, 617), deskPhone: A(1265, 612), chair: A(1560, 760), floor: A(960, 962), door: A(318, 962), doorway: A(318, 962, 0.95), window: A(1552, 307), clock: A(960, 212), plant: A(704, 837) },
    living: { sofa: A(670, 742), sofa_seat_l: A(500, 742), sofa_seat_r: A(840, 742), table: A(1075, 848), tablePhone: A(1180, 846), door: A(1619, 975), window: A(527, 307), lamp: A(120, 326), plant: A(1275, 866), left: A(330, 990), right: A(1560, 990), center: A(960, 990), floor: A(960, 990) },
    street: { left: A(640, 975), right: A(1280, 975), center: A(960, 975), floor: A(960, 975), tree: A(380, 640), post: A(150, 700) },
    plain: { center: A(960, 540), floor: A(960, 1080) },
    party: { left: A(480, 985), center: A(800, 985), right: A(1560, 985), table: A(1310, 636), behindTable: A(1310, 930, 0.95), floor: A(960, 985) },
    mumKitchen: { center: A(960, 985), left: A(600, 985), right: A(1320, 985), counter: A(960, 620), window: A(1000, 285), island: A(960, 836), floor: A(960, 985) },
    friendFlat: { center: A(960, 985), left: A(640, 985), right: A(1300, 985), window: A(1510, 335), boxes: A(280, 600), floor: A(960, 985) },
    // Firstborn's sets (the stand-ins' marks; a real set's own anchors win)
    maternity: { cot: A(860, 652), cotFloor: A(860, 940), parentL: A(545, 975), parentR: A(1175, 975), left: A(520, 985), right: A(1400, 985), window: A(1450, 330), center: A(960, 985), floor: A(960, 985) },
    home: { sofaL: A(820, 738), sofaM: A(935, 738), sofaR: A(1050, 738), armchair: A(280, 738), tv: A(1440, 598), tvFront: A(1440, 985), door: A(1730, 968, 0.98), doorway: A(1772, 900, 0.9),
      table: A(935, 862), fan: A(532, 440), clock: A(935, 116), photos: A(935, 282), left: A(330, 990, 1.02), right: A(1500, 990, 1.02), center: A(960, 990, 1.02), floor: A(960, 990) },
    kitchen: { center: A(960, 985), left: A(600, 985), right: A(1320, 985), counter: A(960, 620), table: A(960, 800), floor: A(960, 985) },
    shop: { counter: A(1150, 700), seller: A(1150, 940, 0.95), left: A(500, 985), right: A(1500, 985), center: A(960, 985), floor: A(960, 985) },
    school: { board: A(960, 380), stage: A(960, 760), left: A(480, 985), right: A(1440, 985), center: A(960, 985), floor: A(960, 985) },
    lifePath: { start: A(260, 930, 0.5), end: A(1700, 420, 0.32), center: A(960, 700, 0.42), floor: A(960, 985) },
    lab: { table: A(960, 720), left: A(460, 985), right: A(1460, 985), center: A(960, 985), floor: A(960, 985) },
    courtroom: { bench: A(1380, 560), judge: A(1380, 700, 0.9), witness: A(560, 985), center: A(960, 985), left: A(420, 985), right: A(1500, 985), floor: A(960, 985) },
    podium: { podium: A(960, 985), left: A(420, 985), right: A(1500, 985), center: A(960, 985), floor: A(960, 985) },
    bankCounter: { teller: A(960, 900, 0.95), counter: A(960, 640), queue: A(1250, 985), left: A(420, 985), right: A(1500, 985), center: A(960, 985), floor: A(960, 985) },
  };
  // c.anchor(set, name) -> {x, y, s} in world px: the set's own anchors (as it last reported them) or the defaults above
  ART.anchor = function (set, name, fb, c) {
    const r = c && c.sets && c.sets[set]; const a = r && r.anchorsSet && r.anchorsSet[name];
    if (a) return { x: a.x, y: a.y, s: a.s || 1 };
    const d = ART.ANCHORS[set] && ART.ANCHORS[set][name]; if (d) return Object.assign({}, d);
    if (fb) return Array.isArray(fb) ? A(fb[0], fb[1], fb[2]) : fb;
    FILM.warn('anchor ' + set + '.' + name + ' unknown'); return A(W / 2, H / 2);
  };

  // ---------------------------------------------------------------- sets
  function callSet(c, fn, o) {
    // hand the shot's camera to the set (it draws its cached layer at the zoom's resolution and clamps as c.camera does);
    // a split-screen half (dx/dy) or a rotated camera keeps the set under the current transform instead
    const cam = c._cam;
    if (cam && !cam.dx && !cam.dy && !cam.rot && cam.zoom >= 1) {
      c.reset(); const r = fn(c.g, Object.assign({}, o, { cam: { x: cam.x, y: cam.y, zoom: cam.zoom } })); c.camera(cam); return r;
    }
    return fn(c.g, o);
  }
  ART.set = function (c, name, o) {
    o = Object.assign({ t: c.t }, o); const S = setsKit(), fn = S && typeof S[name] === 'function' ? S[name] : null;
    if (fn) { try { const r = callSet(c, fn, o); if (r) c.sets[name] = r; return r; } catch (e) { FILM.warn('SETS.' + name + ': ' + e.message); } }
    // a kit set standing in for a set the kit does not have yet (home -> living): drawn, then a small 'stand-in' tag
    const sub = ART.SET_STANDIN[name], sf = sub && S && typeof S[sub.set] === 'function' ? S[sub.set] : null;
    ART.placeholders.set[name] = 1;
    if (sf) { try { const r = callSet(c, sf, Object.assign({}, sub.opts || {}, o)); if (r) c.sets[name] = r; standinTag(c, name + ' (stand-in: ' + sub.set + ')'); return r; } catch (e) { FILM.warn('SETS.' + sub.set + ' for ' + name + ': ' + e.message); } }
    const ph = ART.PH_SETS[name];
    if (ph) { try { const r = ph(c, o); if (r) c.sets[name] = r; return r; } catch (e) { FILM.warn('placeholder ' + name + ': ' + e.message); } }
    placeholderSet(c, name, o); return null;
  };
  // registries filled by film/fb.js: placeholder rooms, and kit sets standing in for missing ones
  ART.PH_SETS = {};
  ART.SET_STANDIN = {};
  ART.hasSet = name => { const S = setsKit(); return !!(S && typeof S[name] === 'function'); };
  // a small grey tag in the top-left corner naming a stand-in set (inside the 60 px margin's corner, out of the action)
  function standinTag(c, text) {
    const g = c.g; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.font = `800 22px ${FONT}`; const w = g.measureText(text).width + 24;
    g.fillStyle = 'rgba(28,28,28,.42)'; g.beginPath(); g.roundRect(14, 12, w, 34, 17); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, 26, 30); g.restore();
  }
  ART.standinTag = standinTag;
  ART.setFront = function (c, name, o) {
    o = Object.assign({ t: c.t }, o); const S = setsKit(), fn = S && typeof S[name + 'Front'] === 'function' ? S[name + 'Front'] : null;
    if (fn) { try { return callSet(c, fn, o); } catch (e) { FILM.warn('SETS.' + name + 'Front: ' + e.message); } }
    return null;
  };
  // the figure tint a set suggests for its light (the living room's evening multiply), or null
  ART.tintFor = function (c, name, k) {
    const r = c.sets[name]; if (!r || !r.tint) return null; k = k == null ? 0.2 : k;
    const n = parseInt(r.tint.slice(1), 16), m = v => Math.round(255 - (255 - v) * k);
    return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => m(v).toString(16).padStart(2, '0')).join('');
  };

  const TOD = { day: 0, morning: 0.05, evening: 0.18, dusk: 0.3, night: 0.5 };
  function placeholderSet(c, name, o) {
    const g = c.g, P = PAL();
    if (name === 'mumKitchen' && global.GFX) return global.GFX.kitchen(g);
    if (name === 'friendFlat' && global.GFX) return global.GFX.movingFlat(g);
    if (name === 'party') name = 'party';
    const key = 'ph|set|' + name + '|' + (o.tod || '') + '|' + (o.night ? 'n' : '') + '|' + (o.view || '');
    const cv = FILM.cache(key, (q) => {
      const box = (x, y, w, h, fill, lw) => { q.fillStyle = fill; q.fillRect(x, y, w, h); if (lw !== 0) { q.lineWidth = lw || 3.5; q.strokeStyle = INK; q.strokeRect(x, y, w, h); } };
      if (name === 'office') {
        box(0, 0, W, H, P.officeWallBack || '#FBEABF', 0); box(0, 0, 470, 962, P.officeWallSide || '#FCC374'); box(0, 962, W, 118, P.officeFloor || '#FDB569');
        box(1284, 84, 537, 446, o.night ? '#3B4A78' : (P.glassLow || '#FFE3B5')); box(1000, 610, 380, 24, P.officeDesk || '#EE8E5C'); box(1050, 400, 120, 200, P.officeMonitor || '#B6CEE6');
      } else if (name === 'living') {
        box(0, 0, W, H, P.livWall || '#C19280', 0); box(0, 900, W, 180, P.livFloor || '#B9714B'); box(382, 127, 289, 360, o.tod === 'morning' ? '#CFE6F0' : (P.glassTop || '#FDCDB0'));
        box(1500, 360, 240, 615, P.door || '#935A47'); box(330, 640, 680, 230, P.sofa || '#A9684C'); box(960, 830, 300, 26, P.table || '#CD8B5F');
      } else if (name === 'street') {
        box(0, 0, W, H, P.stSky || '#FCE9A7', 0); box(0, 90, 760, 780, P.stBrickBldg || '#B5714A'); box(1500, 0, 420, 870, P.stRight || '#E77944'); box(760, 260, 740, 610, P.stTan || '#BD8249');
        box(0, 870, W, 210, P.stPave || '#FBE689'); q.fillStyle = P.stTree || '#81A73A'; q.beginPath(); q.ellipse(380, 470, 170, 220, 0, 0, Math.PI * 2); q.fill(); q.lineWidth = 3.5; q.strokeStyle = INK; q.stroke(); box(360, 650, 40, 230, P.stTrunk || '#9D6B3B'); box(130, 300, 34, 580, P.stPost || '#A9A8A3');
      } else if (name === 'plain') { q.fillStyle = '#9DCFC6'; q.fillRect(0, 0, W, H); }
      else if (name === 'party') {
        box(0, 0, W, H, '#F6C9A0', 0); box(0, 900, W, 180, '#E39A6A'); const cols = ['#E37F78', '#77CC81', '#7BAFE1', '#F4BF54'];
        for (let k = 0; k < 2; k++) for (let i = 0; i < 20; i++) { q.fillStyle = cols[(i + k) % 4]; q.beginPath(); const x0 = i * 100 - k * 50, y0 = 70 + k * 90 + Math.sin(i * 0.9) * 10; q.moveTo(x0, y0); q.lineTo(x0 + 80, y0); q.lineTo(x0 + 40, y0 + 64); q.closePath(); q.fill(); q.lineWidth = 3; q.strokeStyle = INK; q.stroke(); }
      } else if (name === 'kitchen') { box(0, 0, W, H, '#F7DDB0', 0); box(0, 900, W, 180, '#D9A06E'); box(80, 600, 900, 300, '#E9B07A'); box(80, 130, 900, 260, '#F1C48F'); box(1180, 150, 380, 300, '#CFE6F0'); }
      else if (name === 'boxes') {
        box(0, 0, W, H, '#EBD7BE', 0); box(0, 900, W, 180, '#C9A27E');
        [[260, 650, 300, 250], [300, 430, 240, 220], [1300, 670, 320, 230], [1350, 470, 260, 200], [1420, 310, 180, 160]].forEach(b => { box(b[0], b[1], b[2], b[3], P.box || '#C9995F'); q.fillStyle = P.tape || '#E3C38E'; q.fillRect(b[0] + b[2] / 2 - 18, b[1] + 2, 36, b[3] - 4); });
      } else box(0, 0, W, H, '#DDD', 0);
      const k = o.night ? 0.5 : (TOD[o.tod] || 0); if (k && name !== 'plain') { q.fillStyle = `rgba(40,30,70,${k})`; q.fillRect(0, 0, W, H); }
      if (name !== 'plain') { q.font = `800 28px ${FONT}`; q.fillStyle = 'rgba(28,28,28,.5)'; q.textAlign = 'left'; q.textBaseline = 'top'; q.fillText('SET ' + name + (o.tod ? ' · ' + o.tod : '') + (o.night ? ' · night' : '') + ' (placeholder)', 24, 18); }
    });
    g.drawImage(cv, 0, 0);
    if (name === 'office' && o.clock) clockFace(g, 960, 212, 95, o.clock);
  }
  function clockFace(q, x, y, r, hm) {
    const P = global.SETS && global.SETS.clock; if (P) return P(q, x, y, r, hm);
    const [h, m] = String(hm).split(':').map(Number);
    q.save(); q.fillStyle = '#FDFEFA'; q.beginPath(); q.arc(x, y, r, 0, Math.PI * 2); q.fill(); q.lineWidth = 9; q.strokeStyle = '#A3ADB8'; q.stroke();
    const ah = ((h % 12) + (m || 0) / 60) / 12 * Math.PI * 2, am = (m || 0) / 60 * Math.PI * 2; q.lineCap = 'round'; q.strokeStyle = INK;
    q.lineWidth = 7; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.sin(ah) * r * 0.5, y - Math.cos(ah) * r * 0.5); q.stroke();
    q.lineWidth = 5; q.beginPath(); q.moveTo(x, y); q.lineTo(x + Math.sin(am) * r * 0.78, y - Math.cos(am) * r * 0.78); q.stroke(); q.restore();
  }
  ART.clock = clockFace;

  // ---------------------------------------------------------------- characters
  const SEED = { hero: 1, boss: 2, friend: 3, mum: 4, coworker: 5, stranger: 6, dad: 7, sister: 8, brother: 10, auntie: 11, auntie2: 12, auntie3: 13, uncle: 14, uncle2: 15, cousin: 16, cousin2: 17, neighbour: 18,
    fb_mum: 4, fb_dad: 7, fb_sister: 8, fb_brother: 10, fb_auntie: 11, fb_uncle1: 14, fb_uncle2: 15, fb_cousin1: 16, fb_cousin2: 17, fb_okafor_son: 18 };
  // a seed for any other id (dot-suffixed ids share their base's)
  const seedOf = who => SEED[who] || SEED[String(who).split('.')[0]] || (9 + (FILM.hashStr(String(who)) % 40));
  const EXPR_ALIAS = { beaming: 'happy', calm: 'neutral', honest: 'happy' };
  // the roles the sequences use -> the kit's ids: POV.ROLES[role] when the kit exports that map, else the first candidate that
  // POV.CAST has. 'mum' never resolves to POV.CAST.mum (that is Seven Days' mum, not this family's).
  ART.ROLES = {
    hero: ['hero'],
    mum: ['fb_mum', 'mama', 'mother'], dad: ['fb_dad', 'dad', 'papa'],
    sister: ['fb_sister', 'sister'], brother: ['fb_brother', 'brother'],
    auntie: ['fb_auntie', 'auntie'], auntie2: ['fb_auntie2', 'auntie2'], auntie3: ['fb_auntie3', 'auntie3'],
    uncle: ['fb_uncle1', 'uncle'], uncle2: ['fb_uncle2', 'uncle2'],
    cousin: ['fb_cousin1', 'cousin'], cousin2: ['fb_cousin2', 'cousin2'],
    neighbour: ['fb_okafor_son', 'okafor_son', 'neighbour'],
  };
  // roles the kit has no figure for yet, drawn as a recoloured variant of one it has (a second and third auntie for the wedding)
  ART.VARIANTS = {
    auntie2: { base: 'fb_auntie', top: ['#3F7FBF', '#356CA3'], bottom: ['#3F7FBF', '#356CA3'], hair: ['#3F7FBF', '#356CA3', '#5B98D4'], skin: 'fbSkinMum' },
    auntie3: { base: 'fb_auntie', top: ['#4E9A5B', '#40814B'], bottom: ['#4E9A5B', '#40814B'], hair: ['#4E9A5B', '#40814B', '#6BB476'], skin: 'fbSkinU2' },
  };
  const castHas = id => { const P = pov(); return !!(P && P.CAST && P.CAST[String(id).split('.')[0]]); };
  ART.resolve = function (role) {
    const P = pov(); if (!P) return null;
    if (String(role).includes('.')) { const [b, ...rest] = String(role).split('.'); const id = ART.resolve(b); return id ? [id].concat(rest).join('.') : null; }
    const R = P.ROLES || P.FAMILY; if (R && R[role] && castHas(R[role])) return R[role];
    const list = ART.ROLES[role]; if (!list) return castHas(role) && role !== 'mum' ? role : null;
    for (const id of list) if (castHas(id)) return id;
    return null;
  };
  const variantCache = {};
  function variant(role) {
    const P = pov(), v = ART.VARIANTS[role]; if (!P || !v || !castHas(v.base)) return null; if (variantCache[role]) return variantCache[role];
    const b = P.CAST[v.base], o = Object.assign({}, b);
    if (v.top) o.top = Object.assign({}, b.top, { c: v.top[0], sh: v.top[1] }); if (v.bottom) o.bottom = Object.assign({}, b.bottom, { c: v.bottom[0], sh: v.bottom[1] });
    if (v.hair && b.hair) o.hair = Object.assign({}, b.hair, { c: v.hair[0], sh: v.hair[1], hi: v.hair[2] }); if (v.skin && P.C[v.skin]) o.skin = P.C[v.skin];
    return (variantCache[role] = o);
  }
  // ages: the kit draws them when it has POV.buildWho (it maps baby/newborn/toddler/kid/teen/adult/grown itself) or says so per entry
  ART.AGE_K = { newborn: 0.3, baby: 0.3, toddler: 0.5, kid: 0.62, child: 0.62, teen: 0.88, adult: 1, grown: 1 };
  ART.kitAges = function (id, age) {
    const P = pov(); if (!P || !age) return true; if (typeof P.buildWho === 'function') return true; if (age === 'adult' || age === 'grown') return true;
    const A = P.AGES || P.ages; if (A && (Array.isArray(A) ? A.includes(age) : A[age])) return true;
    const ch = P.CAST && P.CAST[id]; return !!(ch && ch.ages && (Array.isArray(ch.ages) ? ch.ages.includes(age) : ch.ages[age]));
  };
  // the stand-ins: this family in the kit's own rig (brown skin tones of the reference's range, everyday dress), with a name tag
  const SK = { a: ['#8D5A3B', '#77492F'], b: ['#6E432B', '#5C3723'], c: ['#9F6B48', '#87583A'], d: ['#7E4E31', '#6A4028'], e: ['#B07A55', '#966545'] };
  const hairBun = { k: 'bun', c: '#221B18', sh: '#151110' }, hairShort = { k: 'curly', c: '#1A1614', hi: '#2E2825' };
  const SPEC = {
    mum: { skin: SK.a, top: ['cardigan', '#E2A33B', '#C98C2E', '#FFF4E3'], bottom: ['skirt', '#2F6E8E', '#255A75'], shoes: ['flat', '#6E5340'], hair: hairBun, h: 0.965, label: 'MUM' },
    dad: { skin: SK.b, top: ['buttonshirt', '#5C88A8', '#4B7593'], bottom: ['trousers', '#4F4A45', '#3F3B37'], shoes: ['dress', '#393939'], hair: null, h: 1.02, label: 'DAD' },
    sister: { skin: SK.c, top: ['tee', '#E37F78', '#C9675F'], bottom: ['skirt', '#7B5EA7', '#664D8C'], shoes: ['flat', '#9A4E3E'], hair: hairBun, h: 0.95, label: 'SISTER' },
    brother: { skin: SK.d, top: ['tee', '#F4BF54', '#DCA63E'], bottom: ['jeans', '#5D8FAE', '#4E7D9A'], shoes: ['trainer', '#E37F78'], hair: null, h: 0.98, label: 'BROTHER' },
    auntie: { skin: SK.e, top: ['cardigan', '#B04F8C', '#963F76', '#F4BF54'], bottom: ['skirt', '#3E8A5A', '#327249'], shoes: ['flat', '#6E5340'], hair: hairBun, h: 0.97, label: 'AUNTIE' },
    auntie2: { skin: SK.b, top: ['cardigan', '#4E8FC4', '#3F79AA', '#FFF4E3'], bottom: ['skirt', '#D9733B', '#BD5F2E'], shoes: ['flat', '#6E5340'], hair: hairBun, h: 0.96, label: 'AUNTIE' },
    auntie3: { skin: SK.c, top: ['cardigan', '#5FAF6E', '#4C955A', '#FFF4E3'], bottom: ['skirt', '#8E3B5B', '#76304B'], shoes: ['flat', '#6E5340'], hair: hairBun, h: 0.96, label: 'AUNTIE' },
    uncle: { skin: SK.d, top: ['shirt', '#E6D3A8', '#CDBA8F'], bottom: ['trousers', '#6B5A4A', '#5A4B3D'], shoes: ['dress', '#393939'], hair: null, h: 1.02, label: 'UNCLE' },
    uncle2: { skin: SK.a, top: ['buttonshirt', '#8A6BB0', '#755998'], bottom: ['trousers', '#3F4A5A', '#333C49'], shoes: ['dress', '#393939'], hair: hairShort, h: 1.0, label: 'UNCLE' },
    cousin: { skin: SK.e, top: ['tee', '#77CC81', '#5FB36A'], bottom: ['jeans', '#4E6F99', '#405D82'], shoes: ['trainer', '#3A3A3A'], hair: hairShort, h: 0.99, label: 'COUSIN' },
    cousin2: { skin: SK.c, top: ['tee', '#7BAFE1', '#6497C8'], bottom: ['jeans', '#6B4E3D', '#593F31'], shoes: ['trainer', '#E5534B'], hair: null, h: 0.99, label: 'COUSIN' },
    neighbour: { skin: SK.d, top: ['buttonshirt', '#FFFFFF', '#E6E6E6'], bottom: ['trousers', '#7A5A3C', '#664A31'], shoes: ['dress', '#4A3A2C'], hair: hairShort, glasses: 1, h: 0.98, label: "OKAFOR'S SON" },
  };
  function standIn(role) {
    const d = SPEC[role]; if (!d) return null;
    const o = { skin: d.skin[0], top: { k: d.top[0], c: d.top[1], sh: d.top[2], under: d.top[3] || '#FFFFFF', cuffC: d.top[1], inner: d.top[2] },
      bottom: { k: d.bottom[0], c: d.bottom[1], sh: d.bottom[2], cuff: d.bottom[1], fly: d.bottom[0] === 'skirt' ? 0 : 1 },
      shoes: { k: d.shoes[0], c: d.shoes[1], sole: d.shoes[0] === 'trainer' ? '#FFFFFF' : '#262626', toe: '#FFFFFF', laces: '#FFFFFF' }, hair: d.hair, brow: '#1c1c1c', h: d.h };
    if (d.glasses) o.glasses = 1;
    return o;
  }
  ART.standIn = standIn; ART.SPEC = SPEC;
  // the engine's poses beyond POV.POSES, built from the kit's own (pose functions take the figure opts)
  const EXTRA = {
    run: (P, o) => Object.assign(P.POSES.walk(Object.assign({}, o, { stride: o.stride || 0.72 })), { lean: 0.14 }),
    handup: (P, o) => Object.assign(P.POSES.stand(o), { armR: { a: 1.0, e: 1.75, hand: 'open', flip: 1 } }),
    stomach: (P, o) => Object.assign(P.POSES.stand(o), { head: { tilt: 0.06, sink: 4 }, armR: { ik: [-6, -104], bend: -1, ul: 0.9, hand: 'flat', flip: -1, hrot: 0.4 } }),
    peace: (P, o) => Object.assign(P.POSES.stand(o), { armR: { a: 2.55, e: 0.35, hand: 'point', flip: 1 } }),
    type: (P, o) => P.POSES.sit(Object.assign({}, o, { view: 'side' })),
    // "No": a flat palm out at chest height (the kit's pose 'no' replaces this when it lands)
    no: (P, o) => Object.assign(P.POSES.stand(o), { armR: { ik: [170, -112], bend: 1, ul: 0.95, hand: 'open', flip: 1, hrot: -1.45 } }),
    finger_up: (P, o) => Object.assign(P.POSES.stand(o), { armR: { a: 2.25, e: 0.95, hand: 'point', flip: 1 } }),
    push_away: (P, o) => Object.assign(P.POSES.stand(o), { armR: { a: 1.45, e: 0.15, hand: 'open', flip: 1 }, armL: { a: 1.3, e: 0.25, hand: 'open', flip: 1, z: 'back' } }),
    hold_card: (P, o) => Object.assign(P.POSES.hold_box(o), { prop: null }),
    // both arms up (a champion, praise, "God will provide")
    arms_up: (P, o) => Object.assign(P.POSES.stand(o), { head: { tilt: -0.06 }, armR: { a: 2.75, e: 0.25, hand: 'open', flip: 1 }, armL: { a: -2.75, e: -0.25, hand: 'open', flip: -1 } }),
    cheer: (P, o) => Object.assign(P.POSES.stand(o), { armR: { a: 2.6 + 0.12 * Math.sin((o.t || 0) * 9), e: 0.9, hand: 'fist', flip: 1 }, armL: { a: -2.6 - 0.12 * Math.sin((o.t || 0) * 9 + 1), e: -0.9, hand: 'fist', flip: -1 } }),
    // clapping: the hands meet in front of the chest on a beat
    clap: (P, o) => { const k = 0.5 + 0.5 * Math.sin((o.t || 0) * 14); return Object.assign(P.POSES.stand(o), { armR: { ik: [20 + 40 * k, -150], bend: -1, ul: 0.9, hand: 'flat', flip: -1, hrot: 1.2 }, armL: { ik: [-20 - 40 * k, -150], bend: 1, ul: 0.9, hand: 'flat', flip: 1, hrot: -1.2 } }); },
    // carrying something in both arms in front (a baby, a bag): the hands low and together
    carry: (P, o) => Object.assign(P.POSES.stand(o), { armR: { ik: [50, -120], bend: -1, ul: 0.9, hand: 'hold', flip: -1, hrot: 1.1 }, armL: { ik: [-36, -110], bend: 1, ul: 0.9, hand: 'flat', flip: -1, hrot: 0.4 } }),
    // a load on the back (the house): both hands up by the shoulders holding it behind the head, the head a little sunk
    load: (P, o) => Object.assign(P.POSES.stand(o), { head: { tilt: 0.05, sink: 8 }, armR: { a: 2.45, e: 1.35, hand: 'open', flip: 1 }, armL: { a: -2.45, e: -1.35, hand: 'open', flip: -1 } }),
    // the swoon: the back of a hand to the forehead, leaning back
    swoon: (P, o) => Object.assign(P.POSES.stand(o), { lean: -0.12, head: { tilt: -0.12 }, armR: { ik: [40, -300], bend: 1, ul: 0.7, hand: 'flat', flip: -1, hrot: 2.2 }, armL: { a: -0.6, e: -0.4, hand: 'open', flip: -1 } }),
    sit_front: (P, o) => sofa(P, o),
    sit_phone: (P, o) => { const b = sofa(P, o); return Object.assign(b, P.HOLD.phone_ear ? P.HOLD.phone_ear(b, o) : {}); },
    sit_laptop: (P, o) => { const b = sofa(P, o); return Object.assign(b, P.HOLD.laptop ? P.HOLD.laptop(b, o) : {}); },
    sit_stomach: (P, o) => Object.assign(sofa(P, o), { head: { tilt: 0.08, sink: 6, turn: 0.2 }, armR: { ik: [40, -100], bend: -1, ul: 0.9, hand: 'flat', flip: -1, hrot: 0.6 } }),
    sit_handup: (P, o) => Object.assign(sofa(P, o), { armR: { a: 1.0, e: 1.75, hand: 'open', flip: 1 } }),
  };
  const sofa = (P, o) => P.POSES.sit_sofa ? P.POSES.sit_sofa(o) : P.POSES.sit(Object.assign({}, o, { view: 'front' }));
  // the options the engine itself reads; everything else goes to POV.figure as it is
  const OWN = new Set(['x', 'y', 's', 'face', 'pose', 'expr', 'walk', 'phase', 'talk', 'blinks', 'blink', 'mouth', 'nod', 'look', 'turn', 'hold', 'mode', 'seat', 'view', 'tint', 'shadow', 'alpha', 'dx', 'dy',
    'tremble', 'rot', 'marks', 'override', 'prop', 'drawProp', 'faceOver', 'breath', 'noBlink', 'A', 't', 'stride', 'lw', 'seatAt', 'thigh', 'q', 'tag', 'age', 'holdBaby', 'lie', 'upright', 'babyRot', 'young', 'who']);
  ART.fig = function (c, who, o) {
    const t = c.t, g = c.g; const op = Object.assign({}, o); op.t = t; op.s = op.s || 1; op.face = op.face === -1 ? -1 : 1;
    if (op.x == null) op.x = W / 2; if (op.y == null) op.y = 962;
    if (op.mouth == null) op.mouth = op.talk ? FILM.talk(t, op.talk) : 0;
    if (op.blink == null) op.blink = op.blinks ? FILM.blinkAt(t, op.blinks) : (op.noBlink ? 0 : FILM.blink(t, seedOf(who)));
    const P = pov(); const vr = P ? variant(who) : null; const id = P ? (ART.resolve(who) || null) : null; const age = op.age || null;
    const kitAge = (id || vr) ? ART.kitAges(id || (ART.VARIANTS[who] || {}).base, age) : false;
    // a baby (age newborn | baby): lie: 1 | -1 lying with the head toward that side, (x, y) under the bundle's middle; upright: true
    // (x, y) the bundle's bottom. s = 1 is a newborn beside a scale-1 adult (about 200 px long). The kit's newborn when it has one,
    // else the engine's swaddled bundle (GFX.bundle).
    if (age === 'newborn' || age === 'baby') {
      const lie = op.upright ? 0 : (op.lie || op.face || 1);
      if (kitAge && id) {
        g.save(); if (op.alpha != null) g.globalAlpha *= FILM.clamp(op.alpha, 0, 1);
        let out = null; const bx = op.x + (op.dx || 0) + (lie ? lie * 21 * op.s : 0), by = op.y + (op.dy || 0);
        try { out = P.figure(g, id, { x: bx, y: by, scale: op.s, facing: lie || op.face, age, pose: lie ? 'lie' : 'held', rot: op.babyRot || (lie ? 0 : (op.rot || 0)), expr: EXPR_ALIAS[op.expr] || op.expr || 'neutral', blink: op.blink, look: op.look, mouth: op.mouth, fists: op.fists, tint: op.tint || null, shadow: op.shadow || null }); } catch (e) { FILM.warn('POV newborn(' + who + '): ' + e.message); }
        g.restore();
        if (out) { const toW = g.getTransform().inverse(), wp = p => { const q = toW.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; }; op.A = { head: wp(out.head), headTop: wp(out.headTop), headR: out.headR, mouth: wp(out.mouth), handL: wp(out.handL), handR: wp(out.handR), pelvis: wp(out.pelvis) }; return op; }
      }
      if (global.GFX && global.GFX.bundle) {
        ART.placeholders.fig[who + ':' + age] = 1; const sb = 0.75 * op.s;
        const bx = op.x + (op.dx || 0) - (lie ? lie * 133 * sb : 0), by = op.y + (op.dy || 0) - (lie ? 45 * sb : 0);
        const r = global.GFX.bundle(g, bx, by, sb, { who, rot: lie ? lie * 1.45 : (op.rot || 0), expr: EXPR_ALIAS[op.expr] || op.expr, blink: op.blink, mouth: op.mouth, look: op.look, face: op.face, t, wrap: op.wrap, alpha: op.alpha, tag: op.tag !== false && who !== 'hero' ? (SPEC[who] ? SPEC[who].label : String(who).toUpperCase()) : null });
        op.A = { head: r.head, headTop: [r.head[0], r.head[1] - r.headR], headR: r.headR, mouth: r.head, handL: r.head, handR: r.head, pelvis: [op.x, op.y] }; return op;
      }
    }
    const sScale = age && !kitAge ? (ART.AGE_K[age] || 1) : 1;
    if (op.rot && (age === 'newborn' || age === 'baby')) op.rot = 0;
    const drawS = op.s * sScale;
    g.save();
    const toWorld = g.getTransform().inverse();
    if (op.alpha != null) g.globalAlpha *= FILM.clamp(op.alpha, 0, 1);
    let dx = op.dx || 0, dy = op.dy || 0;
    if (op.tremble) { const tr = FILM.tremble(t, op.tremble, SEED[who] || 3); dx += tr.dx; dy += tr.dy; }
    if (dx || dy) g.translate(dx, dy);
    if (op.rot) { g.translate(op.x, op.y); g.rotate(op.rot); g.translate(-op.x, -op.y); }
    if (op.breath !== false) { const k = 1 + (op.breath || 0.006) * Math.sin((t + (SEED[who] || 0) * 0.83) * Math.PI * 2 * 0.27); g.translate(op.x, op.y); g.scale(1, k); g.translate(-op.x, -op.y); }
    let out = null, spec = null, tagged = false;
    if (P) {
      spec = id || vr || standIn(who); tagged = !id && !vr && !!spec; if (vr) ART.placeholders.fig[who + ' (variant of ' + ART.VARIANTS[who].base + ')'] = 1;
      if (!spec && castHas(who)) spec = who;
    }
    if (P && spec) {
      let pose = op.pose || 'stand';
      if (typeof pose === 'string' && !P.POSES[pose]) { const ex = EXTRA[pose] || EXTRA[{ running: 'run', typing: 'type' }[pose]]; pose = ex ? (oo => ex(P, oo)) : (P.POSES[POSE_ALIAS[pose]] ? POSE_ALIAS[pose] : 'stand'); }
      const phase = op.phase != null ? op.phase : op.walk != null ? op.walk / 2 : (op.pose === 'wave' ? t * 1.4 : op.pose === 'clap' ? t * 2.2 : (op.pose === 'swoon' || op.pose === 'sneeze') ? 1 : 0);
      const po = { x: op.x, y: op.y, scale: drawS, facing: op.face, pose, phase, expr: EXPR_ALIAS[op.expr] || op.expr || 'neutral', look: op.look, blink: op.blink, mouth: op.mouth,
        turn: op.turn, nod: op.nod, holding: op.hold, tint: op.tint || null, shadow: op.shadow === false ? null : (op.shadow || (op.y < H + 40 ? 'rgba(140,70,20,0.18)' : null)),
        marks: op.marks, override: op.override, prop: op.prop, drawProp: op.drawProp, face: op.faceOver, mode: op.mode, seat: op.seat, view: op.view, stride: op.stride, lw: op.lw,
        seatAt: op.seatAt, thigh: op.thigh, q: op.q, t };
      if (age && kitAge) po.age = age;
      if (vr && age && kitAge && P.buildWho) { po.age = age; }
      for (const k in op) if (!OWN.has(k) && !(k in po)) po[k] = op[k];
      if (op.pose && typeof op.pose === 'string' && EXTRA[op.pose] === undefined && !P.POSES[op.pose] && !POSE_ALIAS[op.pose] && !ART._poseWarned[op.pose]) { ART._poseWarned[op.pose] = 1; ART.placeholders.pose = ART.placeholders.pose || {}; ART.placeholders.pose[op.pose] = 1; }
      try { out = P.figure(g, spec, po); } catch (e) { FILM.warn('POV.figure(' + who + '): ' + e.message); out = null; }
    }
    if (!out) { ART.placeholders.fig[who] = 1; placeholderFig(g, who, Object.assign({}, op, { s: drawS })); out = placeholderAnchors(Object.assign({}, op, { s: drawS })); }
    else {
      // the kit reports device pixels: bring them back to the caller's world space
      const wp = p => { const q = toWorld.transformPoint(new DOMPoint(p[0], p[1])); return [q.x, q.y]; };
      const o2 = { head: wp(out.head), headTop: wp(out.headTop), mouth: wp(out.mouth), handL: wp(out.handL), handR: wp(out.handR), pelvis: wp(out.pelvis), headR: out.headR };
      ['seat', 'lap', 'knee', 'feet', 'elbowL', 'elbowR'].forEach(k => { if (out[k]) o2[k] = wp(out[k]); }); if (out.bodyScale != null) o2.bodyScale = out.bodyScale; out = o2;
    }
    g.restore();
    // the stand-in's name tag, under the feet (or above the head when the feet are off the frame)
    if (tagged && op.tag !== false) { ART.placeholders.fig[who] = 1; nameTag(g, (SPEC[who] && SPEC[who].label) || String(who).toUpperCase(), op.x + (op.dx || 0), op.y + 26 * op.s, op.s, age, sScale); }
    else if (age && !kitAge && who === 'hero') ART.placeholders.fig['hero:' + age] = 1;
    op.A = out; return op;
  };
  ART._poseWarned = {};
  function nameTag(g, label, x, y, s, age, k) {
    const sz = Math.max(16, Math.round(24 * Math.min(1.4, Math.max(0.7, s))));
    g.save(); g.font = `800 ${sz}px ${FONT}`; const text = label + (age ? ' · ' + age : ''); const w = g.measureText(text).width + sz;
    g.globalAlpha *= 0.8; g.fillStyle = '#FFF4E3'; g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.roundRect(x - w / 2, y - sz * 0.75, w, sz * 1.5, sz * 0.75); g.fill(); g.stroke();
    g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 1); g.restore();
  }
  const POSE_ALIAS = { standing: 'stand', walking: 'walk', thinking: 'think', pointing: 'point', waving: 'wave', clasped: 'hands_clasped', thumbsup: 'thumbs_up', handmouth: 'hand_mouth', phone: 'hold_phone', clipboard: 'hold_clipboard', laptop: 'hold_laptop', box: 'hold_box', sitting: 'sit', holding: 'stand' };
  // the head and hands of a drawn figure (world px): from its anchors when c.fig has drawn it, else from proportions
  ART.head = function (who, op) {
    if (op && op.A) return { x: op.A.head[0], y: op.A.head[1], r: op.A.headR, top: op.A.headTop };
    const pa = placeholderAnchors(Object.assign({ s: 1, face: 1, x: 0, y: 0 }, op)); return { x: pa.head[0], y: pa.head[1], r: pa.headR };
  };
  ART.hand = function (who, op, which) {
    const A2 = (op && op.A) || placeholderAnchors(Object.assign({ s: 1, face: 1, x: 0, y: 0 }, op));
    const p = which === 'back' ? A2.handL : A2.handR; return { x: p[0], y: p[1] };
  };
  function placeholderAnchors(o) {
    const s = o.s || 1, Hh = 800 * s, r = 100 * s, f = o.face || 1, sit = /sit|type|sip/.test(o.pose || '');
    const hy = (o.y || 0) - Hh + r + (sit ? 0.2 * Hh : 0);
    return { head: [(o.x || 0), hy], headTop: [(o.x || 0), hy - r], headR: r, mouth: [(o.x || 0) + f * 0.2 * r, hy + 0.5 * r], handR: [(o.x || 0) + f * 0.2 * Hh, (o.y || 0) - 0.5 * Hh], handL: [(o.x || 0) - f * 0.16 * Hh, (o.y || 0) - 0.5 * Hh], pelvis: [(o.x || 0), (o.y || 0) - 0.41 * Hh] };
  }
  const CAST = {
    hero: { body: '#3A8594', legs: '#FFFFFF', head: '#FCEBCB', top: null, label: 'HERO' }, boss: { body: '#FFFFFF', legs: '#7B7C7C', head: '#FCEBCB', top: '#A6A6A6', label: 'BOSS' },
    friend: { body: '#D14A44', legs: '#5D8FAE', head: '#FCEBCB', top: '#3A3A3A', label: 'FRIEND' }, mum: { body: '#EC9547', legs: '#7E5C43', head: '#FCEBCB', top: '#755438', label: 'MOM' },
    coworker: { body: '#6EA179', legs: '#DBC39E', head: '#CBA17C', top: '#2E2420', label: 'COWORKER' }, stranger: { body: '#6E5893', legs: '#6191AF', head: '#FCEBCB', top: '#DAC7A2', label: 'STRANGER' },
  };
  // the placeholder: a capsule body, a round head with dot eyes (lines when blinking) and a mouth that opens, the name on the chest
  function placeholderFig(g, who, o) {
    const K = CAST[who] || { body: '#bbb', legs: '#888', head: '#eee', label: String(who).toUpperCase() };
    const s = o.s, Hh = 800 * s, f = o.face, x = o.x, y = o.y, pose = String(o.pose || 'stand'), sit = /sit|type|sip/.test(pose);
    const pa = placeholderAnchors(o), r = pa.headR, lw = Math.max(2, 5 * s); const hipY = sit ? y - 0.3 * Hh : y - 0.42 * Hh;
    g.lineJoin = 'round'; g.lineCap = 'round';
    const ph = (o.walk || 0) * Math.PI, moving = /walk|run/.test(pose);
    for (const sd of [-1, 1]) { const sw = moving ? Math.sin(ph) * sd * 0.12 * Hh : 0; g.beginPath(); g.moveTo(x + sd * 0.05 * Hh, hipY); if (sit) { g.lineTo(x + f * 0.2 * Hh, hipY); g.lineTo(x + f * 0.2 * Hh, y); } else g.lineTo(x + sd * 0.06 * Hh + sw, y); g.lineWidth = 0.075 * Hh; g.strokeStyle = INK; g.stroke(); g.lineWidth = 0.075 * Hh - 2 * lw; g.strokeStyle = K.legs; g.stroke(); }
    const bt = pa.head[1] + r * 0.9, bw = 0.3 * Hh; g.beginPath(); g.roundRect(x - bw / 2, bt, bw, hipY + 0.03 * Hh - bt, bw * 0.38); g.fillStyle = K.body; g.fill(); g.lineWidth = lw; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(pa.head[0], pa.head[1], r, 0, Math.PI * 2); g.fillStyle = K.head; g.fill(); g.stroke();
    if (K.top) { g.beginPath(); g.arc(pa.head[0], pa.head[1], r, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fillStyle = K.top; g.fill(); g.stroke(); }
    g.fillStyle = INK; for (const k of [-1, 1]) { const ex = pa.head[0] + f * 0.2 * r + k * 0.32 * r; if (o.blink > 0.5) { g.beginPath(); g.moveTo(ex - 0.1 * r, pa.head[1]); g.lineTo(ex + 0.1 * r, pa.head[1]); g.stroke(); } else { g.beginPath(); g.arc(ex, pa.head[1], 0.08 * r, 0, Math.PI * 2); g.fill(); } }
    const m = o.mouth || 0; g.beginPath(); g.ellipse(pa.mouth[0], pa.mouth[1], 0.16 * r, 0.03 * r + 0.16 * r * m, 0, 0, Math.PI * 2); g.fillStyle = '#5E2323'; g.fill(); g.stroke();
    g.font = `800 ${Math.max(12, Math.round(30 * s))}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(K.label, x, (bt + hipY) / 2);
    g.font = `600 ${Math.max(10, Math.round(20 * s))}px ${FONT}`; g.fillText(pose + (o.expr && o.expr !== 'neutral' ? ' · ' + o.expr : ''), x, y + 22 * s);
  }

  // ---------------------------------------------------------------- props
  // c.prop(name, {x, y, s, a, ...}): POV.PROPS[name] (phone phoneFlat laptop laptopSide clipboard box mug notif chatBubble bell buzz
  // thought plateIcon bulb clock flash shadow) when the kit has it, else the engine's GFX drawing of that name
  ART.prop = function (c, name, o) {
    const P = global.POV; o = Object.assign({ t: c.t }, o);
    const fn = P && P.PROPS && typeof P.PROPS[name] === 'function' ? P.PROPS[name] : null;
    if (fn) { try { c.g.save(); fn(c.g, o.x || 0, o.y || 0, o); c.g.restore(); return; } catch (e) { c.g.restore(); FILM.warn('POV.PROPS.' + name + ': ' + e.message); } }
    if (global.GFX && global.GFX.prop) global.GFX.prop(c.g, name, o);
  };
  ART.report = () => ({ sets: Object.keys(ART.placeholders.set), figures: Object.keys(ART.placeholders.fig) });
})(window);
