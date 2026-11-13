// Where things are in Ealdholt, in the village model's own metres (+x east, +z south, y up): the same frame the
// game's village views use (Crownfall, shared/legacy/aethelgard/village-views.ts). Everything the camera is anchored
// to lives here, so a move can be re-aimed without touching the timeline's formulas.
//
// In the game the sun rises at 06:00 about 24 degrees south of east (+x, a little +z) and climbs on that bearing.

/** The model's footprint, and the middle of the settlement. */
export const BOUNDS = { minX: -50.4, minZ: -50.4, maxX: 101.8, maxZ: 101.8 };
export const CENTRE = { x: 25.7, z: 25.7 };

/** The pond (its water is a flat disc in the model) in its fenced compound, north-west of the houses. */
export const POND = { x: -11, z: -4.5, r: 7 };

/** The church: the largest roof, in its yard of graves, two towers at its east end and one at its west. */
export const CHURCH = { x: 34.5, z: 37.7, top: 9 };

/**
 * The opening, the watch before dawn: from above the woods west of the pond, a slow glide toward the village, which
 * is still dark in its trees, and the mountains behind it, where the day is coming up. from/to are [x, y, z] of the
 * camera; look is the point the lens holds, at the start and at the end.
 */
export const WATCH = { from: [-60, 17, 7], to: [-37, 11.5, 15], look: [[34, 27, 38], [34, 20, 38]], fov: [54, 50] };

/**
 * The low run, on the ground plan. It begins on the road north of the churchyard, heading west, swings south down the
 * walled lane along the churchyard's west side and west again along the south road (RUN_LEAD: this film's own), and
 * there joins first-bloom's run as it was re-plotted here (RUN_PLAN): north up the fenced lane, across the yard and
 * through the compound's gate, over the pond, a hop over its fence onto the stream, along the foot of the bank, then
 * east down the lane between the long houses, into the sun, to the alders. Together they circle the village.
 */
export const RUN_LEAD = [[50, 24.9], [40, 24.8], [31.5, 24.6], [25, 26.2], [21, 28.6], [18.9, 32.5], [18.6, 39], [18.7, 45], [16.2, 49.4], [11, 50.6]];
export const RUN_PLAN = [
  [6, 51], [2.6, 46], [2.5, 38], [2.5, 31], [2.3, 24], [2.5, 15], [2.6, 6.5], [1.2, 2.2], [-2, 0.8], [-6.5, -1.5], [-10.5, -5],
  [-9.5, -9], [-6, -12.2], [-1, -10.6], [6, -10.2], [14, -10.2], [20.5, -9.8], [24.5, -8.6], [26.7, -6], [27.1, -3.2], [29.6, -1.6], [36, -2.2], [46, -2.6], [56, -2.3],
  [63, -6], [68, -11],
];
/** The climb through the alder crowns, continuing the run. */
export const GROVE_PLAN = [[60, -4], [68, -11], [73, -17], [78, -24], [84, -32]];
/** Fractions of RUN_PLAN's length: reaching the pond's shore, leaving the stream, turning toward the sun, the grove. */
export const RUN_U = { pond: 0.383, stream: 0.444, sunward: 0.49, grove: 0.97 };

/**
 * The spiral, about the church, from where the climb leaves off north-east of it: [film seconds, value] keys. bearing in degrees (0 = east, 90 = south; falling values
 * turn north about), radius and height (above the churchyard) in metres. lead: how far along its flight the lens
 * looks ahead of the church. lift: when the lens leaves the church for the last frame's aim, last. The flight stays
 * above the crowns (about 16 m) wherever it is near them.
 */
export const SPIRAL = {
  bearing: [[16.79, -52], [18.9, -78], [20.72, -112], [22.2, -170], [23.7, -222], [26.2, -225], [30, -222.3]],
  radius: [[16.79, 82], [20.72, 38], [22.2, 28], [23.7, 40], [30, 92.6]],
  height: [[16.79, 42], [20.72, 24], [22.2, 20.5], [23.7, 26], [30, 50]],
  lead: [[16.79, 14], [20.2, 5], [21.2, 0], [30, 0]],
  fov: [[16.79, 58], [20.72, 48], [22.2, 44], [23.7, 46], [30, 46]],
  lift: [24.0, 28.2], last: [36, 21, 8],
};
