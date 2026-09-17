"""
PHASE 5: FastAPI Backend
AI Early Outbreak Detection & Source Localization System

Matches frontend API contract from:
  frontend/src/api/intelligence.ts
  frontend/src/api/geography.ts
  frontend/src/types/index.ts
"""

from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from typing import Optional
import json
import math
import os
import uuid
import warnings

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")

HEATMAP_CSV   = os.path.join(DATA_DIR, "phase4_heatmap_data.csv")
CLUSTERS_CSV  = os.path.join(DATA_DIR, "phase4_outbreak_clusters.csv")
SOURCE_CSV    = os.path.join(DATA_DIR, "phase4_source_map.csv")
DISTRICT_CSV  = os.path.join(DATA_DIR, "phase4_district_summary.csv")
STATE_CSV     = os.path.join(DATA_DIR, "phase4_state_summary.csv")
P3_PRED_CSV   = os.path.join(DATA_DIR, "phase3_predictions.csv")

# ---------------------------------------------------------------------------
# In-memory cache
# ---------------------------------------------------------------------------
cache: dict = {}

# ---------------------------------------------------------------------------
# GeoJSON — static bundled Kerala geometry (minimal bounding polygons)
# The map uses Leaflet and requires real GeoJSON features.
# We use a simplified static file that ships with the API.
# ---------------------------------------------------------------------------
GEO_DIR = os.path.join(BASE_DIR, "geo")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def safe_float(v):
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


def safe_int(v):
    if v is None:
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


def fmt_date(d) -> str:
    if d is None:
        return ""
    if isinstance(d, str):
        return d[:10]
    if isinstance(d, (datetime, date)):
        return d.strftime("%Y-%m-%d")
    return str(d)[:10]


def filter_df(
    df: pd.DataFrame,
    disease: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    district: Optional[str] = None,
    taluk: Optional[str] = None,
) -> pd.DataFrame:
    if disease and "disease" in df.columns:
        df = df[df["disease"].str.lower() == disease.lower()]
    if start_date and "date" in df.columns:
        df = df[df["date"].dt.date >= start_date]
    if end_date and "date" in df.columns:
        df = df[df["date"].dt.date <= end_date]
    if district and "district" in df.columns:
        df = df[df["district"].str.lower() == district.lower()]
    if taluk and "taluk" in df.columns:
        df = df[df["taluk"].str.lower() == taluk.lower()]
    return df


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
def load_all():
    p4h = pd.read_csv(HEATMAP_CSV, parse_dates=["date"])
    p4c = pd.read_csv(CLUSTERS_CSV, parse_dates=["date"])
    src = pd.read_csv(SOURCE_CSV, parse_dates=["date"])
    p4d = pd.read_csv(DISTRICT_CSV, parse_dates=["date"])
    p4s = pd.read_csv(STATE_CSV, parse_dates=["date"])
    p3  = pd.read_csv(P3_PRED_CSV, parse_dates=["date"])

    # Normalise district/taluk names for consistent lookups
    for df in [p4h, p4c, src, p4d, p4s, p3]:
        if "district" in df.columns:
            df["district"] = df["district"].str.strip()
        if "taluk" in df.columns:
            df["taluk"] = df["taluk"].str.strip()

    cache["heatmap"]  = p4h
    cache["clusters"] = p4c
    cache["sources"]  = src
    cache["district"] = p4d
    cache["state"]    = p4s
    cache["p3"]       = p3

    # Build geo lookup: taluk → {latitude, longitude, district, districtId, id}
    geo_df = (
        p4h[["taluk", "district", "latitude", "longitude"]]
        .drop_duplicates(subset=["taluk", "district"])
        .dropna(subset=["latitude", "longitude"])
    )
    cache["geo"] = geo_df

    print(f"[LOADED] heatmap={len(p4h)}, clusters={len(p4c)}, p3={len(p3)}")


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all()
    yield


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="AI Outbreak Detection API",
    description="Phase 5 — Spatiotemporal outbreak visualization backend",
    version="5.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # permissive for dev; tighten via env in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Custom JSON encoder for NaN/Inf safety
