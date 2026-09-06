import json
import math
import uuid
from urllib.parse import quote

import httpx
from pathlib import Path

import torch

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_TYPES, MAX_UPLOAD_BYTES, UPLOAD_DIR
from .db import (
    dashboard,
    get_assessment,
    initialise,
    insert_assessment,
    list_assessments,
)
from .schemas import (
    AnalyzeResponse,
    AssessmentRequest,
    AssessmentResponse,
)
from .services.assessment import score_assessment
from .services.image_validation import inspect_image
from .services.model_service import get_model, predict_device


app = FastAPI(
    title="EcoLoop AI API",
    version="0.1.0",
    description="Phase-1 decision-support prototype",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://frontend-sooty-theta-39.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# DATABASE / STARTUP
# ============================================================

# Initialise on import so command-line and test clients
# share a usable database.
initialise()


@app.on_event("startup")
def startup():
    initialise()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# HEALTH
# ============================================================

@app.get("/api/health")
def health():
    try:
        get_model()

        return {
            "status": "ok",
            "service": "ecoloop-ai",
            "model_status": "ready",
            "model": "YOLO11n",
            "device": "cuda:0" if torch.cuda.is_available() else "cpu",
        }

    except Exception as exc:
        return {
            "status": "ok",
            "service": "ecoloop-ai",
            "model_status": "unavailable",
            "error": str(exc),
        }


# ============================================================
# IMAGE ANALYSIS
# ============================================================

@app.post("/api/analyze", response_model=AnalyzeResponse)
async def analyze(image: UploadFile = File(...)):

    # --------------------------------------------------------
    # Validate file type
    # --------------------------------------------------------

    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Only JPG and PNG images are allowed.",
        )

    # --------------------------------------------------------
    # Read image
    # --------------------------------------------------------

    content = await image.read()

    # --------------------------------------------------------
    # Validate file size
    # --------------------------------------------------------

    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image exceeds the 8 MB upload limit.",
        )

    # --------------------------------------------------------
    # Inspect image quality
    # --------------------------------------------------------

    quality, failure = inspect_image(content)

    if failure:
        return AnalyzeResponse(
            device_type=None,
            confidence=0,
            status="invalid_image",
            image_quality=quality,
            findings=[],
            message=quality["reason"],
        )

    # --------------------------------------------------------
    # Save uploaded image
    # --------------------------------------------------------

    suffix = (
        ".png"
        if image.content_type == "image/png"
        else ".jpg"
    )

    target = UPLOAD_DIR / f"{uuid.uuid4().hex}{suffix}"
    target.write_bytes(content)

    # --------------------------------------------------------
    # YOLO inference
    # --------------------------------------------------------

    try:
        prediction = predict_device(str(target))

    except Exception as exc:
        return AnalyzeResponse(
            device_type=None,
            confidence=0,
            status="unknown",
            image_quality={
                **quality,
                "stored_path": str(target),
            },
            findings=[
                "Image quality passed.",
                "AI model inference failed.",
            ],
            message=(
                "AI recognition is temporarily unavailable: "
                f"{exc}"
            ),
        )

    device_type = prediction["device_type"]
    confidence = prediction["confidence"]
    status = prediction["status"]

    # --------------------------------------------------------
    # Build user-friendly recognition message
    # --------------------------------------------------------

    if status == "supported":

        message = (
            f"AI recognized the device as "
            f"{device_type} with "
            f"{confidence:.1%} confidence."
        )

    elif status == "unsupported":

        message = (
            "The AI detected a device category that is not "
            "currently supported by the Phase-1 assessment "
            "workflow."
        )

    else:

        message = (
            "Device not confidently recognized. "
            "Select a device category to continue with "
            "a limited/manual assessment."
        )

    return AnalyzeResponse(
        device_type=device_type,
        confidence=confidence,
        status=status,
        image_quality={
            **quality,
            "stored_path": str(target),
        },
        findings=prediction["findings"],
        message=message,
    )


# ============================================================
# ASSESSMENT
# ============================================================

