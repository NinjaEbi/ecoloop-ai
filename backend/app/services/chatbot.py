"""
EcoLoop AI — Grounded Circular Economy Chatbot & Decision Guidance Assistant

This service provides intelligent, educational, and explainable responses
grounded in the exact EcoLoop AI application context, deterministic scoring engine,
page-level awareness, dynamic assessment context, and circular economy principles.

CRITICAL ARCHITECTURAL RULES:
1. The chatbot MUST NOT calculate, alter, or override the EcoScore or recommendation.
2. It MUST be strictly deterministic and transparent when explaining scores.
3. It MUST refuse off-topic questions politely (domain restriction) with the exact mandated wording:
   "I'm here to help with EcoLoop AI, e-waste guidance, device assessments, EcoScore results and how this website works. Please ask a question related to EcoLoop AI."
4. It MUST NOT hallucinate scoring factors, arbitrary numbers, or unsupported features (e.g. cloud database, user accounts).
5. If a value is unavailable, state that the information is not available; never guess.
"""

from __future__ import annotations

import re
from typing import Any

from .scoring_engine import (
    DEFAULT_WEIGHTS,
    get_device_info,
    load_definitions,
    normalize_device_type,
)

FACTOR_MAX_POINTS: dict[str, int] = {
    "working_condition": 25,
    "physical_condition": 20,
    "repairability": 20,
    "device_age": 15,
    "functional_health": 10,
    "reuse_potential": 10,
}

FACTOR_LABELS: dict[str, str] = {
    "working_condition": "Working Condition",
    "physical_condition": "Physical Condition",
    "repairability": "Repairability",
    "device_age": "Device Age",
    "functional_health": "Functional Health",
    "reuse_potential": "Reuse Potential",
}

SUPPORTED_DEVICES_LIST = [
    "Smartphone",
    "Laptop",
    "Desktop Computer",
    "Tablet",
    "Television",
    "Monitor",
    "Refrigerator",
    "Washing Machine",
    "Air Conditioner",
    "Printer",
    "Keyboard",
    "Mouse",
    "Router",
    "Speaker / Audio Device",
    "Other Electronics",
]

# Patterns for off-topic questions (Requirement B8)
OFF_TOPIC_PATTERNS = [
    # Geography, capitals, general world trivia
    r"\b(capital of|population of|currency of|where is (france|germany|italy|spain|india|japan|china|usa|america|russia|brazil|canada|australia|london|paris|rome|tokyo|delhi|new york|berlin|madrid|beijing))\b",
    r"^\s*who (is|was|are|were)\b(?!\s*(?:ecoloop|the stakeholder|the recycler|the partner))",
    r"^\s*what is the capital\b",
    # Sports & matches
    r"\b(cricket|football|soccer|ipl|nfl|nba|fifa|world cup|messi|ronaldo|tennis|baseball|basketball|match|who won)\b",
    # Programming & general software development
    r"\b(python|javascript|typescript|java|c\+\+|c#|php|ruby|rust|golang|docker|kubernetes|sql query|regex)\b",
    r"\b(write.*(?:code|script|program|function|algorithm|class|method|sql))\b",
    # Math & science homework
    r"\b(solve|equation|derivative|integral|algebra|calculus|geometry|physics formula|quadratic)\b",
    r"^\s*what is \d+\s*[\+\-\*\/]\s*\d+",
    # Politics & politicians
    r"\b(president|prime minister|politics|election|parliament|senator|congressman|minister)\b",
    # Entertainment, lifestyle, recipes
    r"\b(joke|riddle|funny story|sing a song|poem|recipe|cook pizza|bake cake|movie recommendation|actor|actress|celebrity)\b",
    # Finance, stocks, crypto
    r"\b(stock price|crypto|bitcoin|ethereum|forex|nft|trading)\b",
    # Weather
    r"\b(weather|temperature|rain today|forecast|humidity)\b",
]

DOMAIN_REFUSAL_MESSAGE = (
    "I'm here to help with EcoLoop AI, e-waste guidance, "
    "device assessments, EcoScore results and how this website works. "
    "Please ask a question related to EcoLoop AI."
)


def is_off_topic(message: str) -> bool:
    """Detect if a user prompt is unrelated to EcoLoop AI and circular economy."""
    msg = message.strip().lower()

    # Check off-topic patterns
    for pat in OFF_TOPIC_PATTERNS:
        if re.search(pat, msg):
            # Allow legitimate queries that explicitly ask about EcoLoop or device assessment
            if any(
                kw in msg
                for kw in [
                    "ecoloop",
                    "ecoscore",
                    "e-waste",
                    "ewaste",
                    "assessment",
                    "scoring",
                    "circular",
                ]
            ):
                return False
            return True

    return False


