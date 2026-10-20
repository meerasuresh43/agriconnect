"""
expert_rules.py
Rule-based IF-THEN Expert System for Agricultural Disease Management.
Provides deterministic agronomic advice based on verified pathology rules,
environmental conditions, and crop management practices.

NOTE: This module provides supplementary agronomic reasoning and does NOT
alter the neural network's visual classification output.
"""

def evaluate_expert_rules(
    predicted_class: str,
    confidence: float,
    weather_condition: str = "normal",
    irrigation_method: str = "drip",
    leaf_wetness_hours: float = 0.0,
    has_alternate_hosts: bool = False,
    confidence_threshold: float = 0.20
) -> dict:
    """
    Evaluate deterministic IF-THEN agronomic rules.
    """
    cls_lower = predicted_class.strip().lower()
    triggered_rules = []
    actions = []
    urgency = "Routine"

    # RULE 1: Low Model Confidence Guard
    if confidence < confidence_threshold:
        triggered_rules.append(
            f"IF confidence < {int(confidence_threshold * 100)}% THEN classify as Uncertain Diagnosis and recommend physical inspection."
        )
        actions.append(
            "Model confidence is insufficient for automated chemical recommendation. "
            "Please collect a physical leaf specimen and consult your local Krishi Vigyan Kendra (KVK) officer."
        )
        urgency = "Moderate"
        return {
            "urgency": urgency,
            "triggered_rules": triggered_rules,
            "recommended_actions": actions,
            "rule_engine": "Deterministic Agri-Expert Rule System v1.0",
            "is_authoritative_visual": False
        }

    # RULE 2: Healthy Leaf Management
    if "leaf" in cls_lower and not any(k in cls_lower for k in ["spot", "blight", "rot", "virus", "rust", "scab", "mold", "curl", "canker"]):
        triggered_rules.append(
            f"IF predicted_class is healthy ('{predicted_class}') THEN advise preventive maintenance and avoid chemical spray."
        )
        actions.append("Foliage displays healthy vegetative vigor. Avoid synthetic pesticide sprays to conserve beneficial predator insects.")
        actions.append("Continue balanced fertilization according to crop growth stage and soil test recommendations.")
        urgency = "Routine"
        return {
            "urgency": urgency,
            "triggered_rules": triggered_rules,
            "recommended_actions": actions,
            "rule_engine": "Deterministic Agri-Expert Rule System v1.0",
            "is_authoritative_visual": False
        }

    # RULE 3: Bean Rust Management
    if "bean rust" in cls_lower:
        triggered_rules.append("IF disease is Bean Rust THEN evaluate uredinia pustule pressure and leaf wetness.")
        urgency = "High"
        if weather_condition in ["rainy", "humid"] or leaf_wetness_hours >= 10.0:
            triggered_rules.append("IF leaf wetness >= 10 hours at 17-24°C THEN alert High Spore Germination Risk.")
            actions.append("CRITICAL: Apply Wettable Sulfur (2g/L) or Mancozeb (2g/L) immediately to stop urediniospore germination.")
            urgency = "Critical"
        else:
            actions.append("Apply bio-fungicide (Trichoderma viride @ 5g/L) or Wettable Sulfur at earliest sign of rust spots.")
        actions.append("Avoid dense planting; prune lower infected foliage to improve airflow and facilitate sun drying.")
        actions.append("Avoid overhead sprinkler irrigation; transition to root-zone drip irrigation.")

    # RULE 4: Bean Halo Blight (Bacterial)
    elif "bean halo blight" in cls_lower:
        triggered_rules.append("IF disease is Halo Blight THEN enforce bacterial containment and copper/streptocycline spray.")
        urgency = "High"
        actions.append("Bacteria spread through rain splash and equipment contact. NEVER enter bean fields when foliage is wet.")
        actions.append("Spray Copper Oxychloride (2.5g/L) + Streptocycline (0.5g/L) at 10-14 day intervals.")
        actions.append("Rogue out severely blighted plants outside field boundaries and burn them.")

    # RULE 5: Bean Mosaic Virus
    elif "bean mosaic virus" in cls_lower:
        triggered_rules.append("IF disease is Bean Mosaic Virus THEN enforce aphid vector control and eradication.")
        urgency = "Moderate"
        actions.append("Viruses cannot be cured with chemicals. Rogue out infected mosaic-stunted plants immediately.")
        actions.append("Install 12-15 Yellow Sticky Traps per acre to trap adult winged aphids.")
        actions.append("Spray Neem Oil (5ml/L) or Imidacloprid (0.3ml/L) to control aphid vectors.")

    # RULE 6: Apple Scab Environmental Risk (Mills Period)
    elif "scab" in cls_lower:
        triggered_rules.append("IF disease is Scab THEN initiate Venturia inaequalis ascospore management.")
        urgency = "High"
        if weather_condition in ["rainy", "humid"] or leaf_wetness_hours >= 9.0:
            triggered_rules.append("IF continuous leaf wetness >= 9 hours at 15-24°C THEN trigger Critical Mills Infection Warning.")
            actions.append(
                "CRITICAL: Ascospores discharge rapidly during rain events. "
                "Apply a protective or systemic fungicide (Captan or Difenoconazole) within 72 hours of rain initiation."
            )
            urgency = "Critical"
        else:
            actions.append("Prune tree canopy to maximize air movement and minimize canopy drying time after morning dew.")
        actions.append("Shred or rake fallen leaves from the orchard floor to eliminate overwintering fungal pseudothecia.")

    # RULE 7: Apple Black Rot & Canker Management
    elif "black rot" in cls_lower:
        triggered_rules.append("IF disease is Black Rot THEN evaluate mummified fruit reservoirs and canker pruning.")
        urgency = "High"
        actions.append("Inspect trees immediately for shriveled black mummified fruits and cankered wood; prune out and burn outside orchard.")
        if irrigation_method == "overhead_sprinkler":
            triggered_rules.append("IF Black Rot present AND irrigation is overhead THEN convert to drip or ground-level irrigation.")
            actions.append("Overhead watering splashes fungal conidia onto adjacent leaves and fruits. Transition to drip irrigation.")
        actions.append("Apply university-approved protective spray (Captan or Mancozeb) from tight cluster through petal fall.")

    # RULE 8: Cedar-Apple Rust Alternate Host Protocol
    elif "rust" in cls_lower:
        triggered_rules.append("IF disease is Rust THEN check heteroecious alternate host interaction.")
        urgency = "Moderate"
        if has_alternate_hosts:
            triggered_rules.append("IF alternate host (Juniper/Cedar) is in vicinity THEN flag high airborne basidiospore influx.")
            actions.append("Remove or prune cedar galls within 1 to 2 km of orchard to break the fungal life cycle.")
            urgency = "High"
        actions.append("Apply protective sterol-inhibitor fungicide (e.g. Myclobutanil) during spring rainy periods when cedar galls are active.")

    # RULE 9: Apple Mosaic Virus Sanitation Protocol
    elif "mosaic virus" in cls_lower:
        triggered_rules.append("IF disease is Mosaic Virus THEN enforce tool sterilization and non-propagation rule.")
        urgency = "Moderate"
        actions.append("Viruses cannot be cured chemically. Disinfect pruning tools in 10% bleach solution between trees to halt mechanical spread.")
        actions.append("Never collect budwood or scions from infected trees. Rogue out heavily stunted young nursery trees.")

    # Generic disease fallback
    else:
        triggered_rules.append(f"IF disease is '{predicted_class}' THEN initiate standard integrated pest management (IPM).")
        actions.append("Prune and remove infected plant debris from the immediate field vicinity.")
        actions.append("Consult university extension guidance for crop-specific fungicide timing.")
        urgency = "Moderate"

    return {
        "urgency": urgency,
        "triggered_rules": triggered_rules,
        "recommended_actions": actions,
        "rule_engine": "Deterministic Agri-Expert Rule System v1.0",
        "is_authoritative_visual": False
    }