# ---------------------------------------------------------------------------
class SafeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        return json.dumps(content, allow_nan=False, default=str).encode("utf-8")


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------
@app.get("/health", summary="Health check")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# /api/dashboard/summary  → DashboardSummary
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/summary", summary="Dashboard KPI summary")
def dashboard_summary():
    p4h = cache["heatmap"]
    p4c = cache["clusters"]

    districts_active = p4h["district"].nunique()
    taluks_active    = p4h["taluk"].nunique()
    reporting_taluks = p4h[p4h["cases"].notna() & (p4h["cases"] > 0)]["taluk"].nunique() if "cases" in p4h.columns else taluks_active
    active_signals   = int((p4h["predicted_outbreak"] == 1).sum()) if "predicted_outbreak" in p4h.columns else 0
    candidate_clusters = int(p4c["cluster_id"].nunique()) if "cluster_id" in p4c.columns else 0

    return {
        "activeSurveillance": {
            "districts": int(districts_active),
            "taluks": int(taluks_active),
        },
        "reportingTaluks": int(reporting_taluks),
        "activeSignals": active_signals,
        "candidateClusters": candidate_clusters,
    }


# ---------------------------------------------------------------------------
# /api/dashboard/map  → MapData
# Params: disease, date, district
# ---------------------------------------------------------------------------
@app.get("/api/dashboard/map", summary="Map taluk data")
def dashboard_map(
    disease:  Optional[str]  = Query(None),
    date_:    Optional[date] = Query(None, alias="date"),
    district: Optional[str]  = Query(None),
):
    p4h = cache["heatmap"].copy()

    # Apply filters
    if disease:
        p4h = p4h[p4h["disease"].str.lower() == disease.lower()]
    if date_:
        p4h = p4h[p4h["date"].dt.date == date_]
    if district:
        p4h = p4h[p4h["district"].str.lower() == district.lower()]

    # Aggregate to latest record per (taluk, disease) for per-taluk summary
    if len(p4h) == 0:
        return {"taluks": [], "districts": [], "bounds": [[8.0, 74.8], [12.8, 77.4]]}

    # Latest observation per taluk (per disease combo kept, then take top by prob)
    latest = (
        p4h.sort_values("date")
        .groupby(["taluk", "district"], as_index=False)
        .last()
    )

    # Merge cases from p3 if available (p4h may not have raw cases)
    p3 = cache["p3"]
    p3_last = (
        p3.sort_values("date")
        .groupby(["taluk", "district"], as_index=False)
        .agg({"cases": "sum", "date": "last"})
    )
    latest = latest.merge(p3_last[["taluk", "district", "cases"]], on=["taluk", "district"], how="left", suffixes=("", "_p3"))
    if "cases_p3" in latest.columns and "cases" not in latest.columns:
        latest["cases"] = latest["cases_p3"]
    elif "cases_p3" in latest.columns:
        latest["cases"] = latest["cases"].fillna(latest["cases_p3"])
    if "cases_p3" in latest.columns:
        latest.drop(columns=["cases_p3"], inplace=True)

    def risk_level(prob: float) -> str:
        if prob is None or math.isnan(prob):
            return "Unknown"
        if prob >= 0.65:
            return "High"
        if prob >= 0.35:
            return "Moderate"
        return "Low"

    taluks = []
    for _, row in latest.iterrows():
        lat = safe_float(row.get("latitude"))
        lon = safe_float(row.get("longitude"))
        if lat is None or lon is None:
            continue
        prob = safe_float(row.get("outbreak_probability")) or safe_float(row.get("model_outbreak_prob")) or 0.0
        cases_val = safe_int(row.get("cases")) or 0
        taluks.append({
            "id": str(row["taluk"]).lower().replace(" ", "_"),
            "name": str(row["taluk"]),
            "districtId": str(row["district"]).lower().replace(" ", "_"),
            "districtName": str(row["district"]),
            "latitude": lat,
            "longitude": lon,
            "disease": str(row.get("disease", disease or "all")),
            "cases": cases_val,
            "previousCases": 0,
            "changePercent": 0.0,
            "riskLevel": risk_level(prob),
            "temporalSignal": bool(row.get("predicted_outbreak", 0) == 1),
            "spatialSignal": bool(safe_float(row.get("outbreak_intensity", 0) or 0) > 0.3),
            "clusterAssociation": False,
        })

    # Districts list
    dist_list = latest["district"].dropna().unique().tolist()
    districts = [
        {"id": d.lower().replace(" ", "_"), "name": d, "talukCount": int(latest[latest["district"] == d]["taluk"].nunique())}
        for d in dist_list
    ]

    lats = [t["latitude"] for t in taluks if t["latitude"]]
    lons = [t["longitude"] for t in taluks if t["longitude"]]
    if lats and lons:
        bounds = [[min(lats) - 0.1, min(lons) - 0.1], [max(lats) + 0.1, max(lons) + 0.1]]
    else:
        bounds = [[8.0, 74.8], [12.8, 77.4]]

    return {"taluks": taluks, "districts": districts, "bounds": bounds}


