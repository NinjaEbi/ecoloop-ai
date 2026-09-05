
from pathlib import Path
import yaml

SOURCE = Path("data/raw/roboflow-balanced-ewaste/extracted/data.yaml")
OUTPUT = Path("data/processed/roboflow-clean/data.yaml")

with open(SOURCE, "r", encoding="utf-8") as f:
    data = yaml.safe_load(f)

data["train"] = "train/images"
data["val"] = "valid/images"
data["test"] = "test/images"

with open(OUTPUT, "w", encoding="utf-8") as f:
    yaml.safe_dump(data, f, sort_keys=False)

print("YOLO DATASET CONFIG CREATED")
print("=" * 60)
print(f"Classes: {data['nc']}")
print(f"Train:   {data['train']}")
print(f"Val:     {data['val']}")
print(f"Test:    {data['test']}")
print("\nTarget classes:")
targets = {
    "Smartphone",
    "Laptop",
    "Computer-Keyboard",
    "Computer-Mouse",
    "Flat-Panel-Monitor",
    "Flat-Panel-TV",
}

for i, name in enumerate(data["names"]):
    if name in targets:
        print(f"  {i}: {name}")

print(f"\nSaved: {OUTPUT}")