@app.post(
    "/api/assessment",
    response_model=AssessmentResponse,
)
def create_assessment(request: AssessmentRequest):

    (
        condition,
        condition_score,
        confidence,
        evidence,
        eco,
        breakdown,
        scores,
        action,
        explanation,
        stakeholder,
    ) = score_assessment(
        request.device_type,
        request.answers,
    )

    record = {
        "image_path": request.image_path,
        "device_type": request.device_type,
        "recognition_status": request.recognition_status,
        "recognition_confidence": request.recognition_confidence,
        "manual_assessment": int(request.manual_assessment),
        "answers_json": request.answers,
        "findings_json": request.findings + evidence,
        "condition": condition,
        "condition_score": condition_score,
        "assessment_confidence": confidence,
        "ecoscore": eco,
        "ecoscore_breakdown_json": breakdown,
        "recommendation_scores_json": scores,
        "recommended_action": action,
        "explanation": explanation,
        "stakeholder_category": stakeholder,
    }

    assessment_id = insert_assessment(record)

    return format_response(
        assessment_id,
        record,
    )


# ============================================================
# FORMAT ASSESSMENT RESPONSE
# ============================================================

def format_response(
    assessment_id,
    record,
):
    score = record["ecoscore"]

    if score <= 30:
        band = "Very Low"
    elif score <= 50:
        band = "Low"
    elif score <= 70:
        band = "Moderate"
    elif score <= 85:
        band = "High"
    else:
        band = "Excellent"

    return AssessmentResponse(
        id=assessment_id,
        device_type=record["device_type"],
        condition=record["condition"],
        condition_score=record["condition_score"],
        assessment_confidence=record["assessment_confidence"],
        ecoscore=score,
        ecoscore_band=band,
        ecoscore_breakdown=record[
            "ecoscore_breakdown_json"
        ],
        recommendation_scores=record[
            "recommendation_scores_json"
        ],
        recommended_action=record[
            "recommended_action"
        ],
        explanation=record["explanation"],
        stakeholder_category=record[
            "stakeholder_category"
        ],
        limitations=[
            "A photograph cannot confirm internal hardware faults.",
            "Functional symptoms are user-reported.",
            "EcoScore is a Phase-1 methodology, not a scientific LCA.",
        ],
    )


# ============================================================
# HISTORY
# ============================================================

@app.get("/api/assessments")
def assessments(
    device: str | None = None,
    recommendation: str | None = None,
):
    return list_assessments(
        device,
        recommendation,
    )


@app.get("/api/assessments/{assessment_id}")
def assessment(assessment_id: int):

    item = get_assessment(assessment_id)

    if not item:
        raise HTTPException(
            status_code=404,
            detail="Assessment not found",
        )

    for key in [
        "answers_json",
        "findings_json",
        "ecoscore_breakdown_json",
        "recommendation_scores_json",
    ]:
        item[key] = json.loads(item[key])

    return item


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/api/dashboard")
def get_dashboard():
    return dashboard()


# ============================================================
# DEMO STAKEHOLDERS
# ============================================================

@app.get("/api/stakeholders")
def stakeholders(
    action: str | None = None,
    radius_km: float = 10,
):
    """
    Phase-1 demo/sample stakeholder data.

    IMPORTANT:
    These are explicitly demo locations.
    They are NOT presented as real businesses.
    """

    entries = [
        {
            "name": "Demo Repair Collective",
            "type": "Repair Shop",
            "action": "Repair",
            "lat": 12.9716,
            "lng": 77.5946,
            "source": "Demo data",
        },
        {
            "name": "Demo Circular Hub",
            "type": "Refurbisher",
            "action": "Refurbish",
            "lat": 12.9352,
            "lng": 77.6245,
            "source": "Demo data",
        },
        {
            "name": "Demo Reuse Network",
            "type": "NGO / Donation Organization",
            "action": "Donate",
            "lat": 12.9889,
            "lng": 77.5901,
            "source": "Demo data",
        },
        {
            "name": "Demo Authorized Recycler",
            "type": "Authorized Recycler",
            "action": "Recycle",
            "lat": 12.9629,
            "lng": 77.5775,
            "source": "Demo data",
        },
        {
            "name": "Demo Device Exchange",
            "type": "Buyer / Marketplace",
            "action": "Sell",
            "lat": 12.9784,
            "lng": 77.6408,
            "source": "Demo data",
        },
    ]

    return [
        entry
        for entry in entries
        if (
            not action
            or entry["action"].lower()
            == action.lower()
        )
    ]


# ============================================================
# REAL NEARBY STAKEHOLDER SEARCH
# ============================================================

def haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float,
) -> float:
    """
    Calculate distance between two geographic coordinates.

    Returns:
        Distance in kilometres.
    """

    earth_radius_km = 6371.0

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)

    delta_phi = math.radians(
        lat2 - lat1
    )

    delta_lambda = math.radians(
        lon2 - lon1
    )

    a = (
        math.sin(delta_phi / 2) ** 2
        +
        math.cos(phi1)
        * math.cos(phi2)
        * math.sin(delta_lambda / 2) ** 2
    )

    return (
        earth_radius_km
        * 2
        * math.atan2(
            math.sqrt(a),
            math.sqrt(1 - a),
        )
    )


def device_profile(device_type: str | None) -> dict:
    """Return OSM tags used to match a device category."""
    profiles = {
        "smartphone": {
            "shops": ["mobile_phone", "electronics"],
            "repair_tags": ['mobile_phone:repair', 'electronics_repair'],
            "repair_values": ['phone'],
            "recycle_tags": ['recycling:mobile_phones'],
            "keywords": ["mobile phone", "phone", "electronics"],
        },
        "laptop": {
            "shops": ["computer", "electronics"],
            "repair_tags": ['computer:repair', 'electronics_repair'],
            "repair_values": ['laptop', 'computer'],
            "recycle_tags": ['recycling:computers'],
            "keywords": ["computer", "laptop", "electronics"],
        },
        "tablet": {
            "shops": ["mobile_phone", "computer", "electronics"],
            "repair_tags": ['electronics_repair', 'mobile_phone:repair'],
            "repair_values": ['tablet', 'phone'],
            "recycle_tags": ['recycling:mobile_phones', 'recycling:small_electrical_appliances'],
            "keywords": ["tablet", "mobile", "electronics"],
        },
        "television": {
            "shops": ["electronics", "hifi"],
            "repair_tags": ['electronics_repair', 'hifi:repair'],
            "repair_values": ['tv', 'television', 'hifi'],
            "recycle_tags": ['recycling:tv_monitor'],
            "keywords": ["tv", "television", "electronics"],
        },
        "monitor": {
            "shops": ["computer", "electronics"],
            "repair_tags": ['computer:repair', 'electronics_repair'],
            "repair_values": ['computer', 'monitor'],
            "recycle_tags": ['recycling:tv_monitor', 'recycling:computers'],
            "keywords": ["monitor", "computer", "electronics"],
        },
        "keyboard": {
            "shops": ["computer", "electronics"],
            "repair_tags": ['computer:repair', 'electronics_repair'],
            "repair_values": ['computer'],
            "recycle_tags": ['recycling:small_electrical_appliances'],
            "keywords": ["keyboard", "computer", "electronics"],
        },
        "mouse": {
            "shops": ["computer", "electronics"],
            "repair_tags": ['computer:repair', 'electronics_repair'],
            "repair_values": ['computer'],
            "recycle_tags": ['recycling:small_electrical_appliances'],
            "keywords": ["mouse", "computer", "electronics"],
        },
        "printer": {
            "shops": ["computer", "electronics", "printer_ink"],
            "repair_tags": ['computer:repair', 'electronics_repair', 'printer:repair'],
            "repair_values": ['computer', 'printer'],
            "recycle_tags": ['recycling:small_electrical_appliances'],
            "keywords": ["printer", "computer", "electronics"],
        },
    }
    return profiles.get(device_type or "", profiles["smartphone"] if False else {
        "shops": ["electronics", "computer", "mobile_phone", "second_hand"],
        "repair_tags": ['repair', 'electronics_repair'],
        "repair_values": ['yes', 'only'],
        "recycle_tags": ['recycling:small_electrical_appliances', 'recycling:electrical_appliances'],
        "keywords": ["electronics"],
    })