# ---------------------------------------------------------------------------
# /api/intelligence/trends  → DiseaseTrends
# Params: disease, district, taluk, period, startDate, endDate
# ---------------------------------------------------------------------------
@app.get("/api/intelligence/trends", summary="Disease case trends over time")
def intelligence_trends(
    disease:   str            = Query(...),
    district:  Optional[str]  = Query(None),
    taluk:     Optional[str]  = Query(None),
    period:    str            = Query("30d"),
    startDate: Optional[date] = Query(None),
    endDate:   Optional[date] = Query(None),
):
    p3 = cache["p3"].copy()
    p3 = p3[p3["disease"].str.lower() == disease.lower()]
    if district:
        p3 = p3[p3["district"].str.lower() == district.lower()]
    if taluk:
        p3 = p3[p3["taluk"].str.lower() == taluk.lower()]

    if startDate:
        p3 = p3[p3["date"].dt.date >= startDate]
    elif not endDate:
        period_map = {"7d": 7, "30d": 30, "90d": 90}
        days = period_map.get(period, 30)
        max_date = p3["date"].max()
        cutoff = max_date - timedelta(days=days)
        p3 = p3[p3["date"] >= cutoff]
    if endDate:
        p3 = p3[p3["date"].dt.date <= endDate]

    if p3.empty:
        return {"disease": disease, "district": district, "taluk": taluk, "data": []}

    daily = p3.groupby("date")["cases"].sum().reset_index().sort_values("date")
    data_points = [
        {"date": fmt_date(row["date"]), "cases": safe_int(row["cases"]) or 0}
        for _, row in daily.iterrows()
    ]

    return {
        "disease": disease,
        "district": district,
        "taluk": taluk,
        "data": data_points,
    }