def generate_suggested_questions(
    device_type: str | None,
    action: str | None,
    ecoscore: float | None,
    page_context: str | None = None,
    mode: str | None = None,
) -> list[str]:
    """Generate dynamic contextual prompt suggestions for the user."""
    suggestions: list[str] = []
    dev_label = (device_type or "device").replace("_", " ").title()

    if mode == "assessment":
        suggestions.append("What am I assessing?")
        suggestions.append("What does this question mean?")
        suggestions.append("Why are you asking about device age?")
        suggestions.append("What does repairability mean?")
        return suggestions[:4]

    if ecoscore is not None:
        suggestions.append(f"Why did my {dev_label.lower()} get {round(ecoscore)}?")
        suggestions.append("What lowered my score?")
        if action:
            act = action.capitalize()
            suggestions.append(f"Why was {act} recommended?")
            if act == "Repair":
                suggestions.append(f"Where can I repair this {dev_label.lower()}?")
            elif act in {"Sell", "Donate"}:
                suggestions.append("How do I safely wipe data?")
            elif act == "Recycle":
                suggestions.append("What should I do before recycling it?")
        return suggestions[:4]

    # Context suggestions based on the current page
    page = (page_context or "").lower()
    if page == "analyze":
        suggestions.append("What devices can I assess?")
        suggestions.append("How is the EcoScore calculated?")
        suggestions.append("What does repairability mean?")
        suggestions.append("Why are device questions specific?")
    elif page == "history":
        suggestions.append("Where is my history stored?")
        suggestions.append("Can I see my history on another laptop?")
        suggestions.append("How does EcoScore track impact?")
    elif page == "learn":
        suggestions.append("What happens to e-waste?")
        suggestions.append("How to safely handle batteries?")
        suggestions.append("How to wipe data before disposal?")
    elif page == "about":
        suggestions.append("What is EcoLoop AI?")
        suggestions.append("How does the assessment work?")
        suggestions.append("What do the recommendations mean?")
    else:
        suggestions.append("What is EcoLoop AI?")
        suggestions.append("How is the EcoScore calculated?")
        suggestions.append("Where is my history stored?")
        suggestions.append("How to wipe personal data?")

    return suggestions[:4]


