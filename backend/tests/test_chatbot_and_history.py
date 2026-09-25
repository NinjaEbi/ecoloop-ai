import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

DOMAIN_REFUSAL = (
    "I'm here to help with EcoLoop AI, e-waste guidance, "
    "device assessments, EcoScore results and how this website works. "
    "Please ask a question related to EcoLoop AI."
)


def test_off_topic_questions_exact_refusal():
    # Capital of France
    resp1 = client.post("/api/chat", json={"message": "What is the capital of France?"})
    assert resp1.status_code == 200
    assert resp1.json()["reply"] == DOMAIN_REFUSAL

    # Write a Python program
    resp2 = client.post("/api/chat", json={"message": "Write a Python program."})
    assert resp2.status_code == 200
    assert resp2.json()["reply"] == DOMAIN_REFUSAL

    # Who won yesterday's cricket match
    resp3 = client.post("/api/chat", json={"message": "Who won yesterday's cricket match?"})
    assert resp3.status_code == 200
    assert resp3.json()["reply"] == DOMAIN_REFUSAL


def test_history_chatbot_inquiries():
    # Where is my history stored?
    resp1 = client.post("/api/chat", json={"message": "Where is my history stored?"})
    assert resp1.status_code == 200
    body1 = resp1.json()
    assert "localstorage" in body1["reply"].lower()
    assert "no personal assessment data is transmitted" in body1["reply"].lower() or "cloud" in body1["reply"].lower()

    # Can I see my history on another laptop?
    resp2 = client.post("/api/chat", json={"message": "Can I see my history on another laptop?"})
    assert resp2.status_code == 200
    body2 = resp2.json()
    assert "not synchronize" in body2["reply"].lower() or "localstorage" in body2["reply"].lower()


def test_assessment_mode_chatbot():
    context = {
        "mode": "assessment",
        "device": {
            "id": "refrigerator",
            "name": "Refrigerator",
            "category": "Appliances",
        },
        "currentQuestion": {
            "key": "cooling_status",
            "label": "Is the refrigerator maintaining proper cooling temperatures?",
            "factor": "functional_health",
            "options": [
                {"label": "Normal", "description": "Freezer and fridge compartments cool properly"},
                {"label": "Warm", "description": "Fails to reach safe temperatures"},
            ],
        },
        "answers": {"age_years": 3, "working_status": "working"},
        "questionNumber": 3,
        "totalQuestions": 6,
    }

    # What am I assessing?
    resp1 = client.post("/api/chat", json={"message": "What am I assessing?", "assessment_context": context})
    assert resp1.status_code == 200
    assert "Refrigerator" in resp1.json()["reply"]
    assert "question 3 of 6" in resp1.json()["reply"].lower()

    # What does this question mean?
    resp2 = client.post("/api/chat", json={"message": "What does this question mean?", "assessment_context": context})
    assert resp2.status_code == 200
    reply2 = resp2.json()["reply"]
    assert "cooling temperatures" in reply2.lower()
    assert "Functional Health" in reply2

    # Why are you asking about device age?
    resp3 = client.post("/api/chat", json={"message": "Why are you asking about device age?", "assessment_context": context})
    assert resp3.status_code == 200
    assert "device age" in resp3.json()["reply"].lower()
    assert "15%" in resp3.json()["reply"]

    # What does repairability mean?
    resp4 = client.post("/api/chat", json={"message": "What does repairability mean?", "assessment_context": context})
    assert resp4.status_code == 200
    assert "repairability" in resp4.json()["reply"].lower()
    assert "fasteners" in resp4.json()["reply"].lower()

    # Why is this factor important?
    resp5 = client.post("/api/chat", json={"message": "Why is this factor important?", "assessment_context": context})
    assert resp5.status_code == 200
    assert "functional health" in resp5.json()["reply"].lower() or "refrigerator" in resp5.json()["reply"].lower()


def test_result_mode_chatbot():
    context = {
        "mode": "result",
        "device": {
            "id": "laptop",
            "name": "Laptop",
            "category": "Computing",
        },
        "answers": {
            "age_years": 4,
            "working_status": "partially_working",
            "visible_damage": "minor",
            "repairability": "easy",
        },
        "result": {
            "ecoScore": 72,
            "recommendation": "Repair",
            "scoringFactors": {
                "working_condition": 18,
                "physical_condition": 14,
                "repairability": 16,
                "device_age": 10,
                "functional_health": 8,
                "reuse_potential": 6,
            },
            "carbonImpact": {
                "waste_avoided_kg": 2.2,
                "co2_benefit_kg": 65,
            },
            "ecoscore_band": "Moderate",
            "recommendation_reasons": ["Core motherboard functional", "Battery can be serviced"],
        },
    }

    # Why did I get 72?
    resp1 = client.post("/api/chat", json={"message": "Why did I get 72?", "assessment_context": context})
    assert resp1.status_code == 200
    assert "72" in resp1.json()["reply"]
    assert "18" in resp1.json()["reply"]
    assert "Working Condition" in resp1.json()["reply"]

    # What lowered my score?
    resp2 = client.post("/api/chat", json={"message": "What lowered my score?", "assessment_context": context})
    assert resp2.status_code == 200
    assert "deficit" in resp2.json()["reply"].lower() or "loss of" in resp2.json()["reply"].lower()
    assert "partially_working" in resp2.json()["reply"] or "minor" in resp2.json()["reply"]

    # Why is repair recommended?
    resp3 = client.post("/api/chat", json={"message": "Why is repair recommended?", "assessment_context": context})
    assert resp3.status_code == 200
    assert "REPAIR" in resp3.json()["reply"]
    assert "Core motherboard functional" in resp3.json()["reply"]
