"""
fuzzy_logic.py
Fuzzy Logic Inference System for Plant Disease Severity & Intervention Urgency.
Implements exact triangular and trapezoidal membership functions and Mamdani
min-max inference with Centroid (Center of Gravity) defuzzification.

DOCUMENTED INPUTS:
  1. visual_confidence: [0.0 - 1.0] - Neural network classification certainty.
  2. lesion_coverage: [0.0 - 100.0] - Percentage of leaf area exhibiting lesions/chlorosis.
  3. relative_humidity: [0.0 - 100.0] - Atmospheric humidity facilitating fungal sporulation.

DOCUMENTED OUTPUT:
  intervention_urgency: [0.0 - 10.0] - Agronomic action priority scale:
    - 0.0 to 3.5: Routine Monitoring / Cultural sanitation
    - 3.5 to 6.5: Moderate / Proactive bio-fungicide or cultural intervention
    - 6.5 to 10.0: Critical / Immediate fungicide application required

NOTE: This fuzzy system provides supplementary agronomic urgency modeling.
It does NOT modify the MobileNetV2 visual disease prediction.
"""

import numpy as np
from typing import Dict, Tuple


# ==============================================================================
# 1. MEMBERSHIP FUNCTIONS
# ==============================================================================

def triangular_mf(x: float, a: float, b: float, c: float) -> float:
    """Standard triangular membership function."""
    if x <= a or x >= c:
        return 0.0
    if a < x <= b:
        return (x - a) / (b - a) if b > a else 1.0
    if b < x < c:
        return (c - x) / (c - b) if c > b else 1.0
    return 0.0


def trapezoidal_mf(x: float, a: float, b: float, c: float, d: float) -> float:
    """Standard trapezoidal membership function."""
    if x <= a or x >= d:
        return 0.0
    if a < x < b:
        return (x - a) / (b - a) if b > a else 1.0
    if b <= x <= c:
        return 1.0
    if c < x < d:
        return (d - x) / (d - c) if d > c else 1.0
    return 0.0


# ==============================================================================
# 2. FUZZIFICATION
# ==============================================================================

def fuzzify_confidence(conf: float) -> Dict[str, float]:
    """Membership of model visual confidence."""
    c = float(np.clip(conf, 0.0, 1.0))
    return {
        "low": trapezoidal_mf(c, 0.0, 0.0, 0.40, 0.60),
        "medium": triangular_mf(c, 0.45, 0.65, 0.85),
        "high": trapezoidal_mf(c, 0.70, 0.85, 1.0, 1.0)
    }


def fuzzify_coverage(cov: float) -> Dict[str, float]:
    """Membership of leaf lesion coverage (percentage)."""
    cv = float(np.clip(cov, 0.0, 100.0))
    return {
        "minor": trapezoidal_mf(cv, 0.0, 0.0, 10.0, 25.0),
        "moderate": triangular_mf(cv, 15.0, 35.0, 55.0),
        "severe": trapezoidal_mf(cv, 45.0, 65.0, 100.0, 100.0)
    }


def fuzzify_humidity(hum: float) -> Dict[str, float]:
    """Membership of relative atmospheric humidity (percentage)."""
    h = float(np.clip(hum, 0.0, 100.0))
    return {
        "dry": trapezoidal_mf(h, 0.0, 0.0, 30.0, 50.0),
        "optimal": triangular_mf(h, 40.0, 60.0, 75.0),
        "saturated": trapezoidal_mf(h, 65.0, 80.0, 100.0, 100.0)
    }


# ==============================================================================
# 3. MAMDANI INFERENCE & CENTROID DEFUZZIFICATION
# ==============================================================================