def build_overpass_query(
    lat: float,
    lng: float,
    action: str | None,
    radius_km: float = 10,
    device_type: str | None = None,
    tier: str = "targeted",
) -> str:
    """Build a layered OSM search query.

    targeted: strongest device + action evidence.
    compatible: broad but still action-oriented fallback.
    general: last-resort local electronics/circular-economy leads.

    The last tier deliberately returns a *lead*, not a claim that the
    business definitely performs the requested service.
    """
    radius = int(radius_km * 1000)
    profile = device_profile(device_type)
    shops = '|'.join(profile['shops'])
    action_l = (action or '').lower()

    clauses: list[str] = []

    if action_l == 'repair':
        if tier == 'targeted':
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[craft="electronics_repair"];',
                f'nwr(around:{radius},{lat},{lng})[repair~"yes|only"];',
            ])
            for tag in profile['repair_tags']:
                if tag == 'electronics_repair':
                    clauses.append(f'nwr(around:{radius},{lat},{lng})[craft="electronics_repair"];')
                elif tag.endswith(':repair'):
                    clauses.append(f'nwr(around:{radius},{lat},{lng})[{tag}~"yes|only"];')
        elif tier == 'compatible':
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[craft="electronics_repair"];',
                f'nwr(around:{radius},{lat},{lng})[shop~"computer|electronics|mobile_phone|printer_ink|hifi|repair"][repair~"yes|only"];',
                f'nwr(around:{radius},{lat},{lng})[shop~"computer|electronics|mobile_phone|printer_ink|hifi"][electronics:repair~"yes|only"];',
                f'nwr(around:{radius},{lat},{lng})[shop~"computer|electronics|mobile_phone|printer_ink|hifi"][computer:repair~"yes|only"];',
                f'nwr(around:{radius},{lat},{lng})[shop~"computer|electronics|mobile_phone|printer_ink|hifi"][mobile_phone:repair~"yes|only"];',
            ])
        else:
            # Last-resort repair search: prefer real customer-facing
            # electronics/computer repair leads. Do not include generic
            # IT/company offices because they are not necessarily repair shops.
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[shop~"computer|electronics|mobile_phone|printer_ink|hifi|repair"];',
                f'nwr(around:{radius},{lat},{lng})[craft="electronics_repair"];',
            ])

    elif action_l in {'sell', 'refurbish'}:
        if tier == 'targeted':
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[shop="second_hand"];',
                f'nwr(around:{radius},{lat},{lng})[second_hand~"yes|only"];',
                f'nwr(around:{radius},{lat},{lng})[shop="pawnbroker"];',
            ])
        elif tier == 'compatible':
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[shop="second_hand"];',
                f'nwr(around:{radius},{lat},{lng})[second_hand~"yes|only"];',
                f'nwr(around:{radius},{lat},{lng})[shop="pawnbroker"];',
                f'nwr(around:{radius},{lat},{lng})[shop~"{shops}"][second_hand~"yes|only"];',
                f'nwr(around:{radius},{lat},{lng})[shop="charity"];',
            ])
        else:
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[shop~"second_hand|pawnbroker|charity|{shops}"];',
            ])

    elif action_l == 'recycle':
        if tier == 'targeted':
            for tag in profile['recycle_tags']:
                clauses.append(f'nwr(around:{radius},{lat},{lng})[{tag}~"yes|only"];')
            clauses.append(f'nwr(around:{radius},{lat},{lng})[amenity="recycling"][recycling_type~"centre|container|residual_waste"];')
        elif tier == 'compatible':
            for tag in profile['recycle_tags']:
                clauses.append(f'nwr(around:{radius},{lat},{lng})[{tag}~"yes|only"];')
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[amenity="recycling"];',
                f'nwr(around:{radius},{lat},{lng})[amenity~"waste_transfer_station|waste_disposal"];',
            ])
        else:
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[amenity="recycling"];',
                f'nwr(around:{radius},{lat},{lng})[amenity~"waste_transfer_station|waste_disposal"];',
                f'nwr(around:{radius},{lat},{lng})[shop~"computer|electronics|mobile_phone"][donation_of_goods];',
                f'nwr(around:{radius},{lat},{lng})[shop~"computer|electronics|mobile_phone"][recycling];',
            ])

    elif action_l == 'donate':
        if tier == 'targeted':
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[shop="charity"];',
                f'nwr(around:{radius},{lat},{lng})[amenity="charity"];',
                f'nwr(around:{radius},{lat},{lng})[donation_of_goods];',
            ])
        elif tier == 'compatible':
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[shop="charity"];',
                f'nwr(around:{radius},{lat},{lng})[amenity="charity"];',
                f'nwr(around:{radius},{lat},{lng})[amenity="freeshop"];',
                f'nwr(around:{radius},{lat},{lng})[shop="second_hand"][second_hand~"yes|only"];',
                f'nwr(around:{radius},{lat},{lng})[donation_of_goods];',
            ])
        else:
            clauses.extend([
                f'nwr(around:{radius},{lat},{lng})[shop~"charity|second_hand"];',
                f'nwr(around:{radius},{lat},{lng})[amenity~"charity|freeshop|community_centre"];',
                f'nwr(around:{radius},{lat},{lng})[shop~"computer|electronics|mobile_phone"][donation_of_goods];',
            ])

    else:
        clauses.extend([
            f'nwr(around:{radius},{lat},{lng})[shop~"{shops}"];',
            f'nwr(around:{radius},{lat},{lng})[craft="electronics_repair"];',
            f'nwr(around:{radius},{lat},{lng})[amenity~"recycling|charity|waste_transfer_station|waste_disposal"];',
        ])

    # De-duplicate clauses while preserving order.
    clauses = list(dict.fromkeys(clauses))
    return '[out:json][timeout:25];\n(\n' + '\n'.join(clauses) + '\n);\nout center tags;'


