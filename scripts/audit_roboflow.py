
from pathlib import Path
from collections import Counter

root = Path("data/raw/roboflow-balanced-ewaste/extracted")

print("\nROBOFLOW DATASET SUMMARY")
print("=" * 60)

for split in ["train", "valid", "test"]:
    split_path = root / split

    if not split_path.exists():
        continue

    images = list((split_path / "images").glob("*"))
    labels = list((split_path / "labels").glob("*.txt"))

    print(f"\n{split.upper()}")
    print(f"Images: {len(images)}")
    print(f"Labels: {len(labels)}")

    counts = Counter()

    for label_file in labels:
        for line in label_file.read_text(errors="ignore").splitlines():
            parts = line.split()
            if parts:
                counts[parts[0]] += 1

    print("Annotations by class ID:")
    for class_id, count in sorted(counts.items(), key=lambda x: int(x[0])):
        print(f"  {class_id}: {count}")

print("\nDATA.YAML")
print("=" * 60)

yaml_file = root / "data.yaml"

if yaml_file.exists():
    print(yaml_file.read_text())
