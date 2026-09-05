# ML pipeline status

No model was trained in the initial environment because no local image dataset or trained artifact was present. `inspect_dataset.py` produces an auditable report, `prepare_dataset.py` records an approved mapping without merging data, and training/evaluation scripts deliberately stop rather than fabricate results. After validating Dataset 2 labels and splits, choose a compatible YOLO runtime, train only on approved classes, retain held-out data, and record real precision/recall/mAP. Do not claim visible damage detection unless labels specifically support it.
