# Dataset inspection report

## Audit date and scope

Initial audit: 31 August 2026. The supplied project workspace had only `work/` and `outputs/`; no Dataset 1, Dataset 2, local raw data directory, or trained model was located. A recursive search of the user Documents/Codex tree did not locate a dataset-named directory. Therefore no local image/label counts, class lists, split counts, corrupt-image counts, duplicate counts, or damage labels can be truthfully reported yet.

## Dataset 3 accessibility

The public Hugging Face dataset is accessible. Its dataset viewer identifies a CSV/tabular train split with 3,000 rows and fields including brand, model, age_years, battery_health_pct, condition, screen_crack, scratches, repair_history, and estimated_resale_price_inr. It is not an image-recognition or damage-annotation dataset. Its values are educational/synthetic and must not be presented as authoritative market prices.

## Current Phase-1 model coverage

**None.** No verified local Dataset 1/2 model-training input or trained artifact is available, so the running app returns `unknown` after image-quality validation and asks the user to select a category for a clearly-labelled limited/manual assessment. It does not fabricate device predictions, confidence, damage, multiple-device detection, or model metrics.

## Required next audit

Run `python scripts/inspect_dataset.py --path <dataset-root>`. The report inspects image files, readable/corrupt files, SHA-256 duplicate groups, YOLO label IDs, missing labels, and `data.yaml`. Inspect each source separately. Map only semantically equivalent labels (for example `mobile` → `smartphone` when confirmed), retain source split boundaries, and document rejected/excluded mappings before any training.
