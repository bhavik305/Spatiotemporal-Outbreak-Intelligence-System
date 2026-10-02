"""
Phase 5 API Test Suite — matches frontend TypeScript contract
"""
import sys, os, math
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from fastapi.testclient import TestClient
from main import app, load_all

load_all()
client = TestClient(app, raise_server_exceptions=True)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}

def test_dashboard_summary_schema():
    r = client.get("/api/dashboard/summary")
    assert r.status_code == 200
    d = r.json()
    assert "activeSurveillance" in d and "districts" in d["activeSurveillance"]
    assert all(k in d for k in ["reportingTaluks", "activeSignals", "candidateClusters"])

def test_dashboard_map_schema():
    r = client.get("/api/dashboard/map")
    assert r.status_code == 200
    d = r.json()
    assert "taluks" in d and "districts" in d and "bounds" in d

def test_dashboard_map_taluk_fields():
    taluks = client.get("/api/dashboard/map").json()["taluks"]
    assert len(taluks) > 0
    for field in ["id","name","districtId","districtName","latitude","longitude","disease","cases","riskLevel","temporalSignal","spatialSignal","clusterAssociation"]:
        assert field in taluks[0], f"Missing: {field}"

def test_dashboard_map_no_nan():
    for t in client.get("/api/dashboard/map").json()["taluks"]:
        if t["latitude"] is not None:
            assert not math.isnan(t["latitude"]) and not math.isinf(t["latitude"])

def test_dashboard_map_coordinate_range():
    for t in client.get("/api/dashboard/map").json()["taluks"]:
        if t["latitude"] is not None:
            assert 6.0 <= t["latitude"] <= 14.0
        if t["longitude"] is not None:
            assert 74.0 <= t["longitude"] <= 78.0

def test_dashboard_map_invalid_district_empty():
    r = client.get("/api/dashboard/map?district=nonexistentdistrict12345")
    assert r.status_code == 200
    assert r.json()["taluks"] == []

def test_trends_schema():
    r = client.get("/api/intelligence/trends?disease=dengue&period=30d")
    assert r.status_code == 200
    d = r.json()
    assert "disease" in d and "data" in d
    for pt in d["data"]:
        assert "date" in pt and "cases" in pt

def test_trends_missing_disease_422():
    assert client.get("/api/intelligence/trends").status_code == 422

def test_trends_invalid_disease_empty():
    r = client.get("/api/intelligence/trends?disease=nonexistent999")
    assert r.status_code == 200 and r.json()["data"] == []

def test_signals_returns_list():
    r = client.get("/api/intelligence/signals")
    assert r.status_code == 200 and isinstance(r.json(), list)

def test_signals_schema():
    sigs = client.get("/api/intelligence/signals").json()
    assert len(sigs) > 0
    s = sigs[0]
    for field in ["disease","taluk","district","detectionPeriod","observedActivity","expectedBaseline","signalDetected"]:
        assert field in s
    assert "start" in s["detectionPeriod"] and "end" in s["detectionPeriod"]

def test_clusters_returns_list():
    r = client.get("/api/clusters")
    assert r.status_code == 200 and isinstance(r.json(), list)

def test_cluster_schema():
    c = client.get("/api/clusters").json()[0]
    for field in ["id","disease","taluks","timeWindow","totalCases","spatialConcentration","temporalSignal","hotspot","epicentre"]:
        assert field in c
    assert "start" in c["timeWindow"] and "end" in c["timeWindow"]

def test_cluster_epicentre_coords():
    for c in client.get("/api/clusters").json():
        if c["epicentre"]:
            lat, lon = c["epicentre"]["latitude"], c["epicentre"]["longitude"]
            if lat: assert 6.0 <= lat <= 14.0
            if lon: assert 74.0 <= lon <= 78.0

def test_cluster_filter_invalid_empty():
    r = client.get("/api/clusters?disease=unknowndisease999")
    assert r.status_code == 200 and r.json() == []

def test_cluster_by_id():
    clusters = client.get("/api/clusters").json()
    if clusters:
        r = client.get(f"/api/clusters/{clusters[0]['id']}")
        assert r.status_code == 200

def test_cluster_by_invalid_id():
    assert client.get("/api/clusters/999999999").status_code == 404

def test_alerts_returns_list():
    r = client.get("/api/alerts")
    assert r.status_code == 200 and isinstance(r.json(), list)

def test_alert_schema():
    alerts = client.get("/api/alerts").json()
    if alerts:
        a = alerts[0]
        for f in ["id","severity","disease","district","taluk","date","explanation","recommendedActions"]:
            assert f in a
        assert a["severity"] in ("Low","Moderate","High","Critical")
        assert isinstance(a["recommendedActions"], list)

def test_alerts_limit():
    assert len(client.get("/api/alerts?limit=3").json()) <= 3

def test_advisory_schema():
    d = client.get("/api/advisory").json()
    for f in ["title","whatIsHappening","where","whatShouldResidentsDo","whenMedicalAttention","source","updateDate"]:
        assert f in d
    assert isinstance(d["whatShouldResidentsDo"], list)

def test_surveillance_cycle():
    d = client.get("/api/surveillance/cycle/current").json()
    for f in ["id","startTime","endTime","status","reportsReceived","taluksReporting","lastUpdate"]:
        assert f in d

def test_geo_districts():
    dists = client.get("/api/geography/districts").json()
    assert len(dists) > 0
    assert all(k in dists[0] for k in ["id","name","talukCount"])

