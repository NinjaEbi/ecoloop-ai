from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_device_config_endpoint():
    response = client.get('/api/config/devices')
    assert response.status_code == 200
    data = response.json()
    assert 'devices' in data
    assert 'weights' in data
    assert len(data['devices']) >= 15
    device_ids = {d['id'] for d in data['devices']}
    expected = {
        'smartphone', 'laptop', 'desktop', 'tablet', 'television',
        'monitor', 'refrigerator', 'washing_machine', 'air_conditioner',
        'printer', 'keyboard', 'mouse', 'router', 'speaker', 'other',
    }
    assert expected.issubset(device_ids)


def test_reproducible_assessment_and_history():
    payload = {
        'device_type': 'smartphone',
        'recognition_status': 'manual',
        'recognition_confidence': 0,
        'manual_assessment': True,
        'answers': {
            'age_years': 2,
            'power': 'yes',
            'charging': 'yes',
            'display': 'no',
            'touch': 'no',
            'battery': 'yes',
            'working_status': 'working',
            'visible_damage': 'minor',
        },
        'findings': ['Manual test'],
    }
    response1 = client.post('/api/assessment', json=payload)
    response2 = client.post('/api/assessment', json=payload)
    assert response1.status_code == 200
    assert response2.status_code == 200
    body1 = response1.json()
    body2 = response2.json()

    # Exact deterministic score reproducibility
    assert body1['ecoscore'] == body2['ecoscore']
    assert body1['condition_score'] == body2['condition_score']
    assert body1['recommended_action'] == body2['recommended_action']
    assert 0 <= body1['ecoscore'] <= 100
    assert body1['recommended_action'] in {'Repair', 'Refurbish', 'Sell', 'Donate', 'Recycle'}
    assert set(body1['recommendation_scores']) == {'Repair', 'Refurbish', 'Sell', 'Donate', 'Recycle'}
    assert 'environmental_impact' in body1
    assert 'recommendation_reasons' in body1
    assert len(body1['recommendation_reasons']) > 0


