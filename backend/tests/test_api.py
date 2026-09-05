from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'

def test_reproducible_assessment_and_history():
    payload = {'device_type':'smartphone','recognition_status':'manual','recognition_confidence':0,'manual_assessment':True,'answers':{'age_years':2,'power':'yes','charging':'yes','display':'no','touch':'no','battery':'yes','working_status':'working','visible_damage':'minor'},'findings':['Manual test']}
    response = client.post('/api/assessment', json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body['recommended_action'] in {'Repair','Refurbish','Sell','Donate','Recycle'}
    assert set(body['recommendation_scores']) == {'Repair','Refurbish','Sell','Donate','Recycle'}
    assert 0 <= body['ecoscore'] <= 100
    assert client.get(f"/api/assessments/{body['id']}").status_code == 200

def test_rejects_non_image():
    response = client.post('/api/analyze', files={'image':('not-image.txt',b'not an image','text/plain')})
    assert response.status_code == 415
