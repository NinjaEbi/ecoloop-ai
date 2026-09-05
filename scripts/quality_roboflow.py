
from pathlib import Path
from PIL import Image
from collections import Counter
import hashlib

root = Path("data/raw/roboflow-balanced-ewaste/extracted")

print("\nROBOFLOW QUALITY CHECK")
print("=" * 60)

for split in ["train", "valid", "test"]:
    img_dir = root / split / "images"

    sizes = Counter()
    hashes = {}

    for p in img_dir.iterdir():
        if not p.is_file():
            continue

        try:
            with Image.open(p) as im:
                sizes[im.size] += 1

            h = hashlib.md5(p.read_bytes()).hexdigest()
            hashes.setdefault(h, []).append(p.name)

        except Exception:
            pass

    duplicate_groups = sum(1 for v in hashes.values() if len(v) > 1)

    print(f"\n{split.upper()}")
    print(f"Images: {len(list(img_dir.iterdir()))}")
    print(f"Unique duplicate groups: {duplicate_groups}")
    print("Top image sizes:")

    for size, count in sizes.most_common(5):
        print(f"  {size}: {count}")

print("\nDONE")
