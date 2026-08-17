from PIL import Image
from pathlib import Path

candidates = [
    Path(r"D:\XueMusic\branding\snowlit_launcher_master.png"),
    Path(r"D:\XueMusic\snowlit_launcher_icon.png"),
]
src = next((p for p in candidates if p.exists()), None)
if src is None:
    raise SystemExit("branding image not found")

out_dir = Path(r"D:\XueMusic\desktop\XueMusic-desktop\resources\icons")
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

ico_path = out_dir / "icon.ico"
img.resize((256, 256), Image.Resampling.LANCZOS).save(
    ico_path,
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print("wrote", ico_path)
print("done from", src)
