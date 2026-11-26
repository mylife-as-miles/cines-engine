// Decode EXT_meshopt_compression and quantization in a Tripo GLB, so the pip build of Blender (which lacks the meshopt
// decoder) can import it. Setup once: npm install @gltf-transform/core@4 @gltf-transform/extensions@4 \
//   @gltf-transform/functions@4 meshoptimizer@0.22   Then: node unpack_glb.mjs in.glb out.glb
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
const [inp, out] = process.argv.slice(2);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inp);
for (const ext of doc.getRoot().listExtensionsUsed()) {
  if (['EXT_meshopt_compression', 'KHR_mesh_quantization'].includes(ext.extensionName)) ext.dispose();
}
await doc.transform(dequantize());
await io.write(out, doc);
const tris = doc.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((s, p) => s + (p.getIndices() ? p.getIndices().getCount() / 3 : 0), 0);
console.log('unpacked', out, 'triangles', tris);
