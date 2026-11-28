"""Print the Cycles devices Blender sees for each GPU backend; exit 1 if there is no OptiX device.

    blender -b --factory-startup -P check_gpu.py        (or: python -I check_gpu.py, with the bpy module)
"""
import sys

import bpy

prefs = bpy.context.preferences.addons["cycles"].preferences
print("CHECK Blender", bpy.app.version_string)
found = {}
for backend in ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"):
    try:
        prefs.compute_device_type = backend
    except TypeError:
        print(f"CHECK {backend}: not in this build")
        continue
    prefs.refresh_devices()
    devs = [d for d in prefs.devices if d.type == backend]
    found[backend] = devs
    print(f"CHECK {backend}: {len(devs)} device(s) " + "; ".join(d.name for d in devs))
if not found.get("OPTIX"):
    print("CHECK FAIL: no OptiX device. Do not render: Cycles would run on the CPU.")
    sys.exit(1)
print(f"CHECK OK: {len(found['OPTIX'])} OptiX device(s)")