def is_relevant_osm_place(tags: dict, device_type: str | None, action: str | None) -> bool:
    """Reject unrelated OSM features before they reach the user.

    Overpass queries are intentionally broad in the fallback tiers, so this
    final allow-list prevents unrelated businesses (for example car dealers)
    from appearing in an electronics e-waste result.
    """
    action_l = (action or "").lower()
    shop = str(tags.get("shop") or "").lower()
    craft = str(tags.get("craft") or "").lower()
    amenity = str(tags.get("amenity") or "").lower()
    profile = device_profile(device_type)
    allowed_shops = set(profile.get("shops", []))

    repair_shops = {
        "computer", "electronics", "mobile_phone", "printer_ink",
        "hifi", "repair",
    }
    resale_shops = {"second_hand", "pawnbroker", "charity"}
    circular_shops = allowed_shops | resale_shops

    if action_l == "repair":
        return (
            craft == "electronics_repair"
            or tags.get("repair") in {"yes", "only"}
            or any(
                str(k).endswith(":repair")
                and str(v).lower() in {"yes", "only"}
                for k, v in tags.items()
            )
            or shop in repair_shops
        )

    if action_l in {"sell", "refurbish"}:
        return (
            shop in circular_shops
            or tags.get("second_hand") in {"yes", "only"}
        )

    if action_l == "donate":
        return (
            shop == "charity"
            or amenity in {"charity", "freeshop", "community_centre"}
            or "donation_of_goods" in tags
        )

    if action_l == "recycle":
        return (
            amenity in {"recycling", "waste_transfer_station", "waste_disposal"}
            or any(
                str(k).startswith("recycling:")
                and str(v).lower() in {"yes", "only"}
                for k, v in tags.items()
            )
            or (
                shop in allowed_shops
                and ("recycling" in tags or "donation_of_goods" in tags)
            )
        )

    return shop in allowed_shops or craft == "electronics_repair"


def classify_osm_place(tags: dict, requested_action: str | None) -> str:
    amenity = tags.get('amenity')
    shop = tags.get('shop')
    craft = tags.get('craft')
    if amenity == 'recycling' or amenity in {'waste_transfer_station', 'waste_disposal'}:
        return 'Recycle'
    if amenity == 'charity':
        return 'Donate'
    if craft == 'electronics_repair' or tags.get('repair') in {'yes', 'only'}:
        return 'Repair'
    if tags.get('second_hand') in {'yes', 'only'} or shop == 'second_hand':
        return 'Sell / Reuse'
    if shop in {'electronics', 'computer', 'mobile_phone', 'electrical', 'printer_ink', 'hifi'}:
        return 'Electronics option'
    return 'Nearby option'


def mapped_services(tags: dict) -> list[str]:
    """Return only services that are explicitly or strongly mapped by OSM tags."""
    services: list[str] = []
    if tags.get('craft') == 'electronics_repair' or tags.get('repair') in {'yes', 'only'} or any(
        str(k).endswith(':repair') and str(v).lower() in {'yes', 'only'}
        for k, v in tags.items()
    ):
        services.append('Repair')
    if tags.get('second_hand') in {'yes', 'only'} or tags.get('shop') == 'second_hand':
        services.append('Sell / Reuse')
    if tags.get('amenity') == 'charity':
        services.append('Donate')
    if tags.get('amenity') == 'recycling' or any(
        str(k).startswith('recycling:') and str(v).lower() in {'yes', 'only'}
        for k, v in tags.items()
    ) or tags.get('amenity') in {'waste_transfer_station', 'waste_disposal'}:
        services.append('Recycle')
    return services


