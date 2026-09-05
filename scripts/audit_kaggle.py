from pathlib import Path

root = Path("data/raw/kaggle-ewaste-images/extracted/modified-dataset")

print("\nKAGGLE DATASET SUMMARY")
print("=" * 60)

total = 0

for split in ["train", "test", "valid"]:
    split_path = root / split

    if not split_path.exists():
        continue

    print(f"\n{split.upper()}")

    class_dirs = sorted([x for x in split_path.iterdir() if x.is_dir()])

    for class_dir in class_dirs:
        count = sum(
            1 for p in class_dir.iterdir()
            if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}
        )
        total += count
        print(f"  {class_dir.name}: {count}")

print("\n" + "=" * 60)
print(f"TOTAL IMAGES: {total}")
