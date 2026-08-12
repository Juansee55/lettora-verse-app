from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/lettora-app-icon.png"
RES = ROOT / "android/app/src/main/res"

icon = Image.open(SOURCE).convert("RGB")

sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for density, size in sizes.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    resized = icon.resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
    resized.save(folder / "ic_launcher.png", optimize=True)
    resized.save(folder / "ic_launcher_round.png", optimize=True)

# Bitmap background for Android adaptive icons: the supplied image is the full artwork.
drawable = RES / "drawable"
drawable.mkdir(parents=True, exist_ok=True)
icon.resize((432, 432), Image.Resampling.LANCZOS).save(drawable / "ic_launcher_background.png", optimize=True)

# Transparent foreground keeps the adaptive icon artwork unchanged.
Image.new("RGBA", (432, 432), (0, 0, 0, 0)).save(drawable / "ic_launcher_foreground.png", optimize=True)

print("Official Lettora app icon generated")