def test_geo_taluks():
    taluks = client.get("/api/geography/taluks").json()
    assert len(taluks) > 0
    for f in ["id","name","districtId","districtName","latitude","longitude"]:
        assert f in taluks[0]

def test_geo_kerala():
    d = client.get("/api/geography/kerala").json()
    assert d["type"] == "FeatureCollection" and len(d["features"]) > 0

def test_geo_district_geometry():
    d = client.get("/api/geography/districts/ernakulam/geometry").json()
    assert d["type"] == "Feature"

def test_cors_header():
    r = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert "access-control-allow-origin" in r.headers

def test_empty_result_no_crash():
    r = client.get("/api/alerts?disease=unknowndisease&district=unknowndistrict")
    assert r.status_code == 200 and r.json() == []

def test_no_nan_in_map_response():
    text = client.get("/api/dashboard/map").text
    for bad in ["NaN","Infinity","-Infinity"]:
        assert bad not in text


def test_surveillance_cycle_lifecycle():
    # 1. Simulate 11:59 AM IST (REPORTING_OPEN)
    sim_open = "2026-10-02T11:59:00+05:30"
    r = client.post("/api/surveillance/simulate", json={"time": sim_open})
    assert r.status_code == 200
    
    cycle_info = client.get("/api/surveillance/cycle/current").json()
    assert cycle_info["status"] == "REPORTING_OPEN"
    assert cycle_info["reporting_open"] is True
    
    # 2. Submit hospital reports from multiple hospitals during open window
    report1 = {
        "districtId": "ernakulam",
        "talukId": "kanayannur",
        "facilityType": "government_hospital",
        "facilityName": "General Hospital Ernakulam",
        "disease": "dengue",
        "reportDate": "2026-10-02",
        "newCases": 25,
        "activeCases": 40,
        "remarks": "Increase in fever admissions"
    }
    
    # Validate report
    val_res = client.post("/api/surveillance/reports/validate", json=report1)
    assert val_res.status_code == 200
    assert val_res.json()["districtName"] == "Ernakulam"
    assert val_res.json()["talukName"] == "Kanayannur"
    
    # Submit report 1
    sub_res1 = client.post("/api/surveillance/reports", json=report1)
    assert sub_res1.status_code == 200
    r1 = sub_res1.json()
    assert r1["status"] == "Accepted"
    assert r1["cycleId"] == "CYCLE-20261002"
    assert r1["newCases"] == 25
    
    # Submit report 2 from another hospital in same cycle
    report2 = {
        "districtId": "kozhikode",
        "talukId": "kozhikode",
        "facilityType": "community_health_center",
        "facilityName": "CHC Kozhikode",
        "disease": "dengue",
        "reportDate": "2026-10-02",
        "newCases": 18,
        "activeCases": 22
    }
    sub_res2 = client.post("/api/surveillance/reports", json=report2)
    assert sub_res2.status_code == 200
    
    # Check cycle reports received
    status_res = client.get("/api/surveillance/cycle/CYCLE-20261002/status").json()
    assert status_res["totalReports"] >= 2
    assert status_res["taluksReporting"] >= 2
    
    # Snapshot principle: before 12:05 PM, the map does not mix today's cycle date
    map_pre = client.get("/api/dashboard/map?date=2026-10-02").json()
    assert len(map_pre["taluks"]) == 0
    
    # 3. Simulate 12:00 PM IST (REPORTING_CLOSED)
    sim_closed = "2026-10-02T12:00:00+05:30"
    client.post("/api/surveillance/simulate", json={"time": sim_closed})
    cycle_closed = client.get("/api/surveillance/cycle/current").json()
    assert cycle_closed["status"] in ("REPORTING_CLOSED", "PROCESSING")
    assert cycle_closed["reporting_open"] is False
    
    # Rejection of submissions after 12:00 PM
    sub_reject = client.post("/api/surveillance/reports", json=report1)
    assert sub_reject.status_code == 400
    assert "Reporting closed" in sub_reject.json()["detail"]
    
    # 4. Simulate 12:02 PM IST (PROCESSING)
    sim_proc = "2026-10-02T12:02:00+05:30"
    client.post("/api/surveillance/simulate", json={"time": sim_proc})
    cycle_proc = client.get("/api/surveillance/cycle/current").json()
    assert cycle_proc["status"] == "PROCESSING"
    
    # 5. Simulate 12:05 PM IST (PUBLISHED)
    sim_pub = "2026-10-02T12:05:00+05:30"
    client.post("/api/surveillance/simulate", json={"time": sim_pub})
    cycle_pub = client.get("/api/surveillance/cycle/current").json()
    assert cycle_pub["status"] == "PUBLISHED"
    
    # Verify map and dashboard now include the newly published cycle
    map_post = client.get("/api/dashboard/map?date=2026-10-02").json()
    assert len(map_post["taluks"]) >= 2
    taluk_names = [t["name"] for t in map_post["taluks"]]
    assert "Kanayannur" in taluk_names or "kanayannur" in [t["id"] for t in map_post["taluks"]]
    
    # Check Kanayannur cases in map data
    kan_data = next((t for t in map_post["taluks"] if "kanayannur" in t["id"].lower()), None)
    assert kan_data is not None
    assert kan_data["cases"] == 25
    
    # Reset simulation
    client.post("/api/surveillance/simulate", json={"reset": True})
