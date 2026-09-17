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
