// The village's ground as a height grid, read from the landscape's own vertices in the model, and the pond's water
// level. The camera rigs (timeline.js) keep their heights above this ground. The grid is baked once in a browser
// (tools/ground.mjs, out/ground.json) and read back by the shoot in Node (groundFromGrid).
//
// The model is licensed (Fab Standard License) and is never part of this repository: tools/server.mjs serves it from
// where it is installed, at /village.glb. The baked grid is derived from it, so it stays in out/ (ignored) too.
import * as L from './layout.js';

export const GRID = { minX: L.BOUNDS.minX, minZ: L.BOUNDS.minZ, maxX: L.BOUNDS.maxX, maxZ: L.BOUNDS.maxZ, cell: 0.5 };

/** Browser only: loads the model and bakes the grid. */
export async function bakeGround() {
  const THREE = await import('three');
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync('/village.glb');
  const root = gltf.scene; root.updateMatrixWorld(true);
  const B = GRID, nx = Math.ceil((B.maxX - B.minX) / B.cell) + 1, nz = Math.ceil((B.maxZ - B.minZ) / B.cell) + 1;
  const grid = new Float32Array(nx * nz).fill(NaN), v = new THREE.Vector3();
  let pondY = 0;
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const name = mesh.material?.name || '', node = (mesh.name || '') + ' ' + (mesh.parent?.name || '');
    if (/Water_Review/.test(name) && /Pond/.test(name)) pondY = new THREE.Box3().setFromObject(mesh).max.y;
    if (!(/BakedGround/.test(name) || /LandscapeComponent/.test(node))) return;
    const pos = mesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const ix = Math.round((v.x - B.minX) / B.cell), iz = Math.round((v.z - B.minZ) / B.cell);
      if (ix < 0 || iz < 0 || ix >= nx || iz >= nz) continue;
      const k = iz * nx + ix;
      if (!(grid[k] >= v.y)) grid[k] = v.y;
    }
  });
  // fill the cells no vertex landed in from their neighbours
  for (let pass = 0; pass < 40; pass++) {
    let holes = 0; const next = grid.slice();
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const k = iz * nx + ix; if (!Number.isNaN(grid[k])) continue;
      let sum = 0, n = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const jx = ix + dx, jz = iz + dz; if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue;
        const h = grid[jz * nx + jx]; if (!Number.isNaN(h)) { sum += h; n++; }
      }
      if (n) next[k] = sum / n; else holes++;
    }
    grid.set(next); if (!holes) break;
  }
  return { ...GRID, nx, nz, pondY, heights: Array.from(grid, (h) => (Number.isNaN(h) ? 0 : Math.round(h * 1000) / 1000)) };
}

/** The ground under (x, z) from a baked grid; beyond the model it holds the height of its nearest edge. */
export function groundFromGrid(g) {
  const at = (ix, iz) => g.heights[Math.min(g.nz - 1, Math.max(0, iz)) * g.nx + Math.min(g.nx - 1, Math.max(0, ix))];
  const heightAt = (x, z) => {
    const fx = (x - g.minX) / g.cell, fz = (z - g.minZ) / g.cell;
    const ix = Math.floor(fx), iz = Math.floor(fz), u = Math.min(1, Math.max(0, fx - ix)), w = Math.min(1, Math.max(0, fz - iz));
    return (at(ix, iz) * (1 - u) + at(ix + 1, iz) * u) * (1 - w) + (at(ix, iz + 1) * (1 - u) + at(ix + 1, iz + 1) * u) * w;
  };
  return { heightAt, pondY: g.pondY };
}
