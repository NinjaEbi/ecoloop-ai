from pathlib import Path
from PIL import Image
from collections import Counter
import hashlib

root = Path("data/raw/kaggle-ewaste-images/extracted/modified-dataset")

print("\nKAGGLE QUALITY CHECK")
print("=" * 60)

for split in ["train", "val", "test"]:
    split_dir = root / split

    sizes = Counter()
    hashes = {}

    for p in split_dir.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue

        try:
            with Image.open(p) as im:
                sizes[im.size] += 1

            h = hashlib.md5(p.read_bytes()).hexdigest()
            hashes.setdefault(h, []).append(str(p))

        except Exception:
            pass

    duplicate_groups = sum(1 for v in hashes.values() if len(v) > 1)

    print(f"\n{split.upper()}")
    print(f"Images: {sum(sizes.values())}")
    print(f"Duplicate groups: {duplicate_groups}")
    print("Top image sizes:")

    for size, count in sizes.most_common(5):
        print(f"  {size}: {count}")

print("\nDONE")
