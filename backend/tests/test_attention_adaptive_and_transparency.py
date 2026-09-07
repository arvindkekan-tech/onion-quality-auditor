from fastapi.testclient import TestClient
from app.main import app
from app import store
from app.grading import calculate_commercial_grade, build_standards_matrix, generate_why_this_grade

client = TestClient(app)

def test_attention_queue_and_standards_matrix():
    detections = [
        {'id': 'onion_1', 'final_class': 'healthy', 'confidence': 0.92, 'diameter_mm': 55.0},
        {'id': 'onion_2', 'final_class': 'uncertain', 'confidence': 0.45, 'diameter_mm': 60.0},
        {'id': 'onion_3', 'final_class': 'sprouted', 'confidence': 0.52, 'diameter_mm': 40.5},
    ]
    res = calculate_commercial_grade(
        total_onions=3,
        healthy_count=1,
        rotten_damaged_count=0,
        sprouted_count=1,
        uncertain_count=1,
        average_confidence=0.63,
        detections=detections,
    )
    # Defect ratio: 1/3 = 33.3% -> Rejected
    assert res.grade == 'Rejected'
    assert res.attention_required is True
    assert len(res.attention_queue) >= 3
    # Check for specific attention queue items
    titles = [item['title'] for item in res.attention_queue]
    assert any('Uncertain' in t for t in titles)
    assert any('Low Confidence' in t for t in titles)
    assert any('Rejection Alert' in t for t in titles)
    
    # Check Standards Matrix
    assert len(res.standards_matrix) == 7
    param_names = [m['parameter'] for m in res.standards_matrix]
    assert 'Visible Rot & Mechanical Damage' in param_names
    assert 'Internal Rot (Smut / Soft Rot)' in param_names
    # Internal rot must require manual check
    int_rot = next(m for m in res.standards_matrix if 'Internal Rot' in m['parameter'])
    assert int_rot['requiresManualCheck'] is True
    assert int_rot['evidenceStatus'] == 'Not Camera Measurable'

def test_why_this_grade_recalculation():
    why = generate_why_this_grade(
        total_onions=50,
        healthy_count=48,
        rotten_damaged_count=1,
        sprouted_count=1,
        uncertain_count=0,
        defect_ratio=0.04,
        grade='Grade A',
        grade_code='grade_a',
        officer_overrides_count=0,
    )
    assert why['grade'] == 'Grade A'
    assert why['sampleSize'] == 50
    assert 'qualifies for Grade A' in why['narrative']
    
    # When officer overrides
    why_overridden = generate_why_this_grade(
        total_onions=50,
        healthy_count=45,
        rotten_damaged_count=3,
        sprouted_count=2,
        uncertain_count=0,
        defect_ratio=0.10,
        grade='URS',
        grade_code='urs',
        officer_overrides_count=2,
    )
    assert why_overridden['grade'] == 'URS'
    assert 'designated as URS' in why_overridden['narrative']
    assert '2 manual officer decision(s)' in why_overridden['narrative']

def test_adaptive_review_intelligence_and_farmer_request():
    # 1. Store mock decisions that simulate officer corrections
    import uuid
    from app import local_store
    local_store.init_db()
    insp_id = f'test-insp-adaptive-{uuid.uuid4().hex[:8]}'
    # Create test inspection
    store.create_inspection(
        id=insp_id,
        variety='Nashik Red',
        weight_kg=50.0,
        location='Lasalgaon Mandi',
        created_at=store.utc_now_iso(),
    )
    # Save an override where AI was 'sprouted' but Officer corrected to 'healthy'
    decisions = [{
        'onionId': 'onion_test_1',
        'aiClass': 'sprouted',
        'officerClass': 'healthy',
        'reason': 'Superficial skin peel, no shoot',
    }]
    store.save_onion_decisions(insp_id, decisions)
    
    # 2. Query adaptive recommendations for 'sprouted'
    rec = store.get_adaptive_recommendation('sprouted', 0.55)
    assert rec['hasAdaptiveInsight'] is True
    assert rec['fromClass'] == 'sprouted'
    assert rec['toClass'] == 'healthy'
    assert 'previously verified similar case' in rec['insightText']
    assert 'Superficial skin peel, no shoot' in rec['commonReasons']

    # 3. Test Farmer Review Request API
    req_res = client.post(
        f'/api/v1/inspections/{insp_id}/request-review',
        json={
            'farmerName': 'Kisan Patil',
            'phoneNumber': '+91 9876543210',
            'reasonCategory': 'Quality Disagreement',
            'comments': 'Sample was drawn from top layer only; request fresh composite draw.',
        }
    )
    assert req_res.status_code == 200, req_res.text
    req_body = req_res.json()
    assert req_body['farmerName'] == 'Kisan Patil'
    assert req_body['status'] == 'PENDING'

    # 4. Query review requests
    get_reqs = client.get(f'/api/v1/inspections/{insp_id}/review-requests')
    assert get_reqs.status_code == 200
    assert len(get_reqs.json()) >= 1