# ---------------------------------------------------------------------------
# /api/intelligence/signals  → TemporalSignal[]
# Params: disease, district
# ---------------------------------------------------------------------------
@app.get("/api/intelligence/signals", summary="Temporal outbreak signals per taluk")
def intelligence_signals(
    disease:  Optional[str] = Query(None),
    district: Optional[str] = Query(None),
):
    p3 = cache["p3"].copy()
    if disease:
        p3 = p3[p3["disease"].str.lower() == disease.lower()]
    if district:
        p3 = p3[p3["district"].str.lower() == district.lower()]

    if p3.empty:
        return []

    # One signal per (taluk, disease) based on most recent observation
    latest = p3.sort_values("date").groupby(["taluk", "district", "disease"], as_index=False).last()
    # Historical baseline per (taluk, disease)
    hist = p3.groupby(["taluk", "district", "disease"])["cases"].mean().reset_index().rename(columns={"cases": "baseline"})
    latest = latest.merge(hist, on=["taluk", "district", "disease"], how="left")

    max_date = p3["date"].max()
    window_start = max_date - timedelta(days=30)

    signals = []
    for _, row in latest.iterrows():
        prob = safe_float(row.get("model_outbreak_prob")) or 0.0
        obs = safe_int(row.get("cases")) or 0
        baseline = safe_float(row.get("baseline")) or 0.0
        detected = bool(row.get("model_outbreak_pred", 0) == 1)

        signals.append({
            "disease": str(row["disease"]),
            "taluk": str(row["taluk"]),
            "district": str(row["district"]),
            "detectionPeriod": {
                "start": fmt_date(window_start),
                "end": fmt_date(max_date),
            },
            "observedActivity": obs,
            "expectedBaseline": round(baseline, 1),
            "signalDetected": detected,
            "technicalDetails": {
                "model": "RandomForest (Phase 3)",
                "temporalAnalysis": "Rolling 4–12 week lag features",
                "spatialAnalysis": "10km neighborhood aggregation",
                "clusterMethod": "Spatiotemporal DBSCAN (r=25km, t=14d)",
                "inputPeriod": "2020-01-01 to 2024-12-31",
                "trainingValidation": "Train/Val/Test split; F1=0.576, PR-AUC=0.613",
                "modelVersion": "v3.0-phase3",
            },
        })

    return signals


# ---------------------------------------------------------------------------
# /api/clusters  → Cluster[]
# Params: disease, district, date
# ---------------------------------------------------------------------------
@app.get("/api/clusters", summary="Outbreak cluster list")
def get_clusters(
    disease:  Optional[str]  = Query(None),
    district: Optional[str]  = Query(None),
    date_:    Optional[date]  = Query(None, alias="date"),
):
    df = cache["clusters"].copy()
    if disease:
        df = df[df["disease"].str.lower() == disease.lower()]
    if district:
        df = df[df["district"].str.lower() == district.lower()]
    if date_:
        df = df[df["date"].dt.date == date_]

    if df.empty:
        return []

    clusters = []
    for cid, grp in df.groupby("cluster_id"):
        taluks = grp["taluk"].dropna().unique().tolist()
        date_min = grp["date"].min()
        date_max = grp["date"].max()
        disease_ = grp["disease"].iloc[0]
        lat = safe_float(grp["latitude"].mean())
        lon = safe_float(grp["longitude"].mean())
        total_cases_raw = cache["p3"]
        tc_filter = total_cases_raw[
            (total_cases_raw["disease"].str.lower() == disease_.lower()) &
            (total_cases_raw["taluk"].isin(taluks))
        ]["cases"].sum()

        intensity = safe_float(grp["outbreak_intensity"].mean()) or 0.0
        clusters.append({
            "id": str(cid),
            "disease": disease_,
            "taluks": taluks,
            "timeWindow": {"start": fmt_date(date_min), "end": fmt_date(date_max)},
            "totalCases": safe_int(tc_filter) or 0,
            "spatialConcentration": round(intensity, 4),
            "temporalSignal": round(intensity, 4),
            "hotspot": taluks[0] if taluks else "",
            "epicentre": {"latitude": lat, "longitude": lon} if lat and lon else None,
            "geometry": None,
        })

    return clusters