def evaluate_fuzzy_urgency(
    visual_confidence: float = 0.85,
    lesion_coverage_pct: float = 25.0,
    relative_humidity_pct: float = 65.0
) -> dict:
    """
    Execute Mamdani fuzzy inference to compute Intervention Urgency Index [0 - 10].
    """
    conf_m = fuzzify_confidence(visual_confidence)
    cov_m = fuzzify_coverage(lesion_coverage_pct)
    hum_m = fuzzify_humidity(relative_humidity_pct)

    # Output Urgency terms
    # Rule 1: IF (Coverage is severe) AND (Humidity is saturated) THEN Urgency is Critical
    r1 = min(cov_m["severe"], hum_m["saturated"])

    # Rule 2: IF (Confidence is high) AND (Coverage is severe) THEN Urgency is Critical
    r2 = min(conf_m["high"], cov_m["severe"])

    # Rule 3: IF (Coverage is moderate) AND (Humidity is saturated) THEN Urgency is Critical
    r3 = min(cov_m["moderate"], hum_m["saturated"])

    # Rule 4: IF (Coverage is moderate) AND (Humidity is optimal) THEN Urgency is Moderate
    r4 = min(cov_m["moderate"], hum_m["optimal"])

    # Rule 5: IF (Coverage is minor) AND (Humidity is saturated) THEN Urgency is Moderate
    r5 = min(cov_m["minor"], hum_m["saturated"])

    # Rule 6: IF (Coverage is minor) AND (Humidity is dry) THEN Urgency is Low
    r6 = min(cov_m["minor"], hum_m["dry"])

    # Rule 7: IF (Confidence is low) AND (Coverage is minor) THEN Urgency is Low
    r7 = min(conf_m["low"], cov_m["minor"])

    # Aggregate rule activations for each consequence fuzzy set
    fire_critical = max(r1, r2, r3)
    fire_moderate = max(r4, r5)
    fire_low = max(r6, r7)

    # Numerical integration across urgency universe [0.0, 10.0]
    y_points = np.linspace(0.0, 10.0, 101)
    aggregated_mf = []

    for y in y_points:
        mu_low = min(fire_low, trapezoidal_mf(y, 0.0, 0.0, 2.0, 4.0))
        mu_mod = min(fire_moderate, triangular_mf(y, 2.5, 5.0, 7.5))
        mu_crit = min(fire_critical, trapezoidal_mf(y, 6.0, 8.0, 10.0, 10.0))
        aggregated_mf.append(max(mu_low, mu_mod, mu_crit))

    aggregated_mf = np.array(aggregated_mf)
    total_area = np.sum(aggregated_mf)

    if total_area > 0:
        centroid_score = float(np.sum(y_points * aggregated_mf) / total_area)
    else:
        centroid_score = 5.0  # default balanced middle

    centroid_score = round(centroid_score, 2)

    # Qualitative classification
    if centroid_score >= 6.5:
        category = "Critical Action Required"
        advice = "Immediate fungicide intervention or infected canopy rogueing recommended to halt rapid field dissemination."
    elif centroid_score >= 3.5:
        category = "Proactive Intervention"
        advice = "Initiate preventative bio-fungicide spray (Neem formulation or Trichoderma) and optimize field drainage."
    else:
        category = "Routine Monitoring"
        advice = "Disease pressure is currently low. Continue routine field scouting without synthetic chemical sprays."

    return {
        "intervention_urgency_score": centroid_score,
        "urgency_category": category,
        "management_guidance": advice,
        "input_evaluation": {
            "visual_confidence": round(visual_confidence, 4),
            "lesion_coverage_pct": round(lesion_coverage_pct, 1),
            "relative_humidity_pct": round(relative_humidity_pct, 1)
        },
        "membership_activations": {
            "low_urgency_activation": round(float(fire_low), 4),
            "moderate_urgency_activation": round(float(fire_moderate), 4),
            "critical_urgency_activation": round(float(fire_critical), 4)
        },
        "defuzzification_method": "Centroid (Center of Gravity)",
        "disclaimer": "Fuzzy logic scores quantify agronomic intervention urgency and do NOT alter the visual neural network diagnosis."
    }
