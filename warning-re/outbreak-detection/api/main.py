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
# GeoJSON — authoritative Kerala boundaries from geohacker/kerala (datameet.org/maps)
# Loaded at startup for /api/geography/* endpoints
# ---------------------------------------------------------------------------
GEO_DIR = os.path.join(BASE_DIR, "geo")
DISTRICTS_GEOJSON = os.path.join(GEO_DIR, "kerala_districts.geojson")
TALUKS_GEOJSON = os.path.join(GEO_DIR, "kerala_taluks.geojson")

# In-memory caches for boundaries
_districts_fc: dict = {}
_taluks_fc: dict = {}
_district_geoms: dict = {}
_taluk_geoms: dict = {}

def load_boundaries():
    global _districts_fc, _taluks_fc, _district_geoms, _taluk_geoms
    with open(DISTRICTS_GEOJSON, "r", encoding="utf-8") as f:
        _districts_fc = json.load(f)
    with open(TALUKS_GEOJSON, "r", encoding="utf-8") as f:
        _taluks_fc = json.load(f)

    # Build lookups: district name (lower, spaces→_) → geometry
    for feat in _districts_fc.get("features", []):
        name = str(feat["properties"].get("DISTRICT", "")).strip()
        if name:
            key = name.lower().replace(" ", "_")
            _district_geoms[key] = feat

    # Build lookups: taluk name (lower, spaces→_) → geometry
    for feat in _taluks_fc.get("features", []):
        name = str(feat["properties"].get("TALUK", "")).strip()
        district = str(feat["properties"].get("DISTRICT", "")).strip()
        if name:
            key = name.lower().replace(" ", "_")
            _taluk_geoms[key] = feat

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

    cache["base_heatmap"]  = p4h.copy()
    cache["base_clusters"] = p4c.copy()
    cache["base_sources"]  = src.copy()
    cache["base_district"] = p4d.copy()
    cache["base_state"]    = p4s.copy()
    cache["base_p3"]       = p3.copy()

    cache["heatmap"]  = p4h.copy()
    cache["clusters"] = p4c.copy()
    cache["sources"]  = src.copy()
    cache["district"] = p4d.copy()
    cache["state"]    = p4s.copy()
    cache["p3"]       = p3.copy()

    # Build geo lookup: taluk → {latitude, longitude, district, districtId, id}
    geo_df = (
        p4h[["taluk", "district", "latitude", "longitude"]]
        .drop_duplicates(subset=["taluk", "district"])
        .dropna(subset=["latitude", "longitude"])
    )
    cache["geo"] = geo_df
    load_boundaries()

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
    ensure_processing()
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
    ensure_processing()
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
    ensure_processing()
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
    ensure_processing()
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
# ---------------------------------------------------------------------------
# Surveillance Cycle Management
# ---------------------------------------------------------------------------
from datetime import timezone, time

IST = timezone(timedelta(hours=5, minutes=30))
_simulated_time: Optional[datetime] = None

submitted_reports: list = []
processed_cycle_id: Optional[str] = None

def set_simulated_time(dt: Optional[datetime]):
    global _simulated_time, processed_cycle_id
    _simulated_time = dt
    processed_cycle_id = None

def get_current_time() -> datetime:
    global _simulated_time
    if _simulated_time is not None:
        if _simulated_time.tzinfo is None:
            return _simulated_time.replace(tzinfo=IST)
        return _simulated_time
    return datetime.now(IST)

def get_cycle_state(sim_time: Optional[datetime] = None):
    now = sim_time if sim_time is not None else get_current_time()
    if now.tzinfo is None:
        now = now.replace(tzinfo=IST)
    cycle_date = now.strftime("%Y%m%d")
    cycle_id = f"CYCLE-{cycle_date}"
    
    t = now.time()
    if t < time(12, 0, 0):
        status = "REPORTING_OPEN"
    elif t < time(12, 5, 0):
        if t.hour == 12 and t.minute == 0 and t.second == 0 and t.microsecond == 0:
            status = "REPORTING_CLOSED"
        else:
            status = "PROCESSING"
    else:
        status = "PUBLISHED"
        
    return cycle_id, status, now

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, lam1 = np.radians(lat1), np.radians(lon1)
    phi2, lam2 = np.radians(lat2), np.radians(lon2)
    a = np.sin((phi2 - phi1) / 2) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin((lam2 - lam1) / 2) ** 2
    return R * 2 * np.arcsin(np.sqrt(np.clip(a, 0, 1)))

