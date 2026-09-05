
from pathlib import Path
import hashlib
import shutil

SOURCE = Path("data/raw/roboflow-balanced-ewaste/extracted")
OUTPUT = Path("data/processed/roboflow-clean")

SPLITS = ["train", "valid", "test"]

for split in SPLITS:
    (OUTPUT / split / "images").mkdir(parents=True, exist_ok=True)
    (OUTPUT / split / "labels").mkdir(parents=True, exist_ok=True)

# Build hashes for every image
images = {}

for split in SPLITS:
    image_dir = SOURCE / split / "images"

    for image in image_dir.iterdir():
        if not image.is_file():
            continue

        h = hashlib.md5(image.read_bytes()).hexdigest()
        images.setdefault(h, []).append((split, image))

# Keep TEST independent.
# If an image appears in TEST and another split, remove the other copy.
# Then clean VALID against TRAIN.
remove = set()

for h, occurrences in images.items():

    splits_present = {split for split, _ in occurrences}

    if "test" in splits_present:
        for split, image in occurrences:
            if split != "test":
                remove.add(image)

    elif "valid" in splits_present and "train" in splits_present:
        for split, image in occurrences:
            if split == "train":
                remove.add(image)

# Copy remaining images and matching labels
copied = 0
removed = 0

for split in SPLITS:
    image_dir = SOURCE / split / "images"
    label_dir = SOURCE / split / "labels"

    for image in image_dir.iterdir():

        if not image.is_file():
            continue

        if image in remove:
            removed += 1
            continue

        destination_image = OUTPUT / split / "images" / image.name
        shutil.copy2(image, destination_image)

        label = label_dir / f"{image.stem}.txt"

        if label.exists():
            shutil.copy2(
                label,
                OUTPUT / split / "labels" / label.name
            )

        copied += 1

print("\nROBOFLOW CLEAN DATASET")
print("=" * 60)
print(f"Original images : {sum(len(v) for v in images.values())}")
print(f"Removed images  : {removed}")
print(f"Copied images   : {copied}")
print(f"Output          : {OUTPUT}")
print("\nDone.")
