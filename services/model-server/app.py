from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

app = FastAPI(title="Restaurant Model Server", version="1.0.0")

# --- Model registry ---------------------------------------------------------

# Map restaurant slug -> model path
MODEL_MAP: Dict[str, str] = {
    "sunset-grill": "models/sunset-grill/0003_customer_demand_pipeline.pkl",
    "pasta-place":  "models/pasta-place/0004_customer_demand_pipeline.pkl",
    "sushi-house":  "models/sushi-house/0005_customer_demand_pipeline.pkl",
}

#temp restaurant meta data 
RESTAURANT_META = {
    "sunset-grill": {
        "google_rating": 4.3,
        "average_bill_price": 28.0,
        "distance_to_cbd_km": 3.5,
        "categories": "grill",
        "closing_time": 22,
        "total_seats": 60,
    },
    "pasta-place": {
        "google_rating": 4.5,
        "average_bill_price": 24.0,
        "distance_to_cbd_km": 5.2,
        "categories": "italian",
        "closing_time": 23,
        "total_seats": 48,
    },
    "sushi-house": {
        "google_rating": 4.2,
        "average_bill_price": 30.0,
        "distance_to_cbd_km": 2.1,
        "categories": "japanese",
        "closing_time": 21,
        "total_seats": 40,
    },
}


# If your file names differ, update the paths above (e.g., customer_demand_pipeline.pkl)

_models: Dict[str, object] = {}  

def load_model(slug: str):
    if slug in _models:
        return _models[slug]
    path = MODEL_MAP.get(slug)
    if not path or not os.path.exists(path):
        raise FileNotFoundError(f"model for {slug} not found at {path}")
    model = joblib.load(path)
    _models[slug] = model
    return model

# --- IO schemas -------------------------------------------------------------

class Hour(BaseModel):
    hour: int  

class GenerateReq(BaseModel):
    restaurant_slug: str
    date: str                 
    opening_hours: List[Hour]
    context: Optional[dict] = None  

class Prediction(BaseModel):
    hour: int
    walkins: int

class Discount(BaseModel):
    hour: int
    discountPct: int

class GenerateRes(BaseModel):
    predictions: List[Prediction]
    discounts: List[Discount]
    total_walkins: Optional[int] = None
    model_version: Optional[str] = "pickle-1.0"


# --- Feature engineering + mapping -----------------------------------------

REQUIRED_COL_DEFAULTS = {
    "hour": 12,
    "day_of_week": 0,
    "weekday_index": 0,
    "month": 1,
    "is_weekend": 0,
    "google_rating": 4.0,
    "temperature": 20.0,
    "weather": "clear",
    "review_sentiment_score": 0.0,
    "reservations": 0,
    "holiday": 0,
    "is_dinner": 0,
    "total_seats": 60,
    "categories": "general",
    "average_bill_price": 25.0,
    "distance_to_cbd_km": 5.0,
    "local_events": 0,
    "closing_time": 22,
    "is_lunch": 0,
}

def ensure_required_columns(df: pd.DataFrame) -> pd.DataFrame:
    for col, default in REQUIRED_COL_DEFAULTS.items():
        if col not in df.columns:
            df[col] = default
    return df

def build_feature_frame(req: GenerateReq, hours: list[int]) -> pd.DataFrame:
    # Parse date
    try:
        dt = datetime.strptime(req.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")

    weekday_index = dt.weekday()        # 0..6
    day_of_week = weekday_index         # <-- define this
    month = dt.month
    is_weekend = 1 if weekday_index >= 5 else 0

    # Defaults (context > restaurant meta > hard default)
    meta = RESTAURANT_META.get(req.restaurant_slug, {})
    ctx = req.context or {}
    pick = lambda k, d: ctx.get(k, meta.get(k, d))

    google_rating        = float(pick("google_rating", 4.0))
    average_bill_price   = float(pick("average_bill_price", 25.0))
    distance_to_cbd_km   = float(pick("distance_to_cbd_km", 5.0))
    categories           = pick("categories", "general")
    closing_time         = int(pick("closing_time", 22))
    total_seats          = int(pick("total_seats", 60))

    # TEMP dynamic signals (replace later with Prisma/APIs)
    temperature            = float(pick("temperature", 20.0))
    weather                = pick("weather", "clear")
    review_sentiment_score = float(pick("review_sentiment_score", 0.0))
    reservations           = int(pick("reservations", 0))
    local_events           = int(pick("local_events", 0))
    holiday                = int(pick("holiday", 0))

    rows = []
    for h in hours:
        is_lunch  = 1 if 11 <= h <= 14 else 0
        is_dinner = 1 if 17 <= h <= 20 else 0
        rows.append({
            "hour": h,
            "weekday_index": weekday_index,
            "day_of_week": day_of_week,
            "month": month,
            "is_weekend": is_weekend,
            "google_rating": google_rating,
            "temperature": temperature,
            "weather": weather,
            "review_sentiment_score": review_sentiment_score,
            "reservations": reservations,
            "holiday": holiday,
            "is_dinner": is_dinner,
            "total_seats": total_seats,
            "categories": categories,
            "average_bill_price": average_bill_price,
            "distance_to_cbd_km": distance_to_cbd_km,
            "local_events": local_events,
            "closing_time": closing_time,
            "is_lunch": is_lunch,
        })

    df = pd.DataFrame(rows)
    df = ensure_required_columns(df)    
    return df  

def map_walkins_to_discount(walkins: int, total_seats: int = 60) -> int:
    # Simple occupancy-based mapping. Tune as needed.
    occ = 0 if total_seats <= 0 else min(1.0, walkins / float(total_seats))
    if occ >= 0.80: return 5
    if occ >= 0.70: return 10
    if occ >= 0.60: return 15
    if occ >= 0.50: return 20
    if occ >= 0.40: return 25
    if occ >= 0.30: return 30
    if occ >= 0.20: return 35
    if occ >= 0.10: return 40
    return 50

# --- Endpoint ---------------------------------------------------------------

@app.post("/v1/generate", response_model=GenerateRes)
def generate(req: GenerateReq):
    #load model
    model = load_model(req.restaurant_slug)

    #feature frame
    hours = [h.hour for h in req.opening_hours]
    X = build_feature_frame(req, hours)

    #predict walk-ins using your pipeline
    try:
        y = model.predict(X)  
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"model predict failed: {e}")

    #ensure ints
    y_int = [int(max(0, round(v))) for v in np.asarray(y).tolist()]

    #discounts from walk-ins
    total_seats = int(req.context.get("totalSeats", 60)) if req.context else 60
    discounts = [map_walkins_to_discount(w, total_seats=total_seats) for w in y_int]

    preds = [Prediction(hour=h, walkins=w) for h, w in zip(hours, y_int)]
    discs = [Discount(hour=h, discountPct=p) for h, p in zip(hours, discounts)]

    return GenerateRes(
    predictions=preds,
    discounts=discs,
    total_walkins=sum(y_int),
    model_version="pickle-1.0"
)

