"""
Resize the Haque Games Metallic Logo to display size for retina
screens. The on-screen size is 440x242 logical pixels. On a 3x
retina device that's 1320x726 actual pixels. Anything larger
just wastes decode time.

Targets a 3x-quality image (~1320x726) with aggressive PNG
optimization. The original is preserved at logo-main-transparent-original.png.
"""
from PIL import Image

src = "/home/user/enigma-game/enigma-native/assets/Haque Games Metallic Logo.png"
dst = src

im = Image.open(src).convert("RGBA")
print(f"Original: {im.size}, mode {im.mode}")

# Target ~1320x726 (3x retina)
TARGET_W = 1320
ratio = TARGET_W / im.width
target_h = int(im.height * ratio)
im = im.resize((TARGET_W, target_h), Image.LANCZOS)
print(f"Resized:  {im.size}")

im.save(dst, "PNG", optimize=True)

import os
print(f"New size: {os.path.getsize(dst)/1024:.1f} KB")
