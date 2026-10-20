"""
knowledge_base.py
Verified Agricultural Knowledge Base for Plant Disease Diagnosis.
Provides factual descriptions, symptoms, etiology, cultural prevention,
and university-extension aligned recovery guidelines.
"""

KNOWLEDGE_BASE = {
    "apple black rot": {
        "common_name": "Apple Black Rot (Frog-Eye Leaf Spot)",
        "scientific_name": "Botryosphaeria obtusa (Physalospora obtusa)",
        "crop": "Apple (Malus domestica)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small purple spots on leaves expanding into circular lesions with light brown centers and dark purple borders ('frog-eye' appearance).",
            "Mummified black shriveled fruits hanging on branches.",
            "Sunken reddish-brown cankers on bark and branch crotches."
        ],
        "symptoms_ta": [
            "இலைகளில் வெளிர் பழுப்பு நிற மையமும் அடர் ஊதா நிற விளிம்பும் கொண்ட தவளைக் கண் போன்ற புள்ளிகள்.",
            "மரக் கிளைகளில் உலர்ந்த கருப்பு நிற கனி அழுகல்.",
            "மரப்பட்டைகளில் பள்ளமான பழுப்பு நிறப் புண்கள்."
        ],
        "causes": (
            "Fungal pathogen Botryosphaeria obtusa overwinters in dead wood, mummified fruits, "
            "and cankered twigs. Ascospores and conidia spread via splashing rain and wind during warm, humid spring weather."
        ),
        "prevention": [
            "Prune out dead, damaged, and cankered wood during winter dormancy.",
            "Remove and destroy all mummified fruits from trees and orchard floor.",
            "Prune tree canopy to maximize interior sunlight penetration and air movement."
        ],
        "recovery_steps": [
            "Sanitation: Collect and burn infected plant tissue outside the orchard perimeter.",
            "Fungicide Protocol: Apply protective sprays (Captan 50 WP @ 2.5g/L or Mancozeb 75 WP @ 2g/L) starting from tight cluster stage through petal fall.",
            "Organic Option: Copper hydroxide spray during delayed dormant to pre-bloom stages.",
            "Avoid overhead sprinkler irrigation to minimize prolonged leaf wetness duration."
        ],
        "extension_reference": "ICAR-CITH / University Agricultural Extension Fruit Pathology Guide."
    },

    "apple leaf": {
        "common_name": "Healthy Apple Leaf",
        "scientific_name": "Malus domestica",
        "crop": "Apple (Malus domestica)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": [
            "Uniform vibrant green leaf blade without chlorosis or necrosis.",
            "Intact leaf margins and well-defined vein structure.",
            "No fungal pustules, mosaic mottling, or insect injury."
        ],
        "symptoms_ta": [
            "எந்தவித புள்ளிகளும் இல்லாமல் பசுமையான ஆரோக்கியமான இலை அமைப்பு.",
            "சீரான நரம்பு அமைப்பு மற்றும் இயற்கை பளபளப்பு.",
            "பூஞ்சை அல்லது வைரஸ் தொற்று அற்ற தூய இலை."
        ],
        "causes": "Normal, healthy physiological plant condition under balanced nutrient and water management.",
        "prevention": [
            "Maintain balanced N-P-K fertilization based on annual soil tests.",
            "Scout orchards weekly during critical phenological growth stages.",
            "Ensure adequate root-zone drainage to prevent root hypoxia."
        ],
        "recovery_steps": [
            "No chemical treatment or intervention required.",
            "Continue standard orchard maintenance, weed suppression, and seasonal irrigation.",
            "Apply well-rotted organic compost or farmyard manure annually."
        ],
        "extension_reference": "Good Agricultural Practices (GAP) for Deciduous Fruit Orchards."
    },

    "apple mosaic virus": {
        "common_name": "Apple Mosaic Virus (ApMV)",
        "scientific_name": "Apple mosaic ilarvirus (ApMV)",
        "crop": "Apple (Malus domestica)",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Distinct cream-to-bright yellow patches, bands, and rings along leaf veins.",
            "Leaves developing in early spring show prominent mosaic patterns, while summer leaves may appear symptomless.",
            "Severe infections can lead to premature leaf chlorosis and moderate tree stunting."
        ],
        "symptoms_ta": [
            "இலை நரம்புகளில் வெளிர் மஞ்சள் நிறக் கோடுகள் மற்றும் மோசைக் வடிவ அமைப்புகள்.",
            "இலைகள் விரைவாக மஞ்சளாகி உதிர்தல்.",
            "செடியின் வளர்ச்சி குறைதல் மற்றும் மகசூல் பாதிப்பு."
        ],
        "causes": (
            "Caused by Apple mosaic ilarvirus (ApMV). Transmitted primarily through infected vegetative propagating material, "
            "budwood grafting, and natural root grafting between closely planted trees. Not insect-transmitted."
        ),
        "prevention": [
            "Plant exclusively certified virus-tested, indexed budwood and nursery rootstocks.",
            "Sterilize pruning shears and grafting knives in 10% sodium hypochlorite solution between cuts.",
            "Quarantine and verify new planting material before introducing into commercial orchards."
        ],
        "recovery_steps": [
            "No chemical cure exists for viral plant infections.",
            "Rogue out and destroy severely debilitated young trees to prevent root-graft transmission.",
            "Support mature trees with balanced micro-nutrients (Zinc, Boron, Magnesium) and stress management.",
            "Do not harvest scionwood or budwood from infected trees for vegetative propagation."
        ],
        "extension_reference": "USDA-ARS / European and Mediterranean Plant Protection Organization (EPPO)."
    },

    "apple rust": {
        "common_name": "Cedar-Apple Rust",
        "scientific_name": "Gymnosporangium juniperi-virginianae",
        "crop": "Apple (Malus domestica)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Bright orange-yellow circular spots on upper leaf surface, later developing dark central dots.",
            "Underside of leaves develops raised orange blisters with tube-like spore-producing aecia.",
            "Severe foliar infection triggers premature leaf drop and fruit spotting."
        ],
        "symptoms_ta": [
            "இலையின் மேல் பரப்பில் பளிச்சென்ற மஞ்சள்-ஆரஞ்சு நிற துரு போன்ற வட்டப் புள்ளிகள்.",
            "இலையின் கீழ்ப்பரப்பில் சிறிய குழல் போன்ற வித்து அமைப்புகள்.",
            "கடுமையான பாதிப்பில் இலைகள் முன்கூட்டியே உதிர்தல்."
        ],
        "causes": (
            "Heteroecious fungus Gymnosporangium juniperi-virginianae requiring two alternating hosts: "
            "Apple (Malus) and Juniper/Red Cedar (Juniperus). Spring rains trigger gelatinous telial horns on cedar galls that release basidiospores carried by wind to apple leaves."
        ),
        "prevention": [
            "Plant rust-resistant apple cultivars such as Freedom, Liberty, or Enterprise.",
            "Remove wild red cedar and ornamental junipers within 1 to 2 km of commercial orchards where feasible.",
            "Prune galls from nearby ornamental junipers during late winter before gelatinous horns emerge."
        ],
        "recovery_steps": [
            "Apply protective fungicides (Mancozeb 75 WP @ 2g/L or Myclobutanil 10 WP @ 0.5g/L) starting at pink bud through petal fall.",
            "Time spray applications to coincide with wet spring periods when temperature is between 12°C and 24°C.",
            "Organic Control: Sulfur-based protective sprays applied prior to anticipated rain events.",
            "Maintain canopy aeration to shorten leaf wetness periods."
        ],
        "extension_reference": "Cornell Cooperative Extension Tree Fruit Pathology / TNAU Agri-Portal."
    },

    "apple scab": {
        "common_name": "Apple Scab",
        "scientific_name": "Venturia inaequalis",
        "crop": "Apple (Malus domestica)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Olive-green to dull olive-black velvety spots with diffuse, feathery margins on both leaf surfaces.",
            "Lesions become thicker, raised, and corky (scabby) as leaves mature.",
            "Infected leaves curl, pucker, turn yellow, and drop prematurely.",
            "Dark, corky scabs on fruit causing surface cracking and distortion."
        ],
        "symptoms_ta": [
            "இலைகளின் இருபுறமும் ஆலிவ்-பச்சை நிற வெல்வெட் போன்ற அடர் புள்ளிகள்.",
            "இலைகள் சுருங்கி, மஞ்சள் நிறமாகி உதிர்தல்.",
            "கனிகளில் கடினமான சொறி போன்ற கரும்புள்ளிகள் மற்றும் வெடிப்புகள்."
        ],
        "causes": (
            "Ascomycete fungus Venturia inaequalis. The fungus overwinters in dead fallen leaves on the orchard floor. "
            "Spring rains cause mature pseudothecia to violently discharge ascospores into the air, initiating primary leaf infection."
        ),
        "prevention": [
            "Plant scab-resistant cultivars (e.g., Prima, Priscilla, Liberty, Florina).",
            "Shred fallen leaves with a flail mower in autumn or apply 5% agricultural urea spray to accelerate leaf breakdown.",
            "Prune trees annually to maintain open framework allowing rapid foliar drying after rain."
        ],
        "recovery_steps": [
            "Protective Fungicide Program: Spray Captan 50 WP (2.5g/L) or Mancozeb 75 WP (2g/L) at green tip, pink bud, and petal fall.",
            "Curative / Systemic Action: Apply Difenoconazole 25 EC (0.5ml/L) or Dodine 65 WP within 72 hours of an infection period.",
            "Organic Management: Liquid lime sulfur or wettable sulfur (3g/L) applied proactively before rain.",
            "Do not allow standing water or dense weed growth under tree drip lines."
        ],
        "extension_reference": "ICAR-Central Institute of Temperate Horticulture (CITH) Scab Management Protocol."
    },

    "banana leaf": {
        "common_name": "Healthy Banana Leaf",
        "scientific_name": "Musa acuminata / Musa balbisiana",
        "crop": "Banana (Musa spp.)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": [
            "Broad, vigorous deep green leaf blades with uniform parallel venation.",
            "Stout, intact midrib supporting expansive healthy leaf lamina.",
            "Absence of chlorotic streaks, sigatoka necrosis, or marginal scorching."
        ],
        "symptoms_ta": [
            "ஆரோக்கியமான அடர் பச்சை நிற வாழை இலை அமைப்பு.",
            "நரம்புகள் மற்றும் மையத் தண்டு சீராக இருத்தல்.",
            "சிகடோகா புள்ளிகளோ அல்லது ஓரக் கருகலோ இல்லாத தூய இலை."
        ],
        "causes": "Optimal vegetative health achieved under proper irrigation, drainage, and potassium nutrition.",
        "prevention": [
            "Maintain generous Potassium (Muriate of Potash) nutrition essential for banana pseudostem and leaf vigor.",
            "Desucker routinely to leave only the mother plant and one healthy follower sucker.",
            "Ensure effective drainage channels; banana roots are sensitive to water stagnation."
        ],
        "recovery_steps": [
            "No chemical treatment required.",
            "Provide 25 to 35 liters of water per plant per day via drip irrigation during hot seasons.",
            "Apply mulch (paddy straw or dried banana leaves) around basin to conserve moisture and suppress weeds.",
            "Conduct routine bi-weekly field inspection for early leaf spot detection."
        ],
        "extension_reference": "ICAR-National Research Centre for Banana (NRCB), Tiruchirappalli, Tamil Nadu."
    },

    "bean rust": {
        "common_name": "Common Bean Rust (பீன்ஸ் துரு நோய்)",
        "scientific_name": "Uromyces appendiculatus (Uromyces phaseoli)",
        "crop": "Common Bean (Phaseolus vulgaris)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small, reddish-brown circular powdery pustules (uredinia) on upper and lower leaf surfaces.",
            "Pustules surrounded by a prominent pale yellow-green chlorotic halo.",
            "Severe infection causes extensive chlorosis, premature defoliation, and reduced pod set."
        ],
        "symptoms_ta": [
            "இலையின் மேல் மற்றும் கீழ் பரப்புகளில் செம்பழுப்பு நிறத் தூள் போன்ற துருப் புள்ளிகள்.",
            "புள்ளிகளைச் சுற்றி வெளிர் மஞ்சள் வளையம் தோன்றுதல்.",
            "தீவிர பாதிப்பில் இலைகள் முன்கூட்டியே உதிர்ந்து காய்களின் எண்ணிக்கை குறைதல்."
        ],
        "causes": (
            "Fungal pathogen Uromyces appendiculatus surviving on crop residue. "
            "Disease development is triggered by prolonged leaf wetness (>10 hours) and moderate temperatures (17-24°C)."
        ),
        "prevention": [
            "Plant rust-resistant bean cultivars.",
            "Destroy or bury infected crop residue immediately after harvest.",
            "Avoid dense planting; maintain 30x10 cm spacing for good canopy airflow.",
            "Practice crop rotation with non-legume crops for at least 2 years."
        ],
        "recovery_steps": [
            "Foliar Spray: Spray Wettable Sulfur (2g/L) or Mancozeb 75 WP (2g/L) at first symptom appearance.",
            "Systemic Option: Apply Azoxystrobin 23 SC (1ml/L) or Difenoconazole 25 EC (0.5ml/L) under severe rust pressure.",
            "Avoid overhead sprinkler irrigation; switch to drip irrigation at root zone."
        ],
        "extension_reference": "TNAU Agritech Portal / ICAR-IIPR Pulses Pathology Advisory."
    },

    "bean halo blight": {
        "common_name": "Bean Halo Blight (பீன்ஸ் ஒளிவட்டக் கருகல் நோய்)",
        "scientific_name": "Pseudomonas syringae pv. phaseolicola",
        "crop": "Common Bean (Phaseolus vulgaris)",
        "category": "Bacterial",
        "is_healthy": False,
        "symptoms": [
            "Small water-soaked pinprick spots on leaves that turn brown, surrounded by a broad greenish-yellow halo.",
            "Systemic chlorosis with yellowing of new foliage and stunting.",
            "Greasy, water-soaked pods producing cream-colored bacterial exudate."
        ],
        "symptoms_ta": [
            "இலைகளில் நீர் ஊறிய பழுப்பு நிறப் புள்ளிகள் மற்றும் அதைச் சுற்றி அகன்ற மஞ்சள் ஒளிவளையம்.",
            "செடிகள் வளர்ச்சி குன்றி புதிய தளிர்கள் மஞ்சளாதல்.",
            "காய்களில் பளபளப்பான நீர் ஊறிய புண்கள் மற்றும் திரவம் வடிதல்."
        ],
        "causes": (
            "Seed-borne bacterial pathogen Pseudomonas syringae pv. phaseolicola. "
            "Bacteria spread rapidly through rain splash, overhead irrigation, and handling wet plants."
        ),
        "prevention": [
            "Use certified disease-free, western-grown seeds.",
            "Avoid working in fields when foliage is wet from rain or dew.",
            "Rotate with non-host crops like maize, wheat, or sorghum for 2-3 years."
        ],
        "recovery_steps": [
            "Chemical Spray: Spray Copper Oxychloride (2.5g/L) combined with Streptomycin Sulphate (0.5g/L) at 10-day intervals.",
            "Rogue out and destroy severely infected bean plants outside the field.",
            "Do not compost infected plant debris."
        ],
        "extension_reference": "ICAR-IIPR / University Agricultural Extension Bacterial Pathology Guide."
    },

    "bean mosaic virus": {
        "common_name": "Bean Common Mosaic Virus - BCMV (பீன்ஸ் தேமல் வைரஸ் நோய்)",
        "scientific_name": "Bean common mosaic virus (Potyvirus)",
        "crop": "Common Bean (Phaseolus vulgaris)",
        "category": "Viral",
        "is_healthy": False,
        "symptoms": [
            "Prominent mosaic pattern of alternating light green and dark green patches on leaves.",
            "Puckering, blistering, and downward cupping of leaf margins.",
            "Stunted plant growth with deformed, undersized bean pods."
        ],
        "symptoms_ta": [
            "இலைகளில் வெளிர் பச்சை மற்றும் அடர் பச்சை நிற தேமல் புள்ளிகள் மாறி மாறி தோன்றுதல்.",
            "இலைகள் சுருங்கி குமிழ் போல மேல்நோக்கி அல்லது கீழ்நோக்கி வளைதல்.",
            "செடி வளர்ச்சி குன்றி, காய்கள் சுருங்கி சிறுத்து போதல்."
        ],
        "causes": (
            "Potyvirus transmitted primarily through infected seeds and vectored by aphids "
            "(Aphis fabae, Myzus persicae) in a non-persistent manner."
        ),
        "prevention": [
            "Sow only certified virus-free seeds with genetic resistance (I gene).",
            "Install Yellow Sticky Traps (12-15/acre) to monitor and trap winged aphids.",
            "Control aphid vectors using organic Neem Seed Kernel Extract (NSKE 5%)."
        ],
        "recovery_steps": [
            "No curative chemical spray exists for plant viral infections.",
            "Immediately rogue out and burn infected bean plants to arrest aphid transmission.",
            "Vector Management: Spray Dimethoate 30 EC (1.5ml/L) or Imidacloprid 17.8 SL (0.3ml/L) to control aphid populations."
        ],
        "extension_reference": "ICAR-Indian Institute of Pulses Research (IIPR) / TNAU Crop Protection."
    },

    "bean leaf": {
        "common_name": "Healthy Bean Leaf (ஆரோக்கியமான பீன்ஸ் இலை)",
        "scientific_name": "Phaseolus vulgaris",
        "crop": "Common Bean (Phaseolus vulgaris)",
        "category": "Healthy",
        "is_healthy": True,
        "symptoms": [
            "Trifoliate leaves with uniform rich green coloration and supple texture.",
            "Smooth leaf margins free of chlorotic rings, necrosis, or mosaic puckering.",
            "Active vegetative growth with normal petiole elongation."
        ],
        "symptoms_ta": [
            "மூன்று சிற்றிலைகள் கொண்ட சீரான அடர் பச்சை நிற ஆரோக்கியமான இலை அமைப்பு.",
            "மஞ்சள் வளையங்களோ அல்லது துருப் புள்ளிகளோ இல்லாத தூய இலை.",
            "செழிப்பான நரம்பு அமைப்பு மற்றும் இயல்பான வளர்ச்சி."
        ],
        "causes": "Optimal physiological plant health under proper Rhizobium nodulation and balanced nutrition.",
        "prevention": [
            "Inoculate seeds with Rhizobium leguminosarum culture before sowing to enhance natural nitrogen fixation.",
            "Maintain balanced basal fertilizer with adequate Phosphorus (DAP/SSP) and Potash.",
            "Avoid waterlogging; ensure light and frequent irrigation."
        ],
        "recovery_steps": [
            "No chemical treatment required.",
            "Continue regular field inspection and weed management.",
            "Support climbing bean varieties with sturdy trellis or stakes."
        ],
        "extension_reference": "TNAU Agritech Portal / ICAR Pulses Division."
    },

    "cabbage alternaria leaf spot": {
        "common_name": "Cabbage / Cauliflower Alternaria Leaf Spot (முட்டைகோஸ் / காலிஃபிளவர் இலைப்புள்ளி நோய்)",
        "scientific_name": "Alternaria brassicae / Alternaria brassicicola",
        "crop": "Brassica oleracea (Cabbage / Cauliflower)",
        "category": "Fungal",
        "is_healthy": False,
        "symptoms": [
            "Small circular dark brown to black spots enlarging with prominent concentric target-like rings.",
            "Shot-hole appearance as dead central tissue drops out.",
            "Black velvety fungal spores visible under humid conditions."
        ],
        "symptoms_ta": [
            "இலைகளில் வட்ட வடிவில் ஒன்றுக்குள் ஒன்றான வளையங்கள் கொண்ட கருப்பு நிறப் புள்ளிகள்.",
            "மையப் பகுதி காய்ந்து உதிர்ந்து ஓட்டைகள் ஏற்படுதல்.",
            "ஈரப்பதமான சூழலில் கருப்பு நிற பூசண வளர்ச்சி."
        ],
        "causes": "Fungal pathogen Alternaria brassicae favored by cool to moderate temperatures and high humidity.",
        "prevention": [
            "Use hot-water treated seeds (50°C for 25 minutes) to eradicate seed-borne inoculum.",
            "Follow 3-year crop rotation with non-cruciferous crops."
        ],
        "recovery_steps": [
            "Foliar Spray: Spray Mancozeb 75 WP (2g/L) or Copper Oxychloride 50 WP (2.5g/L) at 10-day intervals.",
            "Organic Treatment: Spray Pseudomonas fluorescens (10g/L) or Neem oil 3%."
        ],
        "extension_reference": "ICAR-Indian Institute of Horticultural Research (IIHR) / TNAU Vegetable Pathology."
    }
}

