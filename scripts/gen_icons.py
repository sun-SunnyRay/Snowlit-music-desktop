from PIL import Image
from pathlib import Path

root = Path(__file__).resolve().parents[1]
src = root / "branding" / "snowlit_launcher_master.png"
if not src.exists():
    raise SystemExit(f"branding image not found: {src}")

out_dir = root / "resources" / "icons"
out_dir.mkdir(parents=True, exist_ok=True)

img = Image.open(src).convert("RGBA")
w, h = img.size
side = min(w, h)
left = (w - side) // 2
top = (h - side) // 2
img = img.crop((left, top, left + side, top + side))

for s in (16, 32, 48, 64, 128, 256, 512):
    p = out_dir / f"{s}x{s}.png"
    img.resize((s, s), Image.Resampling.LANCZOS).save(p, "PNG")
    print("wrote", p)

icon_png = out_dir / "icon.png"
img.resize((512, 512), Image.Resampling.LANCZOS).save(icon_png, "PNG")
print("wrote", icon_png)

doc_icon = root / "doc" / "images" / "icon.png"
doc_icon.parent.mkdir(parents=True, exist_ok=True)
img.resize((512, 512), Image.Resampling.LANCZOS).save(doc_icon, "PNG")
print("wrote", doc_icon)

ico_path = out_dir / "icon.ico"
img.resize((256, 256), Image.Resampling.LANCZOS).save(
    ico_path,
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print("wrote", ico_path)
print("done from", src)
