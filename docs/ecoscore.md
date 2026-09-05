# EcoScore methodology

`config/ecoscore_weights.json` is the single source of weights: reuse potential 30, condition 25, repairability 20, remaining useful life 15, recyclability 10. Each factor is calculated from reported age, functional answers, reported damage, and category; values are clamped and summed to 0–100. Bands: 0–30 Very Low, 31–50 Low, 51–70 Moderate, 71–85 High, 86–100 Excellent. This is an explainable Phase-1 heuristic, not a validated environmental life-cycle assessment.