# Fallback template for any class outside the primary on-disk classes
GENERIC_HEALTHY_TEMPLATE = {
    "category": "Healthy",
    "is_healthy": True,
    "causes": "Healthy plant vegetative state under balanced environmental and nutritional conditions.",
    "prevention": [
        "Follow recommended crop spacing and crop rotation practices.",
        "Perform regular scouting and balanced fertilizer applications based on soil health cards."
    ],
    "recovery_steps": [
        "No chemical intervention required.",
        "Maintain routine irrigation schedule and regular crop monitoring."
    ],
    "extension_reference": "Verified Agricultural University Extension Advisory."
}

GENERIC_DISEASE_TEMPLATE = {
    "category": "Disease",
    "is_healthy": False,
    "causes": "Pathogen infection influenced by favorable environmental factors (moisture, temperature).",
    "prevention": [
        "Use certified disease-free seed and resistant varieties where available.",
        "Remove and safely dispose of infected crop residues outside the cultivation area."
    ],
    "recovery_steps": [
        "Isolate and prune infected plant tissue to prevent secondary field spread.",
        "Consult local Krishi Vigyan Kendra (KVK) or agricultural extension officer for site-specific treatment."
    ],
    "extension_reference": "ICAR / State Agricultural University Extension Guidelines."
}


def get_disease_info(class_name: str) -> dict:
    """
    Retrieve verified knowledge base record for a given class name.
    """
    norm = class_name.strip().lower()
    if norm in KNOWLEDGE_BASE:
        return KNOWLEDGE_BASE[norm]

    # Generate structured entry for any extended class
    is_healthy = "leaf" in norm and not any(k in norm for k in ["spot", "blight", "rot", "virus", "rust", "scab", "mold", "mildew", "curl", "canker"])
    base = GENERIC_HEALTHY_TEMPLATE if is_healthy else GENERIC_DISEASE_TEMPLATE

    return {
        "common_name": norm.title(),
        "scientific_name": f"{norm.title()} pathogen",
        "crop": norm.split()[0].title(),
        "category": base["category"],
        "is_healthy": is_healthy,
        "symptoms": [f"Visual abnormalities or characteristic lesions typical of {norm}."],
        "symptoms_ta": [f"{norm} தொடர்பான அறிகுறிகள்."],
        "causes": base["causes"],
        "prevention": base["prevention"],
        "recovery_steps": base["recovery_steps"],
        "extension_reference": base["extension_reference"]
    }
