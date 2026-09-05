# Recommendation logic

The backend calculates five deterministic, bounded scores: Repair, Refurbish, Sell, Donate, and Recycle. Inputs include condition score, reported damage, device age, optional estimated value, and optional repair cost. Repair cost affects Repair only when both cost and value are supplied. The highest score is selected and mapped to a stakeholder category in `config/recommendation_rules.json`; no score is random.