def score_osm_match(tags: dict, device_type: str | None, action: str | None) -> tuple[int, str, list[str]]:
    """Rank an OSM place by evidence for the requested device + action.

    This is a transparent ranking heuristic, not a claim that the business
    definitely provides a service when OSM has not explicitly mapped it.
    """
    profile = device_profile(device_type)
    score = 20
    reasons: list[str] = []
    action_l = (action or '').lower()
    shop = tags.get('shop')
    craft = tags.get('craft')

    # Device evidence.
    device_key = None
    if device_type == 'smartphone': device_key = tags.get('mobile_phone:repair')
    elif device_type in {'laptop', 'monitor', 'keyboard', 'mouse'}: device_key = tags.get('computer:repair')
    elif device_type == 'tablet': device_key = tags.get('mobile_phone:repair') or tags.get('electronics_repair')
    elif device_type == 'television': device_key = tags.get('electronics_repair') or tags.get('hifi:repair')
    elif device_type == 'printer': device_key = tags.get('printer:repair') or tags.get('computer:repair')

    if device_key in {'yes', 'only'}:
        score += 55
        reasons.append(f'{device_type.replace("_", " ").title()} service tag')
    elif device_key:
        score += 45
        reasons.append('Device-specific service tag')

    # OSM shop/craft evidence.
    if craft == 'electronics_repair':
        score += 35
        reasons.append('Electronics repair mapped')
    elif tags.get('repair') in {'yes', 'only'}:
        score += 28
        reasons.append('Repair service mapped')
    elif shop in profile['shops']:
        score += 18
        reasons.append(f'{shop.replace("_", " ").title()} category')

    # Action evidence.
    if action_l == 'repair' and (device_key or craft == 'electronics_repair' or tags.get('repair') in {'yes', 'only'}):
        score += 10
    elif action_l in {'sell', 'refurbish'}:
        if tags.get('second_hand') in {'yes', 'only'} or shop == 'second_hand':
            score += 45
            reasons.append('Second-hand/reuse tag')
        elif shop in profile['shops']:
            score += 10
    elif action_l == 'recycle':
        if any(k.startswith('recycling:') and str(v).lower() in {'yes', 'only'} for k, v in tags.items()):
            score += 55
            reasons.append('Device-relevant recycling tag')
        elif tags.get('amenity') == 'recycling':
            score += 25
            reasons.append('Recycling facility mapped')
    elif action_l == 'donate' and tags.get('amenity') == 'charity':
        score += 45
        reasons.append('Charity location mapped')

    score = max(0, min(100, score))
    level = 'Strong' if score >= 75 else 'Good' if score >= 55 else 'General'
    if not reasons:
        reasons.append('Nearby electronics option')
    return score, level, reasons[:2]


async def run_overpass_query(query: str) -> tuple[dict | None, str | None]:
    """Run one Overpass query against several public mirrors."""
    overpass_urls = [
        "https://overpass.private.coffee/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
        "https://overpass-api.de/api/interpreter",
    ]
    last_error: str | None = None
    last_empty: dict | None = None
    for overpass_url in overpass_urls:
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(connect=8.0, read=25.0, write=10.0, pool=10.0),
                follow_redirects=True,
            ) as client:
                response = await client.post(
                    overpass_url,
                    data={"data": query},
                    headers={
                        "User-Agent": "EcoLoopAI/1.0 (Phase-1 college project)",
                        "Accept": "application/json",
                    },
                )
                response.raise_for_status()
                candidate = response.json()
                if not isinstance(candidate, dict) or "elements" not in candidate:
                    raise ValueError("Invalid Overpass response format.")

                # A successful mirror can legitimately return zero elements.
                # Keep trying the remaining mirrors before giving up, because
                # OSM/Overpass coverage can differ between server instances.
                if candidate.get("elements"):
                    return candidate, None

                last_empty = candidate
                continue
        except (httpx.TimeoutException, httpx.HTTPError, ValueError) as exc:
            last_error = str(exc)
    # If at least one mirror responded successfully but all returned zero
    # places, report a genuine data-coverage miss rather than an API failure.
    if last_empty is not None:
        return last_empty, None
    return None, last_error


