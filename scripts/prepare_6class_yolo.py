from pathlib import Path
import shutil
import yaml

SRC = Path("data/processed/roboflow-clean")
DST = Path("data/processed/ecoloop-6class")

TARGET_CLASSES = [
    "Computer-Keyboard",
    "Computer-Mouse",
    "Flat-Panel-Monitor",
    "Flat-Panel-TV",
    "Laptop",
    "Smartphone",
]

SPLITS = ["train", "valid", "test"]


def main():
    with open(SRC / "data.yaml", "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    old_names = data["names"]

    old_to_new = {}

    for new_id, name in enumerate(TARGET_CLASSES):
        if name not in old_names:
            raise ValueError(f"Missing class: {name}")

        old_to_new[old_names.index(name)] = new_id

    if DST.exists():
        shutil.rmtree(DST)

    total_images = 0

    for split in SPLITS:
        src_images = SRC / split / "images"
        src_labels = SRC / split / "labels"

        dst_images = DST / split / "images"
        dst_labels = DST / split / "labels"

        dst_images.mkdir(parents=True, exist_ok=True)
        dst_labels.mkdir(parents=True, exist_ok=True)

        for image in src_images.iterdir():
            if not image.is_file():
                continue

            label = src_labels / f"{image.stem}.txt"

            if not label.exists():
                continue

            new_lines = []

            for line in label.read_text(encoding="utf-8").splitlines():
                parts = line.split()

                if len(parts) != 5:
                    continue

                old_id = int(parts[0])

                if old_id not in old_to_new:
                    continue

                parts[0] = str(old_to_new[old_id])
                new_lines.append(" ".join(parts))

            if not new_lines:
                continue

            shutil.copy2(image, dst_images / image.name)

            (dst_labels / label.name).write_text(
                "\n".join(new_lines) + "\n",
                encoding="utf-8"
            )

            total_images += 1

    output_yaml = {
        "path": str(DST.resolve()),
        "train": "train/images",
        "val": "valid/images",
        "test": "test/images",
        "nc": 6,
        "names": TARGET_CLASSES,
    }

    with open(DST / "data.yaml", "w", encoding="utf-8") as f:
        yaml.safe_dump(output_yaml, f, sort_keys=False)

    print("\n6-CLASS ECOLOOP DATASET CREATED")
    print("=" * 60)
    print(f"Output: {DST.resolve()}")
    print(f"Images copied: {total_images}")

    print("\nClasses:")
    for i, name in enumerate(TARGET_CLASSES):
        print(f"  {i}: {name}")


if __name__ == "__main__":
    main()