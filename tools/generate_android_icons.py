from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src/assets/lettoia-logo.png"
RES = ROOT / "android/app/src/main/res"

logo = Image.open(SOURCE).convert("RGBA")
white = Image.new("RGBA", logo.size, (255, 255, 255, 255))
diff = ImageChops.difference(logo, white)
mask = diff.convert("L").point(lambda value: 0 if value < 18 else 255)
logo.putalpha(mask)
bbox = mask.getbbox()
logo = logo.crop(bbox) if bbox else logo


def make_icon(size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (102, 32, 196, 255))
    max_side = int(size * 0.72)
    scale = min(max_side / logo.width, max_side / logo.height)
    mark = logo.resize((max(1, int(logo.width * scale)), max(1, int(logo.height * scale))), Image.Resampling.LANCZOS)
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return canvas

sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for density, size in sizes.items():
    folder = RES / f"mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    make_icon(size).save(folder / "ic_launcher.png", optimize=True)
    make_icon(size).save(folder / "ic_launcher_round.png", optimize=True)

foreground = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
max_side = 250
scale = min(max_side / logo.width, max_side / logo.height)
mark = logo.resize((int(logo.width * scale), int(logo.height * scale)), Image.Resampling.LANCZOS)
foreground.alpha_composite(mark, ((432 - mark.width) // 2, (432 - mark.height) // 2))
foreground.save(RES / "mipmap-xxxhdpi/ic_launcher_foreground.png", optimize=True)

for density, size in sizes.items():
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    max_side = int(size * 0.58)
    scale = min(max_side / logo.width, max_side / logo.height)
    mark = logo.resize((max(1, int(logo.width * scale)), max(1, int(logo.height * scale))), Image.Resampling.LANCZOS)
    fg.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    fg.save(RES / f"mipmap-{density}/ic_launcher_foreground.png", optimize=True)

print("Android Lettora icons generated")
