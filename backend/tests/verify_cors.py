import sys
from pathlib import Path

backend_dir = str(Path(__file__).resolve().parent.parent)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

origins_to_test = [
    "https://ecoloop-led9pc3u8-ninjaebis-projects.vercel.app",
    "http://localhost:5173",
    "https://ecoloop-preview-test.vercel.app",
]

for origin in origins_to_test:
    print(f"\n--- Testing Origin: {origin} ---")
    headers = {
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    }
    
    # 1. OPTIONS /chat
    res = client.options("/chat", headers=headers)
    assert res.status_code == 200, f"OPTIONS /chat failed for {origin}: {res.status_code}"
    assert res.headers.get("access-control-allow-origin") == origin
    print("OPTIONS /chat: 200 OK, ACAO:", res.headers.get("access-control-allow-origin"))

    # 2. OPTIONS /api/chat
    res_api = client.options("/api/chat", headers=headers)
    assert res_api.status_code == 200
    print("OPTIONS /api/chat: 200 OK")

    # 3. POST /chat
    res_post = client.post("/chat", headers={"Origin": origin}, json={"message": "What is EcoLoop AI?"})
    assert res_post.status_code == 200
    assert res_post.headers.get("access-control-allow-origin") == origin
    print("POST /chat: 200 OK, reply length:", len(res_post.json().get("reply", "")))

    # 4. POST /api/chat
    res_api_post = client.post("/api/chat", headers={"Origin": origin}, json={"message": "What is EcoLoop AI?"})
    assert res_api_post.status_code == 200
    print("POST /api/chat: 200 OK")

    # 5. GET /health
    res_health = client.get("/health", headers={"Origin": origin})
    assert res_health.status_code == 200
    print("GET /health: 200 OK")

    # 6. GET /api/health
    res_api_health = client.get("/api/health", headers={"Origin": origin})
    assert res_api_health.status_code == 200
    print("GET /api/health: 200 OK")

print("\nALL CORS & ROUTE TESTS PASSED!")