def process_reports_for_cycle(cycle_id: str, date_obj: datetime):
    global processed_cycle_id
    cycle_reports = [
        r for r in submitted_reports 
        if r.get("cycleId") == cycle_id or r.get("cycle_id") == cycle_id
    ]
    
    # Work from baseline snapshot to maintain non-fabricated integrity
    p3_df = cache.get("base_p3", cache["p3"]).copy()
    heatmap_df = cache.get("base_heatmap", cache["heatmap"]).copy()
    clusters_df = cache.get("base_clusters", cache["clusters"]).copy()
    sources_df = cache.get("base_sources", cache["sources"]).copy()
    geo_df = cache.get("geo", pd.DataFrame())
    
    if not cycle_reports:
        cache["p3"] = p3_df
        cache["heatmap"] = heatmap_df
        cache["clusters"] = clusters_df
        cache["sources"] = sources_df
        processed_cycle_id = cycle_id
        return
        
    df_rep = pd.DataFrame(cycle_reports)
    # Aggregate all reports submitted during this cycle across Kerala
    agg = df_rep.groupby(["taluk", "district", "disease"], as_index=False).agg({
        "newCases": "sum",
        "activeCases": "sum"
    })
    
    new_p3_rows = []
    new_heatmap_rows = []
    cycle_date_dt = pd.to_datetime(date_obj.date())
    
    # Calculate historical baseline from p3
    hist_baseline = p3_df.groupby(["taluk", "district", "disease"])["cases"].mean().to_dict()
    
    for _, row in agg.iterrows():
        t_name = str(row["taluk"]).strip()
        d_name = str(row["district"]).strip()
        dis = str(row["disease"]).strip().lower()
        cases = int(row["newCases"])
        
        # Resolve coordinates from cache geo lookup or taluk geometries
        lat = None
        lon = None
        if not geo_df.empty:
            match = geo_df[
                (geo_df["taluk"].str.lower() == t_name.lower()) & 
                (geo_df["district"].str.lower() == d_name.lower())
            ]
            if not match.empty:
                lat = safe_float(match.iloc[0]["latitude"])
                lon = safe_float(match.iloc[0]["longitude"])
                
        if lat is None or lon is None:
            taluk_key = t_name.lower().replace(" ", "_")
            feat = _taluk_geoms.get(taluk_key)
            if feat and feat.get("geometry"):
                coords = feat["geometry"].get("coordinates", [])
                if coords:
                    def extract_pts(c):
                        if isinstance(c[0], (int, float)):
                            return [c]
                        res = []
                        for sub in c:
                            res.extend(extract_pts(sub))
                        return res
                    all_pts = extract_pts(coords)
                    if all_pts:
                        lon = float(np.mean([pt[0] for pt in all_pts]))
                        lat = float(np.mean([pt[1] for pt in all_pts]))
        
        baseline = hist_baseline.get((t_name, d_name, dis), 5.0)
        
        # Outbreak detection and risk calculation
        if cases >= 5 and cases > baseline * 1.2:
            prob = float(np.clip(0.40 + (cases - baseline) / (baseline + 10.0) * 0.5, 0.45, 0.95))
            pred = 1
            intensity = float(np.clip(cases / (baseline + 5.0) * 0.4, 0.25, 1.0))
        else:
            prob = float(np.clip(cases / (baseline + 10.0) * 0.3, 0.05, 0.35)) if baseline > 0 else 0.1
            pred = 0
            intensity = float(np.clip(cases / (baseline + 10.0) * 0.2, 0.0, 0.3))
            
        new_p3_rows.append({
            "date": cycle_date_dt,
            "year": date_obj.year,
            "state": "Kerala",
            "district": d_name,
            "taluk": t_name,
            "disease": dis,
            "cases": cases,
            "outbreak_label": pred,
            "split": "test",
            "model_outbreak_prob": prob,
            "model_outbreak_pred": pred,
            "outbreak_intensity_score": intensity,
        })
        
        new_heatmap_rows.append({
            "date": cycle_date_dt,
            "disease": dis,
            "state": "Kerala",
            "district": d_name,
            "taluk": t_name,
            "latitude": lat,
            "longitude": lon,
            "outbreak_label": pred,
            "predicted_outbreak": pred,
            "outbreak_probability": prob,
            "outbreak_intensity": intensity,
            "weight": intensity,
            "cases": cases,
        })
        
    if new_p3_rows:
        new_p3_df = pd.DataFrame(new_p3_rows)
        p3_df = pd.concat([p3_df, new_p3_df], ignore_index=True)
        
    if new_heatmap_rows:
        new_heatmap_df = pd.DataFrame(new_heatmap_rows)
        heatmap_df = pd.concat([heatmap_df, new_heatmap_df], ignore_index=True)
        
        # Spatial Clustering on positive outbreak signals (Radius: 25km)
        positives = new_heatmap_df[
            (new_heatmap_df["predicted_outbreak"] == 1) & 
            new_heatmap_df["latitude"].notna() & 
            new_heatmap_df["longitude"].notna()
        ]
        
        new_cluster_rows = []
        max_cid = int(clusters_df["cluster_id"].max()) if not clusters_df.empty and "cluster_id" in clusters_df.columns else 1000
        
        for dis, grp in positives.groupby("disease"):
            n = len(grp)
            if n == 0:
                continue
            visited = np.zeros(n, dtype=bool)
            lats = grp["latitude"].values
            lons = grp["longitude"].values
            taluks = grp["taluk"].values
            districts = grp["district"].values
            intensities = grp["outbreak_intensity"].values
            
            for i in range(n):
                if visited[i]:
                    continue
                max_cid += 1
                c_indices = [i]
                visited[i] = True
                
                for j in range(n):
                    if not visited[j]:
                        dist_km = haversine_km(lats[i], lons[i], lats[j], lons[j])
                        if dist_km <= 25.0:
                            visited[j] = True
                            c_indices.append(j)
                            
                for idx in c_indices:
                    new_cluster_rows.append({
                        "cluster_id": max_cid,
                        "disease": dis,
                        "date": cycle_date_dt,
                        "state": "Kerala",
                        "district": districts[idx],
                        "taluk": taluks[idx],
                        "latitude": lats[idx],
                        "longitude": lons[idx],
                        "outbreak_intensity": intensities[idx],
                    })
                    
        if new_cluster_rows:
            new_clusters_df = pd.DataFrame(new_cluster_rows)
            clusters_df = pd.concat([clusters_df, new_clusters_df], ignore_index=True)
            
    cache["p3"] = p3_df
    cache["heatmap"] = heatmap_df
    cache["clusters"] = clusters_df
    cache["sources"] = sources_df
    processed_cycle_id = cycle_id


