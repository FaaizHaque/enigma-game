from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import numpy as np

src = "/home/user/enigma-game/enigma-native/assets/logo-main-transparent.png"
dst = "/home/user/enigma-game/enigma-native/assets/logo-main-transparent.png"
backup = "/home/user/enigma-game/enigma-native/assets/logo-main-transparent-original.png"

img = Image.open(src).convert("RGBA")

# --- backup original ---
img.save(backup)
print(f"Backup saved to {backup}")

# --- 1. Scale up ~25% ---
w, h = img.size
new_w, new_h = int(w * 1.25), int(h * 1.25)
img = img.resize((new_w, new_h), Image.LANCZOS)
print(f"Resized: {w}x{h} -> {new_w}x{new_h}")

arr = np.array(img, dtype=np.float32)
r, g, b, a = arr[...,0], arr[...,1], arr[...,2], arr[...,3]

# Mask of visible (non-transparent) pixels
visible = a > 30

# --- 2. Metallic enhancement ---
# Boost contrast on the silver/grey tones — increase brightness variance to make
# highlights brighter and shadows slightly deeper, giving a metallic 3D feel
lum = 0.299*r + 0.587*g + 0.114*b

# Metallic curve: push midtones toward extremes slightly
metallic_boost = np.where(lum > 180, np.minimum(lum * 1.15, 255),
                 np.where(lum > 100, lum * 1.05,
                          lum * 0.90))

# Apply the contrast boost proportionally to each channel
for ch_idx, ch in enumerate([r, g, b]):
    ratio = np.where(lum > 5, metallic_boost / np.maximum(lum, 1), 1.0)
    arr[..., ch_idx] = np.clip(ch * ratio, 0, 255)

# --- 3. Light sweep (diagonal glint) ---
# A soft diagonal band of brightness sweeping top-left to bottom-right
yy, xx = np.mgrid[0:new_h, 0:new_w]
# Diagonal position: project onto 45-degree axis
diag = (xx / new_w + yy / new_h)          # 0 at top-left, 2 at bottom-right
# Center the glint band at 0.85 along the diagonal (right-of-centre, brighter side)
center = 0.85
width = 0.18
glint = np.exp(-((diag - center)**2) / (2 * (width/2.5)**2))
glint = glint * 0.45                       # max 45% brightness boost — subtle

# Apply glint only to visible pixels
for ch_idx in range(3):
    arr[..., ch_idx] = np.where(
        visible,
        np.clip(arr[..., ch_idx] + glint * 255, 0, 255),
        arr[..., ch_idx]
    )

result = Image.fromarray(arr.astype(np.uint8), "RGBA")

# --- 4. Slight sharpening for crisp metallic edges ---
result = result.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=3))

result.save(dst, "PNG")
print(f"Enhanced logo saved to {dst}")