def answer_chat_message(
    user_message: str,
    assessment_context: dict[str, Any] | None = None,
    page_context: str | None = None,
) -> dict[str, Any]:
    """
    Generate an explainable, expert response grounded in circular economy principles,
    real application facts, and the user's explicit assessment context.
    """
    raw_msg = user_message.strip()
    msg = raw_msg.lower()
    ctx = assessment_context or {}

    # Extract mode ("global" | "assessment" | "result")
    mode = ctx.get("mode")

    # Extract device info
    dev_obj = ctx.get("device")
    if isinstance(dev_obj, dict):
        device_type = dev_obj.get("id") or dev_obj.get("device_type") or ctx.get("device_type")
        device_name = dev_obj.get("name") or (device_type.replace("_", " ").title() if device_type else "Device")
        device_category = dev_obj.get("category")
    else:
        device_type = ctx.get("device_type")
        device_name = device_type.replace("_", " ").title() if device_type else "Device"
        device_category = ctx.get("device_category")

    # Extract result info
    res_obj = ctx.get("result")
    if isinstance(res_obj, dict):
        ecoscore = res_obj.get("ecoScore") if res_obj.get("ecoScore") is not None else res_obj.get("ecoscore")
        action = res_obj.get("recommendation") or res_obj.get("recommended_action")
        band = res_obj.get("ecoscore_band") or res_obj.get("band")
        breakdown = res_obj.get("scoringFactors") or res_obj.get("ecoscore_breakdown") or {}
        env = res_obj.get("carbonImpact") or res_obj.get("environmental_impact") or {}
        reasons = res_obj.get("recommendation_reasons") or res_obj.get("reasons") or []
    else:
        ecoscore = ctx.get("ecoscore") if ctx.get("ecoscore") is not None else ctx.get("ecoScore")
        action = ctx.get("recommended_action") or ctx.get("recommendation")
        band = ctx.get("ecoscore_band")
        breakdown = ctx.get("ecoscore_breakdown") or ctx.get("scoringFactors") or {}
        env = ctx.get("environmental_impact") or ctx.get("carbonImpact") or {}
        reasons = ctx.get("recommendation_reasons") or ctx.get("reasons") or []

    if band is None and ecoscore is not None:
        if ecoscore >= 75:
            band = "High"
        elif ecoscore >= 50:
            band = "Moderate"
        else:
            band = "Low"

    # Extract assessment question state
    current_q = ctx.get("currentQuestion") or ctx.get("current_question") or {}
    q_num = ctx.get("questionNumber") or ctx.get("question_number")
    total_q = ctx.get("totalQuestions") or ctx.get("total_questions")
    answers = ctx.get("answers") or {}

    # Infer mode if not provided explicitly
    if not mode:
        if ecoscore is not None:
            mode = "result"
        elif current_q or q_num:
            mode = "assessment"
        else:
            mode = "global"

    # ------------------------------------------------------------
    # 1. DOMAIN RESTRICTION CHECK (Requirement B8)
    # ------------------------------------------------------------
    if is_off_topic(raw_msg):
        return {
            "reply": DOMAIN_REFUSAL_MESSAGE,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # ------------------------------------------------------------
    # 2. HISTORY STORAGE & ISOLATION QUESTIONS (Requirement B10)
    # ------------------------------------------------------------
    if any(k in msg for k in ["where is my history stored", "where is history stored", "history stored", "how is history stored"]):
        reply = (
            "Your EcoLoop assessment history is stored locally in your web browser using **localStorage** "
            "under the dedicated `ecoloop_history` key.\n\n"
            "EcoLoop AI is designed without user accounts or cloud databases, which means your records are "
            "completely private to your current browser. No personal assessment data is transmitted to an online server."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    if any(k in msg for k in ["another laptop", "another computer", "another device", "sync history", "synchronize", "different laptop", "different computer"]):
        reply = (
            "No. Because EcoLoop AI stores your history locally in the browser's **localStorage** without a login or cloud account, "
            "records are isolated to this specific browser on this device.\n\n"
            "History does not synchronize between different laptops, computers, or mobile phones."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # ------------------------------------------------------------
    # 3. ASSESSMENT IN-PROGRESS QUESTIONS (Requirement B3)
    # ------------------------------------------------------------

    # A. "What am I assessing?" / "What device is this?"
    if any(k in msg for k in ["what am i assessing", "what device am i", "what device is this", "what is this device"]):
        category_text = f" ({device_category})" if device_category else ""
        step_text = f" You are currently on question {q_num} of {total_q}." if q_num and total_q else ""
        reply = (
            f"You are currently assessing a **{device_name}**{category_text}.{step_text}\n\n"
            "EcoLoop AI evaluates its operational functionality, physical condition, and component repairability "
            "to calculate a deterministic EcoScore (0–100) and recommend the best circular pathway "
            "(Repair, Refurbish, Sell, Donate, or Recycle)."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # B. "What does this question mean?" / "Explain this question"
    if any(k in msg for k in ["what does this question mean", "explain this question", "what does the question mean", "meaning of this question"]):
        if current_q and current_q.get("label"):
            q_label = current_q.get("label")
            q_factor = current_q.get("factor")
            factor_title = FACTOR_LABELS.get(q_factor, (q_factor or "Condition").replace("_", " ").title())
            options = current_q.get("options") or []
            options_text = ""
            if options:
                opt_lines = "\n".join(f"• **{opt.get('label')}:** {opt.get('description', '')}" for opt in options if isinstance(opt, dict))
                if opt_lines:
                    options_text = f"\n\n**Options for this check:**\n{opt_lines}"

            reply = (
                f"**Current Question:** \"{q_label}\"\n\n"
                f"This question evaluates **{factor_title}** for your {device_name}. "
                "Your answer directly informs the deterministic scoring algorithm, ensuring the recommended circular "
                f"action aligns with the true mechanical and cosmetic state of the device.{options_text}"
            )
        else:
            reply = (
                f"Assessment questions for your {device_name} evaluate key operational, physical, and modularity attributes. "
                "Each question targets one of EcoLoop's 6 transparent scoring factors (working condition, physical state, repairability, "
                "age, functional health, and reuse potential) to calculate an accurate EcoScore."
            )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # C. "Why are you asking about device age?" / "Why ask age?"
    if any(k in msg for k in ["why are you asking about device age", "why ask about age", "why device age", "why ask age", "importance of age"]):
        reply = (
            "**Why EcoLoop AI asks about Device Age:**\n\n"
            "Device age contributes 15% (up to 15 points) of the total EcoScore for several critical reasons:\n"
            "• **Component Wear:** Lithium-ion battery capacity degrades naturally over years, and capacitors and bearings reach end-of-life.\n"
            "• **Software & Security Support:** Modern operating system updates and security patches gradually cease for older hardware.\n"
            "• **Secondary Market Demand:** Newer hardware retains strong resale and donation utility, whereas aging hardware is more economically aligned with component harvesting or recycling."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # D. "What does repairability mean?" / "Explain repairability"
    if any(k in msg for k in ["repairability mean", "what is repairability", "explain repairability"]):
        reply = (
            "**Repairability** (20% / up to 20 points of the EcoScore) assesses how practically and safely a device can be serviced:\n\n"
            "• **Fasteners:** Standard Phillips screws vs heavy adhesive glue or proprietary tamper-resistant screws.\n"
            "• **Modularity:** Swappable sub-assemblies (battery, display, RAM, drive, motor brushes) vs integrated soldered boards.\n"
            "• **Parts Availability:** Widespread commercial availability of original or OEM-compatible spare parts.\n\n"
            "Devices with high repairability can be economically fixed and kept in use, preventing premature disposal."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # E. "Why is this factor important?" / "Why is this factor being asked?"
    if any(k in msg for k in ["why is this factor important", "why is this factor", "why this factor", "importance of this factor"]):
        q_factor = current_q.get("factor") if current_q else None
        if q_factor == "working_condition":
            reply = (
                "**Working Condition** carries the highest single weight (25% / 25 points). Operational hardware "
                "can be immediately reused, resold, or donated without expensive parts replacement, making it the most "
                "environmentally impactful circular factor."
            )
        elif q_factor == "physical_condition":
            reply = (
                "**Physical Condition** carries 20% (20 points). Casing integrity, absence of deep cracks, and screen "
                "health determine whether a device can be used safely and whether it qualifies for top secondary resale or donation."
            )
        elif q_factor == "repairability":
            reply = (
                "**Repairability** carries 20% (20 points). A device that can be disassembled with standard tools and standard "
                "spares has a vastly longer expected lifespan than a glued-shut device."
            )
        elif q_factor == "device_age":
            reply = (
                "**Device Age** carries 15% (15 points). It benchmarks hardware degradation cycles and remaining software "
                "support lifespans to determine realistic circular value."
            )
        elif q_factor == "functional_health":
            reply = (
                f"**Functional Health** carries 10% (10 points). It provides targeted diagnostic checks specific to {device_name} "
                "(such as compressor cycles, touchscreen digitizers, or motor stability) to catch hidden hardware failures."
            )
        elif q_factor == "reuse_potential":
            reply = (
                "**Reuse Potential** carries 10% (10 points). It evaluates secondary market demand and practical utility for "
                "subsequent owners or charitable programs."
            )
        else:
            reply = (
                "Each scoring factor in EcoLoop AI corresponds directly to a circular economy requirement: keeping working "
                "hardware in service avoids mining virgin materials and prevents hazardous electronic waste in landfills."
            )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # ------------------------------------------------------------
    # 4. ASSESSMENT RESULT QUESTIONS (Requirements B4 & B6)
    # ------------------------------------------------------------

    # A. Factors that lowered or reduced the score
    if any(k in msg for k in ["lowered", "reduce", "decrease", "hurt", "lost", "drop", "lower my score", "penalized", "which factor", "which answers affected"]):
        if ecoscore is not None and breakdown:
            factor_losses = []
            for factor, max_pts in FACTOR_MAX_POINTS.items():
                pts = float(breakdown.get(factor, 0))
                deficit = max(0.0, max_pts - pts)
                factor_losses.append((factor, pts, max_pts, deficit))

            factor_losses.sort(key=lambda x: x[3], reverse=True)
            top_losses = [fl for fl in factor_losses if fl[3] >= 0.5]

            # Correlate with answers if available
            answer_notes = []
            if answers.get("visible_damage") in ["minor", "major", "cracked", "heavy_damage"]:
                answer_notes.append(f"• Physical condition was reported as '{answers.get('visible_damage')}', causing cosmetic deductions.")
            if answers.get("working_status") in ["partially_working", "major_issues", "not_working"]:
                answer_notes.append(f"• Working status was reported as '{answers.get('working_status')}', reducing operational points.")
            if answers.get("repairability") in ["moderate", "difficult", "glued"]:
                answer_notes.append(f"• Repairability was noted as '{answers.get('repairability')}', reflecting modularity constraints.")
            if str(answers.get("age_years", "")).startswith(("4", "5", "6", "7", "8")):
                answer_notes.append(f"• Device age of '{answers.get('age_years')}' years incurred age depreciation.")

            if top_losses:
                loss_lines = "\n".join(
                    f"• **{FACTOR_LABELS.get(fl[0], fl[0].replace('_', ' ').title())}:** Awarded {round(fl[1], 1)} / {fl[2]} pts (loss of {round(fl[3], 1)} pts)"
                    for fl in top_losses
                )
                answer_section = ""
                if answer_notes:
                    answer_section = "\n\n**Specific answers contributing to the deficit:**\n" + "\n".join(answer_notes)

                reply = (
                    f"Based on your actual assessment for this {device_name} ({round(ecoscore)}/100), the factors that reduced your score were:\n\n"
                    f"{loss_lines}{answer_section}\n\n"
                    "Addressing repairable components, maintaining cosmetic integrity, or preserving swappable parts helps achieve a higher circular tier."
                )
            else:
                reply = (
                    f"Your {device_name} received nearly full marks across evaluated categories with an EcoScore of **{round(ecoscore)}/100**. "
                    "There are no major factor deficits in your assessment."
                )
            return {
                "reply": reply,
                "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
            }
        elif ecoscore is None:
            return {
                "reply": (
                    "To see which factors reduced your score, please complete an assessment for your device first. "
                    "You can go to the **Analyze** page, select your device, and answer the condition questions."
                ),
                "suggested_questions": generate_suggested_questions(None, None, None, page_context, mode),
            }

    # B. Score breakdown / "Why did my [device] get [score]?" / "Why did I get 72?" / "Explain score"
    if (
        re.search(r"why.*(?:get|receive|\b\d{1,3}\b|score)", msg)
        or any(k in msg for k in ["my score", "score mean", "explain my score", "explain the score", "score breakdown", "explain my result", "explain the result"])
    ):
        if ecoscore is not None:
            w_pts = breakdown.get("working_condition", 0)
            p_pts = breakdown.get("physical_condition", 0)
            r_pts = breakdown.get("repairability", 0)
            a_pts = breakdown.get("device_age", 0)
            f_pts = breakdown.get("functional_health", 0)
            u_pts = breakdown.get("reuse_potential", 0)

            reply = (
                f"Your {device_name} received an EcoScore of **{round(ecoscore)} / 100** ({band} circular tier).\n\n"
                f"The score is calculated deterministically from your actual submitted assessment across 6 transparent dimensions:\n"
                f"• **Working Condition:** {round(w_pts, 1)} / 25 pts (core operational status)\n"
                f"• **Physical Condition:** {round(p_pts, 1)} / 20 pts (casing & screen integrity)\n"
                f"• **Repairability:** {round(r_pts, 1)} / 20 pts (modular design & parts accessibility)\n"
                f"• **Device Age:** {round(a_pts, 1)} / 15 pts (technological lifecycle stage)\n"
                f"• **Functional Health:** {round(f_pts, 1)} / 10 pts (device-specific diagnostics)\n"
                f"• **Reuse Potential:** {round(u_pts, 1)} / 10 pts (circular market utility)\n\n"
                f"The **{action or 'recommended action'}** pathway was selected because it maximizes circular value while keeping hazardous materials out of landfills."
            )
            return {
                "reply": reply,
                "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
            }
        else:
            return {
                "reply": (
                    "Score information is not available yet because an assessment has not been completed. "
                    "Select a device on the **Analyze** page to begin an assessment."
                ),
                "suggested_questions": generate_suggested_questions(None, None, None, page_context, mode),
            }

    # C. Why was [Action] recommended? / Why wasn't Recycle recommended?
    if any(k in msg for k in ["why wasn't recycle", "why not recycle", "why not repair", "why not sell", "why not donate"]):
        if "recycle" in msg:
            if action and action.lower() != "recycle":
                reply = (
                    f"Recycling was **not** recommended because your {device_name} still retains significant operational or material integrity (EcoScore {round(ecoscore) if ecoscore else 'viable'}/100).\n\n"
                    "Under circular economy hierarchy, recycling is a material-recovery step reserved for devices that are non-functional or beyond economical repair. "
                    f"Prioritizing **{action}** preserves embodied manufacturing energy and prevents premature shredding."
                )
            else:
                reply = f"Recycle was recommended for your {device_name} because its damage level or age makes functional restoration uneconomical."
            return {
                "reply": reply,
                "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
            }

    if any(k in msg for k in ["why repair", "why refurbish", "why sell", "why donate", "why recycle", "why was", "why this recommendation", "why is repair", "why is sell", "why is donate", "why is recycle"]):
        if action:
            reasons_text = "\n".join(f"• {r}" for r in reasons) if reasons else (
                f"• Operational and physical state aligns with circular {action.lower()} practices.\n"
                "• Maximizes product utility before material recovery."
            )
            reply = (
                f"**{action.upper()}** was recommended for your {device_name} based on your actual assessment factors:\n\n"
                f"{reasons_text}\n\n"
                f"This decision follows the circular economy hierarchy: keeping working hardware in active use is always more environmentally valuable than premature scrap or shredding."
            )
            return {
                "reply": reply,
                "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
            }
        else:
            return {
                "reply": (
                    "A recommendation is generated once an assessment is completed. "
                    "Start an assessment on the **Analyze** page to receive evidence-based circular guidance."
                ),
                "suggested_questions": generate_suggested_questions(None, None, None, page_context, mode),
            }

    # D. Sustainability improvement
    if any(k in msg for k in ["improve the sustainability", "improve sustainability", "sustainability of this device", "how to improve"]):
        act = (action or "repair").lower()
        if act == "repair":
            reply = (
                f"**How to improve the sustainability of your {device_name}:**\n\n"
                "1. **Targeted Component Repair:** Replace only the degraded component (e.g. battery or screen) rather than replacing the whole unit.\n"
                "2. **Certified Technicians:** Use the Nearby Stakeholders map below to find authorized repair shops with genuine parts.\n"
                "3. **Thermal Cleaning:** Clean vents and replace thermal paste where applicable to prevent hardware throttling.\n"
                "4. **Protective Measures:** Use a protective case to prevent drop damage."
            )
        elif act in {"sell", "resale"}:
            reply = (
                f"**How to improve the sustainability of your {device_name}:**\n\n"
                "1. **Pass Hardware to Secondary Owners:** Reselling functional hardware keeps it out of landfills and prevents new manufacturing emissions.\n"
                "2. **Complete Data Sanitization:** Back up personal files and perform a clean factory reset.\n"
                "3. **Bundle Cables & Adapters:** Providing original chargers prevents subsequent buyers from purchasing new plastic accessories."
            )
        elif act == "donate":
            reply = (
                f"**How to improve the sustainability of your {device_name}:**\n\n"
                "1. **Digital Inclusion:** Donating functional devices bridges the digital divide for schools and community centers.\n"
                "2. **Factory Reset:** Wipe personal accounts completely before donation.\n"
                "3. **Include Accessories:** Bundling keyboards, chargers, or mice makes deployment immediate for charitable programs."
            )
        elif act == "refurbish":
            reply = (
                f"**How to improve the sustainability of your {device_name}:**\n\n"
                "1. **Component Refresh:** Partner with certified refurbishers to replace worn batteries or drives.\n"
                "2. **OS Re-imaging:** Clean software installations eliminate background bloatware and restore snappy performance.\n"
                "3. **Modular Upgrades:** Upgrading RAM or internal storage can extend functional life by several years."
            )
        else:  # recycle
            reply = (
                f"**How to handle recycling sustainably for your {device_name}:**\n\n"
                "1. **Authorized Recyclers:** Deliver to certified e-waste facilities (R2 or e-Stewards) from the Nearby Stakeholders section.\n"
                "2. **Never Landfill:** E-waste contains hazardous heavy metals (lead, mercury, cadmium) that pollute soil and groundwater.\n"
                "3. **Material Reclamation:** Certified recyclers safely reclaim valuable copper, gold, aluminum, and rare-earth elements."
            )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # E. Device age impact on score
    if any(k in msg for k in ["device age", "how did device age", "how age affect", "age factor"]):
        if ecoscore is not None and "device_age" in breakdown:
            age_pts = breakdown.get("device_age", 0)
            age_ans = answers.get("age_years", "reported")
            reply = (
                f"For your {device_name}, device age contributed **{round(age_pts, 1)} / 15 points**.\n\n"
                f"Your selected age bracket was '{age_ans}'. "
                "Newer devices receive higher points because they have longer remaining support cycles, modern software compatibility, and higher secondary utility. "
                "Older hardware gradually incurs an age depreciation factor as software and components age."
            )
            return {
                "reply": reply,
                "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
            }

    # F. Physical condition meaning
    if any(k in msg for k in ["physical condition", "physical damage", "scratches", "casing"]):
        if ecoscore is not None and "physical_condition" in breakdown:
            p_pts = breakdown.get("physical_condition", 0)
            vis = answers.get("visible_damage", "reported")
            reply = (
                f"Physical condition contributed **{round(p_pts, 1)} / 20 points** to your {device_name}'s EcoScore.\n\n"
                f"You reported the physical condition as '{vis}'. "
                "Physical integrity measures cosmetic wear, screen scratches, cracks, and structural enclosure health. "
                "Pristine hardware qualifies for direct resale and donation, whereas cracked casings or screens require refurbishment or repair."
            )
            return {
                "reply": reply,
                "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
            }

    # G. What should I do next?
    if any(k in msg for k in ["what should i do next", "next step", "what now"]):
        act = (action or "repair").lower()
        if act == "repair":
            reply = (
                f"**Next Steps for your {device_name} (Repair):**\n\n"
                "1. **Review Local Repair Options:** Use the Nearby Stakeholders map below to find certified repair technicians.\n"
                "2. **Request an Estimate:** Check if the repair cost is under 50% of the replacement value.\n"
                "3. **Back Up Your Data:** Always create a cloud or local backup before leaving your device for hardware service."
            )
        elif act in {"sell", "resale"}:
            reply = (
                f"**Next Steps for your {device_name} (Resale):**\n\n"
                "1. **Back Up & Wipe Data:** Log out of iCloud/Google/Microsoft accounts and execute a factory reset.\n"
                "2. **Gather Accessories:** Original charger, cables, and packaging increase secondary resale value.\n"
                "3. **Clean the Device:** Use 70% isopropyl alcohol for cosmetic appeal.\n"
                "4. **List or Trade In:** Check reputable trade-in programs or local marketplaces."
            )
        elif act == "donate":
            reply = (
                f"**Next Steps for your {device_name} (Donation):**\n\n"
                "1. **Complete Factory Reset:** Ensure personal accounts, passwords, and photos are completely wiped.\n"
                "2. **Include Power Supplies:** Donating with cables allows charitable programs or schools to deploy it immediately.\n"
                "3. **Check Certified NGOs:** Connect with local digital literacy charities or non-profits on the map."
            )
        elif act == "refurbish":
            reply = (
                f"**Next Steps for your {device_name} (Refurbishment):**\n\n"
                "1. **Locate a Certified Refurbisher:** Consult the Nearby Stakeholders map for certified electronics refurbishment hubs.\n"
                "2. **Data Sanitization:** Perform factory data erasure.\n"
                "3. **Component Refresh:** Refurbishers will test batteries, replace worn thermal interfaces, and restore factory OS."
            )
        else:  # recycle
            reply = (
                f"**Next Steps for your {device_name} (Recycle):**\n\n"
                "1. **Data Erasure:** If the device still boots, perform a factory reset. Remove SIM and SD cards.\n"
                "2. **Drop Off at Authorized Center:** Deliver to an R2 or e-Stewards certified e-waste collection center.\n"
                "3. **Never Put in Trash:** E-waste contains toxic heavy metals that pollute groundwater if landfilled."
            )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # H. Safe data wiping
    if any(k in msg for k in ["wipe", "data", "factory reset", "delete personal", "privacy", "account"]):
        reply = (
            f"**Safe Data Preparation Checklist for your {device_name}:**\n\n"
            "1. **Back Up First:** Save photos, documents, and contacts to cloud storage or an external drive.\n"
            "2. **Sign Out of Accounts:** Disconnect iCloud, Google Account, Microsoft, or Samsung accounts to prevent activation locks.\n"
            "3. **Eject Media:** Remove SIM cards, microSD cards, or wireless USB receivers.\n"
            "4. **Factory Reset:** Go to Settings → System / General → Reset → Erase All Content and Settings.\n"
            "5. **Storage Drive Sanitization:** For desktop/laptop hard drives, perform a full disk format or secure erase tool before handing off."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # I. Nearby options & maps
    if any(k in msg for k in ["nearby", "where can i find", "where to find", "map", "location", "center", "shop"]):
        reply = (
            f"**Finding Certified Nearby Options:**\n\n"
            "You can locate authorized repair shops, refurbishment centers, and e-waste collection sites using the **Nearby Stakeholders** section:\n"
            "• **Interactive OpenStreetMap:** Displays verified circular facilities within 10 km, 25 km, or 50 km.\n"
            "• **Direct Directions:** Click any stakeholder card to open real-time directions on Google Maps.\n"
            "• **Google Maps Search Hand-off:** One-click launch to search live local repair and recycling facilities."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # ------------------------------------------------------------
    # 5. ECOLOOP AI PLATFORM & APPLICATION FACTS (Requirement B2)
    # ------------------------------------------------------------

    # What is EcoLoop AI?
    if any(k in msg for k in ["what is ecoloop", "about ecoloop", "what does ecoloop do", "what does the website do", "website do"]):
        reply = (
            "**EcoLoop AI** is an intelligent circular-economy decision-support platform designed to extend the lifespan of electronics and divert e-waste from landfills.\n\n"
            "Key features include:\n"
            "• **Deterministic Assessment:** Evaluates device condition, age, repairability, and functional health using a transparent 0–100 EcoScore.\n"
            "• **Actionable Guidance:** Recommends the optimal circular pathway: Repair, Refurbish, Sell, Donate, or Recycle.\n"
            "• **Environmental Impact Estimation:** Calculates CO₂ emissions saved and hazardous landfill waste avoided.\n"
            "• **Nearby Stakeholders Mapping:** Connects users directly to certified repair shops, refurbishment hubs, and e-waste recyclers.\n"
            "• **Browser Local History:** Saves completed assessment records in your browser's localStorage without requiring an account."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # How does assessment work? / How is EcoScore calculated?
    if any(k in msg for k in ["how does the assessment work", "how assessment works", "how is ecoscore calculated", "how is the score calculated", "how does scoring work", "how does ecoscore work"]):
        reply = (
            "**How the EcoScore is Calculated:**\n\n"
            "The EcoScore is a deterministic 0–100 index based on 6 weighted factors:\n"
            "1. **Working Condition (25 pts / 25%):** Operational status and primary functionality.\n"
            "2. **Physical Condition (20 pts / 20%):** Enclosure, screen, and cosmetic integrity.\n"
            "3. **Repairability (20 pts / 20%):** Modular design, screws, and spare part availability.\n"
            "4. **Device Age (15 pts / 15%):** Remaining technological lifecycle and software support.\n"
            "5. **Functional Health (10 pts / 10%):** Device-specific diagnostics (battery, display, motor, etc.).\n"
            "6. **Reuse Potential (10 pts / 10%):** Market demand and secondary utility.\n\n"
            "Scores are rule-based, reproducible, and never arbitrarily generated by AI."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # What devices can be assessed?
    if any(k in msg for k in ["what devices", "which devices", "supported devices", "device list", "devices supported"]):
        devices_str = ", ".join(SUPPORTED_DEVICES_LIST)
        reply = (
            f"**Supported Devices in EcoLoop AI:**\n\n"
            f"EcoLoop AI supports 15 predefined device categories:\n"
            f"{devices_str}.\n\n"
            "Each device has tailored assessment questions matching its technical specifications."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # What do recommendations mean?
    if any(k in msg for k in ["what do recommendations mean", "recommendation meaning", "what does recommendation mean"]):
        reply = (
            "**EcoLoop AI Recommendation Tiers:**\n\n"
            "• **Repair:** Device has specific fixable faults while retaining sound primary hardware. Best for extending product life.\n"
            "• **Refurbish:** Hardware is functional but requires deep cleaning, component renewal, or software re-imaging for secondary use.\n"
            "• **Sell:** High working condition and aesthetic health give the device strong commercial resale value.\n"
            "• **Donate:** Working order enables digital inclusion for schools, non-profits, or community initiatives.\n"
            "• **Recycle:** Severe damage or obsolete hardware makes reuse unfeasible. Materials are recovered safely through certified recyclers."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # History page inquiry
    if any(k in msg for k in ["history page", "history", "previous assessments", "past assessments"]):
        reply = (
            "**About the History Page:**\n\n"
            "The History page displays records of your completed device assessments.\n"
            "• Saved locally in your browser's **localStorage** (`ecoloop_history`).\n"
            "• View previous EcoScores, recommended actions, dates, and full score breakdowns without recalculating scores.\n"
            "• Filter assessments by circular action or search by device name.\n"
            "• Fully private: no login required and no cloud synchronization."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # Analyze page inquiry
    if any(k in msg for k in ["analyze page", "what does analyze do", "analyze"]):
        reply = (
            "**About the Analyze Page:**\n\n"
            "The Analyze page is where you assess a device:\n"
            "1. Browse through 15 device categories using the left Category panel or search bar.\n"
            "2. Click **Start Assessment →** on any device card.\n"
            "3. Answer tailored questions regarding physical state, working condition, and hardware components.\n"
            "4. Review your deterministic EcoScore (0–100) and recommendation."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # Learn page inquiry
    if any(k in msg for k in ["learn page", "what is on learn", "learn"]):
        reply = (
            "**About the Learn Page:**\n\n"
            "The Learn page contains educational resources on circular electronics management:\n"
            "• Understanding hazardous e-waste materials (lead, mercury, cadmium).\n"
            "• Lithium-ion battery safety and fire prevention.\n"
            "• Step-by-step personal data wiping guidelines.\n"
            "• Right to Repair principles and how modularity reduces carbon footprints."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # About page inquiry
    if any(k in msg for k in ["about page", "about us", "about"]):
        reply = (
            "**About EcoLoop AI:**\n\n"
            "The About page describes the circular electronics framework behind EcoLoop AI, "
            "our mission to promote sustainable electronics usage, the deterministic 6-factor methodology, "
            "and our commitment to transparent e-waste reduction."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # Battery safety
    if any(k in msg for k in ["battery", "swollen", "fire", "leak", "lithium"]):
        reply = (
            "**Important Lithium Battery Safety Guidelines:**\n\n"
            "• **Never Puncture or Press:** Do not compress, poke, or attempt to bend a swollen battery.\n"
            "• **Disconnect Immediately:** Stop charging and power off the device right away.\n"
            "• **Safe Storage:** Place the device in a cool, ventilated, non-flammable container.\n"
            "• **Certified Disposal:** Take it directly to an authorized e-waste collection point or battery recycling depot. Never throw it in household trash."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # Environmental impact / CO2 / E-waste
    if any(k in msg for k in ["co2", "carbon", "environment", "waste", "materials", "kg", "green", "impact"]):
        waste = env.get("waste_avoided_kg", "1.5")
        co2 = env.get("co2_benefit_kg", "45")
        materials = env.get("recoverable_materials", ["Copper", "Aluminum", "Gold", "Lithium"])
        mat_str = ", ".join(materials) if isinstance(materials, list) else str(materials)

        reply = (
            f"**Environmental Benefits of Circular Electronics:**\n\n"
            f"• **Landfill Waste Diverted:** ~{waste} kg of hazardous electronics prevented from landfills.\n"
            f"• **Estimated CO₂ Savings:** ~{co2} kg CO₂e avoided by reducing virgin raw material mining.\n"
            f"• **Key Recoverable Elements:** {mat_str}.\n\n"
            "Up to 80% of an electronic device's total lifetime carbon footprint occurs during manufacturing. Extending product life directly prevents new manufacturing emissions."
        )
        return {
            "reply": reply,
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # ------------------------------------------------------------
    # 6. GREETINGS & PAGE CONTEXT AWARENESS
    # ------------------------------------------------------------
    if any(k in msg for k in ["hi", "hello", "hey", "help", "who are you", "what can you do"]):
        page = (page_context or "").lower()
        if mode == "assessment":
            context_intro = (
                f"I'm your **EcoLoop AI Assistant** guiding your **{device_name}** assessment. "
                "I can explain what current questions mean, why factors like age and repairability matter, or guide you through answer options."
            )
        elif ecoscore is not None:
            context_intro = (
                f"I'm your **EcoLoop AI Assistant**. I can explain your {device_name}'s score ({round(ecoscore)}/100), "
                f"why **{action}** was recommended, how to safely wipe data, or where to find nearby circular options."
            )
        elif page == "analyze":
            context_intro = "I'm your **EcoLoop AI Assistant** on the **Analyze** page. I can help you choose the right device from our catalog, explain assessment questions, or guide you through the EcoScore methodology."
        elif page == "history":
            context_intro = "I'm your **EcoLoop AI Assistant** on the **History** page. I can explain how past assessments are stored locally in localStorage, how scores are tracked, or help you filter by device and recommendation."
        elif page == "learn":
            context_intro = "I'm your **EcoLoop AI Assistant** on the **Learn** page. I can guide you on e-waste hazards, battery safety, data sanitization, or Right to Repair principles."
        elif page == "about":
            context_intro = "I'm your **EcoLoop AI Assistant** on the **About** page. I can explain our mission, circular economy framework, and deterministic scoring engine."
        else:
            context_intro = "I'm your **EcoLoop AI Assistant**. I can help you evaluate electronics, explain the EcoScore (0–100), guide responsible reuse and recycling, or navigate website features."

        return {
            "reply": f"{context_intro}\n\nWhat would you like to know?",
            "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
        }

    # ------------------------------------------------------------
    # 7. GROUNDED FALLBACK (Polite, Concise, and Domain-Centered)
    # ------------------------------------------------------------
    return {
        "reply": (
            "I can assist you with EcoLoop AI assessments, understanding your EcoScore, "
            "circular recommendations (Repair, Refurbish, Sell, Donate, Recycle), safe data wiping, "
            "battery handling, or navigating the Analyze, History, Learn, and About pages. "
            "Please ask a question related to your device or EcoLoop AI."
        ),
        "suggested_questions": generate_suggested_questions(device_type, action, ecoscore, page_context, mode),
    }