def ensure_processing(sim_time: Optional[datetime] = None):
    global processed_cycle_id
    cycle_id, status, now = get_cycle_state(sim_time)
    if status == "PUBLISHED" and processed_cycle_id != cycle_id:
        process_reports_for_cycle(cycle_id, now)
        processed_cycle_id = cycle_id


# ---------------------------------------------------------------------------
# /api/surveillance/cycle/current  → SurveillanceCycle
# ---------------------------------------------------------------------------
@app.get("/api/surveillance/cycle/current", summary="Current surveillance cycle")
def surveillance_cycle_current():
    ensure_processing()
    cycle_id, status, now = get_cycle_state()
    
    cycle_start = f"{now.strftime('%Y-%m-%d')}T00:00:00+05:30"
    cycle_end   = f"{now.strftime('%Y-%m-%d')}T23:59:59+05:30"
    
    cycle_reports = [r for r in submitted_reports if r.get("cycleId") == cycle_id or r.get("cycle_id") == cycle_id]
    taluks_reporting = len(set(r.get("taluk") for r in cycle_reports if r.get("taluk")))
    
    return {
        "id": cycle_id,
        "startTime": cycle_start,
        "endTime": cycle_end,
        "status": status,
        "reporting_open": status == "REPORTING_OPEN",
        "reportingOpen": status == "REPORTING_OPEN",
        "reportsReceived": len(cycle_reports),
        "taluksReporting": taluks_reporting,
        "lastUpdate": now.strftime("%Y-%m-%dT%H:%M:%S+05:30"),
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
    ensure_processing()
    cycle_id, status, now = get_cycle_state()
    if status != "REPORTING_OPEN":
        raise HTTPException(status_code=400, detail="Reporting closed for today's surveillance cycle.")
        
    dist_id = str(report.get("districtId") or report.get("district", "")).strip().lower().replace(" ", "_")
    taluk_id = str(report.get("talukId") or report.get("taluk", "")).strip().lower().replace(" ", "_")
    dist_feat = _district_geoms.get(dist_id)
    taluk_feat = _taluk_geoms.get(taluk_id)
    
    district_name = dist_feat["properties"]["DISTRICT"] if dist_feat else (report.get("districtName") or report.get("district") or report.get("districtId", ""))
    taluk_name = taluk_feat["properties"]["TALUK"] if taluk_feat else (report.get("talukName") or report.get("taluk") or report.get("talukId", ""))
    
    new_cases_val = safe_int(report.get("newCases", report.get("new_cases", 0))) or 0
    active_cases_val = safe_int(report.get("activeCases", report.get("active_cases", 0))) or 0
    disease_val = str(report.get("disease", "")).strip().lower()
    report_date = str(report.get("reportDate") or report.get("date") or now.strftime("%Y-%m-%d"))
    
    report_copy = dict(report)
    report_copy["reportId"] = str(uuid.uuid4())
    report_copy["cycleId"] = cycle_id
    report_copy["cycle_id"] = cycle_id
    report_copy["district"] = district_name
    report_copy["districtName"] = district_name
    report_copy["districtId"] = report.get("districtId") or dist_id
    report_copy["taluk"] = taluk_name
    report_copy["talukName"] = taluk_name
    report_copy["talukId"] = report.get("talukId") or taluk_id
    report_copy["disease"] = disease_val
    report_copy["reportDate"] = report_date
    report_copy["date"] = report_date
    report_copy["newCases"] = new_cases_val
    report_copy["new_cases"] = new_cases_val
    report_copy["activeCases"] = active_cases_val
    report_copy["active_cases"] = active_cases_val
    report_copy["facilityType"] = report.get("facilityType", report.get("facility_type", ""))
    report_copy["facilityName"] = report.get("facilityName", report.get("facility_name", ""))
    report_copy["remarks"] = report.get("remarks", "")
    report_copy["created_at"] = now.isoformat()
    report_copy["status"] = "Accepted"
    
    submitted_reports.append(report_copy)
    return report_copy


# ---------------------------------------------------------------------------
# /api/surveillance/reports/validate  POST
# ---------------------------------------------------------------------------
@app.post("/api/surveillance/reports/validate", summary="Validate hospital report")
def validate_report(report: dict):
    ensure_processing()
    cycle_id, _, now = get_cycle_state()
    dist_id = str(report.get("districtId") or report.get("district", "")).strip().lower().replace(" ", "_")
    taluk_id = str(report.get("talukId") or report.get("taluk", "")).strip().lower().replace(" ", "_")
    dist_feat = _district_geoms.get(dist_id)
    taluk_feat = _taluk_geoms.get(taluk_id)
    
    district_name = dist_feat["properties"]["DISTRICT"] if dist_feat else (report.get("districtName") or report.get("district") or report.get("districtId", ""))
    taluk_name = taluk_feat["properties"]["TALUK"] if taluk_feat else (report.get("talukName") or report.get("taluk") or report.get("talukId", ""))
    
    return {
        **report,
        "district": district_name,
        "districtName": district_name,
        "districtId": report.get("districtId") or dist_id,
        "taluk": taluk_name,
        "talukName": taluk_name,
        "talukId": report.get("talukId") or taluk_id,
        "cycleId": cycle_id,
        "cycle_id": cycle_id,
        "created_at": now.isoformat(),
    }


# ---------------------------------------------------------------------------
# /api/surveillance/cycle/{cycleId}/status
# ---------------------------------------------------------------------------
@app.get("/api/surveillance/cycle/{cycle_id}/status", summary="Cycle reporting status")
def cycle_status(cycle_id: str):
    ensure_processing()
    cycle_reports = [r for r in submitted_reports if r.get("cycleId") == cycle_id or r.get("cycle_id") == cycle_id]
    taluks_reporting = len(set(r.get("taluk") for r in cycle_reports if r.get("taluk")))
    diseases = list(set(r.get("disease") for r in cycle_reports if r.get("disease")))
    
    return {
        "totalReports": len(cycle_reports),
        "taluksReporting": taluks_reporting,
        "diseasesReported": diseases,
    }


# ---------------------------------------------------------------------------
# /api/surveillance/simulate (Development / Demo Simulation Helper)
# ---------------------------------------------------------------------------
@app.post("/api/surveillance/simulate", summary="Set simulated time for testing cycle states")
def simulate_cycle(payload: dict):
    if payload.get("reset"):
        set_simulated_time(None)
        return {"status": "reset", "currentTime": get_current_time().isoformat()}
    sim_time_str = payload.get("time")
    if sim_time_str:
        dt = datetime.fromisoformat(sim_time_str)
        set_simulated_time(dt)
        ensure_processing()
        cycle_id, status, now = get_cycle_state()
        return {
            "status": "simulated",
            "cycleId": cycle_id,
            "cycleStatus": status,
            "simulatedTime": now.isoformat(),
        }
    return {"status": "no_change", "currentTime": get_current_time().isoformat()}


# ---------------------------------------------------------------------------
# /api/geography/districts  → District[]
# ---------------------------------------------------------------------------
@app.get("/api/geography/districts", summary="List of districts with polygons")
def geo_districts():
    return [
        {
            "id": feat["properties"]["DISTRICT"].lower().replace(" ", "_"),
            "name": feat["properties"]["DISTRICT"],
            "talukCount": len([
                t for t in _taluks_fc.get("features", [])
                if t["properties"].get("DISTRICT", "").lower().replace(" ", "_") == feat["properties"]["DISTRICT"].lower().replace(" ", "_")
            ]),
            "geometry": feat["geometry"],
        }
        for feat in _districts_fc.get("features", [])
    ]


# ---------------------------------------------------------------------------
# /api/geography/taluks  → Taluk[]
# Params: district_id
# ---------------------------------------------------------------------------
@app.get("/api/geography/taluks", summary="Taluks with polygons, optionally by district")
def geo_taluks(district_id: Optional[str] = Query(None)):
    feats = _taluks_fc.get("features", [])
    if district_id:
        feats = [f for f in feats if f["properties"].get("DISTRICT", "").lower().replace(" ", "_") == district_id.lower()]
    
    geo_df = cache.get("geo", pd.DataFrame())
    result = []
    for feat in feats:
        t_name = feat["properties"].get("TALUK", "")
        d_name = feat["properties"].get("DISTRICT", "")
        lat = None
        lon = None
        if not geo_df.empty:
            match = geo_df[(geo_df["taluk"].str.lower() == t_name.lower()) & (geo_df["district"].str.lower() == d_name.lower())]
            if not match.empty:
                lat = safe_float(match.iloc[0]["latitude"])
                lon = safe_float(match.iloc[0]["longitude"])
        if lat is None or lon is None:
            coords = feat.get("geometry", {}).get("coordinates", [])
            if coords:
                def extract_pts(c):
                    if isinstance(c[0], (int, float)):
                        return [c]
                    res = []
                    for sub in c:
                        res.extend(extract_pts(sub))
                    return res
                all_pts = extract_pts(coords)
                if all_pts:
                    lon = float(np.mean([pt[0] for pt in all_pts]))
                    lat = float(np.mean([pt[1] for pt in all_pts]))
        result.append({
            "id": feat["properties"]["TALUK"].lower().replace(" ", "_"),
            "name": feat["properties"]["TALUK"],
            "districtId": feat["properties"]["DISTRICT"].lower().replace(" ", "_"),
            "districtName": feat["properties"]["DISTRICT"],
            "latitude": lat,
            "longitude": lon,
            "geometry": feat["geometry"],
        })
    return result


# ---------------------------------------------------------------------------
# /api/geography/taluks/{talukId}/geometry  → GeoJSON Feature (Polygon)
# Returns authoritative polygon from downloaded boundary data
# ---------------------------------------------------------------------------
@app.get("/api/geography/taluks/{taluk_id}/geometry", summary="Taluk geometry (polygon)")
def taluk_geometry(taluk_id: str):
    feat = _taluk_geoms.get(taluk_id.lower())
    if not feat:
        return {"type": "Feature", "geometry": None, "properties": {"id": taluk_id}}
    return feat


# ---------------------------------------------------------------------------
# /api/geography/districts/{districtId}/geometry  → GeoJSON Feature (Polygon)
# ---------------------------------------------------------------------------
@app.get("/api/geography/districts/{district_id}/geometry", summary="District geometry (polygon)")
def district_geometry(district_id: str):
    feat = _district_geoms.get(district_id.lower())
    if not feat:
        return {"type": "Feature", "geometry": None, "properties": {"id": district_id}}
    return feat


# ---------------------------------------------------------------------------
# /api/geography/kerala  → GeoJSON FeatureCollection (all taluk polygons)
# ---------------------------------------------------------------------------
@app.get("/api/geography/kerala", summary="All Kerala taluk polygons as FeatureCollection")
def kerala_geometry():
    return _taluks_fc
