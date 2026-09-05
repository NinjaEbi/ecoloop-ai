from pathlib import Path
import hashlib

root = Path("data/raw/roboflow-balanced-ewaste/extracted")

splits = {}

for split in ["train", "valid", "test"]:
    hashes = {}

    for p in (root / split / "images").iterdir():
        if p.is_file():
            h = hashlib.md5(p.read_bytes()).hexdigest()
            hashes.setdefault(h, []).append(p.name)

    splits[split] = hashes

print("\nROBOFLOW CROSS-SPLIT DUPLICATE CHECK")
print("=" * 60)

for a, b in [("train", "valid"), ("train", "test"), ("valid", "test")]:
    overlap = set(splits[a]) & set(splits[b])
    print(f"{a} <-> {b}: {len(overlap)} duplicate image hashes")

print("\nDONE")