# ---------------------------------------------------------------------------
# /api/clusters/{clusterId}  → Cluster
# ---------------------------------------------------------------------------
@app.get("/api/clusters/{cluster_id}", summary="Single cluster detail")
def get_cluster_by_id(cluster_id: str):
    df = cache["clusters"].copy()
    try:
        cid = int(cluster_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Cluster not found")

    grp = df[df["cluster_id"] == cid]
    if grp.empty:
        raise HTTPException(status_code=404, detail="Cluster not found")

    taluks = grp["taluk"].dropna().unique().tolist()
    date_min = grp["date"].min()
    date_max = grp["date"].max()
    disease_ = grp["disease"].iloc[0]
    lat = safe_float(grp["latitude"].mean())
    lon = safe_float(grp["longitude"].mean())
    intensity = safe_float(grp["outbreak_intensity"].mean()) or 0.0

    tc_filter = cache["p3"][
        (cache["p3"]["disease"].str.lower() == disease_.lower()) &
        (cache["p3"]["taluk"].isin(taluks))
    ]["cases"].sum()

    return {
        "id": cluster_id,
        "disease": disease_,
        "taluks": taluks,
        "timeWindow": {"start": fmt_date(date_min), "end": fmt_date(date_max)},
        "totalCases": safe_int(tc_filter) or 0,
        "spatialConcentration": round(intensity, 4),
        "temporalSignal": round(intensity, 4),
        "hotspot": taluks[0] if taluks else "",
        "epicentre": {"latitude": lat, "longitude": lon} if lat and lon else None,
        "geometry": None,
    }


# ---------------------------------------------------------------------------
# /api/alerts  → Alert[]
# Params: severity, disease, district, limit
# ---------------------------------------------------------------------------
@app.get("/api/alerts", summary="Public health alerts derived from Phase 3 predictions")
def get_alerts(
    severity: Optional[str] = Query(None),
    disease:  Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    limit:    int            = Query(20, ge=1, le=200),
):
    p3 = cache["p3"].copy()
    p4h = cache["heatmap"].copy()

    # Take high-probability outbreak predictions as alerts
    alerts_df = p3[p3["model_outbreak_pred"] == 1].copy()

    if disease:
        alerts_df = alerts_df[alerts_df["disease"].str.lower() == disease.lower()]
    if district:
        alerts_df = alerts_df[alerts_df["district"].str.lower() == district.lower()]

    alerts_df = alerts_df.sort_values("model_outbreak_prob", ascending=False).head(limit * 2)

    def sev(prob: float) -> str:
        if prob >= 0.75: return "Critical"
        if prob >= 0.60: return "High"
        if prob >= 0.45: return "Moderate"
        return "Low"

    alerts = []
    for _, row in alerts_df.iterrows():
        prob = safe_float(row.get("model_outbreak_prob")) or 0.0
        s = sev(prob)
        if severity and s.lower() != severity.lower():
            continue
        alerts.append({
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{row['date']}-{row['disease']}-{row['taluk']}")),
            "severity": s,
            "disease": str(row["disease"]).replace("_", " ").title(),
            "district": str(row["district"]),
            "taluk": str(row["taluk"]),
            "date": fmt_date(row["date"]),
            "explanation": (
                f"Outbreak probability {prob:.0%} detected in {row['taluk']}, {row['district']} "
                f"for {str(row['disease']).replace('_', ' ')} based on Phase 3 Random Forest model."
            ),
            "recommendedActions": [
                "Increase surveillance frequency in this taluk",
                "Alert district health officers",
                "Prepare rapid response if case counts rise",
            ],
        })
        if len(alerts) >= limit:
            break

    return alerts


# ---------------------------------------------------------------------------
# /api/advisory  → Advisory
# ---------------------------------------------------------------------------
@app.get("/api/advisory", summary="Public health advisory")
def get_advisory():
    p3 = cache["p3"]
    top = (
        p3[p3["model_outbreak_pred"] == 1]
        .sort_values("model_outbreak_prob", ascending=False)
        .head(1)
    )
    if top.empty:
        return {
            "title": "General Health Advisory — Kerala Disease Surveillance",
            "whatIsHappening": "Routine disease surveillance is ongoing across all districts of Kerala.",
            "where": "Kerala (all 14 districts)",
            "whatShouldResidentsDo": [
                "Maintain personal hygiene and sanitation",
                "Seek medical care for fever, rash, or diarrhoea",
                "Avoid stagnant water to reduce vector-borne disease risk",
                "Report unusual disease clusters to the nearest Primary Health Centre",
            ],
            "whenMedicalAttention": "Seek immediate care for high fever (>38.5°C), severe diarrhoea, difficulty breathing, or sudden rash.",
            "source": "AI Outbreak Detection System — Phase 3 Analysis",
            "updateDate": datetime.today().strftime("%Y-%m-%d"),
        }

    row = top.iloc[0]
    disease_clean = str(row["disease"]).replace("_", " ").title()
    return {
        "title": f"Health Advisory: Elevated {disease_clean} Activity",
        "whatIsHappening": (
            f"AI surveillance has detected elevated {disease_clean} activity in {row['district']} district "
            f"(model probability: {row['model_outbreak_prob']:.0%}). "
            "This advisory is based on spatiotemporal pattern analysis and is NOT a confirmed outbreak declaration."
        ),
        "where": f"{row['taluk']}, {row['district']} district, Kerala",
        "whatShouldResidentsDo": [
            f"Be alert to symptoms associated with {disease_clean}",
            "Maintain good hygiene and safe water practices",
            "Avoid self-medication; seek diagnosis at the nearest healthcare facility",
            "Report new cases to local health authorities promptly",
        ],
        "whenMedicalAttention": (
            f"Seek immediate medical attention for fever, rash, or symptoms typical of {disease_clean}. "
            "Do not delay if symptoms are severe."
        ),
        "source": "AI Outbreak Detection System — Phase 3 Random Forest Model (Candidate Source — No Ground Truth)",
        "updateDate": datetime.today().strftime("%Y-%m-%d"),
    }


# ---------------------------------------------------------------------------
# /api/surveillance/cycle/current  → SurveillanceCycle
# ---------------------------------------------------------------------------
@app.get("/api/surveillance/cycle/current", summary="Current surveillance cycle")
def surveillance_cycle_current():
    p3 = cache["p3"]
    max_date = p3["date"].max()
    cycle_start = (max_date - timedelta(days=6)).strftime("%Y-%m-%dT00:00:00")
    cycle_end   = max_date.strftime("%Y-%m-%dT23:59:59")
    reporting   = int(p3[p3["date"] >= (max_date - timedelta(days=6))]["taluk"].nunique())
    return {
        "id": f"CYCLE-{max_date.strftime('%Y%m%d')}",
        "startTime": cycle_start,
        "endTime": cycle_end,
        "status": "ANALYSIS_READY",
        "reportsReceived": reporting,
        "taluksReporting": reporting,
        "lastUpdate": max_date.strftime("%Y-%m-%dT%H:%M:%S"),
    }


# ---------------------------------------------------------------------------
# /api/surveillance/cycle/{cycleId}
# ---------------------------------------------------------------------------
@app.get("/api/surveillance/cycle/{cycle_id}", summary="Surveillance cycle by ID")
def surveillance_cycle_by_id(cycle_id: str):
    return surveillance_cycle_current()


# ---------------------------------------------------------------------------
# /api/surveillance/reports  POST — accept and acknowledge
# ---------------------------------------------------------------------------
@app.post("/api/surveillance/reports", summary="Submit hospital report")
def submit_report(report: dict):
    return {
        "reportId": str(uuid.uuid4()),
        "district": report.get("districtId", ""),
        "taluk": report.get("talukId", ""),
        "disease": report.get("disease", ""),
        "newCases": report.get("newCases", 0),
        "cycleId": f"CYCLE-{date.today().strftime('%Y%m%d')}",
        "status": "Accepted",
    }


# ---------------------------------------------------------------------------
# /api/surveillance/reports/validate  POST
# ---------------------------------------------------------------------------
@app.post("/api/surveillance/reports/validate", summary="Validate hospital report")
def validate_report(report: dict):
    return {
        **report,
        "districtName": report.get("districtId", ""),
        "talukName": report.get("talukId", ""),
        "cycleId": f"CYCLE-{date.today().strftime('%Y%m%d')}",
    }


# ---------------------------------------------------------------------------
# /api/surveillance/cycle/{cycleId}/status
# ---------------------------------------------------------------------------
@app.get("/api/surveillance/cycle/{cycle_id}/status", summary="Cycle reporting status")
def cycle_status(cycle_id: str):
    p3 = cache["p3"]
    return {
        "totalReports": len(p3),
        "taluksReporting": int(p3["taluk"].nunique()),
        "diseasesReported": p3["disease"].unique().tolist(),
    }


# ---------------------------------------------------------------------------
# /api/geography/districts  → District[]
# ---------------------------------------------------------------------------
@app.get("/api/geography/districts", summary="List of districts")
def geo_districts():
    geo = cache["geo"]
    districts = geo[["district"]].drop_duplicates()
    return [
        {
            "id": str(row["district"]).lower().replace(" ", "_"),
            "name": str(row["district"]),
            "talukCount": int(geo[geo["district"] == row["district"]]["taluk"].nunique()),
        }
        for _, row in districts.iterrows()
    ]


# ---------------------------------------------------------------------------
# /api/geography/taluks  → Taluk[]
# Params: district_id
# ---------------------------------------------------------------------------
@app.get("/api/geography/taluks", summary="Taluks, optionally by district")
def geo_taluks(district_id: Optional[str] = Query(None)):
    geo = cache["geo"]
    if district_id:
        geo = geo[geo["district"].str.lower().str.replace(" ", "_") == district_id.lower()]
    return [
        {
            "id": str(row["taluk"]).lower().replace(" ", "_"),
            "name": str(row["taluk"]),
            "districtId": str(row["district"]).lower().replace(" ", "_"),
            "districtName": str(row["district"]),
            "latitude": safe_float(row["latitude"]),
            "longitude": safe_float(row["longitude"]),
        }
        for _, row in geo.iterrows()
    ]


# ---------------------------------------------------------------------------
# /api/geography/taluks/{talukId}/geometry  → GeoJSON Feature
# Returns a simple point feature (no polygon data available without external GeoJSON)
# ---------------------------------------------------------------------------
@app.get("/api/geography/taluks/{taluk_id}/geometry", summary="Taluk geometry (point)")
def taluk_geometry(taluk_id: str):
    geo = cache["geo"]
    match = geo[geo["taluk"].str.lower().str.replace(" ", "_") == taluk_id.lower()]
    if match.empty:
        return {"type": "Feature", "geometry": None, "properties": {"id": taluk_id}}
    row = match.iloc[0]
    lat = safe_float(row["latitude"])
    lon = safe_float(row["longitude"])
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]} if lat and lon else None,
        "properties": {
            "id": taluk_id,
            "name": str(row["taluk"]),
            "district": str(row["district"]),
        },
    }


