"""
EcoLoop AI — Centralized Deterministic Scoring & Recommendation Engine

This module provides:
1. Deterministic EcoScore calculation (0-100) using a 6-factor weighted model:
   - Working Condition:     25% (max 25 pts)
   - Physical Condition:    20% (max 20 pts)
   - Repairability:         20% (max 20 pts)
   - Device Age:            15% (max 15 pts)
   - Functional Health:     10% (max 10 pts)
   - Reuse Potential:       10% (max 10 pts)
   Total:                  100% (max 100 pts)

2. Deterministic Recommendation Engine:
   - Considers both EcoScore AND explicit answer indicators.
   - Evaluates: Repair, Refurbish, Sell, Donate, Recycle.
   - Produces evidence-based reasons grounded in the user's actual answers.

3. Environmental Impact Calculator:
   - Estimated e-waste avoided (kg)
   - Estimated CO2 benefit (kg CO2e)
   - Potential recoverable materials
   - Circular reuse rating
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from ..config import CONFIG

DEVICE_DEFINITIONS_PATH = CONFIG / "device_definitions.json"

# Fallback definitions in case the config file is absent
DEFAULT_WEIGHTS = {
    "working_condition": 25.0,
    "physical_condition": 20.0,
    "repairability": 20.0,
    "device_age": 15.0,
    "functional_health": 10.0,
    "reuse_potential": 10.0,
}

STAKEHOLDER_CATEGORIES = {
    "Repair": "Repair Shop",
    "Refurbish": "Refurbisher",
    "Sell": "Buyer / Marketplace",
    "Donate": "NGO / Donation Organization",
    "Recycle": "Authorized Recycler",
}

_cached_definitions: dict[str, Any] | None = None


def load_definitions() -> dict[str, Any]:
    """Load centralized device definitions with caching."""
    global _cached_definitions
    if _cached_definitions is not None:
        return _cached_definitions

    if DEVICE_DEFINITIONS_PATH.exists():
        try:
            data = json.loads(DEVICE_DEFINITIONS_PATH.read_text(encoding="utf-8"))
            _cached_definitions = data
            return data
        except Exception:
            pass

    return {"weights": DEFAULT_WEIGHTS, "devices": [], "common_questions": []}


def normalize_device_type(device_type: str | None) -> str:
    """Normalize device type identifiers and aliases."""
    if not device_type:
        return "other"
    dt = str(device_type).strip().lower().replace("-", "_").replace(" ", "_")
    alias_map = {
        "desktop_computer": "desktop",
        "personal_computer": "desktop",
        "pc": "desktop",
        "mobile": "smartphone",
        "phone": "smartphone",
        "cellphone": "smartphone",
        "tv": "television",
        "screen": "monitor",
        "fridge": "refrigerator",
        "washer": "washing_machine",
        "ac": "air_conditioner",
        "audio": "speaker",
        "speakers": "speaker",
        "audio_device": "speaker",
        "audio_system": "speaker",
    }
    return alias_map.get(dt, dt)


def get_device_info(device_type: str) -> dict[str, Any]:
    """Return device metadata and specific questions for a device category."""
    norm = normalize_device_type(device_type)
    defs = load_definitions()
    for d in defs.get("devices", []):
        if d.get("id") == norm:
            return d
    return {
        "id": norm,
        "name": norm.replace("_", " ").title(),
        "category": "Electronics",
        "glyph": "🔌",
        "mass_kg": 1.5,
        "embodied_co2_kg": 40.0,
        "recoverable_materials": ["Copper", "Plastics", "Steel", "Circuit Boards"],
        "specific_questions": [],
    }


def parse_age_years(val: Any) -> float:
    """Convert age answers (number or string like '8+', '3-4') into numeric years."""
    if val is None:
        return 2.0
    val_str = str(val).strip().lower()
    if val_str in {"8+", "8", "8_plus", "vintage", "old"}:
        return 8.0
    if val_str in {"0", "under_1", "new", "<1"}:
        return 0.5
    if val_str in {"1-2", "1_2"}:
        return 1.5
    if val_str in {"3-4", "3_4"}:
        return 3.5
    if val_str in {"5-7", "5_7"}:
        return 6.0
    try:
        return max(0.0, float(val))
    except (ValueError, TypeError):
        return 2.0


def score_working_condition(answers: dict[str, Any]) -> tuple[float, list[str]]:
    """
    Score working condition dimension: 0.0 to 1.0.
    Considers 'working_status', 'power', etc.
    """
    evidence: list[str] = []
    status = str(answers.get("working_status") or "").lower()
    power = str(answers.get("power") or "").lower()

    if status in {"fully_working", "working", "yes", "true", "excellent"}:
        score = 1.0
        evidence.append("Device is fully functional and operational")
    elif status in {"partially_working", "minor_issues", "minor_issue", "partially"}:
        score = 0.65
        evidence.append("Device is partially working with minor operational issues")
    elif status in {"major_issues", "major_issue", "failing", "unstable"}:
        score = 0.30
        evidence.append("Device experiences major operational instability or frequent failures")
    elif status in {"not_working", "dead", "no", "false"}:
        score = 0.05
        evidence.append("Device is non-operational or does not power on")
    else:
        # Check power indicator if working_status not explicitly provided
        if power in {"yes", "true", "working"}:
            score = 0.85
            evidence.append("Device powers on successfully")
        elif power in {"no", "false", "dead"}:
            score = 0.05
            evidence.append("Device does not power on")
        else:
            score = 0.70
            evidence.append("Standard working condition reported")

    return score, evidence


def score_physical_condition(answers: dict[str, Any]) -> tuple[float, list[str]]:
    """
    Score physical condition dimension: 0.0 to 1.0.
    Considers 'visible_damage', 'casing', 'scratches', etc.
    """
    evidence: list[str] = []
    damage = str(answers.get("visible_damage") or "").lower()

    if damage in {"none", "pristine", "like_new", "clean", "excellent"}:
        score = 1.0
        evidence.append("Physical condition is pristine with no visible damage")
    elif damage in {"minor", "cosmetic", "scratches", "good"}:
        score = 0.70
        evidence.append("Minor cosmetic scuffs or light exterior wear")
    elif damage in {"moderate", "fair", "dents", "scratches"}:
        score = 0.40
        evidence.append("Moderate exterior wear, scratches, or small casing cracks")
    elif damage in {"major", "severe", "cracked", "broken", "poor"}:
        score = 0.10
        evidence.append("Severe physical damage, cracked screen/housing, or broken structural components")
    else:
        score = 0.65
        evidence.append("Standard cosmetic condition")

    return score, evidence


def score_repairability(answers: dict[str, Any], working_score: float, physical_score: float) -> tuple[float, list[str]]:
    """
    Score repairability dimension: 0.0 to 1.0.
    Considers explicit 'repairability' answer or infers from fault modularity.
    """
    evidence: list[str] = []
    rep = str(answers.get("repairability") or "").lower()

    if rep in {"easy", "high", "modular", "parts_available"}:
        score = 1.0
        evidence.append("High repairability: modular design and accessible replacement parts")
    elif rep in {"moderate", "medium", "standard"}:
        score = 0.65
        evidence.append("Moderate repairability: standard tools and obtainable components")
    elif rep in {"difficult", "low", "unrepairable", "glued", "sealed", "obsolete"}:
        score = 0.20
        evidence.append("Low repairability: proprietary parts, sealed chassis, or difficult disassembly")
    else:
        # Default inferred from physical integrity
        if physical_score >= 0.7:
            score = 0.75
            evidence.append("Standard component repairability expected")
        elif working_score <= 0.2 and physical_score <= 0.2:
            score = 0.30
            evidence.append("Repairability constrained by compound defects")
        else:
            score = 0.60
            evidence.append("Reasonable potential for component-level repair")

    return score, evidence


def score_device_age(answers: dict[str, Any]) -> tuple[float, float, list[str]]:
    """
    Score age dimension: 0.0 to 1.0.
    Returns (normalized_score, numeric_age_years, evidence).
    """
    evidence: list[str] = []
    raw_age = answers.get("age_years", answers.get("age", 2))
    age = parse_age_years(raw_age)

    if age <= 1.0:
        score = 1.0
        evidence.append(f"Device is very recent (~{age:g} year old), retaining strong technological relevance")
    elif age <= 2.5:
        score = 0.85
        evidence.append(f"Device is modern (~{age:g} years old), with ample remaining design lifespan")
    elif age <= 4.5:
        score = 0.65
        evidence.append(f"Device is mid-cycle (~{age:g} years old), still capable of useful service")
    elif age <= 7.0:
        score = 0.40
        evidence.append(f"Device is mature (~{age:g} years old), approaching replacement cycle")
    else:
        score = 0.15
        evidence.append(f"Device is 8+ years old, subject to software/hardware obsolescence")

    return score, age, evidence


def score_functional_health(device_type: str, answers: dict[str, Any]) -> tuple[float, list[str]]:
    """
    Score functional health dimension: 0.0 to 1.0.
    Evaluates device-specific component questions.
    """
    evidence: list[str] = []
    device_info = get_device_info(device_type)
    specific_questions = device_info.get("specific_questions", [])

    if not specific_questions:
        # Fallback to checking generic boolean/status keys
        observed = 0
        sum_scores = 0.0
        for key in ["charging", "display", "touch", "battery", "connection", "ports"]:
            val = answers.get(key)
            if val is not None:
                v = str(val).lower()
                observed += 1
                if v in {"yes", "true", "working", "flawless", "healthy"}:
                    sum_scores += 1.0
                elif v in {"minor", "degraded", "loose", "some_keys_faulty"}:
                    sum_scores += 0.6
                else:
                    sum_scores += 0.1
        if observed > 0:
            score = sum_scores / observed
            evidence.append(f"Evaluated {observed} component health indicators")
            return max(0.0, min(1.0, score)), evidence
        return 0.75, ["Standard component health inferred"]

    scores: list[float] = []
    for q in specific_questions:
        q_key = q["key"]
        ans = answers.get(q_key)
        if ans is None:
            continue
        ans_str = str(ans).lower()
        matched = False
        for opt in q.get("options", []):
            if opt["value"].lower() == ans_str:
                scores.append(float(opt.get("score", 0.5)))
                matched = True
                if float(opt.get("score", 0.5)) >= 0.8:
                    evidence.append(f"{q['label']}: healthy")
                elif float(opt.get("score", 0.5)) <= 0.3:
                    evidence.append(f"{q['label']}: defect reported")
                break
        if not matched:
            # Generic heuristics
            if ans_str in {"yes", "working", "healthy", "clean", "reliable"}:
                scores.append(1.0)
            elif ans_str in {"no", "broken", "dead", "faulty"}:
                scores.append(0.1)
            else:
                scores.append(0.5)

    if scores:
        score = sum(scores) / len(scores)
    else:
        score = 0.75
        evidence.append("Component health within normal baseline")

    return max(0.0, min(1.0, score)), evidence


def score_reuse_potential(
    working_score: float,
    physical_score: float,
    repair_score: float,
    age_score: float,
    age_years: float,
) -> tuple[float, list[str]]:
    """
    Score circular reuse potential dimension: 0.0 to 1.0.
    Reflects whether someone else can directly or secondary-use this device.
    """
    evidence: list[str] = []
    # Base reuse potential is driven by operational status and physical appeal
    base = (working_score * 0.45) + (physical_score * 0.30) + (repair_score * 0.15) + (age_score * 0.10)

    # Age penalty for very obsolete tech
    if age_years >= 8:
        base *= 0.65
        evidence.append("Reuse potential modulated by device age")
    elif working_score >= 0.8 and physical_score >= 0.7:
        base = max(base, 0.85)
        evidence.append("Strong secondary reuse market interest")

    score = max(0.05, min(1.0, base))
    return score, evidence


def calculate_ecoscore_and_breakdown(
    device_type: str,
    answers: dict[str, Any],
) -> dict[str, Any]:
    """
    Calculate the transparent, deterministic EcoScore and full breakdown.
    Returns:
    {
      "ecoscore": float (0-100),
      "ecoscore_band": str,
      "condition": str,
      "condition_score": float,
      "confidence": float,
      "breakdown": dict[str, float],
      "breakdown_details": dict[str, Any],
      "evidence": list[str],
      "age_years": float,
    }
    """
    weights = DEFAULT_WEIGHTS

    w_score, w_ev = score_working_condition(answers)
    p_score, p_ev = score_physical_condition(answers)
    r_score, r_ev = score_repairability(answers, w_score, p_score)
    a_score, age_years, a_ev = score_device_age(answers)
    f_score, f_ev = score_functional_health(device_type, answers)
    u_score, u_ev = score_reuse_potential(w_score, p_score, r_score, a_score, age_years)

    # Calculate points for each factor: normalized * weight
    working_points = round(w_score * weights["working_condition"], 1)
    physical_points = round(p_score * weights["physical_condition"], 1)
    repair_points = round(r_score * weights["repairability"], 1)
    age_points = round(a_score * weights["device_age"], 1)
    functional_points = round(f_score * weights["functional_health"], 1)
    reuse_points = round(u_score * weights["reuse_potential"], 1)

    breakdown = {
        "working_condition": working_points,
        "physical_condition": physical_points,
        "repairability": repair_points,
        "device_age": age_points,
        "functional_health": functional_points,
        "reuse_potential": reuse_points,
    }

    # Sum of factors equals final EcoScore
    ecoscore = round(sum(breakdown.values()), 1)
    ecoscore = max(0.0, min(100.0, ecoscore))

    # Comprehensive condition score (0-100) based on working, physical, and functional health
    condition_score = round(
        ((w_score * 0.45) + (p_score * 0.35) + (f_score * 0.20)) * 100, 1
    )

    if condition_score >= 85:
        condition = "Excellent"
    elif condition_score >= 70:
        condition = "Good"
    elif condition_score >= 50:
        condition = "Moderate"
    elif condition_score >= 25:
        condition = "Poor"
    else:
        condition = "Non-functional"

    if ecoscore <= 30:
        band = "Very Low"
    elif ecoscore <= 50:
        band = "Low"
    elif ecoscore <= 70:
        band = "Moderate"
    elif ecoscore <= 85:
        band = "High"
    else:
        band = "Excellent"

    # Confidence calculation based on number of answered items
    answered_count = len([k for k, v in answers.items() if v not in {None, "", "unknown"}])
    confidence = min(95.0, 45.0 + (answered_count * 8.0))

    breakdown_details = {
        "working_condition": {
            "label": "Working Condition",
            "score": working_points,
            "max": weights["working_condition"],
            "normalized": round(w_score, 2),
            "summary": "Operating stability and core readiness.",
        },
        "physical_condition": {
            "label": "Physical Condition",
            "score": physical_points,
            "max": weights["physical_condition"],
            "normalized": round(p_score, 2),
            "summary": "Casing, display, and cosmetic integrity.",
        },
        "repairability": {
            "label": "Repairability",
            "score": repair_points,
            "max": weights["repairability"],
            "normalized": round(r_score, 2),
            "summary": "Modularity, screw access, and replacement parts availability.",
        },
        "device_age": {
            "label": "Device Age",
            "score": age_points,
            "max": weights["device_age"],
            "normalized": round(a_score, 2),
            "summary": "Technological relevance and remaining useful lifespan.",
        },
        "functional_health": {
            "label": "Functional Health",
            "score": functional_points,
            "max": weights["functional_health"],
            "normalized": round(f_score, 2),
            "summary": "Specific component tests (battery, screen, ports, motor).",
        },
        "reuse_potential": {
            "label": "Reuse Potential",
            "score": reuse_points,
            "max": weights["reuse_potential"],
            "normalized": round(u_score, 2),
            "summary": "Market value retention and suitability for direct re-homing.",
        },
    }

    all_evidence = w_ev + p_ev + r_ev + a_ev + f_ev + u_ev

    return {
        "ecoscore": ecoscore,
        "ecoscore_band": band,
        "condition": condition,
        "condition_score": condition_score,
        "confidence": confidence,
        "breakdown": breakdown,
        "breakdown_details": breakdown_details,
        "evidence": all_evidence,
        "age_years": age_years,
        "raw_factors": {
            "working": w_score,
            "physical": p_score,
            "repair": r_score,
            "age": a_score,
            "functional": f_score,
            "reuse": u_score,
        },
    }


def calculate_recommendation(
    device_type: str,
    answers: dict[str, Any],
    ecoscore: float,
    condition_score: float,
    factors: dict[str, float],
    age_years: float,
) -> tuple[str, dict[str, float], list[str], str, str]:
    """
    Deterministic Recommendation Engine.
    Considers BOTH the EcoScore and critical assessment answers.

    Returns:
    (recommended_action, recommendation_scores, reasons, explanation, stakeholder_category)
    """
    w_score = factors["working"]
    p_score = factors["physical"]
    r_score = factors["repair"]
    a_score = factors["age"]
    f_score = factors["functional"]

    damage = str(answers.get("visible_damage") or "").lower()
    status = str(answers.get("working_status") or "").lower()

    # Base scores for each action (0 to 100)
    scores = {
        "Repair": 0.0,
        "Refurbish": 0.0,
        "Sell": 0.0,
        "Donate": 0.0,
        "Recycle": 0.0,
    }

    reasons: list[str] = []

    # 1. Critical Recycling checks
    # Severe physical damage + low repairability OR completely dead with no repairability
    is_severely_damaged = damage == "major" or p_score <= 0.2
    is_non_repairable = r_score <= 0.35
    is_dead = status == "not_working" or w_score <= 0.15

    has_repairable_defect = (
        w_score < 0.85
        or f_score < 0.75
        or (damage in {"moderate", "minor"} and status != "fully_working")
    )

    if (is_severely_damaged and is_non_repairable) or (is_dead and is_non_repairable) or ecoscore < 30:
        scores["Recycle"] = 92.0 + (100.0 - ecoscore) * 0.08
        scores["Repair"] = 15.0
        scores["Refurbish"] = 20.0
        scores["Sell"] = 5.0
        scores["Donate"] = 10.0

        if is_severely_damaged:
            reasons.append("Severe physical damage impairs structural integrity and safe operation.")
        if is_dead:
            reasons.append("Device is non-functional with limited technical restoration feasibility.")
        if is_non_repairable:
            reasons.append("Lack of modular components or replacement parts makes repair unfeasible.")
        reasons.append("Authorized recycling prevents toxic e-waste in landfills and recovers essential secondary raw materials.")

    # 2. Repair Scenario: Device has an actual repairable defect/fault with good modularity
    elif has_repairable_defect and r_score >= 0.50 and ecoscore >= 35:
        # Strong repair candidate
        scores["Repair"] = 52.0 + (r_score * 30.0) + (w_score * 15.0)
        scores["Refurbish"] = 40.0 + (condition_score * 0.4)
        scores["Recycle"] = max(10.0, (100.0 - condition_score) * 0.6)
        scores["Sell"] = condition_score * 0.5
        scores["Donate"] = condition_score * 0.45

        reasons.append("The core architecture and primary components remain fundamentally functional.")
        reasons.append("Identified functional or cosmetic issues can be resolved with localized component replacement.")
        reasons.append("High repairability and modular parts availability make repair the most resource-efficient choice.")
        reasons.append("Restoring the device avoids the substantial environmental cost of manufacturing new hardware.")

    # 3. High working condition + good physical shape: Sell vs Donate vs Refurbish
    elif w_score >= 0.80 and p_score >= 0.65:
        if age_years <= 3.5 and ecoscore >= 70:
            # Modern, high score -> Sell
            scores["Sell"] = 55.0 + (ecoscore * 0.40) + (p_score * 10.0)
            scores["Donate"] = 45.0 + (ecoscore * 0.35)
            scores["Refurbish"] = 35.0 + (ecoscore * 0.30)
            scores["Repair"] = 25.0
            scores["Recycle"] = 10.0

            reasons.append("Device is in fully working condition with minimal cosmetic wear.")
            reasons.append(f"At ~{age_years:g} years old, it retains high commercial value and strong secondary market demand.")
            reasons.append("Reselling directly extends the product lifespan with an active new owner without remanufacturing.")
        else:
            # Older device in good shape -> Donate
            scores["Donate"] = 55.0 + (ecoscore * 0.38) + (w_score * 10.0)
            scores["Sell"] = 40.0 + (ecoscore * 0.30)
            scores["Refurbish"] = 45.0 + (ecoscore * 0.35)
            scores["Repair"] = 20.0
            scores["Recycle"] = 15.0

            reasons.append("Device remains reliable and fully capable of standard everyday use.")
            reasons.append("Donating to schools, non-profits, or community initiatives provides vital technological access.")
            reasons.append("Direct community reuse delivers maximum immediate social and environmental benefit.")

    # 4. Moderate condition, aging hardware -> Refurbish
    else:
        scores["Refurbish"] = 50.0 + (ecoscore * 0.40) + (r_score * 10.0)
        scores["Repair"] = 45.0 + (r_score * 30.0)
        scores["Donate"] = 35.0 + (ecoscore * 0.30)
        scores["Sell"] = 30.0 + (ecoscore * 0.25)
        scores["Recycle"] = max(15.0, (100.0 - ecoscore) * 0.5)

        reasons.append("Hardware fundamentals are sound, but the device requires professional servicing or clean-up.")
        reasons.append("Refurbishment bridges the gap between aging equipment and reliable secondary deployment.")
        reasons.append("Professional diagnostics and parts rejuvenation restore performance while preventing premature disposal.")

    # Clamp scores
    scores = {k: round(max(0.0, min(100.0, v)), 1) for k, v in scores.items()}
    action = max(scores, key=scores.get)
    stakeholder = STAKEHOLDER_CATEGORIES.get(action, "Authorized Recycler")

    # If action won by score, ensure reasons match that specific action
    if action == "Repair" and not any("repair" in r.lower() for r in reasons):
        reasons = [
            "Device shows localized faults while maintaining sound primary architecture.",
            "Component replacement is practical and cost-effective.",
            "Repairing preserves existing embodied materials and avoids new manufacturing emissions.",
        ]
    elif action == "Recycle" and not any("recycl" in r.lower() for r in reasons):
        reasons = [
            "Significant damage or non-functional status renders continued safe operation unfeasible.",
            "Repair costs or parts scarcity make restoration economically and environmentally inefficient.",
            "Certified recycling safely neutralizes hazardous materials and reclaims valuable metals.",
        ]
    elif action == "Sell" and not any("sell" in r.lower() for r in reasons):
        reasons = [
            "Excellent working status and physical condition create strong market appeal.",
            "High residual financial value rewards responsible ownership.",
            "Direct resale transfers the equipment to a new user with zero processing overhead.",
        ]
    elif action == "Donate" and not any("donat" in r.lower() for r in reasons):
        reasons = [
            "Dependable working order provides strong utility for charitable or educational programs.",
            "Donation fosters technological inclusion in underserved communities.",
            "Extends operational life without requiring commercial intermediaries.",
        ]
    elif action == "Refurbish" and not any("refurbish" in r.lower() for r in reasons):
        reasons = [
            "Hardware is fundamentally sound but requires tuning, cleaning, or minor component refresh.",
            "Refurbishment restores factory performance standards for secondary commercial use.",
            "Extends product longevity while keeping high-grade materials in active circulation.",
        ]

    explanation = (
        f"EcoLoop evaluated your {device_type.replace('_', ' ')} based on condition, repairability, and age. "
        + " ".join(reasons[:2])
    )

    return action, scores, reasons, explanation, stakeholder


def calculate_environmental_impact(
    device_type: str,
    ecoscore: float,
    recommended_action: str,
) -> dict[str, Any]:
    """
    Calculate transparent environmental impact estimates.
    All figures are marked as estimates based on device category life cycle analyses.
    """
    device_info = get_device_info(device_type)
    mass_kg = float(device_info.get("mass_kg", 1.5))
    embodied_co2_kg = float(device_info.get("embodied_co2_kg", 40.0))
    materials = list(device_info.get("recoverable_materials", ["Metals", "Plastics"]))

    # Efficiency factor by action
    action_l = recommended_action.lower()
    if action_l in {"sell", "donate"}:
        diversion_rate = 0.98
        co2_multiplier = 0.92
        rating = "High"
    elif action_l in {"repair", "refurbish"}:
        diversion_rate = 0.90
        co2_multiplier = 0.85
        rating = "High" if ecoscore >= 65 else "Moderate"
    else:  # recycle
        diversion_rate = 0.78
        co2_multiplier = 0.45
        rating = "Material Recovery"

    waste_avoided = round(mass_kg * diversion_rate, 2)
    co2_benefit = round(embodied_co2_kg * co2_multiplier, 1)

    return {
        "waste_avoided_kg": waste_avoided,
        "co2_benefit_kg": co2_benefit,
        "device_mass_kg": mass_kg,
        "recoverable_materials": materials,
        "reuse_potential_rating": rating,
        "estimate_disclaimer": "All environmental figures are transparent estimates based on average device mass and embodied manufacturing carbon indices.",
    }


def score_assessment(device: str, answers: dict[str, Any]):
    """
    Main entry point maintaining signature compatibility with existing code.
    Returns:
    (condition, condition_score, assessment_confidence, evidence, eco, breakdown, scores, action, explanation, stakeholder, reasons, environmental_impact, breakdown_details)
    """
    norm_device = normalize_device_type(device)
    result = calculate_ecoscore_and_breakdown(norm_device, answers)

    action, scores, reasons, explanation, stakeholder = calculate_recommendation(
        norm_device,
        answers,
        result["ecoscore"],
        result["condition_score"],
        result["raw_factors"],
        result["age_years"],
    )

    env_impact = calculate_environmental_impact(norm_device, result["ecoscore"], action)

    return (
        result["condition"],
        result["condition_score"],
        result["confidence"],
        result["evidence"],
        result["ecoscore"],
        result["breakdown"],
        scores,
        action,
        explanation,
        stakeholder,
        reasons,
        env_impact,
        result["breakdown_details"],
    )
