"""
build_knowledge_base.py
Generates the comprehensive, ICAR & TNAU aligned Knowledge Base for all 89 PlantWild classes.
Provides precise botanical details, pathogen etiology, bilingual symptoms, safe cultural steps,
and verified agronomic treatment protocols.
"""

import json

# Verified Pathology Registry for all 89 classes
REGISTRY = {
    # 1. APPLE
    "apple black rot": {
        "common_name": "Apple Black Rot (Frog-Eye Leaf Spot)",
        "scientific_name": "Botryosphaeria obtusa",
        "crop": "Apple (Malus domestica)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Circular purple spots on leaves expanding with light brown centers ('frog-eye' appearance).",
            "Mummified black shriveled fruits remaining on branches.",
            "Sunken reddish-brown cankers on twigs."
        ],
        "symptoms_ta": [
            "இலைகளில் தவளைக் கண் போன்ற பழுப்பு விளிம்புள்ள வட்ட வடிவப் புள்ளிகள்.",
            "கிளைகளில் உலர்ந்த கருப்பு நிற கனி அழுகல்.",
            "மரப்பட்டைகளில் பள்ளமான புண்கள்."
        ],
        "causes": "Botryosphaeria obtusa fungal spores overwintering in dead wood, spreading via splashing rain in warm humid weather (20-27°C).",
        "immediate_safe_steps": [
            "Immediately prune out dead or cankered twigs 15 cm below infected tissue.",
            "Rake and safely bury or burn fallen mummified fruits outside the orchard."
        ],
        "treatment_options": [
            "Foliar Spray: Apply Mancozeb 75 WP (2g/L) or Captan 50 WP (2.5g/L) during cluster to petal-fall stage.",
            "Organic Control: Spray Copper Hydroxide (2g/L) during delayed dormant stage."
        ],
        "prevention": [
            "Prune canopy annually to maximize air circulation and sunlight penetration.",
            "Avoid sprinkler irrigation wetting foliage."
        ],
        "expert_warning": "Consult a horticulture extension officer if cankers encircle more than 50% of main scaffold branches.",
        "extension_reference": "ICAR-CITH / State Agricultural University Fruit Pathology Advisory."
    },
    "apple leaf": {
        "common_name": "Healthy Apple Leaf",
        "scientific_name": "Malus domestica",
        "crop": "Apple (Malus domestica)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": [
            "Uniform green leaf blade with intact margins and healthy vein architecture.",
            "No necrotic lesions, fungal pustules, or chlorotic mottling."
        ],
        "symptoms_ta": ["புள்ளிகள் அற்ற சீரான பசுமையான ஆரோக்கியமான ஆப்பிள் இலை."],
        "causes": "Normal, healthy physiological plant condition under balanced nutrient and water management.",
        "immediate_safe_steps": ["Continue standard orchard scouting; no chemical intervention needed."],
        "treatment_options": ["No treatment required. Maintain balanced nutrition."],
        "prevention": ["Maintain balanced N-P-K fertilization and regular weekly orchard scouting."],
        "expert_warning": "No expert intervention required for healthy foliage.",
        "extension_reference": "Good Agricultural Practices (GAP) for Deciduous Orchards."
    },
    "apple mosaic virus": {
        "common_name": "Apple Mosaic Virus (ApMV)",
        "scientific_name": "Apple mosaic ilarvirus",
        "crop": "Apple (Malus domestica)",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Bright yellow to cream-colored patches, bands, and vein banding on leaves.",
            "Severely affected leaves develop necrosis and drop prematurely in mid-summer."
        ],
        "symptoms_ta": ["இலை நரம்புகளில் பிரகாசமான மஞ்சள் நிற திட்டுகள் மற்றும் இலை உதிர்தல்."],
        "causes": "Transmitted almost exclusively through infected budwood and root grafting during vegetative propagation.",
        "immediate_safe_steps": [
            "Mark virus-infected trees and never collect budwood or scions from them.",
            "Remove severely stunted, non-productive young trees."
        ],
        "treatment_options": [
            "Viral infections cannot be cured with chemical sprays.",
            "Apply foliar micronutrient sprays (Zinc & Boron) to alleviate physiological stress."
        ],
        "prevention": ["Plant only virus-indexed certified certified rootstocks and scions."],
        "expert_warning": "Submit graft samples to university plant pathology lab for viral indexing.",
        "extension_reference": "ICAR-Central Institute of Temperate Horticulture Virology Advisory."
    },
    "apple rust": {
        "common_name": "Cedar-Apple Rust",
        "scientific_name": "Gymnosporangium juniperi-virginianae",
        "crop": "Apple (Malus domestica)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Bright orange-yellow circular spots on upper leaf surface with red margins.",
            "Small tube-like aecia structures forming on the underside of leaf lesions."
        ],
        "symptoms_ta": ["இலைகளின் மேல் பகுதியில் பிரகாசமான ஆரஞ்சு-மஞ்சள் நிற வட்டப் புள்ளிகள்."],
        "causes": "Heteroecious rust fungus requiring both Apple and Juniper/Cedar trees to complete its life cycle.",
        "immediate_safe_steps": [
            "Remove nearby wild Juniper/Cedar trees within 300 meters if feasible.",
            "Prune out galls from adjacent ornamental junipers before spring rains."
        ],
        "treatment_options": [
            "Foliar Fungicide: Spray Mancozeb (2g/L) or Myclobutanil (0.4ml/L) from pink bud through petal fall.",
            "Bio-Control: Spray Bacillus subtilis or Sulfur (3g/L) during early vegetative flush."
        ],
        "prevention": ["Plant rust-resistant apple cultivars (e.g. Liberty, Enterprise)."],
        "expert_warning": "Consult horticulture officer if premature defoliation exceeds 25% of the canopy.",
        "extension_reference": "TNAU / ICAR Deciduous Fruit Disease Management Guidelines."
    },
    "apple scab": {
        "common_name": "Apple Scab",
        "scientific_name": "Venturia inaequalis",
        "crop": "Apple (Malus domestica)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Olive-green to dull brown velvety spots on upper and lower leaf surfaces.",
            "Cork-like scabby lesions on developing apple fruit, causing fruit cracking."
        ],
        "symptoms_ta": ["இலைகளில் ஆலிவ்-பச்சை நிற வெல்வெட் போன்ற கரும் புள்ளிகள் மற்றும் பழத்தில் தழும்புகள்."],
        "causes": "Venturia inaequalis ascospores released from fallen overwintered leaves during wet spring weather.",
        "immediate_safe_steps": [
            "Shred and plow down fallen leaves or spray 5% urea solution to accelerate leaf decomposition."
        ],
        "treatment_options": [
            "Chemical Fungicide: Spray Mancozeb 75 WP (2g/L) or Difenoconazole 25 EC (0.5ml/L) at bud break.",
            "Protective Organic Spray: Copper oxychloride (2.5g/L) at silver-tip stage."
        ],
        "prevention": ["Prune trees for rapid drying; select scab-resistant apple varieties."],
        "expert_warning": "Seek extension advice if fungicide resistance (strobilurins/QoIs) is suspected in your district.",
        "extension_reference": "ICAR-CITH Apple Scab Warning & Spray Schedule."
    },

    # 2. BANANA
    "banana leaf": {
        "common_name": "Healthy Banana Leaf",
        "scientific_name": "Musa acuminata / Musa balbisiana",
        "crop": "Banana (Musa spp.)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Expansive vibrant emerald-green leaf blade without chlorotic streaks, wilting, or marginal necrosis."],
        "symptoms_ta": ["மஞ்சள் புள்ளிகள் மற்றும் கருகல் அற்ற பளபளப்பான பச்சை வாழை இலை."],
        "causes": "Optimum pseudostem hydration, deep root drainage, and balanced Potash/Nitrogen nutrition.",
        "immediate_safe_steps": ["Maintain regular drip irrigation and de-suckering."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Apply recommended Potash (300g/plant) in split doses to sustain bunch development."],
        "expert_warning": "No intervention required.",
        "extension_reference": "ICAR-National Research Centre for Banana (NRCB), Trichy."
    },
    "banana panama disease": {
        "common_name": "Panama Disease / Fusarium Wilt",
        "scientific_name": "Fusarium oxysporum f. sp. cubense (Foc TR4 / Race 1)",
        "crop": "Banana (Musa spp.)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Yellowing of lower older leaves progressing to the petiole, causing leaves to collapse and hang around the pseudostem ('skirt' of dead leaves).",
            "Internal vascular discoloration: continuous reddish-brown streaks visible when pseudostem is split longitudinally."
        ],
        "symptoms_ta": ["கீழ் இலைகள் மஞ்சளாகி தண்டுடன் தொங்குதல் மற்றும் தண்டை பிளக்கும் போது உள் பகுதியில் சிவப்பு-பழுப்பு நிறக் கோடுகள்."],
        "causes": "Soil-borne chlamydospores surviving in soil for over 30 years, penetrating roots via nematodes or mechanical injury.",
        "immediate_safe_steps": [
            "Quarantine the infected plant immediately; do not move soil or water from infected mat to healthy areas.",
            "Inject infected pseudostem with 2% glyphosate or dig and burn with strict biosecurity."
        ],
        "treatment_options": [
            "No chemical cure exists once vascular wilt occurs.",
            "Bio-Control: Soil application of Trichoderma reesei / viride (50g/plant) with 5 kg neem cake."
        ],
        "prevention": ["Use tissue-culture plantlets certified disease-free; avoid flood irrigation."],
        "expert_warning": "Mandatory reporting: notify district agricultural officer / ICAR-NRCB immediately if TR4 is suspected.",
        "extension_reference": "ICAR-NRCB Fusarium Wilt Management Protocol."
    },

    # 3. BASIL
    "basil downy mildew": {
        "common_name": "Basil Downy Mildew",
        "scientific_name": "Peronospora belbahrii",
        "crop": "Sweet Basil (Ocimum basilicum)",
        "category": "Oomycete",
        "is_healthy": False,
        "symptoms": [
            "Interveinal yellowing on upper leaf surfaces resembling nutritional deficiency.",
            "Purplish-gray fuzzy sporulation coating the underside of yellow leaf areas in humid conditions."
        ],
        "symptoms_ta": ["இலை நரம்புகளுக்கு நடுவே மஞ்சள் நிறமும் அடியில் சாம்பல் நிற பூசணமும் தோன்றுதல்."],
        "causes": "Seed-borne and airborne sporangia thriving in relative humidity above 85% and temperatures of 15-22°C.",
        "immediate_safe_steps": ["Discard heavily infected basil plants; water only at soil level in early morning."],
        "treatment_options": [
            "Organic Spray: Spray Potassium bicarbonate (3g/L) or Copper octanoate.",
            "Chemical Fungicide: Spray Mancozeb (2g/L) or Azoxystrobin (1ml/L) respecting pre-harvest interval."
        ],
        "prevention": ["Increase plant spacing to 30 cm; use downy-mildew tolerant basil varieties (e.g. Prospera)."],
        "expert_warning": "Check pre-harvest waiting interval (PHI) carefully on fresh culinary herbs.",
        "extension_reference": "TNAU Aromatic & Medicinal Plants Pathology."
    },
    "basil leaf": {
        "common_name": "Healthy Basil Leaf",
        "scientific_name": "Ocimum basilicum",
        "crop": "Sweet Basil (Ocimum basilicum)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Aromatic bright green convex leaves without downy sporulation or yellow mottling."],
        "symptoms_ta": ["தூய நறுமணமிக்க பசுமையான துளசி / திருநீற்றுப்பச்சிலை இலை."],
        "causes": "Optimum well-drained loamy soil, warm temperatures, and good airflow.",
        "immediate_safe_steps": ["Pinch flower buds to promote vegetative leaf yield."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Avoid overhead irrigation; maintain good container or bed drainage."],
        "expert_warning": "No action needed.",
        "extension_reference": "Good Agricultural Practices for Culinary Herbs."
    },

    # 4. BEAN
    "bean halo blight": {
        "common_name": "Bean Halo Blight",
        "scientific_name": "Pseudomonas savastanoi pv. phaseolicola",
        "crop": "Common Bean (Phaseolus vulgaris)",
        "category": "Bacterial",
        "is_healthy": False,
        "symptoms": [
            "Small water-soaked pinhead spots on leaves surrounded by broad pale yellow-green chlorotic halos.",
            "Systemic chlorosis of young emerging leaves; greasy sunken spots on bean pods."
        ],
        "symptoms_ta": ["இலைகளில் சிறிய நீர் ஊறிய புள்ளிகளைச் சுற்றி அகலமான மஞ்சள் நிற வளையங்கள் (Halo)."],
        "causes": "Seed-borne bacterium producing phaseolotoxin, disseminated rapidly by rain splashes below 22°C.",
        "immediate_safe_steps": ["Do not work in wet bean fields to avoid spreading bacterial slime."],
        "treatment_options": [
            "Spray Copper Oxychloride 50 WP (2.5g/L) mixed with Streptocycline (0.5g/10L) at initial symptom onset.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Sow certified western-grown disease-free seeds; practice 2-year crop rotation."],
        "expert_warning": "Consult extension officer if systemic chlorosis affects over 30% of bean crop.",
        "extension_reference": "ICAR-IIPR Pulses Pathology Advisory."
    },
    "bean leaf": {
        "common_name": "Healthy Bean Leaf",
        "scientific_name": "Phaseolus vulgaris",
        "crop": "Common Bean (Phaseolus vulgaris)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Trifoliate dark green leaves with clean margins and no rust pustules or water-soaked lesions."],
        "symptoms_ta": ["ஆரோக்கியமான மூன்று சிற்றிழைகள் கொண்ட பயறு/பீன்ஸ் இலை."],
        "causes": "Active symbiotic Rhizobium root nodulation and balanced phosphorus nutrition.",
        "immediate_safe_steps": ["Maintain regular weeding and protective moisture."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Inoculate seeds with Rhizobium prior to sowing."],
        "expert_warning": "No action needed.",
        "extension_reference": "ICAR Pulse Production Guidelines."
    },
    "bean mosaic virus": {
        "common_name": "Bean Common Mosaic Virus (BCMV)",
        "scientific_name": "Bean common mosaic potyvirus",
        "crop": "Common Bean (Phaseolus vulgaris)",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Irregular mosaic pattern of light and dark green patches on leaves.",
            "Downward cupping, puckering, and blister-like malformations along leaf veins."
        ],
        "symptoms_ta": ["இலைகளில் வெளிர் மற்றும் அடர் பச்சை நிற மொசைக் திட்டுகள் மற்றும் சுருக்கம்."],
        "causes": "Transmitted by seed and non-persistently vectored by aphids (Aphis fabae, Myzus persicae).",
        "immediate_safe_steps": ["Rogue out and destroy virus-infected plants immediately."],
        "treatment_options": [
            "Control Aphid Vectors: Spray Neem oil (5ml/L) or Imidacloprid 17.8 SL (0.3ml/L).",
            "No chemical cure exists for viral particles."
        ],
        "prevention": ["Plant BCMV-resistant varieties bearing the dominant I gene; use certified seed."],
        "expert_warning": "Contact extension specialist if virus vectors persist across border rows.",
        "extension_reference": "TNAU Pulses Protection Advisory."
    },
    "bean rust": {
        "common_name": "Bean Rust",
        "scientific_name": "Uromyces appendiculatus",
        "crop": "Common Bean (Phaseolus vulgaris)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small raised cinnamon-brown or reddish-brown powdery pustules (uredinia) on lower and upper leaf surfaces.",
            "Pustules surrounded by a narrow chlorotic halo; severe infection causes leaf chlorosis and desiccation."
        ],
        "symptoms_ta": ["இலைகளின் இருபுறமும் செம்பழுப்பு நிற துருப் புள்ளிகள் மற்றும் தூள் போன்ற பூசணம்."],
        "causes": "Airborne urediniospores germinating when free moisture/dew persists for 10-15 hours at 17-24°C.",
        "immediate_safe_steps": ["Prune heavily rusted lower leaves; destroy crop residues after harvest."],
        "treatment_options": [
            "Chemical Fungicide: Spray Mancozeb 75 WP (2g/L) or Wettable Sulfur (2.5g/L) at first sign of pustules.",
            "Organic Option: Spray Trichoderma viride (5g/L) or 3% Neem oil emulsion."
        ],
        "prevention": ["Follow 2-year crop rotation; avoid overhead irrigation; sow rust-resistant cultivars."],
        "expert_warning": "Spray immediately if pustules appear before pod-filling stage.",
        "extension_reference": "TNAU / ICAR Legume Pathology Guidelines."
    },

    # 5. BELL PEPPER / CHILLI
    "bell pepper leaf": {
        "common_name": "Healthy Bell Pepper / Chilli Leaf",
        "scientific_name": "Capsicum annuum",
        "crop": "Bell Pepper / Chilli (Capsicum annuum)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Smooth, dark green glossy leaves without circular necrotic spots, curling, or powdery residue."],
        "symptoms_ta": ["ஆரோக்கியமான பளபளப்பான குடைமிளகாய் / மிளகாய் இலை."],
        "causes": "Optimal soil moisture, balanced nitrogen, and freedom from thrips or bacterial spot.",
        "immediate_safe_steps": ["Maintain regular drip fertigation."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Scout weekly for early signs of thrips, mites, or leaf spot."],
        "expert_warning": "No action needed.",
        "extension_reference": "TNAU Vegetable Production Guide."
    },
    "bell pepper leaf spot": {
        "common_name": "Bacterial Leaf Spot of Chilli / Bell Pepper",
        "scientific_name": "Xanthomonas campestris pv. vesicatoria",
        "crop": "Bell Pepper / Chilli (Capsicum annuum)",
        "category": "Bacterial",
        "is_healthy": False,
        "symptoms": [
            "Small circular to angular water-soaked dark brown-to-black spots on leaves.",
            "Lesions develop a prominent yellow halo and necrotic ragged center; severe spotting causes heavy defoliation.",
            "Raised blister-like rough scabs on green chilli/pepper fruit."
        ],
        "symptoms_ta": ["மிளகாய் இலைகளில் சிறிய கருப்பு புள்ளிகள், மஞ்சள் வளையம் மற்றும் தீவிர இலை உதிர்தல்."],
        "causes": "Seed-borne and debris-borne bacterium Xanthomonas spreading rapidly in driving rain and warm humid weather (25-30°C).",
        "immediate_safe_steps": [
            "Avoid overhead sprinkler irrigation; do not cultivate when foliage is wet.",
            "Prune severely spotted lower leaves outside field."
        ],
        "treatment_options": [
            "Bactericide Spray (TNAU/ICAR): Spray Copper Oxychloride 50 WP (2.5g/L) mixed with Streptomycin Sulphate (Plantomycin 0.5g/L) at 10-day intervals.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L) at nursery and transplanting stages."
        ],
        "prevention": ["Hot-water treat seeds (50°C for 25 min); plant resistant pepper hybrids (e.g. Arka Harita)."],
        "expert_warning": "Apply bactericide promptly at first lesion detection; defoliation directly exposes fruit to sunscald.",
        "extension_reference": "TNAU / ICAR-IIHR Chilli Bacterial Spot Advisory."
    },

    # 6. BLUEBERRY
    "blueberry leaf": {
        "common_name": "Healthy Blueberry Leaf",
        "scientific_name": "Vaccinium corymbosum",
        "crop": "Blueberry (Vaccinium spp.)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Elliptic glossy green leaves with acid-soil vigor and no red pustules."],
        "symptoms_ta": ["ஆரோக்கியமான புளூபெர்ரி இலை."],
        "causes": "Acidic soil pH (4.5–5.2) with adequate organic pine bark mulch.",
        "immediate_safe_steps": ["Maintain soil acidity with elemental sulfur."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Monitor soil pH annually."],
        "expert_warning": "No action needed.",
        "extension_reference": "Berry Pathology Extension Guide."
    },
    "blueberry rust": {
        "common_name": "Blueberry Leaf Rust",
        "scientific_name": "Thekopsora minima",
        "crop": "Blueberry (Vaccinium corymbosum)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small reddish-brown to purple spots on upper leaf surface.",
            "Bright yellow to orange-brown pustules on lower leaf surface causing early autumn defoliation."
        ],
        "symptoms_ta": ["புளூபெர்ரி இலையின் அடியில் மஞ்சள் மற்றும் ஆரஞ்சு நிற துருப் புள்ளிகள்."],
        "causes": "Fungal rust favored by moderate temperatures and persistent free moisture on foliage.",
        "immediate_safe_steps": ["Rake and destroy fallen leaves to reduce overwintering teliospores."],
        "treatment_options": ["Foliar Spray: Apply Mancozeb (2g/L) or Pyraclostrobin post-harvest."],
        "prevention": ["Prune bushes to maintain open canopy."],
        "expert_warning": "Seek specialist help if rust causes premature defoliation before bud set.",
        "extension_reference": "Commercial Small Fruit Pathology Advisory."
    },

    # 7. CRUCIFERS (Broccoli, Cabbage, Cauliflower)
    "broccoli downy mildew": {
        "common_name": "Broccoli Downy Mildew",
        "scientific_name": "Hyaloperonospora brassicae",
        "crop": "Broccoli (Brassica oleracea var. italica)",
        "category": "Oomycete",
        "is_healthy": False,
        "symptoms": [
            "Angular yellowish spots bounded by leaf veins on upper leaf surface.",
            "White to grayish downy fungal growth on corresponding undersides during cool, moist mornings."
        ],
        "symptoms_ta": ["ப்ரோக்கோலி இலையின் அடியில் வெண்மையான பூசணம் மற்றும் மேல் பகுதியில் மஞ்சள் புள்ளிகள்."],
        "causes": "Cool temperatures (10-15°C) and extended dew periods exceeding 6 hours.",
        "immediate_safe_steps": ["Improve field drainage; rogue infected seedlings in nursery."],
        "treatment_options": [
            "Spray Metalaxyl + Mancozeb (Ridomil MZ @ 2g/L) or Copper Oxychloride (2.5g/L).",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Use certified disease-free seed; practice 3-year non-brassica rotation."],
        "expert_warning": "Do not spray systemic fungicides within 14 days of head harvest.",
        "extension_reference": "TNAU Vegetable Pathology Guide."
    },
    "broccoli leaf": {
        "common_name": "Healthy Broccoli Leaf",
        "scientific_name": "Brassica oleracea var. italica",
        "crop": "Broccoli (Brassica oleracea var. italica)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Thick waxy blue-green foliage without downy spots or black rot lesions."],
        "symptoms_ta": ["ஆரோக்கியமான ப்ரோக்கோலி இலை."],
        "causes": "Optimal cool-season growth and balanced boron and nitrogen nutrition.",
        "immediate_safe_steps": ["Maintain even soil moisture to avoid hollow stem."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Maintain balanced nutrition; scout for diamondback moth."],
        "expert_warning": "No action needed.",
        "extension_reference": "TNAU Cole Crop Production Guide."
    },
    "cabbage alternaria leaf spot": {
        "common_name": "Cabbage Alternaria Leaf Spot",
        "scientific_name": "Alternaria brassicae / Alternaria brassicicola",
        "crop": "Cabbage (Brassica oleracea var. capitata)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Circular brown necrotic spots with distinct concentric rings on outer leaves.",
            "Shot-hole effect as dried centers of spots drop out; dark velvety spore layer in humid air."
        ],
        "symptoms_ta": ["முட்டைகோஸ் இலையில் வளைய வடிவ கருப்பு நிற கருகல் புள்ளிகள்."],
        "causes": "Alternaria fungus surviving on cruciferous crop debris, spreading via wind and rain at 20-25°C.",
        "immediate_safe_steps": ["Remove and burn outer infected leaves; avoid evening irrigation."],
        "treatment_options": [
            "Foliar Spray: Apply Mancozeb 75 WP (2g/L) or Iprodione (1.5g/L) at 10-day intervals.",
            "Organic Control: Spray Neem oil (5ml/L) or Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Hot-water treat seeds (50°C for 25 min); follow 3-year rotation."],
        "expert_warning": "Ensure thorough spray coverage on waxy cabbage leaf surface by adding sticker/spreader.",
        "extension_reference": "TNAU / ICAR-IIHR Vegetable Pathology."
    },
    "cabbage leaf": {
        "common_name": "Healthy Cabbage Leaf",
        "scientific_name": "Brassica oleracea var. capitata",
        "crop": "Cabbage (Brassica oleracea var. capitata)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Robust waxy leaves wrapping cleanly without black veins or fungal rings."],
        "symptoms_ta": ["ஆரோக்கியமான முட்டைகோஸ் இலை."],
        "causes": "Cool weather, organic soil, and good pest monitoring.",
        "immediate_safe_steps": ["Maintain regular shallow watering."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Practice crop rotation."],
        "expert_warning": "No action needed.",
        "extension_reference": "Good Agricultural Practices for Cole Crops."
    },
    "cauliflower alternaria leaf spot": {
        "common_name": "Cauliflower Alternaria Leaf Spot",
        "scientific_name": "Alternaria brassicicola",
        "crop": "Cauliflower (Brassica oleracea var. botrytis)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Concentric dark brown to black circular lesions on leaves and curds.",
            "Curds develop brown water-soaked rotting spots, rendering them unmarketable."
        ],
        "symptoms_ta": ["காலிஃபிளவர் இலைகளில் வளைய கருகல் புள்ளிகள் மற்றும் பூவில் பழுப்பு நிற அழுகல்."],
        "causes": "Wind-borne fungal conidia flourishing in wet weather with warm days (22-28°C).",
        "immediate_safe_steps": ["Tie wrapper leaves over curds (blanching) to protect from spore wash."],
        "treatment_options": [
            "Foliar Spray: Apply Mancozeb (2g/L) or Copper Oxychloride (2.5g/L) at head formation.",
            "Bio-Control: Spray Trichoderma viride (5g/L)."
        ],
        "prevention": ["Use certified seed; destroy infected crucifer crop residues."],
        "expert_warning": "Spray curds before spot expansion to prevent complete economic loss.",
        "extension_reference": "ICAR-IIHR Cauliflower Pathology."
    },
    "cauliflower leaf": {
        "common_name": "Healthy Cauliflower Leaf",
        "scientific_name": "Brassica oleracea var. botrytis",
        "crop": "Cauliflower (Brassica oleracea var. botrytis)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Elongated upright blue-green leaves without black rot V-shaped lesions or alternaria rings."],
        "symptoms_ta": ["ஆரோக்கியமான காலிஃபிளவர் இலை."],
        "causes": "Balanced micronutrient management (Molybdenum and Boron).",
        "immediate_safe_steps": ["Continue standard fertilization."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Apply Borax (10 kg/ha) if whiptail or browning symptoms occur in district."],
        "expert_warning": "No action needed.",
        "extension_reference": "TNAU Vegetable Pathology."
    },

    # 8. CARROT & CELERY
    "carrot cavity spot": {
        "common_name": "Carrot Cavity Spot",
        "scientific_name": "Pythium violae / Pythium sulcatum",
        "crop": "Carrot (Daucus carota)",
        "category": "Oomycete",
        "is_healthy": False,
        "symptoms": [
            "Small sunken elliptical dark lesions across carrot root surface opening into cavities.",
            "Sparse yellowing and subtle stunting of corresponding carrot top foliage."
        ],
        "symptoms_ta": ["கேரட் கிழங்கில் பள்ளமான கரும்புள்ளிகள் மற்றும் இலைகளில் மெல்லிய மஞ்சள் நிறம்."],
        "causes": "Soil-borne Pythium species favored by cold, waterlogged, compacted soils with pH below 6.5.",
        "immediate_safe_steps": ["Improve raised bed drainage; avoid excessive late-season irrigation."],
        "treatment_options": [
            "Soil Drench: Drench Metalaxyl-M (1.5g/L) or Copper Hydroxide (2g/L) during early root swelling.",
            "Bio-Fungicide: Soil drench Trichoderma harzianum (10g/L)."
        ],
        "prevention": ["Grow carrots on high raised beds; lime acidic soils to pH 7.0."],
        "expert_warning": "Consult extension specialist for soil drainage engineering in heavy clay soils.",
        "extension_reference": "Horticultural Root Crop Pathology Guide."
    },
    "celery anthracnose": {
        "common_name": "Celery Anthracnose / Stunt",
        "scientific_name": "Colletotrichum fioriniae / Colletotrichum acutatum",
        "crop": "Celery (Apium graveolens)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Oval-shaped sunken brown lesions on celery petioles (stalks) causing curling and twisting.",
            "Stunted growth with heart leaves turning brittle and cupping downward."
        ],
        "symptoms_ta": ["செலரி தண்டுகளில் பள்ளமான பழுப்பு நிறப் புண்கள் மற்றும் தண்டு வளைந்து போதல்."],
        "causes": "Spreads via rain splash and overhead irrigation during warm humid weather (24-30°C).",
        "immediate_safe_steps": ["Remove diseased stalks immediately; transition to drip irrigation."],
        "treatment_options": [
            "Foliar Fungicide: Spray Azoxystrobin (1ml/L) or Chlorothalonil (2g/L) as per label.",
            "Organic Option: Copper Hydroxide (2g/L)."
        ],
        "prevention": ["Use certified disease-free seed; clean harvesting tools."],
        "expert_warning": "Avoid excessive nitrogen which makes celery petioles soft and susceptible.",
        "extension_reference": "Vegetable Pathology Advisory."
    },
    "celery early blight": {
        "common_name": "Celery Early Blight (Cercospora Leaf Spot)",
        "scientific_name": "Cercospora apii",
        "crop": "Celery (Apium graveolens)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Circular to angular yellowish spots rapidly turning ash-gray with dark borders.",
            "Velvety spore layer appears on both sides of spots in humid weather; severe spotting blights entire leaf."
        ],
        "symptoms_ta": ["செலரி இலைகளில் சாம்பல் நிறப் புள்ளிகள் தோன்றி இலை கருகிப் போதல்."],
        "causes": "Cercospora apii fungus flourishing in high humidity (above 90%) and warm temperatures (25-30°C).",
        "immediate_safe_steps": ["Avoid sprinkler watering; space plants to encourage fast canopy drying."],
        "treatment_options": [
            "Foliar Spray: Apply Mancozeb (2g/L) or Copper Oxychloride (2.5g/L) at 7-10 day intervals.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Soak seeds in hot water (48°C for 30 minutes); practice 3-year crop rotation."],
        "expert_warning": "Start protective sprays early if warm rainy spells persist.",
        "extension_reference": "TNAU Vegetable Disease Advisory."
    },
    "celery leaf": {
        "common_name": "Healthy Celery Leaf",
        "scientific_name": "Apium graveolens",
        "crop": "Celery (Apium graveolens)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Crisp, aromatic bright green pinnate foliage with smooth clean stalks."],
        "symptoms_ta": ["ஆரோக்கியமான செலரி இலை."],
        "causes": "Adequate soil organic matter, uniform moisture, and freedom from fungal blights.",
        "immediate_safe_steps": ["Maintain regular drip irrigation."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Apply organic compost."],
        "expert_warning": "No action needed.",
        "extension_reference": "Good Agricultural Practices for Apiaceae."
    },

    # 9. CHERRY
    "cherry leaf": {
        "common_name": "Healthy Cherry Leaf",
        "scientific_name": "Prunus avium / Prunus cerasus",
        "crop": "Cherry (Prunus spp.)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Glossy serrated green leaves without purple shot-holes or white powdery fungal bloom."],
        "symptoms_ta": ["ஆரோக்கியமான செர்ரி இலை."],
        "causes": "Balanced nitrogen and good temperate chilling hours.",
        "immediate_safe_steps": ["Maintain weed-free tree base."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Scout weekly during post-bloom."],
        "expert_warning": "No action needed.",
        "extension_reference": "Temperate Fruit Pathology Advisory."
    },
    "cherry leaf spot": {
        "common_name": "Cherry Leaf Spot (Shot-Hole)",
        "scientific_name": "Blumeriella jaapii",
        "crop": "Cherry (Prunus avium)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small circular purple to dark reddish spots on upper leaf surface.",
            "Centers of spots drop out leaving 'shot-hole' appearance; leaves turn yellow and drop prematurely in mid-summer."
        ],
        "symptoms_ta": ["செர்ரி இலைகளில் ஊதா-சிவப்பு நிறப் புள்ளிகள் காய்ந்து துவாரங்கள் (Shot-hole) ஏற்படுதல்."],
        "causes": "Overwinters in fallen leaves; ascospores released during spring rains (16-20°C).",
        "immediate_safe_steps": ["Rake and destroy fallen leaves in autumn to eliminate overwintering inoculum."],
        "treatment_options": [
            "Spray Captan 50 WP (2.5g/L) or Mancozeb (2g/L) from petal fall through post-harvest.",
            "Organic Option: Copper Hydroxide (2g/L) at leaf-drop."
        ],
        "prevention": ["Open tree canopy by pruning to accelerate foliage drying."],
        "expert_warning": "Premature defoliation weakens trees and increases winter-injury vulnerability.",
        "extension_reference": "ICAR-CITH Temperate Fruit Pathology."
    },
    "cherry powdery mildew": {
        "common_name": "Cherry Powdery Mildew",
        "scientific_name": "Podosphaera clandestina",
        "crop": "Cherry (Prunus spp.)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "White circular powdery patches of fungal mycelium on leaves and young green fruit.",
            "Infected leaves cup, curl upward, and become distorted and brittle."
        ],
        "symptoms_ta": ["செர்ரி இலைகளில் வெள்ளை நிற சாம்பல் போன்ற பூசண வளர்ச்சி மற்றும் இலை சுருங்குதல்."],
        "causes": "High humidity without free water at temperatures of 18-25°C in dense canopies.",
        "immediate_safe_steps": ["Prune crowded water sprouts and sucker growth in tree center."],
        "treatment_options": [
            "Foliar Spray: Apply Wettable Sulfur (2.5g/L) or Hexaconazole 5 EC (1ml/L) from shuck fall.",
            "Bio-Control: Spray Ampelomyces quisqualis or Neem oil (5ml/L)."
        ],
        "prevention": ["Avoid excessive late-spring nitrogen; plant open varieties."],
        "expert_warning": "Do not spray sulfur within 21 days of oil applications or when temperatures exceed 30°C.",
        "extension_reference": "Horticultural Tree Fruit Pathology Guide."
    },

    # 10. CITRUS
    "citrus canker": {
        "common_name": "Citrus Bacterial Canker",
        "scientific_name": "Xanthomonas citri pv. citri",
        "crop": "Citrus (Citrus spp. - Acid Lime, Lemon, Orange)",
        "category": "Bacterial",
        "is_healthy": False,
        "symptoms": [
            "Raised, corky, rough brownish eruptions/blisters on both leaf surfaces surrounded by a characteristic oily/water-soaked margin and bright yellow halo.",
            "Crater-like raised canker scabs on fruit rinds and young twigs causing premature fruit drop."
        ],
        "symptoms_ta": ["எலுமிச்சை இலை மற்றும் பழங்களில் சொறி போன்ற தடித்த பழுப்பு நிறப் புள்ளிகள் மற்றும் மஞ்சள் வளையம் (சிட்ரஸ் கேன்கர்)."],
        "causes": "Bacterial pathogen Xanthomonas citri entering via stomata and leafminer (Phyllocnistis citrella) puncture wounds during wind-driven rains (25-35°C).",
        "immediate_safe_steps": [
            "Prune and burn cankered twigs during summer before seasonal monsoon rains.",
            "Control citrus leafminer larvae strictly to prevent bacterial entry points."
        ],
        "treatment_options": [
            "Bactericide Protocol (TNAU/ICAR): Spray Streptocycline (1g/10L) combined with Copper Oxychloride 50 WP (2.5g/L) at new flush and fruit-set stages.",
            "Leafminer Control: Spray Neem oil (5ml/L) or Thiamethoxam 25 WG (0.3g/L) at emergence of new flush."
        ],
        "prevention": ["Erect Casuarina windbreaks around citrus orchards; use canker-free certified budded seedlings."],
        "expert_warning": "Prune cankered branches 10 cm below infection using surface-sterilized shears (dip in 1% sodium hypochlorite).",
        "extension_reference": "TNAU Acid Lime Canker Advisory / ICAR-CCRI Nagpur."
    },
    "citrus greening disease": {
        "common_name": "Citrus Greening Disease (Huanglongbing - HLB)",
        "scientific_name": "Candidatus Liberibacter asiaticus",
        "crop": "Citrus (Citrus spp. - Sweet Orange, Lime, Mandarin)",
        "category": "Bacterial",
        "is_healthy": False,
        "symptoms": [
            "Asymmetric blotchy mottle chlorosis across leaf veins (one half of leaf yellow while opposite half remains green).",
            "Upright, small, rigid, chlorotic leaves resembling zinc deficiency.",
            "Lopsided, small, bitter fruits that remain green at the stylar end ('greening')."
        ],
        "symptoms_ta": ["இலை நரம்புகளில் சமச்சீரற்ற மஞ்சள் நிற திட்டுகள் (Blotchy mottle) மற்றும் கசப்பான சிறிய காய் உருவாதல் (HLB நோய்)."],
        "causes": "Phloem-limited unculturable bacterium Candidatus Liberibacter, vectored by Asian Citrus Psyllid (Diaphorina citri).",
        "immediate_safe_steps": [
            "Rogue out and destroy confirmed HLB-positive trees to protect surrounding orchard.",
            "Install yellow sticky traps to detect adult citrus psyllids."
        ],
        "treatment_options": [
            "No chemical cure exists for systemic phloem infection.",
            "Vector Control (Psyllid): Spray Imidacloprid 17.8 SL (0.5ml/L) or Thiamethoxam (0.3g/L) at bud burst.",
            "Nutritional Support: Foliar micro-nutrient spray (Zinc 0.5%, Iron 0.2%, Manganese 0.2%) to alleviate symptoms."
        ],
        "prevention": ["Plant only certified disease-free budwood produced in insect-proof screenhouses."],
        "expert_warning": "HLB is a quarantine pathogen causing complete orchard decline; consult ICAR-CCRI / University immediately.",
        "extension_reference": "ICAR-Central Citrus Research Institute (CCRI) HLB Management."
    },

    # 11. COFFEE
    "coffee leaf": {
        "common_name": "Healthy Coffee Leaf",
        "scientific_name": "Coffea arabica / Coffea canephora",
        "crop": "Coffee (Coffea spp.)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Thick, dark glossy green leaves with deep parallel venation and no powdery orange spots."],
        "symptoms_ta": ["ஆரோக்கியமான காபி இலை."],
        "causes": "Well-regulated shade canopy (Silver Oak / Albizia) and balanced N-P-K estate nutrition.",
        "immediate_safe_steps": ["Maintain 40-50% shade cover."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Prune dead shade branches; clear weed competition."],
        "expert_warning": "No action needed.",
        "extension_reference": "Central Coffee Research Institute (CCRI) Advisory."
    },
    "coffee leaf rust": {
        "common_name": "Coffee Leaf Rust",
        "scientific_name": "Hemileia vastatrix",
        "crop": "Coffee (Coffea arabica)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Pale yellow spots on upper leaf surface corresponding to powdery yellow-orange spore clusters on the underside.",
            "Circular patches coalesce, dry, and turn brown, causing heavy defoliation and berry drop."
        ],
        "symptoms_ta": ["காபி இலையின் அடியில் மஞ்சள்-ஆரஞ்சு நிற பொடி போன்ற துருப் பூசணம் மற்றும் இலை உதிர்தல்."],
        "causes": "Fungal urediniospores germinating in drops of free water under humid shade at 21-25°C.",
        "immediate_safe_steps": ["Prune excess shade tree branches to allow dappled sunlight to dry foliage."],
        "treatment_options": [
            "Foliar Fungicide (CCRI / TNAU): Spray Bordeaux Mixture 0.5% or Copper Oxychloride (2.5g/L) pre-monsoon (May-June) and post-monsoon (October).",
            "Systemic Spray: Apply Hexaconazole 5 EC (1ml/L) or Bayleton 25 WP (0.5g/L) at initial lesion breakout."
        ],
        "prevention": ["Plant rust-resistant coffee cultivars (e.g. Chandragiri, Selection 5B, Sln 9)."],
        "expert_warning": "Timely pre-monsoon spray is critical to prevent severe defoliation and dieback.",
        "extension_reference": "Central Coffee Research Institute (CCRI), Balehonnur Guidelines."
    },

    # 12. CORN / MAIZE
    "corn gray leaf spot": {
        "common_name": "Corn Gray Leaf Spot",
        "scientific_name": "Cercospora zeae-maydis",
        "crop": "Corn / Maize (Zea mays)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Distinct rectangular, long, narrow tan-to-gray lesions strictly delimited by leaf veins.",
            "Lesions expand to 2-7 cm in length, merging to blight entire leaf bladders."
        ],
        "symptoms_ta": ["மக்காச்சோள இலைகளில் நரம்புகளுக்கு இடைப்பட்ட நீளமான செவ்வக வடிவ சாம்பல் நிற கருகல் புண்கள்."],
        "causes": "Fungal pathogen surviving in corn stubble; warm humid weather (25-30°C) with persistent fog or dew.",
        "immediate_safe_steps": ["Deep summer plowing to bury crop residues."],
        "treatment_options": [
            "Foliar Spray: Apply Azoxystrobin + Difenoconazole (Amistar Top @ 1ml/L) or Mancozeb (2g/L) at tassel emergence.",
            "Organic Control: Trichoderma viride seed treatment."
        ],
        "prevention": ["Rotate with pulses or oilseeds; plant resistant corn hybrids."],
        "expert_warning": "Treat before tasseling stage if gray leaf spot lesions reach the third leaf below the ear.",
        "extension_reference": "ICAR-Indian Institute of Maize Research (IIMR) Advisory."
    },
    "corn leaf": {
        "common_name": "Healthy Corn / Maize Leaf",
        "scientific_name": "Zea mays",
        "crop": "Corn / Maize (Zea mays)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Elongate, broad, linear green leaf blades with prominent midrib and no fungal lesions."],
        "symptoms_ta": ["ஆரோக்கியமான மக்காச்சோள இலை."],
        "causes": "Optimal nitrogen top-dressing and weed-free early vegetative stage.",
        "immediate_safe_steps": ["Apply earthing-up and furrow irrigation."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Monitor for Fall Armyworm (Spodoptera frugiperda)."],
        "expert_warning": "No action needed.",
        "extension_reference": "TNAU Maize Production Guide."
    },
    "corn northern leaf blight": {
        "common_name": "Northern Corn Leaf Blight (NCLB)",
        "scientific_name": "Exserohilum turcicum (Setosphaeria turcica)",
        "crop": "Corn / Maize (Zea mays)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Large, elongated, cigar-shaped / elliptical grayish-green to tan lesions (2.5 to 15 cm long).",
            "Dark olive fungal sporulation visible inside lesions during damp weather."
        ],
        "symptoms_ta": ["மக்காச்சோளத்தில் சுருட்டு வடிவ பெரிய சாம்பல் நிற கருகல் புண்கள் (Cigar-shaped lesions)."],
        "causes": "Fungal spores splashed from corn debris during moderate temperatures (18-27°C) and extended dew.",
        "immediate_safe_steps": ["Destroy heavily infected lower leaves after grain development."],
        "treatment_options": [
            "Spray Mancozeb 75 WP (2g/L) or Propiconazole 25 EC (1ml/L) at first symptom appearance.",
            "Seed Treatment: Treat seed with Carbendazim (2g/kg seed)."
        ],
        "prevention": ["Plant NCLB-resistant corn hybrids; practice 2-year crop rotation with legumes."],
        "expert_warning": "Severe blighting before silking can cause over 40% grain yield loss.",
        "extension_reference": "ICAR-IIMR Maize Pathology Protocol."
    },
    "corn rust": {
        "common_name": "Common Rust of Corn",
        "scientific_name": "Puccinia sorghi",
        "crop": "Corn / Maize (Zea mays)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Circular to elongate golden-brown to cinnamon-brown powdery pustules on both leaf surfaces.",
            "Pustules rupture the epidermis, releasing mass powdery rust urediniospores."
        ],
        "symptoms_ta": ["மக்காச்சோள இலையின் இருபுறமும் செம்பழுப்பு நிற துருப் புள்ளிகள்."],
        "causes": "Airborne spores carried by wind currents during cool moist weather (16-24°C).",
        "immediate_safe_steps": ["Ensure balanced fertilizer application; avoid excess urea."],
        "treatment_options": [
            "Spray Mancozeb (2g/L) or Azoxystrobin (1ml/L) if rust reaches ear leaf before silking.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Sow resistant maize hybrids; plant early in season to escape late rust peaks."],
        "expert_warning": "Fungicide application is rarely economical once corn passes dent stage.",
        "extension_reference": "TNAU Cereals Crop Protection."
    },
    "corn smut": {
        "common_name": "Common Smut of Corn",
        "scientific_name": "Ustilago maydis",
        "crop": "Corn / Maize (Zea mays)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Prominent fleshy galls/tumors on ears, tassels, stalks, and leaves.",
            "Galls covered with silvery-white membrane that ruptures to release masses of black powdery teliospores."
        ],
        "symptoms_ta": ["மக்காச்சோள கதிர் மற்றும் தண்டுகளில் வெள்ளையான கட்டிகள் தோன்றி வெடித்து கருப்பு தூள் வெளியேறுதல்."],
        "causes": "Fungus entering through mechanical wounds (hail, detasseling, cultivation) or silk channels.",
        "immediate_safe_steps": [
            "Remove and deeply bury young galls before they rupture and disperse black teliospores.",
            "Avoid damaging corn plants during weeding and cultivation."
        ],
        "treatment_options": [
            "Chemical sprays are ineffective once galls form.",
            "Seed Treatment: Treat seed with Thiram or Captan (2.5g/kg seed)."
        ],
        "prevention": ["Plant resistant varieties; maintain balanced soil fertility (avoid excess nitrogen)."],
        "expert_warning": "Sanitize field tools; do not compost mature smut galls.",
        "extension_reference": "ICAR Maize Disease Management Guidelines."
    },

    # 13. CUCURBITS (Cucumber & Squash)
    "cucumber angular leaf spot": {
        "common_name": "Cucumber Angular Leaf Spot",
        "scientific_name": "Pseudomonas syringae pv. lachrymans",
        "crop": "Cucumber (Cucumis sativus)",
        "category": "Bacterial",
        "is_healthy": False,
        "symptoms": [
            "Small water-soaked lesions bounded strictly by leaf veins, giving them a distinct angular blocky shape.",
            "White bacterial crust dries on leaf underside; necrotic centers fall out, leaving ragged holes."
        ],
        "symptoms_ta": ["வெள்ளரி இலைகளில் நரம்புகளுக்கு இடைப்பட்ட கோண வடிவ நீர் ஊறிய புள்ளிகள் மற்றும் ஓட்டைகள்."],
        "causes": "Seed-borne bacterium spreading via splashing rain, insects, and hands at 24-28°C and high humidity.",
        "immediate_safe_steps": ["Do not harvest or prune vines when wet with dew."],
        "treatment_options": [
            "Spray Copper Oxychloride 50 WP (2.5g/L) combined with Streptocycline (0.5g/10L) at 7-day intervals.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Sow certified disease-free seed; practice 2-year rotation with non-cucurbits."],
        "expert_warning": "Copper sprays can cause mild phytotoxicity on young cucumber seedlings; test concentration first.",
        "extension_reference": "TNAU Vegetable Pathology Advisory."
    },
    "cucumber bacterial wilt": {
        "common_name": "Cucumber Bacterial Wilt",
        "scientific_name": "Erwinia tracheiphila",
        "crop": "Cucumber (Cucumis sativus)",
        "category": "Bacterial",
        "is_healthy": False,
        "symptoms": [
            "Dull green wilting of individual leaves during hot midday sun, recovering at night, before entire vine wilts permanently.",
            "Bacterial string test: cutting stem near crown and pulling ends apart reveals sticky white bacterial strands."
        ],
        "symptoms_ta": ["வெள்ளரி கொடி திடீரென வாடி வதங்குதல்; தண்டை வெட்டி இழுத்தால் ஒட்டும் நூல் போன்ற பாக்டீரியா திரவம்."],
        "causes": "Overwintered in and vectored exclusively by Cucumber Beetles (Acalymma vittatum, Diabrotica undecimpunctata).",
        "immediate_safe_steps": [
            "Rogue out and destroy wilted plants immediately (they cannot be revived).",
            "Control cucumber beetles promptly from seedling emergence."
        ],
        "treatment_options": [
            "Vector Control (Beetles): Spray Neem oil (5ml/L) or Acetamiprid 20 SP (0.5g/L).",
            "Use yellow sticky traps and row covers over young cucumber beds."
        ],
        "prevention": ["Install 40-mesh insect-proof netting over seedling nursery; plant resistant cultivars."],
        "expert_warning": "No bactericide can unclog xylem vessels once bacterial wilt is established.",
        "extension_reference": "TNAU Cucurbit Disease Management."
    },
    "cucumber leaf": {
        "common_name": "Healthy Cucumber Leaf",
        "scientific_name": "Cucumis sativus",
        "crop": "Cucumber (Cucumis sativus)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Triangular lobed dark green foliage with rough hairs and no powdery white coating."],
        "symptoms_ta": ["ஆரோக்கியமான வெள்ளரி இலை."],
        "causes": "Adequate soil drainage, trellised vines, and regular drip irrigation.",
        "immediate_safe_steps": ["Maintain clean vine trellising."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Trellis vines to elevate foliage away from wet soil."],
        "expert_warning": "No action needed.",
        "extension_reference": "Good Agricultural Practices for Cucurbits."
    },
    "cucumber powdery mildew": {
        "common_name": "Cucumber Powdery Mildew",
        "scientific_name": "Podosphaera xanthii (Erysiphe cichoracearum)",
        "crop": "Cucumber (Cucumis sativus)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "White talcum-powder like circular spots on upper and lower leaf surfaces, petioles, and stems.",
            "Powdery coating expands across entire leaf, causing leaves to turn brown, dry, and become papery."
        ],
        "symptoms_ta": ["வெள்ளரி இலையின் இருபுறமும் வெள்ளை நிற சாம்பல் பொடி போன்ற பூசண வளர்ச்சி."],
        "causes": "Airborne conidia thriving in warm (20-28°C), dry weather with shaded, high humidity microclimates.",
        "immediate_safe_steps": [
            "Prune heavily infected older lower leaves to increase sunlight inside vine canopy.",
            "Avoid dense planting."
        ],
        "treatment_options": [
            "Foliar Spray: Spray Wettable Sulfur (2g/L) or Dinocap 48 EC (1ml/L) at first spot appearance.",
            "Organic Option: Spray Potassium bicarbonate (3g/L) or 0.5% Neem oil emulsion."
        ],
        "prevention": ["Plant resistant cucumber hybrids (e.g. Malini, Pusa Sanyog); trellis vines off the ground."],
        "expert_warning": "Do not apply sulfur when ambient temperature exceeds 32°C to prevent leaf scorching.",
        "extension_reference": "TNAU / ICAR-IIHR Cucurbit Protection Protocol."
    },
    "squash leaf": {
        "common_name": "Healthy Squash Leaf",
        "scientific_name": "Cucurbita pepo",
        "crop": "Squash / Pumpkin (Cucurbita spp.)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Large lobed green foliage with natural silvery vein patterning and no powdery mildew coating."],
        "symptoms_ta": ["ஆரோக்கியமான பூசணி / சுரைக்காய் இலை."],
        "causes": "Full sunlight and rich organic matter.",
        "immediate_safe_steps": ["Water at base."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Mulch base with straw."],
        "expert_warning": "Natural silver markings along leaf veins are normal genetics, not powdery mildew.",
        "extension_reference": "Cucurbit Production Guide."
    },
    "squash powdery mildew": {
        "common_name": "Squash Powdery Mildew",
        "scientific_name": "Podosphaera xanthii",
        "crop": "Squash / Pumpkin (Cucurbita pepo)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "White powdery fungal patches spreading across both leaf surfaces and petioles.",
            "Infected leaves yellow prematurely, leading to sunscald on unprotected squash fruit."
        ],
        "symptoms_ta": ["பூசணி இலையில் மாவு போன்ற வெண்மையான பூஞ்சைத் தாக்குதல்."],
        "causes": "Airborne conidia multiplying in warm shaded foliage without needing free water.",
        "immediate_safe_steps": ["Remove yellowing mildewed lower leaves."],
        "treatment_options": [
            "Spray Wettable Sulfur (2g/L) or Carbendazim 50 WP (1g/L) or Azoxystrobin (1ml/L).",
            "Bio-Spray: Spray Ampelomyces quisqualis or 5% Cow urine-asafetida spray."
        ],
        "prevention": ["Plant powdery mildew resistant squash varieties."],
        "expert_warning": "Treat early; severe mildew depresses fruit sugars and storage quality.",
        "extension_reference": "TNAU Vegetable Pathology."
    },
    "zucchini yellow mosaic virus": {
        "common_name": "Zucchini Yellow Mosaic Virus (ZYMV)",
        "scientific_name": "Zucchini yellow mosaic potyvirus",
        "crop": "Zucchini / Squash (Cucurbita pepo)",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Severe yellow mosaic, blistering, and extreme leaf distortion ('shoestring' / enation symptoms).",
            "Knobby, distorted, stunted zucchini fruits with prominent raised green warts."
        ],
        "symptoms_ta": ["சுரை / பூசணி இலையில் கடும் மஞ்சள் மொசைக் சுருக்கம் மற்றும் காய்களில் தடித்த கொப்புளங்கள்."],
        "causes": "Vectored non-persistently by numerous aphid species in under 60 seconds of feeding.",
        "immediate_safe_steps": ["Rogue and deeply bury symptomatic plants immediately."],
        "treatment_options": [
            "Viral infections cannot be cured chemically.",
            "Install yellow sticky traps; spray Neem oil (5ml/L) or reflective silver mulch to repel aphids."
        ],
        "prevention": ["Plant transgenic or traditionally bred ZYMV-resistant hybrids."],
        "expert_warning": "Do not leave infected vines in field; aphids rapidly spread virus to adjacent cucurbits.",
        "extension_reference": "ICAR-IIHR Cucurbit Virology Advisory."
    },

    # 14. EGGPLANT / BRINJAL
    "eggplant cercospora leaf spot": {
        "common_name": "Eggplant Cercospora Leaf Spot",
        "scientific_name": "Cercospora melongenae",
        "crop": "Eggplant / Brinjal (Solanum melongena)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Circular to irregular brown chlorotic spots with concentric rings.",
            "Centers become grayish-white with dark margins; heavy infection causes premature leaf fall."
        ],
        "symptoms_ta": ["கத்தரி இலையில் பழுப்பு நிற வட்டப் புள்ளிகள் மற்றும் இலை உதிர்தல்."],
        "causes": "Cercospora fungus favored by high humidity (above 85%) and warm temperatures (25-30°C).",
        "immediate_safe_steps": ["Prune and destroy infected lower leaves; avoid overhead watering."],
        "treatment_options": [
            "Foliar Spray: Apply Mancozeb 75 WP (2g/L) or Copper Oxychloride (2.5g/L) or Carbendazim (1g/L) at 10-day intervals.",
            "Organic Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Follow 2-year crop rotation with non-solanaceous crops; use certified seed."],
        "expert_warning": "Spray early before leaf spots spread to calyx and fruit.",
        "extension_reference": "TNAU Brinjal Crop Protection Advisory."
    },
    "eggplant leaf": {
        "common_name": "Healthy Eggplant / Brinjal Leaf",
        "scientific_name": "Solanum melongena",
        "crop": "Eggplant / Brinjal (Solanum melongena)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Large fuzzy green-to-purplish leaves without leaf spots, little-leaf stunting, or shoot borer damage."],
        "symptoms_ta": ["ஆரோக்கியமான கத்தரி இலை."],
        "causes": "Balanced organic matter, good drainage, and freedom from phytoplasma.",
        "immediate_safe_steps": ["Monitor shoot & fruit borer."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Erect pheromone traps for shoot borer (Leucinodes orbonalis)."],
        "expert_warning": "No action needed.",
        "extension_reference": "TNAU Vegetable Production Guide."
    },

    # 15. ALLIUMS (Garlic)
    "garlic leaf": {
        "common_name": "Healthy Garlic Leaf",
        "scientific_name": "Allium sativum",
        "crop": "Garlic (Allium sativum)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Linear flat grayish-green foliage with upright vigor and no orange rust pustules or tip burn."],
        "symptoms_ta": ["ஆரோக்கியமான பூண்டு இலை."],
        "causes": "Cold vegetative period and well-drained sandy loam soil.",
        "immediate_safe_steps": ["Maintain weed-free beds."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Apply sulfur during clove planting."],
        "expert_warning": "No action needed.",
        "extension_reference": "TNAU Garlic Production Guidelines."
    },
    "garlic leaf blight": {
        "common_name": "Garlic Stemphylium / Purple Leaf Blight",
        "scientific_name": "Stemphylium vesicarium / Alternaria porri",
        "crop": "Garlic (Allium sativum)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small yellow-to-orange flecks on leaves expanding into elliptical purple-bordered brown blight lesions.",
            "Tips of garlic leaves die back, severely restricting clove bulb expansion."
        ],
        "symptoms_ta": ["பூண்டு இலைகளில் ஊதா-பழுப்பு நிற கருகல் புள்ளிகள் மற்றும் நுனி காய்ந்து போதல்."],
        "causes": "Fungal pathogens flourishing during warm humid spells (22-26°C) following winter rains.",
        "immediate_safe_steps": ["Avoid excessive late nitrogen fertilization; improve bed drainage."],
        "treatment_options": [
            "Foliar Spray: Apply Mancozeb 75 WP (2.5g/L) or Tebuconazole (1ml/L) at first sign of purple flecks.",
            "Organic Control: Spray Trichoderma viride (5g/L) with sticker."
        ],
        "prevention": ["Plant healthy certified cloves; follow 3-year allium crop rotation."],
        "expert_warning": "Always use a wetting agent/sticker (0.5ml/L) when spraying waxy garlic foliage.",
        "extension_reference": "National Horticultural Research and Development Foundation (NHRDF) Advisory."
    },
    "garlic rust": {
        "common_name": "Garlic Rust",
        "scientific_name": "Puccinia allii",
        "crop": "Garlic (Allium sativum)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small white-to-yellow spots turning into prominent raised reddish-orange blister-like pustules on foliage.",
            "Heavily infected leaves turn yellow, desiccate, and collapse, stunting bulb yield."
        ],
        "symptoms_ta": ["பூண்டு இலைகளில் செம்மஞ்சள் நிற துருப் புள்ளிகள்."],
        "causes": "Puccinia allii urediniospores active in moderate temperatures (12-20°C) with high humidity.",
        "immediate_safe_steps": ["Stop overhead watering; destroy heavily infected garlic leaves."],
        "treatment_options": [
            "Spray Mancozeb (2g/L) or Azoxystrobin (1ml/L) or Tebuconazole (1ml/L) at 10-day intervals.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Avoid planting allium crops consecutively; provide wide in-row spacing."],
        "expert_warning": "Do not save cloves from rust-infected fields for next season's seed.",
        "extension_reference": "NHRDF Garlic Pathology Guide."
    },

    # 16. GINGER
    "ginger leaf": {
        "common_name": "Healthy Ginger Leaf",
        "scientific_name": "Zingiber officinale",
        "crop": "Ginger (Zingiber officinale)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Narrow lanceolate glossy green leaves with upright pseudostems and no water-soaked yellowing."],
        "symptoms_ta": ["ஆரோக்கியமான இஞ்சி இலை."],
        "causes": "Well-drained rich organic mulch and dappled shade.",
        "immediate_safe_steps": ["Maintain organic leaf mulch."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Apply Trichoderma-enriched compost."],
        "expert_warning": "No action needed.",
        "extension_reference": "ICAR-Indian Institute of Spices Research (IISR) Advisory."
    },
    "ginger leaf spot": {
        "common_name": "Ginger Phyllosticta Leaf Spot",
        "scientific_name": "Phyllosticta zingiberi",
        "crop": "Ginger (Zingiber officinale)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small oval to elongated yellowish spots with white or papery centers and dark brown margins.",
            "Black pinhead pycnidia form in centers of spots; leaves shred and dry prematurely."
        ],
        "symptoms_ta": ["இஞ்சி இலைகளில் வெண்மையான மையமும் பழுப்பு விளிம்பும் கொண்ட புள்ளிகள்."],
        "causes": "Spreads via rain splash in tropical monsoons with high humidity and temperatures of 25-30°C.",
        "immediate_safe_steps": ["Collect and burn spotted leaves; maintain clean bed drainage."],
        "treatment_options": [
            "Spray Mancozeb 75 WP (2g/L) or Bordeaux Mixture 1% at 15-day intervals during monsoon.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Treat rhizomes with Mancozeb (3g/L) for 30 minutes before planting."],
        "expert_warning": "Commence spray at first appearance of spots during early monsoon.",
        "extension_reference": "ICAR-IISR Calicut Ginger Disease Management."
    },
    "ginger sheath blight": {
        "common_name": "Ginger Soft Rot / Rhizome Rot / Sheath Blight",
        "scientific_name": "Pythium aphanidermatum / Rhizoctonia solani",
        "crop": "Ginger (Zingiber officinale)",
        "category": "Oomycete",
        "is_healthy": False,
        "symptoms": [
            "Water-soaked lesions on collar region of pseudostem progressing upward into the leaf sheath.",
            "Leaves turn yellow from bottom upward; affected pseudostems pull out easily from the rotting rhizome with a foul odor."
        ],
        "symptoms_ta": ["இஞ்சி தண்டு மற்றும் கிழங்கு அழுகல்; இலைகள் மஞ்சளாகி தண்டு எளிதில் பிடுங்கி வருதல்."],
        "causes": "Soil-borne Pythium fungus in waterlogged soil with stagnant moisture during monsoon rains.",
        "immediate_safe_steps": [
            "Isolate infected clumps; dig trenches to drain stagnant rainwater away from ginger beds.",
            "Rogue out rotting clumps and drench the pit with bleaching powder (20g/L)."
        ],
        "treatment_options": [
            "Soil Drenching: Drench Metalaxyl-Mancozeb (Ridomil MZ @ 2g/L) or Copper Oxychloride (3g/L) around root zone.",
            "Bio-Control: Soil application of Trichoderma harzianum (50g/bed mixed with FYM and neem cake)."
        ],
        "prevention": ["Plant ginger on 30 cm raised beds; treat seed rhizomes before planting."],
        "expert_warning": "Rhizome soft rot is the most destructive disease of ginger; act immediately upon detecting first yellow shoot.",
        "extension_reference": "ICAR-IISR Calicut Package of Practices for Ginger."
    },

    # 17. GRAPES
    "grape black rot": {
        "common_name": "Grape Black Rot",
        "scientific_name": "Guignardia bidwellii (Phyllosticta ampelicida)",
        "crop": "Grape (Vitis vinifera)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Circular reddish-brown spots on leaves with dark borders and tiny black fruiting pycnidia arranged in rings.",
            "Berries shrivel into hard, black, wrinkled mummies that cling to the vine cluster."
        ],
        "symptoms_ta": ["திராட்சை இலைகளில் பழுப்புப் புள்ளிகள் மற்றும் பழங்கள் சுருங்கி கருப்பு மம்மியாக மாறுதல்."],
        "causes": "Overwinters in mummified berries and cane lesions; ascospores released during spring rains (21-27°C).",
        "immediate_safe_steps": ["Remove and burn all mummified grape clusters and pruned infected canes."],
        "treatment_options": [
            "Foliar Spray: Apply Mancozeb 75 WP (2g/L) or Myclobutanil (0.4ml/L) from early shoot growth through veraison.",
            "Organic Option: Copper Oxychloride (2.5g/L)."
        ],
        "prevention": ["Maintain open trellis canopy for fast air drying; prune canopy shoots."],
        "expert_warning": "Protect berries from bloom through 4 weeks post-bloom when fruit is most susceptible.",
        "extension_reference": "ICAR-National Research Centre for Grapes (NRCG), Pune."
    },
    "grape downy mildew": {
        "common_name": "Grape Downy Mildew",
        "scientific_name": "Plasmopara viticola",
        "crop": "Grape (Vitis vinifera)",
        "category": "Oomycete",
        "is_healthy": False,
        "symptoms": [
            "Yellowish translucent oily spots ('oil-spots') on upper leaf surface.",
            "Dense white cottony/downy fungal growth on the underside of oil-spots during humid mornings."
        ],
        "symptoms_ta": ["திராட்சை இலைகளின் மேல் பகுதியில் எண்ணெய் போன்ற மஞ்சள் திட்டுகளும் அடியில் வெள்ளை பூசணமும் தோன்றுதல்."],
        "causes": "Oospores germinating during rainfall of at least 10 mm when temperatures are above 10°C ('10-10 rule').",
        "immediate_safe_steps": ["Prune crowded canopy shoots; clean fallen leaves."],
        "treatment_options": [
            "Spray Bordeaux Mixture 1% or Metalaxyl + Mancozeb (2g/L) or Dimethomorph (1g/L).",
            "Bio-Control: Spray Trichoderma or Potassium phosphonate (3ml/L)."
        ],
        "prevention": ["Train vines on bower/Y-trellis for rapid drying; avoid overhead irrigation."],
        "expert_warning": "Downy mildew can destroy entire grape flower clusters in 48 hours under rainy conditions.",
        "extension_reference": "ICAR-NRCG Pune Downy Mildew Forewarning Advisory."
    },
    "grape leaf": {
        "common_name": "Healthy Grape Leaf",
        "scientific_name": "Vitis vinifera",
        "crop": "Grape (Vitis vinifera)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Palmate lobed vibrant green leaves without oil spots, powdery bloom, or reddish interveinal scorch."],
        "symptoms_ta": ["ஆரோக்கியமான திராட்சை இலை."],
        "causes": "Balanced micronutrients (Magnesium and Zinc) and open bower canopy management.",
        "immediate_safe_steps": ["Maintain standard shoot positioning."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Scout weekly during post-pruning flushes."],
        "expert_warning": "No action needed.",
        "extension_reference": "TNAU Viticulture Guide."
    },
    "grape leaf spot": {
        "common_name": "Grape Anthracnose / Bird's Eye Rot",
        "scientific_name": "Elsinoë ampelina (Sphaceloma ampelinum)",
        "crop": "Grape (Vitis vinifera)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small circular spots on leaves with pale gray centers and dark reddish-brown borders ('bird's eye').",
            "Cankers on young shoots causing shoot tip dieback; sunken bird's-eye spots on green berries."
        ],
        "symptoms_ta": ["திராட்சை இலை மற்றும் பழங்களில் பறவைக் கண் போன்ற சாம்பல் நிற மையமும் சிவப்பு விளிம்பும் கொண்ட புள்ளிகள்."],
        "causes": "Conidia splashed from infected cane cankers during warm wet flushes.",
        "immediate_safe_steps": ["Prune out and burn all cankered canes during dormant pruning."],
        "treatment_options": [
            "Dormant Spray: Swab canes with 0.1% Copper sulphate or lime sulfur.",
            "Vegetative Spray: Apply Mancozeb (2g/L) or Carbendazim (1g/L) at 10-day intervals."
        ],
        "prevention": ["Prune vines cleanly; treat cuts with Bordeaux paste."],
        "expert_warning": "Critical: protect tender 5-to-10 cm spring shoots before flower bunch opening.",
        "extension_reference": "ICAR-NRCG Pune Anthracnose Protocol."
    },
    "grapevine leafroll disease": {
        "common_name": "Grapevine Leafroll Disease (GLD)",
        "scientific_name": "Grapevine leafroll-associated viruses (GLRaV-1, 2, 3)",
        "crop": "Grape (Vitis vinifera)",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Downward rolling and curling of leaf margins starting in late summer.",
            "Red varieties show prominent interveinal reddening while veins remain green; white varieties show chlorosis and rolling."
        ],
        "symptoms_ta": ["திராட்சை இலைகள் கீழ்நோக்கி சுருண்டு நரம்புகள் பச்சையாக இருக்க இடைப்பட்ட பகுதி சிவப்பாக மாறுதல்."],
        "causes": "Transmitted by grafting and vectored by mealybugs (Pseudococcus spp., Planococcus ficus) and soft scales.",
        "immediate_safe_steps": [
            "Mark virus-infected vines and eliminate them during winter dormancy.",
            "Do not take cuttings from symptomatic vines."
        ],
        "treatment_options": [
            "Viral infection has no chemical cure.",
            "Vector Control (Mealybug): Spray Buprofezin 25 SC (1.25ml/L) or Cryptolaemus montrouzieri ladybird predator beetles."
        ],
        "prevention": ["Plant certified virus-tested grafted grapevines."],
        "expert_warning": "Control mealybugs aggressively to prevent vineyard-wide viral transmission.",
        "extension_reference": "ICAR-NRCG Pune Virology Advisory."
    },

    # 18. LETTUCE
    "lettuce downy mildew": {
        "common_name": "Lettuce Downy Mildew",
        "scientific_name": "Bremia lactucae",
        "crop": "Lettuce (Lactuca sativa)",
        "category": "Oomycete",
        "is_healthy": False,
        "symptoms": [
            "Angular light green to pale yellow spots delineated by leaf veins on upper leaf surfaces.",
            "White downy felt of fungal sporulation covering the lower surface of spots during humid conditions."
        ],
        "symptoms_ta": ["லெட்டூஸ் இலையின் அடியில் வெள்ளை பூசணமும் மேல் பகுதியில் கோண வடிவ மஞ்சள் புள்ளிகளும்."],
        "causes": "Airborne sporangia flourishing in cool (10-15°C), humid microclimates with free moisture.",
        "immediate_safe_steps": ["Switch to morning drip irrigation; space plants to encourage fast drying."],
        "treatment_options": [
            "Spray Metalaxyl + Mancozeb (2g/L) or Dimethomorph (1g/L) observing pre-harvest interval.",
            "Bio-Control: Spray Bacillus subtilis or Copper octanoate."
        ],
        "prevention": ["Plant downy-mildew resistant lettuce varieties; rotate crops."],
        "expert_warning": "Respect 14-day pre-harvest intervals for fresh leafy salad greens.",
        "extension_reference": "TNAU Vegetable Pathology Guide."
    },
    "lettuce leaf": {
        "common_name": "Healthy Lettuce Leaf",
        "scientific_name": "Lactuca sativa",
        "crop": "Lettuce (Lactuca sativa)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Crisp tender leaves with uniform green color and no downy mildew or mosaic mottling."],
        "symptoms_ta": ["ஆரோக்கியமான லெட்டூஸ் இலை."],
        "causes": "Cool weather and uniform soil moisture.",
        "immediate_safe_steps": ["Maintain regular drip watering."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Avoid overhead irrigation."],
        "expert_warning": "No action needed.",
        "extension_reference": "Good Agricultural Practices for Leafy Greens."
    },
    "lettuce mosaic virus": {
        "common_name": "Lettuce Mosaic Virus (LMV)",
        "scientific_name": "Lettuce mosaic potyvirus",
        "crop": "Lettuce (Lactuca sativa)",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Mottling, light green and dark green mosaic patterns, and vein clearing.",
            "Leaf margins become ruffled and heads fail to form or remain stunted and loose."
        ],
        "symptoms_ta": ["லெட்டூஸ் இலையில் பச்சை மொசைக் திட்டுகள் மற்றும் தலை கட்டாமல் போதல்."],
        "causes": "Seed-borne and transmitted non-persistently by green peach aphids (Myzus persicae).",
        "immediate_safe_steps": ["Rogue and destroy virus-infected plants."],
        "treatment_options": [
            "Control Aphid Vectors: Spray Neem oil (5ml/L) or Flonicamid 50 WG (0.3g/L).",
            "No chemical cure for virus."
        ],
        "prevention": ["Sow indexed mosaic-tested seed (0 in 30,000 seed standard); use resistant varieties."],
        "expert_warning": "Weed non-crop fields as wild lettuce serves as persistent virus reservoir.",
        "extension_reference": "Vegetable Virology Advisory."
    },

    # 19. MAPLE
    "maple leaf": {
        "common_name": "Healthy Maple Leaf",
        "scientific_name": "Acer spp.",
        "crop": "Maple (Acer spp.)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Palmate lobed foliage with clean margins and no tar spot stroma."],
        "symptoms_ta": ["ஆரோக்கியமான மேப்பிள் இலை."],
        "causes": "Healthy forest or landscape tree physiology.",
        "immediate_safe_steps": ["No action needed."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Rake fallen leaves annually."],
        "expert_warning": "No action needed.",
        "extension_reference": "Arboricultural Pathology."
    },
    "maple tar spot": {
        "common_name": "Maple Tar Spot",
        "scientific_name": "Rhytisma acerinum",
        "crop": "Maple (Acer spp.)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Yellow-green spots on leaves that develop thick, raised, glossy black tar-like fungal stromata (1-2 cm wide).",
            "Heavy infection causes cosmetic blemishes and premature autumn leaf fall."
        ],
        "symptoms_ta": ["மேப்பிள் இலைகளில் தார் போன்ற பளபளப்பான தடித்த கருப்புப் புள்ளிகள்."],
        "causes": "Overwinters in fallen leaves; ascospores released during damp spring weather to infect new leaves.",
        "immediate_safe_steps": ["Rake and thoroughly compost or destroy fallen leaves in autumn."],
        "treatment_options": [
            "Fungicides are rarely warranted for mature trees.",
            "In high-value nurseries: apply Copper Hydroxide (2g/L) or Mancozeb at bud break."
        ],
        "prevention": ["Rake and dispose of fallen infected leaves before spring bud break."],
        "expert_warning": "Tar spot is primarily cosmetic and rarely threatens overall tree vitality.",
        "extension_reference": "Forest Pathology Advisory."
    },

    # 20. PEACH & PLUM
    "peach leaf": {
        "common_name": "Healthy Peach Leaf",
        "scientific_name": "Prunus persica",
        "crop": "Peach (Prunus persica)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Smooth, lanceolate glossy green leaves with serrated margins and no puckered red blisters."],
        "symptoms_ta": ["ஆரோக்கியமான பீச் இலை."],
        "causes": "Balanced winter chilling and standard stone-fruit nutrition.",
        "immediate_safe_steps": ["Scout for borer and curl."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Apply dormant copper spray annually."],
        "expert_warning": "No action needed.",
        "extension_reference": "TNAU Horticultural Advisory."
    },
    "peach leaf curl": {
        "common_name": "Peach Leaf Curl",
        "scientific_name": "Taphrina deformans",
        "crop": "Peach (Prunus persica)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "New spring leaves become severely distorted, thickened, puckered, curled, and blistered.",
            "Color changes from yellow-green to reddish-purple, then develops a velvety gray fungal bloom before dying."
        ],
        "symptoms_ta": ["பீச் இலைகள் தடித்து, சுருங்கி, சிவப்பு-ஊதா நிறமாக மாறி உதிர்தல்."],
        "causes": "Fungus overwintering in bark crevices; infects expanding bud scales during cool wet spring weather (10-18°C).",
        "immediate_safe_steps": [
            "Once symptoms appear in spring, chemical sprays are INEFFECTIVE for current season.",
            "Thin excess fruit to reduce tree stress; apply light nitrogen to support second flush of leaves."
        ],
        "treatment_options": [
            "Dormant Season Treatment (Mandatory): Spray Copper Oxychloride 50 WP (3g/L) or Chlorothalonil (2.5g/L) or Lime Sulfur once in autumn after 90% leaf fall and once in late winter before bud swell."
        ],
        "prevention": ["A single dormant spray in late winter before bud break provides 100% control; plant curl-resistant varieties (e.g. Frost, Avalon)."],
        "expert_warning": "Sprays must be applied BEFORE bud swell; applications after green tip will not control leaf curl.",
        "extension_reference": "ICAR-CITH Temperate Fruit Advisory."
    },
    "plum leaf": {
        "common_name": "Healthy Plum Leaf",
        "scientific_name": "Prunus domestica",
        "crop": "Plum (Prunus domestica)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Oval, finely serrated green leaves without bladdery fruit enlargement or bacterial shot-holes."],
        "symptoms_ta": ["ஆரோக்கியமான பிளம் இலை."],
        "causes": "Adequate winter chilling and proper orchard sanitation.",
        "immediate_safe_steps": ["Maintain regular orchard scouting."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Prune dead twigs during dormancy."],
        "expert_warning": "No action needed.",
        "extension_reference": "Stone Fruit Management Guidelines."
    },
    "plum pocket disease": {
        "common_name": "Plum Pockets (Bladder Plum)",
        "scientific_name": "Taphrina pruni",
        "crop": "Plum (Prunus domestica)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Young plum fruits become abnormally enlarged, spongy, hollow, bladder-like, and deformed without a stone/pit.",
            "Young leaves and shoots become thickened, curled, and distorted similar to peach leaf curl."
        ],
        "symptoms_ta": ["பிளம் பழங்கள் வீங்கி, கொட்டை இல்லாமல் வெற்றுப் பைகளாக மாறுதல் (பிளம் பாக்கெட் நோய்)."],
        "causes": "Taphrina fungus overwintering on twig scales, infecting young blossoms during cool wet spring weather.",
        "immediate_safe_steps": ["Hand-pick and burn deformed bladder fruits before white fungal spores develop."],
        "treatment_options": [
            "Dormant Spray: Apply Bordeaux mixture 1% or Copper Oxychloride 50 WP (3g/L) in late winter before bud break."
        ],
        "prevention": ["Prune out and destroy infected twig shoots during winter dormancy."],
        "expert_warning": "Dormant copper application is mandatory; sprays after flowering are completely ineffective.",
        "extension_reference": "ICAR-CITH Stone Fruit Pathology."
    },

    # 21. POTATO
    "potato early blight": {
        "common_name": "Potato Early Blight",
        "scientific_name": "Alternaria solani",
        "crop": "Potato (Solanum tuberosum)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Dark brown to black circular lesions with distinct concentric ridges ('target board' pattern) on older lower leaves.",
            "Lesions surrounded by a narrow chlorotic halo; foliage dries up and drops, exposing tubers."
        ],
        "symptoms_ta": ["உருளைக்கிழங்கு இலைகளில் வளைய வடிவிலான பழுப்பு நிற கருகல் புள்ளிகள் (Early Blight)."],
        "causes": "Alternaria solani fungus surviving in solanaceous plant debris and soil; favored by alternating wet and dry weather (24-30°C).",
        "immediate_safe_steps": ["Avoid overhead sprinkler irrigation; rogue out severely infected lower foliage."],
        "treatment_options": [
            "Foliar Spray: Apply Mancozeb 75 WP (2g/L) or Chlorothalonil 75 WP (2g/L) at first spot appearance.",
            "Systemic Fungicide: Apply Difenoconazole 25 EC (0.5ml/L) or Azoxystrobin (1ml/L) at 10-day intervals.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Plant certified disease-free seed tubers; follow 3-year rotation with non-solanaceous crops."],
        "expert_warning": "Maintain balanced nitrogen; early blight attacks stressed and nitrogen-deficient plants aggressively.",
        "extension_reference": "ICAR-Central Potato Research Institute (CPRI), Shimla."
    },
    "potato late blight": {
        "common_name": "Potato Late Blight",
        "scientific_name": "Phytophthora infestans",
        "crop": "Potato (Solanum tuberosum)",
        "category": "Oomycete",
        "is_healthy": False,
        "symptoms": [
            "Water-soaked dark brownish-black lesions rapidly expanding across leaf tips and margins.",
            "Delicate white fungal mold (sporangiophores) visible on the underside of lesions during cool, humid, foggy weather.",
            "Stems develop water-soaked black lesions; tubers develop dry brownish-purple rot under skin."
        ],
        "symptoms_ta": ["உருளைக்கிழங்கு இலையில் நீர் ஊறிய கரும்பழுப்பு அழுகல் புள்ளிகள் மற்றும் அடியில் வெண்மையான பூசணம் (Late Blight)."],
        "causes": "Destructive oomycete pathogen Phytophthora infestans spreading rapidly when relative humidity > 90% and temperatures are 12-22°C.",
        "immediate_safe_steps": [
            "Act within 24 hours of first symptom detection; late blight can destroy an entire field in 5 days.",
            "Hill up soil well around tuber beds to prevent sporangia from washing down into potato tubers."
        ],
        "treatment_options": [
            "Preventive Spray (Pre-disease): Mancozeb 75 WP (2.5g/L) or Copper Oxychloride 50 WP (2.5g/L).",
            "Curative Spray (Post-infection): Metalaxyl + Mancozeb (Ridomil Gold @ 2.5g/L) or Cymoxanil + Mancozeb (Sectotin @ 2g/L) or Dimethomorph (1.5g/L) at 7-day intervals."
        ],
        "prevention": ["Plant late blight resistant cultivars (e.g. Kufri Jyoti, Kufri Girdhari); use certified seed tubers."],
        "expert_warning": "CRITICAL EMERGENCY: Late blight is the most devastating disease of potato; spray immediately and report outbreak to CPRI / KVK.",
        "extension_reference": "ICAR-CPRI Shimla Late Blight Warning System & Spray Advisory."
    },
    "potato leaf": {
        "common_name": "Healthy Potato Leaf",
        "scientific_name": "Solanum tuberosum",
        "crop": "Potato (Solanum tuberosum)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Compound pinnate deep green leaves with clean margins and no water-soaked blighting or target rings."],
        "symptoms_ta": ["ஆரோக்கியமான உருளைக்கிழங்கு இலை."],
        "causes": "Optimal hilling, adequate Potash, and cool highland climate.",
        "immediate_safe_steps": ["Continue standard hilling and scouting."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Scout for late blight during foggy or rainy weather."],
        "expert_warning": "No action needed.",
        "extension_reference": "ICAR-CPRI Good Agricultural Practices for Potato."
    },

    # 22. RASPBERRY
    "raspberry leaf": {
        "common_name": "Healthy Raspberry Leaf",
        "scientific_name": "Rubus idaeus",
        "crop": "Raspberry (Rubus idaeus)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Pinnately compound green foliage with silvery pubescent undersides and no spur blight lesions."],
        "symptoms_ta": ["ஆரோக்கியமான ராஸ்பெர்ரி இலை."],
        "causes": "Well-drained acidic soil and cane trellising.",
        "immediate_safe_steps": ["Prune spent floricanes after harvest."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Keep cane rows weed-free."],
        "expert_warning": "No action needed.",
        "extension_reference": "Brambles Crop Production Guide."
    },

    # 23. RICE / PADDY
    "rice blast": {
        "common_name": "Rice Blast (Leaf Blast / Neck Blast)",
        "scientific_name": "Magnaporthe oryzae (Pyricularia oryzae)",
        "crop": "Rice / Paddy (Oryza sativa)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Spindle-shaped / diamond-shaped lesions with gray or whitish centers and reddish-brown borders on leaf blades.",
            "Neck blast: black necrotic lesion encircling the panicle base, causing the entire earhead to break and fall over ('chaffy unfilled grains').",
            "Node blast: infected stem nodes turn black and rot, causing lodging."
        ],
        "symptoms_ta": ["நெல் இலைகளில் சுழல்/வைர வடிவ பழுப்பு நிறப் புள்ளிகள் மற்றும் கதிர் கழுத்துப் பகுதியில் கருப்பு அழுகல் (குலை நோய்)."],
        "causes": "Airborne conidia favored by high relative humidity (>90%), cool night temperatures (18-24°C), and excessive nitrogen (urea) application.",
        "immediate_safe_steps": [
            "Stop top-dressing Nitrogen/Urea immediately (excess N makes tissues succulent and blast-prone).",
            "Drain standing water for 2-3 days if field is heavily waterlogged."
        ],
        "treatment_options": [
            "Foliar Spray (TNAU / ICAR): Spray Tricyclazole 75 WP (0.6g/L) or Isoprothiolane 40 EC (1.5ml/L) or Azoxystrobin (1ml/L) at tillering and boot leaf / panicle emergence stage.",
            "Organic Control: Spray Pseudomonas fluorescens (10g/L) or 10% cow dung extract."
        ],
        "prevention": ["Treat seeds with Pseudomonas fluorescens (10g/kg seed); cultivate blast-resistant varieties (e.g. CO 51, ADT 43, TPS 5)."],
        "expert_warning": "Apply Tricyclazole promptly at boot leaf emergence if leaf blast is present to prevent devastating neck blast.",
        "extension_reference": "TNAU Paddy Crop Protection Guidelines / ICAR-NRRI Cuttack."
    },
    "rice leaf": {
        "common_name": "Healthy Rice / Paddy Leaf",
        "scientific_name": "Oryza sativa",
        "crop": "Rice / Paddy (Oryza sativa)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Upright, slender, vibrant green linear leaf blades with clean margins and no blast lesions or sheath rot."],
        "symptoms_ta": ["ஆரோக்கியமான நெல் பயிர் இலை."],
        "causes": "Alternate Wetting and Drying (AWD) water management and balanced N-P-K-Zn nutrition.",
        "immediate_safe_steps": ["Maintain recommended AWD water schedule."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Apply Potash in split doses; apply Zinc sulfate (25 kg/ha) at planting."],
        "expert_warning": "No action needed.",
        "extension_reference": "ICAR-National Rice Research Institute (NRRI) Guidelines."
    },
    "rice sheath blight": {
        "common_name": "Rice Sheath Blight",
        "scientific_name": "Rhizoctonia solani",
        "crop": "Rice / Paddy (Oryza sativa)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Oval or elliptical greenish-gray water-soaked lesions with irregular brown borders on leaf sheaths near water line.",
            "Lesions coalesce, forming a 'serpentine' snake-skin banded appearance extending up to upper leaves and flag leaf."
        ],
        "symptoms_ta": ["நெல் தண்டு உறையில் பாம்புத் தோல் போன்ற ஒழுங்கற்ற சாம்பல்-பச்சை கருகல் புண்கள் (Sheath Blight)."],
        "causes": "Soil-borne sclerotia floating on irrigation water, flourishing in warm temperatures (28-32°C), high humidity, and dense planting.",
        "immediate_safe_steps": [
            "Drain field water to reduce humidity in microclimate around base.",
            "Do not apply excessive chemical nitrogen."
        ],
        "treatment_options": [
            "Foliar Spray: Apply Validamycin 3 L (2ml/L) or Hexaconazole 5 EC (2ml/L) or Thifluzamide 24 SC (0.75ml/L) directing spray to plant base/sheaths.",
            "Bio-Control: Apply Pseudomonas fluorescens (10g/L) or Trichoderma viride to root zone."
        ],
        "prevention": ["Avoid excessive seedling density; maintain 20 x 15 cm spacing; practice alleyways in paddy field."],
        "expert_warning": "Direct spray towards the lower sheaths near water level for effective disease control.",
        "extension_reference": "TNAU Rice Pathology Advisory / ICAR-NRRI."
    },

    # 24. SOYBEAN
    "soybean leaf": {
        "common_name": "Healthy Soybean Leaf",
        "scientific_name": "Glycine max",
        "crop": "Soybean (Glycine max)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Broad trifoliate deep green leaves with active Bradyrhizobium nitrogen-fixing vigor."],
        "symptoms_ta": ["ஆரோக்கியமான சோயாபீன் இலை."],
        "causes": "Proper seed inoculation and balanced phosphorus fertilization.",
        "immediate_safe_steps": ["Maintain regular weed control."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Scout for defoliating caterpillars (Spodoptera)."],
        "expert_warning": "No action needed.",
        "extension_reference": "ICAR-Indian Institute of Soybean Research (IISR), Indore."
    },

    # 25. STRAWBERRY
    "strawberry anthracnose": {
        "common_name": "Strawberry Anthracnose",
        "scientific_name": "Colletotrichum acutatum / Colletotrichum gloeosporioides",
        "crop": "Strawberry (Fragaria × ananassa)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Dark brown to black sunken circular lesions on leaf petioles and stolons (runners), causing runner wilting.",
            "Sunken round brown-to-black firm rot lesions on strawberry fruit with salmon-pink spore masses in moist air."
        ],
        "symptoms_ta": ["ஸ்ட்ராபெர்ரி இலைக்காம்புகளில் கருப்புப் பள்ளங்களும் பழங்களில் சால்மன்-இளஞ்சிவப்பு பூசண அழுகலும்."],
        "causes": "Warm rainy weather (25-30°C) with overhead water splashing conidia from plant to plant.",
        "immediate_safe_steps": ["Remove and safely destroy infected strawberry plants and rotting fruit."],
        "treatment_options": [
            "Spray Captan (2g/L) or Azoxystrobin (1ml/L) or Pyraclostrobin observing pre-harvest intervals.",
            "Organic Control: Copper Hydroxide (2g/L) during pre-bloom."
        ],
        "prevention": ["Grow strawberries on plastic mulch with drip irrigation; use certified runner plants."],
        "expert_warning": "Avoid overhead sprinkler irrigation completely during fruiting.",
        "extension_reference": "TNAU Horticultural Research Station Ooty."
    },
    "strawberry leaf": {
        "common_name": "Healthy Strawberry Leaf",
        "scientific_name": "Fragaria × ananassa",
        "crop": "Strawberry (Fragaria × ananassa)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Trifoliate glossy dark green serrated leaves with strong crown vigor and clean petioles."],
        "symptoms_ta": ["ஆரோக்கியமான ஸ்ட்ராபெர்ரி இலை."],
        "causes": "Well-drained raised beds, plastic mulch, and balanced nutrition.",
        "immediate_safe_steps": ["Maintain clean straw/plastic mulch."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Monitor for spider mites."],
        "expert_warning": "No action needed.",
        "extension_reference": "Berry Production Guide."
    },
    "strawberry leaf scorch": {
        "common_name": "Strawberry Leaf Scorch",
        "scientific_name": "Diplocarpon earlianum",
        "crop": "Strawberry (Fragaria × ananassa)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Numerous small, irregular, purple to dark reddish spots on upper leaf surfaces.",
            "Spots coalesce, turning the entire leaf purplish-brown, dry, and 'scorched' along margins as if burned."
        ],
        "symptoms_ta": ["ஸ்ட்ராபெர்ரி இலைகள் தீயில் கருகியது போன்ற பழுப்பு-ஊதா நிற கருகல் (Leaf Scorch)."],
        "causes": "Fungus overwintering in living strawberry leaves, spreading via rain droplets during wet spring weather.",
        "immediate_safe_steps": ["Remove and burn heavily scorched older leaves after harvest."],
        "treatment_options": [
            "Spray Mancozeb 75 WP (2g/L) or Myclobutanil (0.5ml/L) at crown emergence.",
            "Bio-Control: Spray Trichoderma viride (5g/L)."
        ],
        "prevention": ["Renovate strawberry beds after harvest; choose scorch-resistant cultivars."],
        "expert_warning": "Ensure adequate spacing to prevent leaf matting and humidity retention.",
        "extension_reference": "ICAR-CITH Berry Pathology."
    },

    # 26. TOBACCO
    "tobacco leaf": {
        "common_name": "Healthy Tobacco Leaf",
        "scientific_name": "Nicotiana tabacum",
        "crop": "Tobacco (Nicotiana tabacum)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Large broad thick green leaves with intact glandular trichomes and no mosaic blisters."],
        "symptoms_ta": ["ஆரோக்கியமான புகையிலை இலை."],
        "causes": "Balanced potassium and nitrogen nutrition under well-aerated light soils.",
        "immediate_safe_steps": ["Maintain regular topping and suckering."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Scout for caterpillar pests."],
        "expert_warning": "No action needed.",
        "extension_reference": "ICAR-Central Tobacco Research Institute (CTRI), Rajahmundry."
    },
    "tobacco mosaic virus": {
        "common_name": "Tobacco Mosaic Virus (TMV)",
        "scientific_name": "Tobacco mosaic tobamovirus",
        "crop": "Tobacco (Nicotiana tabacum) & Solanaceous Crops",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Mottling of leaves with alternating light green and dark green mosaic patches.",
            "Blistering, rugosity, leaf curling, and severe 'shoestring' narrowing of leaf blades.",
            "Stunted plant growth and uneven curing of harvested leaves."
        ],
        "symptoms_ta": ["புகையிலை இலையில் பச்சை மொசைக் திட்டுகள், தடித்த கொப்புளங்கள் மற்றும் இலை குறுகுதல்."],
        "causes": "Extremely stable, persistent rod-shaped virus transmitted mechanically through sap, hands, tools, and tobacco products.",
        "immediate_safe_steps": [
            "Wash hands thoroughly with soap/milk before handling plants.",
            "Rogue out and destroy infected plants immediately (do not touch healthy plants after touching infected ones)."
        ],
        "treatment_options": [
            "No chemical cure exists for viral particles.",
            "Disinfect tools and hands with 20% non-fat dry milk solution or 10% trisodium phosphate."
        ],
        "prevention": ["Plant TMV-resistant cultivars carrying the N gene; prohibit smoking/chewing tobacco in fields."],
        "expert_warning": "TMV can survive in dry plant debris and cigarettes for decades; maintain strict field hygiene.",
        "extension_reference": "ICAR-CTRI Rajahmundry TMV Management."
    },

    # 27. TOMATO
    "tomato bacterial leaf spot": {
        "common_name": "Tomato Bacterial Leaf Spot",
        "scientific_name": "Xanthomonas perforans / Xanthomonas vesicatoria",
        "crop": "Tomato (Solanum lycopersicum)",
        "category": "Bacterial",
        "is_healthy": False,
        "symptoms": [
            "Small water-soaked circular to angular lesions (1-3 mm) turning dark brown to black.",
            "Lesions surrounded by a prominent yellow chlorotic halo; centers become papery and tear.",
            "Raised scabby brown blisters on green tomato fruits."
        ],
        "symptoms_ta": ["தக்காளி இலைகளில் சிறிய நீர் ஊறிய கருப்பு புள்ளிகள் மற்றும் சுற்றிலும் மஞ்சள் வளையம்."],
        "causes": "Seed-borne bacterium spreading via rain splash, overhead irrigation, and field tools at 24-30°C.",
        "immediate_safe_steps": [
            "Never work or spray in tomato fields when leaves are wet.",
            "Prune out heavily infected lower leaves and safely destroy them."
        ],
        "treatment_options": [
            "Bactericide Spray (TNAU/ICAR): Spray Copper Oxychloride 50 WP (2.5g/L) mixed with Streptomycin Sulphate (0.5g/L) at 10-day intervals.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Hot-water treat seeds (50°C for 25 min); practice 3-year non-solanaceous crop rotation."],
        "expert_warning": "Bacterial leaf spot causes heavy defoliation and fruit sunscald if untreated.",
        "extension_reference": "TNAU / ICAR-IIHR Tomato Disease Advisory."
    },
    "tomato early blight": {
        "common_name": "Tomato Early Blight",
        "scientific_name": "Alternaria solani",
        "crop": "Tomato (Solanum lycopersicum)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Circular brown-to-black spots with concentric rings ('target board' pattern) on older lower leaves.",
            "Yellow halo surrounds each lesion; leaves wither and drop from the bottom up ('firing').",
            "Sunken dark leathery cankers on stems and fruit calyx."
        ],
        "symptoms_ta": ["தக்காளி கீழ் இலைகளில் இலக்கு பலகை போன்ற வளைய வடிவிலான பழுப்பு நிற கருகல் புள்ளிகள்."],
        "causes": "Alternaria fungus surviving in tomato debris, spreading by wind and splashing rain during alternating warm wet/dry periods (24-29°C).",
        "immediate_safe_steps": [
            "Promptly prune and burn heavily spotted lower foliage outside the field.",
            "Apply straw mulch at base to prevent soil splash onto foliage."
        ],
        "treatment_options": [
            "Foliar Spray (TNAU/ICAR): Apply Mancozeb 75 WP (2g/L) or Copper Oxychloride 50 WP (2.5g/L) at initial lesion appearance.",
            "Systemic Fungicide: Spray Difenoconazole 25 EC (0.5ml/L) or Azoxystrobin (1ml/L) at 10-12 day intervals.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L) or Trichoderma viride."
        ],
        "prevention": ["Stake tomato plants to elevate canopy; use drip irrigation at root zone; rotate crops for 3 years."],
        "expert_warning": "Maintain balanced nitrogen; early blight attacks stressed plants with low nitrogen rapidly.",
        "extension_reference": "TNAU Vegetable Pathology Guidelines / ICAR-IIHR."
    },
    "tomato late blight": {
        "common_name": "Tomato Late Blight",
        "scientific_name": "Phytophthora infestans",
        "crop": "Tomato (Solanum lycopersicum)",
        "category": "Oomycete",
        "is_healthy": False,
        "symptoms": [
            "Large, irregular, water-soaked grayish-green lesions rapidly turning dark brown to purplish-black.",
            "Delicate white cottony/downy mold on the underside of lesions during humid, foggy, or dewy mornings.",
            "Brown greasy firm rot on green tomato fruits; whole plant wilts and collapses rapidly."
        ],
        "symptoms_ta": ["தக்காளி இலைகளில் நீர் ஊறிய கரும்பழுப்பு அழுகல் புள்ளிகள் மற்றும் அடியில் வெண்மையான பூசணம்."],
        "causes": "Aggressive oomycete spreading via wind-borne sporangia during cool wet weather (12-22°C) with RH > 90%.",
        "immediate_safe_steps": [
            "Act immediately within 24 hours: late blight can destroy an entire tomato field in 3 to 5 days.",
            "Prune severely affected plants, seal in bags, and destroy outside the field."
        ],
        "treatment_options": [
            "Preventive Spray (Pre-disease): Mancozeb 75 WP (2g/L) or Copper Oxychloride 50 WP (2.5g/L).",
            "Curative Spray (Post-infection): Metalaxyl + Mancozeb (Ridomil Gold @ 2g/L) or Cymoxanil + Mancozeb (Sectotin @ 2g/L) or Dimethomorph (1.5g/L) at 7-day intervals."
        ],
        "prevention": ["Plant resistant tomato hybrids (e.g. Arka Rakshak, Arka Samrat); avoid overhead irrigation."],
        "expert_warning": "CRITICAL EMERGENCY: Late blight is the most destructive tomato disease; report outbreaks to local KVK officer immediately.",
        "extension_reference": "TNAU Tomato Pathology Advisory / ICAR-IIHR Bangalore."
    },
    "tomato leaf": {
        "common_name": "Healthy Tomato Leaf",
        "scientific_name": "Solanum lycopersicum",
        "crop": "Tomato (Solanum lycopersicum)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": ["Vibrant green compound pinnate leaves with healthy glandular trichomes, clean margins, and no spots or curling."],
        "symptoms_ta": ["ஆரோக்கியமான தக்காளி இலை."],
        "causes": "Balanced drip fertigation, proper staking, and freedom from whiteflies or fungal blights.",
        "immediate_safe_steps": ["Maintain regular trellising and sucker pruning."],
        "treatment_options": ["No treatment required."],
        "prevention": ["Install yellow sticky traps for early whitefly monitoring."],
        "expert_warning": "No action needed.",
        "extension_reference": "Good Agricultural Practices for Solanaceous Crops."
    },
    "tomato leaf mold": {
        "common_name": "Tomato Leaf Mold",
        "scientific_name": "Passalora fulva (Cladosporium fulvum)",
        "crop": "Tomato (Solanum lycopersicum)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Pale yellow to chlorotic spots with indefinite borders on upper leaf surface.",
            "Dense olive-green to brownish velvety fungal spore carpet covering the underside of the yellow spots.",
            "Leaves curl, wither, and drop prematurely in greenhouses and polyhouses."
        ],
        "symptoms_ta": ["தக்காளி இலையின் மேல் பகுதியில் மஞ்சள் புள்ளிகளும் அடியில் ஆலிவ்-பச்சை வெல்வெட் பூசணமும் தோன்றுதல்."],
        "causes": "High humidity (relative humidity > 85%) and warm temperatures (21-24°C) in poorly ventilated greenhouses/polyhouses.",
        "immediate_safe_steps": [
            "Increase greenhouse ventilation and air circulation with exhaust fans.",
            "Avoid overhead watering and lower greenhouse relative humidity below 80%."
        ],
        "treatment_options": [
            "Spray Copper Oxychloride 50 WP (2.5g/L) or Mancozeb (2g/L) or Chlorothalonil (2g/L) at 7-10 day intervals.",
            "Bio-Control: Spray Trichoderma harzianum or Bacillus subtilis."
        ],
        "prevention": ["Grow leaf-mold resistant tomato hybrids; space plants adequately."],
        "expert_warning": "Ensure adequate air movement at ground level in polyhouses.",
        "extension_reference": "TNAU Polyhouse Vegetable Advisory."
    },
    "tomato mosaic virus": {
        "common_name": "Tomato Mosaic Virus (ToMV)",
        "scientific_name": "Tomato mosaic tobamovirus",
        "crop": "Tomato (Solanum lycopersicum)",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Light and dark green mosaic pattern and mottling on foliage.",
            "Distorted, blistered leaves; severe narrowing ('fern leaf' / shoestring appearance).",
            "Internal brown necrotic rings inside tomato fruit walls ('brown wall')."
        ],
        "symptoms_ta": ["தக்காளி இலையில் வெளிர் மற்றும் அடர் பச்சை மொசைக் திட்டுகள் மற்றும் இலை சுருங்குதல்."],
        "causes": "Tobamovirus transmitted mechanically via contaminated hands, tools, stakes, and infected seed coat.",
        "immediate_safe_steps": [
            "Rogue out and burn infected plants immediately.",
            "Wash hands and dip tools in 20% non-fat dry milk solution before working with healthy plants."
        ],
        "treatment_options": [
            "No chemical cure exists for viral infection.",
            "Sterilize stakes and cages with 10% bleach before reuse."
        ],
        "prevention": ["Sow certified ToMV-resistant seed (varieties with Tm-2 or Tm-2^2 resistance gene); avoid tobacco use near plants."],
        "expert_warning": "Do not touch healthy plants after touching infected ones.",
        "extension_reference": "ICAR-IIHR Tomato Virology."
    },
    "tomato septoria leaf spot": {
        "common_name": "Tomato Septoria Leaf Spot",
        "scientific_name": "Septoria lycopersici",
        "crop": "Tomato (Solanum lycopersicum)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Numerous small, circular spots (2-3 mm) with sunken ash-gray centers and dark brown margins.",
            "Tiny black specks (pycnidia) clearly visible inside the gray centers with a hand lens.",
            "Leaves turn yellow and drop prematurely, progressing upwards from the base."
        ],
        "symptoms_ta": ["தக்காளி இலைகளில் சாம்பல் நிற மையமும் பழுப்பு விளிம்பும் கொண்ட சிறிய வட்டப் புள்ளிகள் (Septoria)."],
        "causes": "Septoria fungus overwintering in solanaceous weed debris; spread by splashing rain in warm wet weather (20-25°C).",
        "immediate_safe_steps": [
            "Prune infected lower foliage immediately.",
            "Mulch bed with straw to prevent soil-borne spore splashing."
        ],
        "treatment_options": [
            "Foliar Spray: Apply Mancozeb 75 WP (2g/L) or Copper Oxychloride (2.5g/L) or Chlorothalonil (2g/L) at 7-10 day intervals.",
            "Bio-Control: Spray Pseudomonas fluorescens (10g/L)."
        ],
        "prevention": ["Practice 3-year crop rotation; avoid overhead irrigation; stake plants."],
        "expert_warning": "Distinguish from early blight by gray center and presence of black pycnidia specks.",
        "extension_reference": "TNAU Tomato Pathology Advisory."
    },
    "tomato yellow leaf curl virus": {
        "common_name": "Tomato Yellow Leaf Curl Virus (TYLCV)",
        "scientific_name": "Tomato yellow leaf curl begomovirus (TYLCV)",
        "crop": "Tomato (Solanum lycopersicum)",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Severe upward curling and rolling of leaf margins into a cup-like shape.",
            "Marked chlorosis and pale yellowing of leaf borders while veins remain green.",
            "Severe stunting of plant growth with bushy appearance ('bonsai' effect); flowers drop and fruit set ceases completely."
        ],
        "symptoms_ta": ["தக்காளி இலைகள் மேல்நோக்கி சுருண்டு, விளிம்புகள் மஞ்சளாகி, செடி வளர்ச்சி குன்றி பூக்கள் உதிர்தல் (மஞ்சள் சுருள் நோய்)."],
        "causes": "Begomovirus transmitted persistently by the Silverleaf Whitefly (Bemisia tabaci); favored by hot dry weather.",
        "immediate_safe_steps": [
            "Rogue out and bury virus-infected plants immediately to prevent vectors feeding on them.",
            "Erect 12-15 Yellow Sticky Traps per acre to trap adult whiteflies."
        ],
        "treatment_options": [
            "Vector Control (Whitefly): Spray Neem Seed Kernel Extract (NSKE 5%) or 1% Neem Oil with liquid soap.",
            "University Chemical Recommendation: Spray Imidacloprid 17.8 SL (0.3ml/L) or Thiamethoxam 25 WG (0.2g/L) or Diafenthiuron 50 WP (1g/L) as per university guidance.",
            "Cover young nursery beds with 40-mesh insect-proof netting for 25-30 days."
        ],
        "prevention": ["Plant TYLCV-resistant tomato hybrids (e.g. Arka Rakshak, Arka Samrat, US 440); grow border barrier crops of Maize or Sorghum (3 rows) around tomato field."],
        "expert_warning": "Control whiteflies starting from nursery stage; late vector sprays cannot reverse viral stunting.",
        "extension_reference": "TNAU / ICAR-IIHR Tomato Yellow Leaf Curl Management Protocol."
    }
}