# ---------------------------------------------------------------------------
# /api/geography/districts/{districtId}/geometry  → GeoJSON Feature
# ---------------------------------------------------------------------------
@app.get("/api/geography/districts/{district_id}/geometry", summary="District geometry (point centroid)")
def district_geometry(district_id: str):
    geo = cache["geo"]
    match = geo[geo["district"].str.lower().str.replace(" ", "_") == district_id.lower()]
    if match.empty:
        return {"type": "Feature", "geometry": None, "properties": {"id": district_id}}
    lat = safe_float(match["latitude"].mean())
    lon = safe_float(match["longitude"].mean())
    district_name = match["district"].iloc[0]
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]} if lat and lon else None,
        "properties": {
            "id": district_id,
            "name": str(district_name),
        },
    }


# ---------------------------------------------------------------------------
# /api/geography/kerala  → GeoJSON FeatureCollection (all taluk points)
# ---------------------------------------------------------------------------
@app.get("/api/geography/kerala", summary="All Kerala taluk points as FeatureCollection")
def kerala_geometry():
    geo = cache["geo"]
    features = []
    for _, row in geo.iterrows():
        lat = safe_float(row["latitude"])
        lon = safe_float(row["longitude"])
        if not lat or not lon:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {
                "id": str(row["taluk"]).lower().replace(" ", "_"),
                "name": str(row["taluk"]),
                "district": str(row["district"]),
                "districtId": str(row["district"]).lower().replace(" ", "_"),
            },
        })
    return {"type": "FeatureCollection", "features": features}