def build_google_maps_search_url(device_type: str, action: str | None) -> str:
    """Build a live Google Maps fallback query from the requested device/action.

    This is a search hand-off, not a claim that Google Maps has verified a
    particular business. The user can review the live results before visiting.
    """
    device_labels = {
        "smartphone": "smartphone",
        "laptop": "laptop",
        "tablet": "tablet",
        "television": "TV",
        "monitor": "monitor",
        "keyboard": "computer keyboard",
        "mouse": "computer mouse",
        "printer": "printer",
        "other": "electronics device",
    }
    device_label = device_labels.get(device_type, device_type.replace("_", " "))
    action_l = (action or "").lower()
    action_queries = {
        "repair": f"{device_label} repair near me",
        "refurbish": f"{device_label} refurbishment near me",
        "sell": f"sell used {device_label} near me",
        "donate": f"donate {device_label} near me",
        "recycle": f"{device_label} recycling near me",
    }
    query = action_queries.get(
        action_l,
        f"{device_label} electronics service near me",
    )
    return f"https://www.google.com/maps/search/?api=1&query={quote(query)}"


@app.get("/api/stakeholders/nearby")
async def nearby(
    lat: float,
    lng: float,
    action: str | None = None,
    device_type: str | None = None,
    radius_km: float = 10,
):
    """Find real nearby OSM places using layered device/action matching.

    Search order:
      1. targeted   - exact device + action evidence
      2. compatible - broader but still relevant service evidence
      3. general    - real local electronics/circular-economy leads

    The general tier is clearly labelled as a lead when OSM does not prove
    that the business performs the requested service. EcoLoop never invents
    a business, address, phone number, or service.
    """
    if not -90 <= lat <= 90:
        raise HTTPException(status_code=400, detail="Invalid latitude.")
    if not -180 <= lng <= 180:
        raise HTTPException(status_code=400, detail="Invalid longitude.")

    allowed_actions = {"repair", "refurbish", "sell", "donate", "recycle"}
    if action and action.lower() not in allowed_actions:
        raise HTTPException(status_code=400, detail="Invalid action.")

    allowed_devices = {
        "smartphone", "laptop", "tablet", "television", "monitor",
        "keyboard", "mouse", "printer", "other",
    }
    if device_type and device_type.lower() not in allowed_devices:
        raise HTTPException(status_code=400, detail="Invalid device_type.")
    device_type = device_type.lower() if device_type else "other"

    if not 1 <= radius_km <= 50:
        raise HTTPException(status_code=400, detail="radius_km must be between 1 and 50.")

    radius_km = float(radius_km)
    action_l = (action or "").lower()

    tiers = ["targeted", "compatible", "general"]
    osm_data: dict | None = None
    used_tier = "targeted"
    last_error: str | None = None

    for tier in tiers:
        query = build_overpass_query(
            lat, lng, action, radius_km, device_type, tier=tier
        )
        candidate, error = await run_overpass_query(query)
        if candidate is None:
            last_error = error
            continue
        if candidate.get("elements"):
            # A broad OSM query may still contain irrelevant objects. Check
            # whether at least one element belongs to the requested domain
            # before accepting this tier.
            relevant_elements = [
                element
                for element in candidate.get("elements", [])
                if is_relevant_osm_place(
                    element.get("tags", {}) or {}, device_type, action
                )
            ]
            if relevant_elements:
                osm_data = {**candidate, "elements": relevant_elements}
                used_tier = tier
                break

    # Never fail the whole user flow just because the public Overpass service
    # is temporarily unavailable. Return a normal JSON response with a live
    # Google Maps fallback instead of HTTP 502.
    osm_service_unavailable = False
    if osm_data is None:
        osm_data = {"elements": []}
        used_tier = "general"
        osm_service_unavailable = bool(last_error)

    results: list[dict] = []

    for element in osm_data.get("elements", []):
        tags = element.get("tags", {}) or {}

        # Safety net for broad fallback searches: never surface a place whose
        # OSM tags do not belong to the requested device/action domain.
        if not is_relevant_osm_place(tags, device_type, action):
            continue

        place_lat = element.get("lat")
        place_lng = element.get("lon")
        if place_lat is None or place_lng is None:
            center = element.get("center", {}) or {}
            place_lat = center.get("lat")
            place_lng = center.get("lon")
        if place_lat is None or place_lng is None:
            continue

        place_lat = float(place_lat)
        place_lng = float(place_lng)
        distance_km = haversine_distance(lat, lng, place_lat, place_lng)

        # Prefer a real OSM name. If OSM has no name, use an existing
        # brand/operator/reference when available. Otherwise create a
        # transparent descriptive label from the mapped place category.
        # This is NOT a fabricated business name.
        place_type = classify_osm_place(tags, action)
        name = next(
            (str(value).strip() for value in (
                tags.get("name"),
                tags.get("brand"),
                tags.get("operator"),
                tags.get("ref"),
            ) if value and str(value).strip()),
            None,
        )
        if not name:
            if tags.get("shop") in {"computer", "electronics", "mobile_phone", "printer_ink", "hifi", "repair"}:
                name = "Unnamed electronics shop"
            elif tags.get("craft") == "electronics_repair" or tags.get("repair") in {"yes", "only"}:
                name = "Unnamed electronics repair location"
            elif tags.get("amenity") == "recycling":
                name = "Unnamed recycling facility"
            elif tags.get("amenity") == "charity" or tags.get("shop") == "charity":
                name = "Unnamed donation location"
            elif tags.get("shop") in {"second_hand", "pawnbroker"}:
                name = "Unnamed reuse / resale shop"
            elif action_l == "repair":
                name = "Unnamed repair-related local option"
            elif action_l in {"sell", "refurbish"}:
                name = "Unnamed reuse / resale option"
            elif action_l == "recycle":
                name = "Unnamed recycling-related option"
            elif action_l == "donate":
                name = "Unnamed donation-related option"
            else:
                name = "Unnamed local option"

        match_score, match_level, match_reasons = score_osm_match(
            tags, device_type, action
        )
        services = mapped_services(tags)

        if used_tier == "compatible":
            match_score = max(0, match_score - 8)
            if match_level == "Strong":
                match_level = "Good"
        elif used_tier == "general":
            match_score = min(match_score, 48)
            match_level = "General lead"
            match_reasons = [
                "Broader local option",
                "Requested service not explicitly mapped",
            ]

        address_parts = [
            tags.get(key)
            for key in [
                "addr:housenumber", "addr:street", "addr:suburb",
                "addr:city", "addr:postcode",
            ]
            if tags.get(key)
        ]

        results.append({
            "id": f"osm-{element.get('type')}-{element.get('id')}",
            "name": name,
            "type": place_type,
            "action": action_l.capitalize() if action_l else classify_osm_place(tags, action),
            "lat": place_lat,
            "lng": place_lng,
            "distance_km": round(distance_km, 2),
            "address": ", ".join(address_parts),
            "phone": tags.get("phone"),
            "website": tags.get("website"),
            "source": "OpenStreetMap",
            "match_score": match_score,
            "match_level": match_level,
            "match_reasons": match_reasons,
            "services": services,
            "search_tier": used_tier,
        })

    # Same OSM feature can match multiple clauses. Keep one record per feature.
    results = list({item["id"]: item for item in results}.values())
    results.sort(key=lambda item: (-item["match_score"], item["distance_km"]))
    results = results[:15]

    device_label = device_type.replace("_", " ")
    action_label = action_l or "electronics"
    external_search_url = build_google_maps_search_url(device_type, action)

    exhausted = radius_km >= 50 and len(results) == 0
    if osm_service_unavailable:
        search_message = (
            "The live OpenStreetMap map service is temporarily unavailable. "
            "EcoLoop did not invent or substitute a business. "
            "Use the live Google Maps search below to review real nearby options."
        )
    elif exhausted:
        search_message = (
            "We searched the strongest matches, broader compatible categories, "
            "and general local leads up to 50 km, but the map data did not give "
            f"us a verified {device_label} + {action_label} option. "
            "Use the live Google Maps search below to review real nearby alternatives."
        )
    elif used_tier == "general":
        search_message = (
            "We broadened the search to real local electronics/circular-economy "
            "leads because the requested service was not explicitly mapped."
        )
    elif used_tier == "compatible":
        search_message = (
            "We broadened the search to compatible service categories to find "
            "a useful local option."
        )
    else:
        search_message = "Found places with direct or strong OpenStreetMap evidence for this request."

    return {
        "user_location": {"lat": lat, "lng": lng},
        "action": action,
        "device_type": device_type,
        "radius_km": radius_km,
        "count": len(results),
        "results": results,
        "source": "OpenStreetMap",
        "search_tier": used_tier,
        "search_message": search_message,
        "exhausted_50km": exhausted,
        "external_search_url": external_search_url,
        "osm_service_unavailable": osm_service_unavailable,
    }
