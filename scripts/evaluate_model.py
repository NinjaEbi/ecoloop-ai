"""Evaluation guard: metrics are generated only after a real model and held-out dataset exist."""
raise SystemExit('No evaluation metrics available: no local verified model or held-out dataset was present.')
