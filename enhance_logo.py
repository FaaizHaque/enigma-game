from PIL import Image, ImageFilter, ImageEnhance
import numpy as np

src = "/home/user/enigma-game/enigma-native/assets/logo-main-transparent-original.png"
dst = "/home/user/enigma-game/enigma-native/assets/logo-main-transparent.png"

img = Image.open(src).convert("RGBA")
w, h = img.size

# --- 1. Scale up 30% ---
new_w, new_h = int(w * 1.30), int(h * 1.30)
img = img.resize((new_w, new_h), Image.LANCZOS)
print(f"Resized: {w}x{h} -> {new_w}x{new_h}")

arr = np.array(img, dtype=np.float32)
r, g, b, a = arr[...,0], arr[...,1], arr[...,2], arr[...,3]
visible = a > 30

lum = 0.299*r + 0.587*g + 0.114*b

# --- 2. Strong metallic contrast curve ---
# Dark pixels → darker, bright pixels → much brighter (high contrast chrome look)
def metallic_curve(lum):
    # S-curve: shadows pulled darker, highlights pushed much brighter
    norm = lum / 255.0
    # Steepen the curve
    out = np.where(norm > 0.65,
                   np.minimum(0.65 + (norm - 0.65) * 2.2, 1.0),   # boost highlights hard
                   np.where(norm > 0.35,
                            0.35 + (norm - 0.35) * 0.85,            # compress midtones slightly
                            norm * 0.70))                            # darken shadows
    return out * 255.0

new_lum = metallic_curve(lum)
ratio = np.where(lum > 5, new_lum / np.maximum(lum, 1), 1.0)

for ch_idx in range(3):
    arr[..., ch_idx] = np.where(visible, np.clip(arr[..., ch_idx] * ratio, 0, 255), arr[..., ch_idx])

# --- 3. Strong diagonal light sweep ---
yy, xx = np.mgrid[0:new_h, 0:new_w]
# Diagonal band sweeping top-left to bottom-right
diag = (xx / new_w + yy / new_h)   # 0 to 2
# Place a bright narrow glint band at 0.80 on the diagonal
center = 0.80
width = 0.12
glint = np.exp(-((diag - center)**2) / (2 * (width / 2.5)**2))
glint = glint * 0.75   # up to 75% brightness boost — clearly visible

# Cooler/whiter specular (slightly blue-white tint on the glint)
glint_r = glint * 0.90
glint_g = glint * 0.95
glint_b = glint * 1.00

for ch_idx, g_ch in enumerate([glint_r, glint_g, glint_b]):
    arr[..., ch_idx] = np.where(
        visible,
        np.clip(arr[..., ch_idx] + g_ch * 255, 0, 255),
        arr[..., ch_idx]
    )

# --- 4. Sharpen for crisp metallic edges ---
result = Image.fromarray(arr.astype(np.uint8), "RGBA")
result = result.filter(ImageFilter.UnsharpMask(radius=1.5, percent=90, threshold=2))

result.save(dst, "PNG")
print(f"Done: {dst}")