def generate_knowledge_base_file():
    with open("data/plantwild/plantwild/classes.txt", "r", encoding="utf-8") as f:
        all_classes = [l.strip().split(maxsplit=1)[1] for l in f if l.strip()]

    print(f"Total classes in classes.txt: {len(all_classes)}")
    print(f"Verified registry entries: {len(REGISTRY)}")

    missing = set(all_classes) - set(REGISTRY.keys())
    if missing:
        print(f"CRITICAL: {len(missing)} classes missing from registry! {missing}")
        return False

    # Save to JSON
    json_path = "ai_service/models/knowledge_base.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(REGISTRY, f, indent=2, ensure_ascii=False)
    print(f"[SUCCESS] Wrote JSON knowledge base to {json_path}")

    code = '''"""
knowledge_base.py
Comprehensive Agricultural Knowledge Base for All 89 PlantWild Classes.
Contains verified botanical species, pathogen etiology, bilingual symptoms (English + Tamil),
immediate safe cultural measures, and evidence-based treatment protocols aligned with
ICAR and Tamil Nadu Agricultural University (TNAU) guidelines.
"""

import os
import json

_JSON_PATH = os.path.join(os.path.dirname(__file__), "models", "knowledge_base.json")
if os.path.exists(_JSON_PATH):
    with open(_JSON_PATH, "r", encoding="utf-8") as _f:
        KNOWLEDGE_BASE = json.load(_f)
else:
    KNOWLEDGE_BASE = {}

# Backward compatibility alias
PLANT_DISEASE_KNOWLEDGE = KNOWLEDGE_BASE


def get_disease_info(class_name: str) -> dict:
    """
    Retrieve verified knowledge base record for a given class name.
    """
    norm = (class_name or "").strip().lower()
    if norm in KNOWLEDGE_BASE:
        return KNOWLEDGE_BASE[norm]

    # Dynamic fallback for novel or modified class query
    is_healthy = "leaf" in norm and not any(k in norm for k in ["spot", "blight", "rot", "virus", "rust", "scab", "mold", "mildew", "curl", "canker"])
    return {
        "common_name": norm.title(),
        "scientific_name": f"{norm.title()} pathogen",
        "crop": norm.split()[0].title(),
        "category": "Healthy" if is_healthy else "Disease",
        "is_healthy": is_healthy,
        "symptoms": [f"Visual characteristics typical of {norm}."],
        "symptoms_ta": [f"{norm} தொடர்பான அறிகுறிகள்."],
        "causes": "Environmental factors and pathogen interaction.",
        "immediate_safe_steps": ["Inspect affected plants and isolate from healthy foliage."],
        "treatment_options": ["Consult local agricultural university extension guidelines."],
        "prevention": ["Practice standard crop rotation and clean field hygiene."],
        "expert_warning": "Consult a local agricultural extension officer or KVK specialist.",
        "extension_reference": "ICAR / State Agricultural University Extension Guidelines."
    }
'''

    with open("ai_service/knowledge_base.py", "w", encoding="utf-8") as f:
        f.write(code)

    print(f"[SUCCESS] Successfully wrote comprehensive knowledge base covering all {len(REGISTRY)} classes to ai_service/knowledge_base.py!")
    return True

if __name__ == "__main__":
    generate_knowledge_base_file()
