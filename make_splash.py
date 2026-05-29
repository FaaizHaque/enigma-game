"""
Creates a native splash.png (1242×2688, iPhone max) with the Haque Games
Metallic Logo centred on the app's dark background colour #06060f.
This eliminates the black gap: the native splash now shows the logo,
so the transition to the JS-animated version is seamless.
"""
from PIL import Image
import numpy as np

BG_COLOR = (6, 6, 15, 255)   # #06060f
OUT_W, OUT_H = 1242, 2688

logo_path = "/home/user/enigma-game/enigma-native/assets/Haque Games Metallic Logo.png"
out_path  = "/home/user/enigma-game/enigma-native/assets/splash.png"

logo = Image.open(logo_path).convert("RGBA")

# Scale logo to 55% of the JS size (440×242 → native points, then scale for high-res)
# On a 3× device, 440pt ≈ 1320px. Scale to 55% → 726px wide.
target_w = int(OUT_W * 0.58)
ratio = target_w / logo.width
target_h = int(logo.height * ratio)
logo = logo.resize((target_w, target_h), Image.LANCZOS)

# Create the background
bg = Image.new("RGBA", (OUT_W, OUT_H), BG_COLOR)

# Paste logo centred
x = (OUT_W - target_w) // 2
y = (OUT_H - target_h) // 2
bg.paste(logo, (x, y), logo)

bg = bg.convert("RGB")
bg.save(out_path, "PNG", optimize=True)
print(f"Saved {out_path}  ({OUT_W}×{OUT_H}, logo at {target_w}×{target_h})")