def test_scenario_new_working_smartphone_resale():
    payload = {
        'device_type': 'smartphone',
        'answers': {
            'age_years': 0,
            'working_status': 'fully_working',
            'visible_damage': 'none',
            'battery_condition': 'healthy',
            'touch_display': 'flawless',
            'repairability': 'easy',
        },
    }
    resp = client.post('/api/assessment', json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body['ecoscore'] >= 75
    assert body['recommended_action'] == 'Sell'
    assert any('reselling' in r.lower() or 'market' in r.lower() or 'commercial' in r.lower() for r in body['recommendation_reasons'])


def test_scenario_old_working_device_donation():
    payload = {
        'device_type': 'laptop',
        'answers': {
            'age_years': 6,
            'working_status': 'fully_working',
            'visible_damage': 'minor',
            'battery_condition': 'healthy',
            'repairability': 'easy',
        },
    }
    resp = client.post('/api/assessment', json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body['recommended_action'] in {'Donate', 'Refurbish', 'Sell'}
    assert 0 <= body['ecoscore'] <= 100


def test_scenario_minor_repairable_issue():
    payload = {
        'device_type': 'smartphone',
        'answers': {
            'age_years': 2,
            'working_status': 'partially_working',
            'visible_damage': 'minor',
            'battery_condition': 'degraded',
            'touch_display': 'flawless',
            'repairability': 'easy',
        },
    }
    resp = client.post('/api/assessment', json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body['recommended_action'] == 'Repair'
    assert any('repair' in r.lower() for r in body['recommendation_reasons'])


def test_scenario_severely_damaged_nonworking_recycling():
    payload = {
        'device_type': 'television',
        'answers': {
            'age_years': 8,
            'working_status': 'not_working',
            'visible_damage': 'major',
            'repairability': 'difficult',
        },
    }
    resp = client.post('/api/assessment', json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body['ecoscore'] <= 35
    assert body['recommended_action'] == 'Recycle'
    assert any('recycl' in r.lower() for r in body['recommendation_reasons'])


def test_all_15_device_types():
    devices = [
        'smartphone', 'laptop', 'desktop', 'tablet', 'television',
        'monitor', 'refrigerator', 'washing_machine', 'air_conditioner',
        'printer', 'keyboard', 'mouse', 'router', 'speaker', 'other',
    ]
    for device in devices:
        payload = {
            'device_type': device,
            'answers': {
                'age_years': 2,
                'working_status': 'fully_working',
                'visible_damage': 'minor',
                'repairability': 'easy',
            },
        }
        resp = client.post('/api/assessment', json=payload)
        assert resp.status_code == 200
        body = resp.json()
        assert 0 <= body['ecoscore'] <= 100
        assert body['recommended_action'] in {'Repair', 'Refurbish', 'Sell', 'Donate', 'Recycle'}
        assert body['environmental_impact']['device_mass_kg'] > 0


def test_chatbot_endpoint():
    req = {
        'message': 'Why did I get 78?',
        'assessment_context': {
            'device_type': 'laptop',
            'ecoscore': 78.0,
            'ecoscore_band': 'High',
            'recommended_action': 'Repair',
            'recommendation_reasons': ['Core architecture is sound', 'Battery is replaceable'],
            'ecoscore_breakdown': {
                'working_condition': 22.0,
                'physical_condition': 17.0,
                'repairability': 16.0,
                'device_age': 12.0,
                'functional_health': 8.0,
                'reuse_potential': 3.0,
            },
        },
    }
    resp = client.post('/api/chat', json=req)
    assert resp.status_code == 200
    body = resp.json()
    assert '78' in body['reply']
    assert len(body['suggested_questions']) > 0


def test_chatbot_off_topic_refusal():
    req = {'message': 'Write me a Python program to sort a list'}
    resp = client.post('/api/chat', json=req)
    assert resp.status_code == 200
    body = resp.json()
    assert "I'm here to help with EcoLoop AI" in body['reply']


def test_chatbot_score_reduction_explanation():
    req = {
        'message': 'Which factors reduced my score?',
        'assessment_context': {
            'device_type': 'laptop',
            'ecoscore': 64.0,
            'ecoscore_band': 'Moderate',
            'recommended_action': 'Repair',
            'ecoscore_breakdown': {
                'working_condition': 15.0,
                'physical_condition': 10.0,
                'repairability': 18.0,
                'device_age': 9.0,
                'functional_health': 6.0,
                'reuse_potential': 6.0,
            },
        },
    }
    resp = client.post('/api/chat', json=req)
    assert resp.status_code == 200
    body = resp.json()
    assert 'reduced your score' in body['reply'].lower()
    assert 'Physical Condition' in body['reply']


def test_chatbot_page_context():
    req = {'message': 'What can I do here?', 'page_context': 'analyze'}
    resp = client.post('/api/chat', json=req)
    assert resp.status_code == 200
    body = resp.json()
    assert 'Analyze' in body['reply']


def test_assessment_session_id_isolation():
    session_a = 'session-user-aaa-123'
    session_b = 'session-user-bbb-456'

    payload = {
        'device_type': 'smartphone',
        'session_id': session_a,
        'device_category': 'Mobile',
        'answers': {
            'age_years': 1,
            'working_status': 'fully_working',
            'visible_damage': 'none',
            'repairability': 'easy',
        },
    }
    res_a = client.post('/api/assessment', json=payload)
    assert res_a.status_code == 200

    # Query by session_a
    history_a = client.get(f'/api/assessments?session_id={session_a}').json()
    assert any(item.get('session_id') == session_a for item in history_a)

    # Query by session_b should not find session_a's record
    history_b = client.get(f'/api/assessments?session_id={session_b}').json()
    assert not any(item.get('session_id') == session_a for item in history_b)


def test_rejects_non_image():
    response = client.post('/api/analyze', files={'image': ('not-image.txt', b'not an image', 'text/plain')})
    assert response.status_code == 415
