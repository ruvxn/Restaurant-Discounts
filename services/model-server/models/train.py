# train_walkins_model.py
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor
from sklearn.metrics import mean_squared_error, r2_score


# --- helpers to coerce mixed JSON values ---
WEEKDAY_MAP = {
    "monday": 0, "mon": 0,
    "tuesday": 1, "tue": 1, "tues": 1,
    "wednesday": 2, "wed": 2,
    "thursday": 3, "thu": 3, "thur": 3, "thurs": 3,
    "friday": 4, "fri": 4,
    "saturday": 5, "sat": 5,
    "sunday": 6, "sun": 6,
}

def to_int(x, default=0):
    try:
        # handles "12", 12, "12.0"
        return int(float(x))
    except (TypeError, ValueError):
        return default

def to_float(x, default=0.0):
    try:
        return float(x)
    except (TypeError, ValueError):
        return default

def to_dow(x, default=0):
    # accepts 0..6, "5", "Friday", "fri"
    if isinstance(x, (int, float)):
        return int(x)
    if isinstance(x, str):
        s = x.strip().lower()
        if s in WEEKDAY_MAP:
            return WEEKDAY_MAP[s]
        # numbers as strings
        try:
            return int(float(s))
        except ValueError:
            return default
    return default

def to_cat(x, default=""):
    # Convert lists/tuples/sets to a single string label.
    # Choose ONE: either join or first element. I'll join to preserve info.
    if x is None:
        return default
    if isinstance(x, (list, tuple, set)):
        if not x:
            return default
        return "|".join(map(str, x))  # e.g., ["rain","wind"] -> "rain|wind"
    return str(x)

# -------- 1) LOAD + FLATTEN (adjust loader to your data shape) ----------
# Example expects a JSON with records per day and an "hourly_data" list (your earlier format).
# If your source is already a flat CSV/Parquet, just load that instead.

SOURCE_JSON = "pasta_place_2YEAR_data.json"   # << change per restaurant
MODEL_OUT   = "pasta-place/0004_customer_demand_pipeline.pkl"  # << new version

rows = []
with open(SOURCE_JSON, "r") as f:
    data = json.load(f)

for day in data:
    for h in day["hourly_data"]:
        hr  = to_int(h.get("hour"), 12)
        dow = to_dow(h.get("day_of_week"), 0)
        wki = to_int(h.get("weekday_index", dow), dow)

        rows.append({
            "date": day["date"],
            "hour": hr,
            "day_of_week": dow,
            "weekday_index": wki,
            "month": pd.Timestamp(day["date"]).month,
            "is_weekend": 1 if dow >= 5 else 0,

            "google_rating": to_float(h.get("google_rating", 4.0)),
            "temperature": to_float(h.get("temperature", 20.0)),
            "weather": h.get("weather", "clear"),
            "review_sentiment_score": to_float(h.get("review_sentiment_score", 0.0)),

            # used only to derive target during training
            "reservations": to_int(h.get("reservations", 0)),
            "walk_ins": to_int(h.get("walk_ins", 0)),

            "holiday": to_int(h.get("holiday", 0)),
            "is_dinner": to_int(h.get("is_dinner", 1 if 17 <= hr <= 20 else 0)),
            "total_seats": to_int(h.get("total_seats", 60)),
            "categories": h.get("categories", "general"),
            "average_bill_price": to_float(h.get("average_bill_price", 25.0)),
            "distance_to_cbd_km": to_float(h.get("distance_to_cbd_km", 5.0)),
            "local_events": to_int(h.get("local_events", 0)),
            "closing_time": to_int(h.get("closing_time", 22)),
            "is_lunch": to_int(h.get("is_lunch", 1 if 11 <= hr <= 14 else 0)),
        })



df = pd.DataFrame(rows)

# Coerce categoricals to plain strings (no lists/dicts)
for c in ["weather", "categories"]:
    df[c] = df[c].apply(to_cat)


# -------- 2) TARGET = walk-ins (and DO NOT USE reservations as a feature) ----------
# We only use reservations here to derive the target once (training time only).
# If your history already has a walk-ins column, use that directly instead.
if "walk_ins" not in df.columns:
    raise ValueError("Expected 'walk_ins' in training data.")

df["reservations"] = df["reservations"].fillna(0)
df["walk_ins"] = df["walk_ins"].fillna(0)

df["walk_ins"] = (df["walk_ins"] - df["reservations"]).clip(lower=0).astype(int)

# -------- 3) FEATURES (exclude 'reservations') ----------
drop_cols = ["date", "walk_ins", "walk_ins"]  # target and ids
feature_df = df.drop(columns=[c for c in drop_cols if c in df.columns])

# Keep only the columns the app sends (it already sends all of these).
# IMPORTANT: 'reservations' is intentionally omitted.
numeric_features = [
    "hour","weekday_index","day_of_week","month","is_weekend",
    "google_rating","temperature","review_sentiment_score","holiday",
    "is_dinner","total_seats","average_bill_price","distance_to_cbd_km",
    "local_events","closing_time","is_lunch"
]
categorical_features = ["weather","categories"]

# Safety: if a column is missing, create it with a sensible default
defaults = {
    "hour": 12, "weekday_index": 0, "day_of_week": 0, "month": 1, "is_weekend": 0,
    "google_rating": 4.0, "temperature": 20.0, "review_sentiment_score": 0.0, "holiday": 0,
    "is_dinner": 0, "total_seats": 60, "average_bill_price": 25.0, "distance_to_cbd_km": 5.0,
    "local_events": 0, "closing_time": 22, "is_lunch": 0, "weather": "clear", "categories": "general"
}
for c, d in defaults.items():
    if c not in feature_df.columns:
        feature_df[c] = d

X = feature_df[numeric_features + categorical_features].copy()
y = df["walk_ins"].astype(int)

# -------- 4) PIPELINE ----------
preprocess = ColumnTransformer(
    transformers=[
        ("num", "passthrough", numeric_features),
        ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
    ],
    remainder="drop",
)

model = XGBRegressor(
    n_estimators=400,
    max_depth=6,
    learning_rate=0.05,
    subsample=0.9,
    colsample_bytree=0.9,
    reg_lambda=1.0,
    tree_method="hist",       # fast on CPU
    random_state=42
)

pipe = Pipeline([
    ("prep", preprocess),
    ("model", model),
])

# -------- 5) TRAIN / EVAL ----------
X_train, X_valid, y_train, y_valid = train_test_split(
    X, y, test_size=0.2, random_state=42
)

pipe.fit(X_train, y_train)
preds = pipe.predict(X_valid).clip(0)

# RMSE that works across sklearn versions
try:
    rmse = mean_squared_error(y_valid, preds, squared=False)
except TypeError:
    rmse = np.sqrt(mean_squared_error(y_valid, preds))

r2 = r2_score(y_valid, preds)
print(f"RMSE: {rmse:.3f} | R2: {r2:.3f}")


# -------- 6) SAVE ----------
Path(MODEL_OUT).parent.mkdir(parents=True, exist_ok=True)
joblib.dump(pipe, MODEL_OUT)
print(f"Saved: {MODEL_OUT}")
