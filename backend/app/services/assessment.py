import json
from pathlib import Path
from typing import Any
from ..config import CONFIG

YES = {'yes', True, 'working', 'none'}
NO = {'no', False, 'not_working'}

def load(name: str):
    return json.loads((CONFIG / name).read_text(encoding='utf-8'))

def condition_engine(answers: dict[str, Any]) -> tuple[str, float, float, list[str]]:
    score, observed, evidence = 72.0, 0, []
    age = float(answers.get('age_years') or 0)
    score -= min(age * 4, 28)
    if age: evidence.append(f"Reported age: {age:g} year(s)")
    for key, label in [('power','Powers on'), ('charging','Charging works'), ('display','Display works'), ('touch','Touch works'), ('battery','Battery performs adequately'), ('working_status','Overall working status')]:
        val = answers.get(key)
        if val is None or val == 'unknown': continue
        observed += 1
        if str(val).lower() in YES: score += 5; evidence.append(f"{label}: yes")
        elif str(val).lower() in NO: score -= 14; evidence.append(f"{label}: no")
    damage = str(answers.get('visible_damage', 'unknown')).lower()
    if damage == 'minor': score -= 8; observed += 1; evidence.append('Minor visible damage reported')
    elif damage == 'major': score -= 22; observed += 1; evidence.append('Major visible damage reported')
    elif damage == 'none': score += 3; observed += 1; evidence.append('No visible damage reported')
    score = max(0, min(100, score))
    label = 'Excellent' if score >= 86 else 'Good' if score >= 70 else 'Moderate' if score >= 51 else 'Poor' if score >= 26 else 'Non-functional'
    confidence = min(90, 35 + observed * 8 + (10 if answers.get('age_years') is not None else 0))
    return label, round(score, 1), round(confidence, 1), evidence

def score_assessment(device: str, answers: dict[str, Any]):
    weights = load('ecoscore_weights.json')
    condition, condition_score, assessment_confidence, evidence = condition_engine(answers)
    age = float(answers.get('age_years') or 0)
    functional = max(0, min(1, condition_score / 100))
    reuse = weights['reuse_potential'] * functional
    condition_points = weights['condition'] * functional
    repairability = weights['repairability'] * (0.82 if condition_score >= 30 else 0.45)
    useful_life = weights['remaining_useful_life'] * max(0.15, 1 - age / 10)
    recyclability = weights['recyclability'] * (0.9 if device not in {'other'} else 0.65)
    breakdown = {'reuse_potential': round(reuse,1), 'condition': round(condition_points,1), 'repairability': round(repairability,1), 'remaining_useful_life': round(useful_life,1), 'recyclability': round(recyclability,1)}
    eco = round(sum(breakdown.values()), 1)
    rules = load('recommendation_rules.json')
    damage = str(answers.get('visible_damage','unknown')).lower()
    repair_cost = float(answers.get('estimated_repair_cost') or 0)
    current_value = float(answers.get('estimated_value') or 0)
    repair_economic = 0 if not current_value else max(-18, min(18, 18 * (1 - repair_cost / max(current_value, 1))))
    scores = {
      'Repair': 35 + .48*condition_score + repair_economic + (10 if damage in {'minor','major'} else 0),
      'Refurbish': 24 + .57*condition_score + (8 if age >= 2 else 0),
      'Sell': 18 + .58*condition_score + (7 if current_value > 0 else 0),
      'Donate': 25 + .43*condition_score + (8 if current_value <= 0 else 0),
      'Recycle': 18 + .7*(100-condition_score) + (8 if damage == 'major' else 0),
    }
    scores = {key: round(max(0, min(100, value)), 1) for key, value in scores.items()}
    action = max(scores, key=scores.get)
    stakeholder = rules['stakeholder_categories'][action]
    reasons = [f"Condition score is {condition_score}/100 ({condition.lower()}).", f"EcoScore is calculated from reuse, condition, repairability, useful life, and recyclability."]
    if action == 'Repair': reasons.append('Restoring the device is scored as more valuable than ending its useful life.')
    elif action == 'Recycle': reasons.append('Low functional condition makes responsible material recovery the strongest option.')
    else: reasons.append(f"{action} has the highest transparent Phase-1 option score.")
    return condition, condition_score, assessment_confidence, evidence, eco, breakdown, scores, action, ' '.join(reasons), stakeholder
