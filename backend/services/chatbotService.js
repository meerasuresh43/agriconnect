/**
 * chatbotService.js
 * Comprehensive Bilingual (Tamil + English + Tanglish) AI Farming Assistant Service
 * with Crop-Specific Grounding, Context Resolution, and Integrated Web Research.
 * 
 * Strict Guarantees:
 * 1. Crop Canonicalization & Synonyms: Extract canonical crop identity across English, Tamil script,
 *    and Tanglish (e.g. brinjal, tomato, chilli, potato, rice, cotton, banana, groundnut, bean, etc.).
 * 2. Multi-turn Context Resolution:
 *    - Explicit crop in user query triggers IMMEDIATE CROP SWITCHING (e.g. "Ippo brinjal pathi sollu").
 *    - Follow-ups (e.g. "Indha disease-ku treatment enna?") accurately inherit the active crop & disease from history.
 *    - Crop ambiguity detection: Disease queries without any crop context prompt a clarifying question.
 * 3. Crop Consistency Validation: Never return tomato advice for a brinjal inquiry.
 * 4. Image Detector Integration (Priority 3):
 *    - Connects leaf disease detection results into the chatbot conversation.
 *    - Automatically detects cross-crop discrepancies (e.g. uploaded tomato leaf, but asks about brinjal).
 * 5. Grounded in ICAR and TNAU agronomic guidelines with 4-part structured responses.
 */

const { getDb } = require('../db');
const { performWebResearch } = require('./webSearchService');

// Canonical Crop Registry
const CANONICAL_CROPS = [
  'brinjal',
  'tomato',
  'chilli',
  'potato',
  'rice',
  'cotton',
  'banana',
  'groundnut',
  'bean',
  'apple',
  'cucumber',
  'corn',
  'grape',
  'bhendi'
];

// Comprehensive Crop Synonyms & Spelling Normalization Dictionary
const CROP_SYNONYMS = {
  brinjal: [
    'brinjal', 'brinjol', 'bringal', 'eggplant', 'aubergine', 'baingan',
    'kathari', 'kathirikai', 'katharikai', 'kathirikkai', 'katharikkai', 'kattari',
    'கத்தரி', 'கத்திரிக்காய்', 'கத்தரிக்காய்', 'வழுதுணங்காய்'
  ],
  tomato: [
    'tomato', 'tomatoes', 'tamatar', 'thakkali', 'thakkalai', 'takali',
    'தக்காளி'
  ],
  chilli: [
    'chilli', 'chili', 'chillies', 'chilies', 'pepper', 'bell pepper', 'capsicum',
    'mirch', 'milagai', 'milakai', 'milaga', 'மிளகாய்', 'குடைமிளகாய்'
  ],
  potato: [
    'potato', 'potatoes', 'aloo', 'urulai', 'urulaikilangu', 'urulaikkilangu', 'urulai kilangu',
    'உருளை', 'உருளைக்கிழங்கு'
  ],
  rice: [
    'paddy', 'rice', 'chawal', 'dhan', 'nel', 'nellu', 'arisi', 'நெல்', 'அரிசி'
  ],
  cotton: [
    'cotton', 'kapas', 'paruthi', 'parutthi', 'பருத்தி'
  ],
  banana: [
    'banana', 'plantain', 'kela', 'vazhai', 'vaazhai', 'vazhaipazham', 'வாழை', 'வாழைப்பழம்'
  ],
  groundnut: [
    'groundnut', 'peanut', 'peanuts', 'mungphali', 'kadala', 'kadalai', 'verkadalai',
    'nilakkadalai', 'நிலக்கடலை', 'கடலை', 'வேர்க்கடலை'
  ],
  bean: [
    'bean', 'beans', 'green bean', 'green beans', 'bush bean', 'broad bean', 'french bean',
    'avarai', 'avaraikkai', 'பீன்ஸ்', 'அவரை', 'அவரைக்காய்'
  ],
  apple: [
    'apple', 'apples', 'seb', 'aappil', 'ஆப்பிள்'
  ],
  cucumber: [
    'cucumber', 'kheera', 'vellarikkai', 'vellari', 'வெள்ளரி', 'வெள்ளரிக்காய்'
  ],
  corn: [
    'corn', 'maize', 'makka cholam', 'makkacholam', 'cholam', 'bhutta', 'மக்காச்சோளம்', 'சோளம்'
  ],
  grape: [
    'grape', 'grapes', 'angur', 'thiratchai', 'திராட்சை', 'திராட்சைப்பழம்'
  ],
  bhendi: [
    'bhendi', 'bhindi', 'okra', 'ladyfinger', 'lady finger', 'vendai', 'vendaikkai',
    'வெண்டை', 'வெண்டைக்காய்'
  ]
};

/**
 * Extracts canonical crop name from arbitrary text with word boundary & Tamil script checks.
 */
function extractCropFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  for (const [canonical, synonyms] of Object.entries(CROP_SYNONYMS)) {
    for (const syn of synonyms) {
      if (/[\u0B80-\u0BFF]/.test(syn)) {
        if (lower.includes(syn)) return canonical;
      } else {
        const regex = new RegExp(`(^|[^a-z0-9])${syn}([^a-z0-9]|$)`, 'i');
        if (regex.test(lower)) return canonical;
      }
    }
  }
  return null;
}

/**
 * Resolves active crop, symptoms, antecedents, and cross-crop discrepancies.
 */
function resolveCropAndContext({ message, history = [], requestCrop = null, requestDisease = null, imagePrediction = null }) {
  const trimmed = (message || '').trim();

  // 1. Current user message crop check
  const messageCrop = extractCropFromText(trimmed);

  // 2. Check for image prediction crop
  let imgCrop = null;
  let imgDisease = null;
  if (imagePrediction) {
    imgCrop = extractCropFromText(imagePrediction.crop || imagePrediction.diseaseName || imagePrediction.predicted_class || '') || (imagePrediction.crop ? imagePrediction.crop.toLowerCase() : null);
    imgDisease = imagePrediction.diseaseName || imagePrediction.disease || imagePrediction.predicted_class || null;
  }

  // Check for discrepancy between image prediction and user text inquiry
  let imageDiscrepancy = null;
  if (imgCrop && messageCrop && imgCrop !== messageCrop) {
    imageDiscrepancy = {
      imageCrop: imgCrop,
      imageDisease: imgDisease,
      userCrop: messageCrop
    };
  }

  // 3. Immediate crop switching: If user explicitly mentioned a crop in current message, use it immediately!
  if (messageCrop) {
    return {
      activeCrop: messageCrop,
      isCropSwitched: true,
      source: 'message',
      diseaseContext: null, // Reset previous disease when crop is explicitly switched
      imageDiscrepancy
    };
  }

  // 4. Request crop passed from client
  if (requestCrop) {
    const normalizedReq = extractCropFromText(requestCrop) || requestCrop.toLowerCase();
    if (CANONICAL_CROPS.includes(normalizedReq)) {
      return {
        activeCrop: normalizedReq,
        isCropSwitched: false,
        source: 'requestCrop',
        diseaseContext: requestDisease || imgDisease || null,
        imageDiscrepancy: null
      };
    }
  }

  // 5. Image prediction inheritance (if user didn't mention any crop in text)
  if (imgCrop && CANONICAL_CROPS.includes(imgCrop)) {
    return {
      activeCrop: imgCrop,
      isCropSwitched: false,
      source: 'imagePrediction',
      diseaseContext: imgDisease,
      imageDiscrepancy: null
    };
  }

  // 6. Multi-turn inheritance from history
  if (Array.isArray(history) && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const item = history[i];
      if (item?.crop_context && CANONICAL_CROPS.includes(item.crop_context)) {
        return {
          activeCrop: item.crop_context,
          isCropSwitched: false,
          source: 'history_context',
          diseaseContext: item?.disease_context || null,
          imageDiscrepancy: null
        };
      }
      const prevText = item?.text || item?.message || '';
      const histCrop = extractCropFromText(prevText);
      if (histCrop) {
        return {
          activeCrop: histCrop,
          isCropSwitched: false,
          source: 'history_text',
          diseaseContext: item?.disease_context || null,
          imageDiscrepancy: null
        };
      }
    }
  }

  return {
    activeCrop: null,
    isCropSwitched: false,
    source: 'none',
    diseaseContext: null,
    imageDiscrepancy: null
  };
}

/**
 * Validates that knowledge base data strictly matches the active crop.
 */
function validateCropConsistency(selectedData, activeCrop) {
  if (!selectedData || !activeCrop) return true;
  if (selectedData.crop && selectedData.crop !== activeCrop) {
    return false;
  }
  return true;
}

// Verified Agronomic Baseline Knowledge Base
const KNOWLEDGE_BASE = {
  // ================= 1. TOMATO (தக்காளி) =================
  tomato: {
    crop: 'tomato',
    name_en: 'Tomato',
    name_ta: 'தக்காளி',
    name_tanglish: 'Thakkali',
    overview: {
      crop: 'tomato',
      direct_en: 'Tomato (*Solanum lycopersicum*) is a major commercial vegetable. High-yielding certified varieties include Arka Rakshak, Shivam, PKM 1, and CO 3.',
      direct_ta: 'தக்காளி (*Solanum lycopersicum*) முக்கிய வணிக காய்கறிப் பயிராகும். அர்கா ரக்ஷக், சிவம, PKM 1 மற்றும் CO 3 ஆகியவை அதிக விளைச்சல் தரும் ரகங்களாகும்.',
      direct_tanglish: 'Thakkali (Tomato) nalla market demand ulla vegetable crop. Arka Rakshak, PKM 1, CO 3 nalla yield tharum r撹angal aagum.',
      expl_en: 'Tomatoes require well-drained sandy loam soil with good organic carbon. Major yield limiters include Early Blight, Late Blight, and Whitefly-transmitted Yellow Leaf Curl Virus.',
      expl_ta: 'தக்காளிக்கு வடிகால் வசதியுள்ள மணல் கலந்த வண்டல் மண் உகந்தது. முன்கூட்டிய கருகல், லேட் பிளைட் மற்றும் வெள்ளை ஈக்கள் பரப்பும் இலைச்சுருள் நோய் ஆகியவை முக்கிய சவால்களாகும்.',
      expl_tanglish: 'Thakkali-kku nalla vadigaal vasadhi konda manal paangaana nilam thevai. Karukal poonjai matrum whitefly leaf curl noi thaakkudhal irukkum.',
      treatment_en: [
        'Apply well-rotted FYM (10 tonnes/acre) during basal preparation.',
        'Install 15 Yellow Sticky Traps per acre to monitor whiteflies and thrips.',
        'Spray Mancozeb 75 WP (2g/L) preventively during monsoon or high humidity.',
        'Use drip irrigation; avoid overhead watering.'
      ],
      treatment_ta: [
        'நிலத் தயாரிப்பில் ஏக்கருக்கு 10 டன் மக்கிய தொழுவுரம் இடவும்.',
        'வெள்ளை ஈக்களைக் கண்காணிக்க ஏக்கருக்கு 15 மஞ்சள் ஒட்டும் பொறிகளை வைக்கவும்.',
        'மழைக்காலத்தில் மேன்கோசெப் 75 WP (2 கிராம்/லி) தடுப்பு மருந்தாக தெளிக்கவும்.',
        'சொட்டு நீர்ப்பாசனம் செய்யவும்; இலைகளில் மேல்மட்ட நீர் தெளிப்பதைத் தவிர்க்கவும்.'
      ],
      treatment_tanglish: [
        'Acre-ku 10 ton thozhu uram basally idavum.',
        'Whitefly control panna acre-ku 15 Yellow Sticky Traps vaikka vendum.',
        'Fungicide: Mancozeb 75 WP (2g/L) thelikkavum.',
        'Drip irrigation seiyavum.'
      ]
    },
    yellow_spots: {
      crop: 'tomato',
      direct_en: 'The yellowing and yellow spots on your tomato leaves are primarily caused by **Tomato Yellow Leaf Curl Virus (TYLCV)** transmitted by whiteflies, **Early Blight** (*Alternaria solani*), or **Nitrogen/Magnesium nutrient deficiency**.',
      direct_ta: 'தக்காளி இலையில் மஞ்சள் நிறம் மற்றும் மஞ்சள் புள்ளிகள் தோன்றுவதற்கு முக்கிய காரணங்கள்: வெள்ளை ஈக்கள் மூலம் பரவும் **மஞ்சள் சுருள் வைரஸ் (TYLCV)**, **முன்கூட்டிய கருகல் பூஞ்சை நோய் (Early Blight)** அல்லது **தழைச்சத்து/மெக்னீசியம் பற்றாக்குறை** ஆகும்.',
      direct_tanglish: 'Thakkali ilaila manjal niram (yellow spots) vara mukkiya kaaranam vella ee parappum **TYLCV yellow leaf curl virus**, **Early Blight fungal disease**, alladhu **Nitrogen/Magnesium oottachathu kuraipaadu** aagalam.',
      expl_en: 'If leaves curl upward and margins turn pale yellow, it is TYLCV transmitted by adult whiteflies (*Bemisia tabaci*). If older lower leaves have brown spots surrounded by yellow halos, it is early blight fungus. General pale yellowing of bottom leaves signifies Nitrogen shortage, whereas yellowing between green veins indicates Magnesium deficiency.',
      expl_ta: 'இலைகள் மேல்நோக்கி சுருண்டு விளிம்புகள் வெளிர் மஞ்சள் நிறமானால் அது வெள்ளை ஈக்கள் பரப்பும் வைரஸ் நோய். கீழ் இலைகளில் பழுப்புப் புள்ளிகளைச் சுற்றி மஞ்சள் வளையம் இருந்தால் அது பூஞ்சை நோய். கீழ் இலைகள் முழுமையாக வெளிறினால் தழைச்சத்து பற்றாக்குறை; நரம்புகளுக்கு நடுவே மஞ்சளானால் மெக்னீசியம் பற்றாக்குறை.',
      expl_tanglish: 'Ilai mel nokki surundu margin manjal aanaal adhu whitefly parappura TYLCV virus. Keezh ilaiyil pazhuppu pulli suthi manjal valayam irundhal early blight poonjai noi. Keezh ilai muzhusa yellow aanaal Nitrogen thevai; narambugalukku naduve manjal aanaal Magnesium thevai.',
      treatment_en: [
        'Vector Management (Whitefly): Install 12–15 Yellow Sticky Traps per acre to trap adult whiteflies. Spray Neem Seed Kernel Extract (NSKE 5%) or Neem Oil (5ml/L) with liquid soap.',
        'Sanitation: Safely prune and destroy severely infected lower leaves outside the field (do not compost).',
        'Fungicide Protection: If fungal blight spots appear, spray Mancozeb 75 WP (2g/L) or Copper Oxychloride 50 WP (2.5g/L) as certified by TNAU/ICAR.',
        'Nutrient Balancing: Apply 0.5% Magnesium Sulphate foliar spray if interveinal yellowing is observed.',
        'Visual Confirmation: Upload a close-up leaf photo to our "Plant Disease" tab for automated AI visual verification.'
      ],
      treatment_ta: [
        'வெள்ளை ஈ கட்டுப்பாடு: ஏக்கருக்கு 12-15 மஞ்சள் நிற ஒட்டும் பொறிகளை (Yellow Sticky Traps) நிறுவவும். வேப்பங்கொட்டை கரைசல் (NSKE 5%) அல்லது வேப்பெண்ணெய் (5 மி.லி/லி) தெளிக்கவும்.',
        'வயல் சுகாதாரம்: பாதிக்கப்பட்ட கீழ் இலைகளை உடனே கிள்ளி வயலுக்கு வெளியே தீயிட்டு அழிக்கவும் (உரமாகப் போடக்கூடாது).',
        'பூஞ்சைக் கொல்லி தெளிப்பு: கருகல் புள்ளிகளுக்கு மேன்கோசெப் (Mancozeb 2 கிராம்/லிட்டர்) அல்லது காப்பர் ஆக்ஸிகுளோரைடு (2.5 கிராம்/லிட்டர்) தெளிக்கவும்.',
        'ஊட்டச்சத்து தெளிப்பு: நரம்புகளுக்கு இடையே மஞ்சளானால் 0.5% மெக்னீசியம் சல்பேட் கரைசல் தெளிக்கவும்.',
        'புகைப்பட ஆய்வு: துல்லியமான உறுதிப்படுத்தலுக்கு எங்களது "Plant Disease" பக்கத்தில் இலை படத்தை பதிவேற்றலாம்.'
      ],
      treatment_tanglish: [
        'Whitefly-ai kattu padutha acre-ku 12-15 Manjal Ottum Pori (Yellow Sticky Traps) vaikka vendum.',
        'Baadhikkapatta keezh ilaikalai parithu veliye theeyittu azhikkavum (compost panna koodathu).',
        'Iyarkai thelippu: Veppennai (5ml/L) alladhu NSKE 5% thelikkavum.',
        'Fungicide: Karukal pulli irundhal Mancozeb 75 WP (2g/L) alladhu Copper Oxychloride (2.5g/L) TNAU aalosanai padi thelikkalam.',
        'Nutrient: Magnesium kuraipaadukku 0.5% Magnesium Sulphate thelikkavum.',
        'Upload photo: Ungal ilai photovai AgriConnect "Plant Disease" tab-il upload panni instant AI test pannunga.'
      ]
    },
    brown_spots: {
      crop: 'tomato',
      direct_en: 'Brown spots on tomato leaves are primarily caused by **Early Blight** (*Alternaria solani*), **Septoria Leaf Spot**, or **Late Blight** (*Phytophthora infestans*) during moist and humid conditions.',
      direct_ta: 'தக்காளி இலையில் பழுப்பு நிறப் புள்ளிகள் தோன்றுவதற்கு முக்கிய காரணங்கள்: **முன்கூட்டிய கருகல் பூஞ்சை நோய் (Early Blight - Alternaria solani)**, **செப்டோரியா இலைப்புள்ளி நோய்**, அல்லது ஈரப்பதம் மிகுந்த வானிலையில் தோன்றும் **லேட் பிளைட் பூஞ்சை நோய்** ஆகும்.',
      direct_tanglish: 'Thakkali ilaila pazhuppu pulligal (brown spots) vara mukkiya kaaranam **Early Blight (Alternaria solani poonjai noi)**, **Septoria Leaf Spot**, alladhu **Late Blight** fungal infection aagum.',
      expl_en: 'Early blight causes dark brown to black spots with distinct concentric rings ("target board" pattern) on older lower foliage. Septoria creates small circular lesions with sunken gray centers and dark borders. Left unmanaged, spots coalesce, causing leaves to yellow, wither, and prematurely drop.',
      expl_ta: 'முன்கூட்டிய கருகல் நோயினால் கீழ் இலைகளில் இலக்கு பலகை போன்ற வளைய வடிவிலான பழுப்பு நிறப் புள்ளிகள் தோன்றும். செப்டோரியா நோயினால் சாம்பல் நிற மையமும் பழுப்பு விளிம்பும் கொண்ட சிறிய வட்டப் புள்ளிகள் உருவாகும். இதைக் கட்டுப்படுத்தாவிட்டால் இலைகள் உதிர்ந்து காய் உற்பத்தி கடுமையாக பாதிக்கப்படும்.',
      expl_tanglish: 'Early blight vandhal ilaiyil round target board pola valaiyam konda pazhuppu pulligal varum. Septoria noi vandhal saambal nira naduppagudhi konda chinna pulligal thondrum. Kattupaduthaamal vittal ilai kothoda karugi uthirnthu vidum.',
      treatment_en: [
        'Sanitation & Pruning: Promptly remove and safely burn or deeply bury heavily spotted lower leaves outside the field.',
        'Approved Chemical Fungicide (TNAU / ICAR): Spray Mancozeb 75 WP (2g per liter of water) or Copper Oxychloride 50 WP (2.5g/L) upon detecting initial lesions. Repeat after 10–12 days if humid.',
        'Organic Bio-Control: Spray *Pseudomonas fluorescens* (10g/L) or *Trichoderma viride* (5g/L) during early morning or late evening.',
        'Irrigation Management: Irrigate directly at the root zone using drip irrigation; strictly avoid overhead sprinkler watering that leaves foliage wet.',
        'Mulching: Spread clean straw mulch around plant beds to prevent soil-borne fungal spores from splashing onto foliage during rainfall.'
      ],
      treatment_ta: [
        'கவாத்து & சுகாதாரம்: பாதிக்கப்பட்ட கீழ் இலைகளை உடனே பறித்து வயலுக்கு வெளியே தீயிட்டு அழிக்கவும்.',
        'பரிந்துரைக்கப்படும் பூஞ்சைக் கொல்லி (TNAU வழிகாட்டல்): ஆரம்ப அறிகுறிகள் தெரிந்ததும் மேன்கோசெப் 75 WP (ஒரு லிட்டர் தண்ணீருக்கு 2 கிராம்) அல்லது காப்பர் ஆக்ஸிகுளோரைடு 50 WP (2.5 கிராம்/லி) தெளிக்கவும். 10-12 நாட்களுக்குப் பின் மீண்டும் தெளிக்கவும்.',
        'இயற்கை உயிரியல் முறை: சூடோமோனாஸ் (Pseudomonas fluorescens 10 கிராம்/லிட்டர்) கரைசலை மாலையில் தெளிக்கவும்.',
        'பாசன முறை: இலைகளில் தண்ணீர் படாதவாறு வேர்ப் பகுதியில் மட்டும் சொட்டு நீர்ப்பாசனம் செய்யவும்.',
        'வைக்கோல் மூடாக்கு: பூஞ்சை வித்துக்கள் மண்ணிலிருந்து இலைக்குத் தெறிக்காமல் இருக்க செடியைச் சுற்றி வைக்கோல் மூடாக்கு போடவும்.'
      ],
      treatment_tanglish: [
        'Ilai Sanitation: Baadhikkapatta keezh ilaikalai parithu veliye theeyittu azhikkavum.',
        'Fungicide Spray (TNAU Certified): Mancozeb 75 WP (2g/L) alladhu Copper Oxychloride 50 WP (2.5g/L) water-il kalandhu thelikkavum. Thevaippattal 10 naal kazhithu marupadi thelikkalam.',
        'Bio-Control: Pseudomonas fluorescens (10g/L) maalai nerathil thelikkavum.',
        'Drip Irrigation: Sottu neer paasanam seiyavum, ilai nanaiya koodathu.',
        'Mulching: Mannilirundhu fungal spores ilaikku thelikkaamal irukka vaikoal moodakku podavum.'
      ]
    }
  },

  // ================= 2. BRINJAL / EGGPLANT (கத்தரி) =================
  brinjal: {
    crop: 'brinjal',
    name_en: 'Brinjal / Eggplant',
    name_ta: 'கத்தரி',
    name_tanglish: 'Kathirikai',
    overview: {
      crop: 'brinjal',
      direct_en: 'Brinjal (*Solanum melongena*) is a high-value solanaceous vegetable crop cultivated across Tamil Nadu and India. Top high-yielding TNAU varieties include CO 2, PKM 1, PLR 1, and Annamalai.',
      direct_ta: 'கத்தரி (*Solanum melongena*) தமிழ்நாட்டில் பரவலாகப் பயிரிடப்படும் முக்கிய காய்கறிப் பயிராகும். TNAU வெளியிட்ட CO 2, PKM 1, PLR 1 மற்றும் அண்ணாமலை ஆகியவை சிறந்த ரகங்களாகும்.',
      direct_tanglish: 'Kathirikai (Brinjal) Tamil Nadu-vil nalla varumaanam tharum mukkiya vegetable crop. TNAU PKM 1, CO 2, PLR 1, matrum Annamalai nalla yield tharum r撹angal aagum.',
      expl_en: 'Brinjal requires well-drained fertile sandy loam to clay loam soil with a pH of 6.5–7.5. Key management consists of regular scouting for shoot and fruit borer, preventing fungal damping-off in nurseries, and controlling Phomopsis leaf blight during the monsoon.',
      expl_ta: 'கத்தரி சாகுபடிக்கு நல்ல வடிகால் வசதியுள்ள செம்மண் அல்லது வண்டல் மண் சிறந்தது (pH 6.5-7.5). தண்டு மற்றும் காய்த் துளைப்பான் கட்டுப்பாடு, நாற்றழுகல் தடுப்பு மற்றும் போமாப்சிஸ் கருகல் நோய் மேலாண்மை மிக முக்கியமாகும்.',
      expl_tanglish: 'Kathirikai-kku nalla vadigaal vasadhi konda manal paangaana nilam thevai. Thandu matrum kaai thulaipaan kattu paduthudhal matrum Phomopsis karukal noi thaduppadhu mukkiyam.',
      treatment_en: [
        'Seed Treatment: Dress seeds with *Trichoderma viride* (4g/kg) or Captan (2g/kg) before sowing.',
        'Spacing & Planting: Maintain 60 x 60 cm spacing for varieties and 75 x 60 cm for hybrids.',
        'Nutrient Management: Apply 100:50:50 kg NPK/ha along with 25 tonnes FYM during land preparation.',
        'Pest Monitoring: Install Lucin-lure pheromone traps (12/acre) for shoot & fruit borer.',
        'Irrigation: Provide drip irrigation at 3-day intervals; avoid waterlogging around the root zone.'
      ],
      treatment_ta: [
        'விதை நேர்த்தி: ஒரு கிலோ விதைக்கு 4 கிராம் டிரைக்கோடெர்மா விரிடி அல்லது 2 கிராம் கேப்டான் கொண்டு நேர்த்தி செய்யவும்.',
        'இடைவெளி: செடிகளுக்கு இடையே 60 x 60 செ.மீ இடைவெளி விட்டு நடவு செய்யவும்.',
        'உர மேலாண்மை: ஏக்கருக்கு 10 டன் தொழுவுரத்துடன் பரிந்துரைக்கப்பட்ட NPK உரங்களை இடவும்.',
        'பூச்சிப் பொறி: காய்த் துளைப்பானைக் கண்காணிக்க ஏக்கருக்கு 12 இனக்கவர்ச்சிப் பொறிகளை வைக்கவும்.',
        'பாசனம்: 3 நாட்களுக்கு ஒருமுறை சொட்டு நீர்ப்பாசனம் செய்யவும்; வேர்ப்பகுதியில் நீர் தேங்க விடக்கூடாது.'
      ],
      treatment_tanglish: [
        'Vidhai Nerthi: 1 kg seed-kku 4g Trichoderma viride kalandhu nerthi seiyavum.',
        'Spacing: 60 x 60 cm idaiveli vittu nadavu seiyavum.',
        'Fertilizer: Nangu makkiya thozhu uram (10 ton/acre) basally idavum.',
        'Pheromone Traps: Acre-ku 12 Lucin-lure porigal vaikka vendum.',
        'Drip Irrigation: Sottu neer paasanam panna vendum, thanni thenga koodathu.'
      ]
    },
    brown_spots: {
      crop: 'brinjal',
      direct_en: 'Brown spots on brinjal leaves are primarily caused by **Phomopsis Blight (*Phomopsis vexans*)** or **Cercospora Leaf Spot (*Cercospora melongenae*)**.',
      direct_ta: 'கத்தரி இலையில் பழுப்பு நிறப் புள்ளிகள் தோன்றுவதற்கு முக்கிய காரணங்கள்: **போமாப்சிஸ் கருகல் பூஞ்சை நோய் (*Phomopsis vexans*)** அல்லது **செர்கோஸ்போரா இலைப்புள்ளி நோய் (*Cercospora melongenae*)** ஆகும்.',
      direct_tanglish: 'Kathirikai ilaila pazhuppu pulligal (brown spots) vara mukkiya kaaranam **Phomopsis Blight (*Phomopsis vexans*)** alladhu **Cercospora Leaf Spot (*Cercospora melongenae*)** poonjai noi aagum.',
      expl_en: 'Phomopsis blight produces clearly defined circular to irregular brown necrotic lesions on foliage. Older lesions show numerous tiny black pimple-like pycnidia fruiting bodies in concentric zones; infected leaves turn yellow and drop prematurely, and the fungus causes brown sunken rot spots on developing fruits. Cercospora causes circular brown lesions with distinct chlorotic halos.',
      expl_ta: 'போமாப்சிஸ் பூஞ்சை நோயினால் இலைகளில் வட்ட அல்லது ஒழுங்கற்ற பழுப்பு நிற கருகல் திட்டுக்கள் உருவாகும்; பழைய புள்ளிகளின் நடுவில் கருப்பு நிறப் புள்ளிகள் (pycnidia) வளைய வடிவில் தோன்றும். இலைகள் மஞ்சள் நிறமாகி உதிர்ந்துவிடும், காய்களிலும் பழுப்பு நிற அழுகல் பள்ளங்கள் தோன்றும். செர்கோஸ்போரா நோயால் பழுப்பு நிற வட்டப் புள்ளிகள் உண்டாகும்.',
      expl_tanglish: 'Phomopsis poonjai vandhal ilaiyil round/irregular pazhuppu karukal patches varum, naduvula black dots valaiyamaaga thondrum. Ilai manjal aagi kotti vidum, kaayilum pazhuppu azhugal varum. Cercospora vandhal suthi manjal valayam konda brown spots varum.',
      treatment_en: [
        'Sanitation: Collect and safely burn or deeply bury heavily spotted lower leaves and rotted fruits outside the field.',
        'Approved Fungicide Spray (TNAU / ICAR): Spray Mancozeb 75 WP (2g per liter of water) or Copper Oxychloride 50 WP (2.5g/L) or Carbendazim 50 WP (1g/L) upon detecting initial leaf spots. Repeat after 10–12 days if humid.',
        'Organic Bio-Control: Spray *Pseudomonas fluorescens* (10g/L) or *Trichoderma viride* (5g/L) during late afternoon.',
        'Irrigation Management: Strictly transition to drip irrigation; avoid overhead hose watering that splashes spores from soil onto leaves.',
        'Seed Treatment for Next Crop: Treat seeds with Thiram or Captan (2g/kg seed) or soak in hot water (50°C for 30 mins).'
      ],
      treatment_ta: [
        'வயல் சுகாதாரம்: பாதிக்கப்பட்ட கீழ் இலைகள் மற்றும் அழுகிய காய்களை உடனடியாகப் பறித்து வயலுக்கு வெளியே தீயிட்டு அழிக்கவும்.',
        'பரிந்துரைக்கப்படும் பூஞ்சைக் கொல்லி (TNAU வழிகாட்டல்): ஆரம்ப அறிகுறிகள் தெரிந்ததும் மேன்கோசெப் 75 WP (ஒரு லிட்டர் தண்ணீருக்கு 2 கிராம்) அல்லது காப்பர் ஆக்ஸிகுளோரைடு 50 WP (2.5 கிராம்/லி) அல்லது கார்பென்டாசிம் 50 WP (1 கிராம்/லி) தெளிக்கவும். 10-12 நாட்களுக்குப் பின் மீண்டும் தெளிக்கவும்.',
        'இயற்கை உயிரியல் முறை: சூடோமோனாஸ் (Pseudomonas fluorescens 10 கிராம்/லிட்டர்) கரைசலை மாலையில் தெளிக்கவும்.',
        'பாசன மேலாண்மை: சொட்டு நீர்ப்பாசனம் செய்யவும்; இலைகளில் மேல்மட்ட நீர் தெளிப்பதைத் தவிர்க்கவும்.',
        'விதை நேர்த்தி: அடுத்த பயிருக்கு விதைகளை கேப்டான் (2 கிராம்/கிலோ) கொண்டு நேர்த்தி செய்யவும்.'
      ],
      treatment_tanglish: [
        'Sanitation: Baadhikkapatta keezh ilaikalai parithu veliye theeyittu azhikkavum.',
        'Fungicide Spray (TNAU Certified): Mancozeb 75 WP (2g/L) alladhu Copper Oxychloride 50 WP (2.5g/L) alladhu Carbendazim (1g/L) water-il kalandhu thelikkavum. Thevaippattal 10 naal kazhithu marupadi thelikkalam.',
        'Bio-Control: Pseudomonas fluorescens (10g/L) maalai nerathil thelikkavum.',
        'Drip Irrigation: Sottu neer paasanam seiyavum, ilai mela thanni thelikka koodathu.',
        'Seed Treatment: Adutha muraikku Captan (2g/kg) vidhai nerthi seiyavum.'
      ]
    },
    yellow_spots: {
      crop: 'brinjal',
      direct_en: 'Yellowing and yellow spots on brinjal leaves are primarily caused by **Little Leaf of Brinjal** (phytoplasma transmitted by leafhoppers *Hishimonus phycitis*) or **Iron / Nitrogen nutrient deficiency**.',
      direct_ta: 'கத்தரி இலையில் மஞ்சள் நிறம் தோன்றுவதற்கு முக்கிய காரணங்கள்: தத்துப்பூச்சிகள் மூலம் பரவும் **கத்தரி சிறு இலை நோய் (Little Leaf Phytoplasma)** அல்லது **இரும்புச்சத்து / தழைச்சத்து பற்றாக்குறை** ஆகும்.',
      direct_tanglish: 'Kathirikai ilaila manjal niram (yellow spots) vara mukkiya kaaranam thadhu poochi parappum **Little Leaf of Brinjal phytoplasma**, alladhu **Iron / Nitrogen deficiency** aagum.',
      expl_en: 'Little leaf disease causes leaves to become extremely small, yellow-green, and clustered in a bushy bunch with stunted growth and zero fruit set. General yellowing between green leaf veins signifies iron chlorosis, common in alkaline soils.',
      expl_ta: 'சிறு இலை நோயினால் இலைகள் மிகச் சிறியதாகி, வெளிர் மஞ்சள் நிறமாகி செடி புதர் போல வளரும்; காய்கள் பிடிக்காது. நரம்புகளுக்கு இடையே மஞ்சளானால் இரும்புச்சத்து குறைபாடு ஆகும்.',
      expl_tanglish: 'Little leaf noi vandhal ilai ellam chinna chinna bushes pola aagi, chedi kurugi kaai pidikkaadhu. Narambugalukku naduve yellow aanaal iron sathu kuraipaadu.',
      treatment_en: [
        'Rogueing: Immediately uproot and burn all stunted little-leaf infected plants to eliminate the virus/phytoplasma source.',
        'Vector Control (Leafhopper): Install 12 Yellow Sticky Traps per acre. Spray Dimethoate 30 EC (1.5ml/L) or Neem oil (5ml/L) to control leafhoppers.',
        'Nutrient Balancing: Apply 0.5% Ferrous Sulphate foliar spray if interveinal iron chlorosis is present.',
        'Seedling Dip: Dip roots of seedlings in Tetracycline hydrochloride solution (500 ppm) for 30 minutes before transplanting.'
      ],
      treatment_ta: [
        'பாதிக்கப்பட்ட செடிகளை அகற்றுதல்: சிறு இலை நோய் தாக்கிய குட்டைச் செடிகளை உடனே வேரோடு பிடுங்கி தீயிட்டு அழிக்கவும்.',
        'தத்துப்பூச்சி கட்டுப்பாடு: ஏக்கருக்கு 12 மஞ்சள் நிற ஒட்டும் பொறிகளை வைக்கவும். டைமெத்தோயேட் 30 EC (1.5 மி.லி/லி) அல்லது வேப்பெண்ணெய் (5 மி.லி/லி) தெளிக்கவும்.',
        'நுண்ணூட்டச் சத்து: நரம்புகளுக்கு இடையே மஞ்சளானால் 0.5% அன்னபேதி (Ferrous Sulphate) தெளிக்கவும்.',
        'நாற்று வேர் நனைத்தல்: நடவு முன் நாற்றுகளின் வேர்களை டெட்ராசைக்ளின் கரைசலில் 30 நிமிடம் நனைத்து நடவும்.'
      ],
      treatment_tanglish: [
        'Rogueing: Baadhikkapatta little leaf chedigalai pidingi veliye theeyittu azhikkavum.',
        'Leafhopper Control: Acre-ku 12 Yellow Sticky Traps vaikka vendum. Dimethoate (1.5ml/L) alladhu Veppennai (5ml/L) thelikkavum.',
        'Nutrient Spray: Narambugalukku naduve yellow aanaal 0.5% Ferrous Sulphate thelikkavum.',
        'Root Dip: Nadavukku mun naatru verkalai Tetracycline karaisalil 30 mins nanaithu nadavum.'
      ]
    },
    shoot_fruit_borer: {
      crop: 'brinjal',
      direct_en: 'Wilting shoots and bore holes in brinjal fruits are caused by **Brinjal Shoot and Fruit Borer (*Leucinodes orbonalis*)**, the most serious insect pest of brinjal.',
      direct_ta: 'கத்தரி குருத்து வாடுதல் மற்றும் காய்களில் துளைகள் விழுவதற்கு முக்கிய காரணம்: **கத்தரி தண்டு மற்றும் காய்த் துளைப்பான் (*Leucinodes orbonalis*)** ஆகும்.',
      direct_tanglish: 'Kathirikai kuruthu vaadudhal matrum kaayil thulaigal vara kaaranam **Shoot and Fruit Borer (*Leucinodes orbonalis*)** puzhu aagum.',
      expl_en: 'The caterpillar bores into tender terminal shoots causing drooping and wilting ("dead hearts"). Later, it bores into developing flower buds and fruits, plugging entrance holes with excreta and causing fruit rot.',
      expl_ta: 'புழு இளம் குருத்துகளில் துளையிடுவதால் குருத்துகள் வாடி உலர்ந்துவிடும். பின் காய்களில் நுழைந்து துளையிட்டு எச்சங்களால் அடைத்து காய்களை அழுகச் செய்யும்.',
      expl_tanglish: 'Puzhu ilam kuruthai thulaithu ulle sendru vaada vaikkum. Pin kaaygalukku ulle poi excreta pottu kaayai azhuga vaikkum.',
      treatment_en: [
        'Mechanical Pruning: Periodically clip and destroy all wilted terminal shoots along with boring larvae.',
        'Pheromone Trapping: Install 12 Lucin-lure pheromone traps per acre to mass-trap male moths.',
        'Bio-Pesticide: Spray Neem Seed Kernel Extract (NSKE 5%) or *Bacillus thuringiensis* (Bt @ 2g/L) at weekly intervals.',
        'Certified Chemical Insecticide: Spray Emamectin Benzoate 5 SG (0.4g/L) or Chlorantraniliprole 18.5 SC (0.3ml/L) as recommended by TNAU.'
      ],
      treatment_ta: [
        'வாடிய குருத்துகளை அகற்றுதல்: வாடிய குருத்துகளை புழுவோடு சேர்த்து கிள்ளி அழித்துவிட வேண்டும்.',
        'இனக்கவர்ச்சிப் பொறி: ஏக்கருக்கு 12 லூசின்-லியூர் இனக்கவர்ச்சிப் பொறிகளை வைக்கவும்.',
        'இயற்கை தெளிப்பு: வேப்பங்கொட்டை கரைசல் (NSKE 5%) அல்லது பி.டி (Bt 2 கிராம்/லி) வாரந்தோறும் தெளிக்கவும்.',
        'பரிந்துரைக்கப்படும் மருந்து (TNAU): எமாமெக்டின் பென்சோயேட் (0.4 கிராம்/லி) அல்லது குளோரான்ட்ரானிலிப்ரோல் (0.3 மி.லி/லி) தெளிக்கவும்.'
      ],
      treatment_tanglish: [
        'Mechanical Pruning: Vaadiya ilam kuruthugalai puzhuvodu serthu parithu azhikkavum.',
        'Pheromone Traps: Acre-ku 12 Lucin-lure pheromone porigal vaikka vendum.',
        'Organic Spray: NSKE 5% alladhu Bacillus thuringiensis (2g/L) thelikkavum.',
        'Insecticide (TNAU Certified): Emamectin Benzoate 5 SG (0.4g/L) water-il kalandhu thelikkavum.'
      ]
    }
  },

  // ================= 3. CHILLI / PEPPER (மிளகாய்) =================
  chilli: {
    crop: 'chilli',
    name_en: 'Chilli / Bell Pepper',
    name_ta: 'மிளகாய்',
    name_tanglish: 'Milagai',
    overview: {
      crop: 'chilli',
      direct_en: 'Chilli (*Capsicum annuum*) is an important spice and cash crop. Leading varieties in South India include K1, K2, CO 4, and PMK 1.',
      direct_ta: 'மிளகாய் (*Capsicum annuum*) முக்கிய பணப்பயிராகும். தென்னிந்தியாவில் K1, K2, CO 4 மற்றும் PMK 1 ஆகியவை சிறந்த ரகங்களாகும்.',
      direct_tanglish: 'Milagai (Chilli) mukkiya spice crop. TNAU K1, K2, CO 4 nalla varieties.',
      expl_en: 'Chilli needs warm climate and well-drained loamy soil. It is susceptible to thrips-vectored leaf curl, powdery mildew, and anthracnose fruit rot.',
      expl_ta: 'மிளகாய்க்கு நல்ல வடிகால் வசதியும் வெப்பமான காலநிலையும் தேவை. இலைப்பேன் மூலம் பரவும் இலைச்சுருள், சாம்பல் நோய் மற்றும் அந்திரக்னோஸ் அழுகல் நோய் ஆகியவை முக்கியமானவை.',
      expl_tanglish: 'Milagai-kku vadigaal vasadhi thevai. Thrips parappura leaf curl noi matrum anthracnose noi thaakkudhal varalam.',
      treatment_en: [
        'Install Blue Sticky Traps (12/acre) for thrips and Yellow Sticky Traps for whiteflies.',
        'Spray Wettable Sulphur (2.5g/L) for powdery mildew at first onset.',
        'Spray Copper Oxychloride 50 WP (2.5g/L) + Streptocycline (0.5g/L) for bacterial spot.'
      ],
      treatment_ta: [
        'இலைப்பேன் கட்டுப்படுத்த ஏக்கருக்கு 12 நீல நிற ஒட்டும் பொறிகளை வைக்கவும்.',
        'சாம்பல் நோய்க்கு நனையும் கந்தகம் (2.5 கிராம்/லி) தெளிக்கவும்.',
        'பாக்டீரியா புள்ளி நோய்க்கு காப்பர் ஆக்ஸிகுளோரைடு (2.5 கிராம்/லி) + ஸ்ட்ரெப்டோசைக்கிளின் தெளிக்கவும்.'
      ],
      treatment_tanglish: [
        'Thrips-kku Blue Sticky Traps (12/acre) vaikka vendum.',
        'Saambal noi-kku Wettable Sulphur (2.5g/L) thelikkavum.',
        'Bacterial spot-kku Copper Oxychloride (2.5g/L) thelikkalam.'
      ]
    },
    black_spots: {
      crop: 'chilli',
      direct_en: 'Black and dark brown spots on chilli leaves are primarily caused by **Bacterial Leaf Spot (*Xanthomonas campestris pv. vesicatoria*)** or **Anthracnose / Dieback (*Colletotrichum capsici*)**.',
      direct_ta: 'மிளகாய் இலையில் கருப்பு மற்றும் அடர் பழுப்பு நிறப் புள்ளிகள் தோன்றுவதற்கு முக்கிய காரணங்கள்: **பாக்டீரியா இலைப்புள்ளி நோய் (*Xanthomonas campestris*)** அல்லது **அந்திரக்னோஸ் / நுனிக்கருகல் பூஞ்சை நோய் (*Colletotrichum capsici*)** ஆகும்.',
      direct_tanglish: 'Milagai ilaila karuppu pulligal (black spots) vara mukkiya kaaranam **Xanthomonas bacterial leaf spot** alladhu **Colletotrichum anthracnose poonjai noi** aagum.',
      expl_en: 'Bacterial leaf spot starts as water-soaked spots that rapidly turn dark brown or black with irregular margins. In high humidity, lesions cause severe premature defoliation, leaving fruits vulnerable to sunscald. Anthracnose causes sunken circular necrotic spots on foliage and ripe pods.',
      expl_ta: 'பாக்டீரியா இலைப்புள்ளி நோய் ஆரம்பத்தில் நீர் ஊறிய புள்ளிகளாகத் தோன்றி, பின் ஒழுங்கற்ற கருப்புப் புள்ளிகளாக மாறும். இந்நோய் அதிகமானால் இலைகள் கொட்டி செடி மொட்டையாகிவிடும். அந்திரக்னோஸ் பூஞ்சை நோயால் இலையிலும் காயிலும் பள்ளமான கருப்புப் புள்ளிகள் உருவாகும்.',
      expl_tanglish: 'Bacterial spot vandhal ilaiyil thanneer ooriya pola karuppu pulli thondrum. Kaatril eerappadham adhigamaanaal ilai ellam kotti chedi mottai aaidum. Anthracnose poonjai vandhal kaai matrum ilaiyil sunken black spots varum.',
      treatment_en: [
        'Sanitation: Immediately prune heavily spotted lower leaves and destroy them outside the field.',
        'Approved Bactericide Spray (TNAU / ICAR): Spray Copper Oxychloride 50 WP (2.5g/L) combined with Streptomycin Sulphate (Plantomycin @ 0.5g/L). Repeat after 10–12 days if rains continue.',
        'Bio-Control: Spray *Pseudomonas fluorescens* (10g/L) during cool morning hours.',
        'Irrigation Discipline: Transition strictly to drip irrigation; avoid overhead sprinkling.'
      ],
      treatment_ta: [
        'வயல் சுகாதாரம்: பாதிக்கப்பட்ட கீழ் இலைகளை உடனே பறித்து வயலுக்கு வெளியே தீயிட்டு அழிக்கவும்.',
        'பரிந்துரைக்கப்படும் மருந்து (TNAU வழிகாட்டல்): காப்பர் ஆக்ஸிகுளோரைடு 50 WP (ஒரு லிட்டர் தண்ணீருக்கு 2.5 கிராம்) உடன் ஸ்ட்ரெப்டோமைசின் (Plantomycin 0.5 கிராம்/லிட்டர்) கலந்து தெளிக்கவும். 10-12 நாட்களுக்குப் பின் மீண்டும் தெளிக்கவும்.',
        'இயற்கை உயிரியல் முறை: சூடோமோனாஸ் (Pseudomonas fluorescens 10 கிராம்/லிட்டர்) கரைசலை மாலையில் தெளிக்கவும்.',
        'பாசன மேலாண்மை: இலைகளில் தண்ணீர் தெறிக்காமல் இருக்க சொட்டு நீர்ப்பாசனம் செய்யவும்.'
      ],
      treatment_tanglish: [
        'Sanitation: Baadhikkapatta ilaikalai parithu veliye theeyittu azhikkavum.',
        'Bactericide Spray (TNAU Certified): Copper Oxychloride 50 WP (2.5g/L) + Streptomycin / Plantomycin (0.5g/L) water-il kalandhu thelikkavum. Thevaippattal 10 naal kazhithu marupadi thelikkalam.',
        'Bio-Control: Pseudomonas fluorescens (10g/L) maalai nerathil thelikkavum.',
        'Drip Irrigation: Sottu neer paasanam seiyavum, sprinkler thavirkkavum.'
      ]
    },
    powdery_mildew: {
      crop: 'chilli',
      direct_en: 'Powdery mildew in chilli (*Leveillula taurica*) is prevented and controlled by ensuring adequate air circulation and applying **Wettable Sulphur (2.5g/L)**, **Dinocap (1ml/L)**, or bio-fungicide (*Ampelomyces quisqualis*).',
      direct_ta: 'மிளகாய் பயிரில் சாம்பல் நோயை (*Leveillula taurica*) தடுக்கவும் கட்டுப்படுத்தவும் காற்றோட்டமான இடைவெளியைப் பராமரித்து, ஆரம்பத்திலேயே **நனையும் கந்தகம் (Wettable Sulphur 2.5 கிராம்/லிட்டர்)** அல்லது **டைனோகேப் (1 மி.லி/லி)** தெளிக்க வேண்டும்.',
      direct_tanglish: 'Milagai-il saambal noi (powdery mildew) thadukka matrum kattupadutha **Wettable Sulphur (2.5g/L)** alladhu **Dinocap (1ml/L)** thelikka vendum.',
      expl_en: 'Powdery mildew produces white talcum-like powdery fungal patches on the lower surface of leaves with corresponding yellow chlorotic patches on the upper surface.',
      expl_ta: 'இலையின் அடிப்பகுதியில் வெள்ளை மாவு போன்ற சாம்பல் பூஞ்சைப் படலம் தோன்றும்; மேற்பகுதியில் மஞ்சள் திட்டுக்கள் காணப்படும். நோய் தீவிரமடைந்தால் இலைகள் காய்ந்து உதிர்ந்துவிடும்.',
      expl_tanglish: 'Ilaiyin adippagudhiyil vellai maavu pola poonjai padalam thondrum; melae manjal patches varum.',
      treatment_en: [
        'Fungicide Spray: Spray Wettable Sulphur 80 WP (2.5g/L) or Dinocap (1ml/L) or Hexaconazole 5 EC (1ml/L). Repeat after 14 days if needed.',
        'Organic Bio-Fungicide: Spray Neem oil (5ml/L with soap) or *Trichoderma viride* (5g/L).',
        'Canopy Airflow: Prune excess dense vegetative suckers and maintain proper spacing.'
      ],
      treatment_ta: [
        'பூஞ்சைக் கொல்லி தெளிப்பு: நனையும் கந்தகம் 80 WP (2.5 கிராம்/லிட்டர்) அல்லது ஹெக்சாகோனசோல் (1 மி.லி/லி) தெளிக்கவும்.',
        'இயற்கை முறை: வேப்பெண்ணெய் (5 மி.லி/லிட்டர்) கரைசலை இலைகளின் அடிப்புறம் நனையுமாறு தெளிக்கவும்.',
        'காற்றோட்டம்: செடிகளுக்கு இடையே போதிய இடைவெளியும் காற்றோட்டமும் பராமரிக்கவும்.'
      ],
      treatment_tanglish: [
        'Fungicide Spray: Wettable Sulphur 80 WP (2.5g/L) alladhu Hexaconazole (1ml/L) thelikkavum.',
        'Organic Spray: Veppennai (5ml/L) soap water-odu kalandhu ilaiyin adippagudhiyil thelikkavum.',
        'Airflow: Chedigalukku idaiye nalla kaatrottam maintain seiyavum.'
      ]
    }
  },

  // ================= 4. POTATO (உருளைக்கிழங்கு) =================
  potato: {
    crop: 'potato',
    name_en: 'Potato',
    name_ta: 'உருளைக்கிழங்கு',
    name_tanglish: 'Urulaikilangu',
    overview: {
      crop: 'potato',
      direct_en: 'Potato (*Solanum tuberosum*) is grown primarily in hilly regions of Tamil Nadu (Nilgiris, Dindigul). Top varieties include Kufri Jyoti and Kufri Surya.',
      direct_ta: 'உருளைக்கிழங்கு (*Solanum tuberosum*) தமிழ்நாட்டின் நீலகிரி மற்றும் திண்டுக்கல் மலைப்பகுதிகளில் பெருமளவில் பயிரிடப்படுகிறது. குப்ரி ஜோதி மற்றும் குப்ரி சூர்யா சிறந்த ரகங்கள்.',
      direct_tanglish: 'Urulaikilangu Nilgiris matrum Kodaikanal malai pagudhigalil valarum mukkiya crop. Kufri Jyoti nalla yield tharum variety.',
      expl_en: 'Potato needs cool weather and loose, fertile acidic soil (pH 5.2–6.4). Late blight (*Phytophthora infestans*) is the most destructive disease.',
      expl_ta: 'உருளைக்கிழங்கிற்கு குளிர்ந்த காலநிலையும் மிருதுவான வடிகால் வசதியுள்ள அமில மண்ணும் தேவை. லேட் பிளைட் கருகல் நோய் மிகக் கொடிய நோயாகும்.',
      expl_tanglish: 'Urulaikilangu-kku kulir weather thevai. Late blight karukal noi dhaan mukkiya threat.',
      treatment_en: [
        'Use certified disease-free seed tubers.',
        'Foliar spray of Mancozeb 75 WP (2g/L) or Ridomil MZ (2g/L) against Late Blight.',
        'Practice earthing up at 30 and 45 days after planting.'
      ],
      treatment_ta: [
        'சான்று பெற்ற நோய் தாக்காத விதை கிழங்குகளைப் பயன்படுத்தவும்.',
        'லேட் பிளைட் நோய்க்கு மேன்கோசெப் (2 கிராம்/லி) அல்லது ரிடோமில் (2 கிராம்/லி) தெளிக்கவும்.',
        'நடவு செய்த 30 மற்றும் 45 நாட்களில் மண் அணைக்க வேண்டும்.'
      ],
      treatment_tanglish: [
        'Disease-free seed tubers use panna vendum.',
        'Late blight karukal-kku Mancozeb (2g/L) alladhu Ridomil MZ (2g/L) thelikkavum.',
        '30 matrum 45 naatkalil mann anaikka vendum.'
      ]
    },
    brown_spots: {
      crop: 'potato',
      direct_en: 'Brown lesions on potato leaves are primarily caused by **Late Blight (*Phytophthora infestans*)** or **Early Blight (*Alternaria solani*)**.',
      direct_ta: 'உருளைக்கிழங்கு இலையில் பழுப்பு நிறக் கருகல் புள்ளிகள் தோன்றுவதற்கு முக்கிய காரணம்: **லேட் பிளைட் பூஞ்சை நோய் (*Phytophthora infestans*)** அல்லது **முன்கூட்டிய கருகல் நோய்** ஆகும்.',
      direct_tanglish: 'Urulaikilangu ilaila pazhuppu karukal pulligal vara mukkiya kaaranam **Late Blight poonjai noi** alladhu **Early Blight** aagum.',
      expl_en: 'Late blight produces water-soaked dark brown to black patches that spread rapidly in cool, humid fog. Early blight produces concentric ring target-board brown spots.',
      expl_ta: 'குளிர்ந்த பனிமூட்டமான வானிலையில் லேட் பிளைட் கருகல் நோய் மிக வேகமாகப் பரவி இலைகளையும் கிழங்குகளையும் அழுகச் செய்யும்.',
      expl_tanglish: 'Late blight kulir kaalathil vegamaaga paravum. Early blight concentric rings pola target board pattern tharum.',
      treatment_en: [
        'Foliar Spray: Spray Metalaxyl + Mancozeb (Ridomil MZ @ 2g/L) or Mancozeb 75 WP (2g/L) at first symptom onset.',
        'Sanitation: Destroy infected haulms 10 days before harvest to prevent tuber infection.',
        'Drainage: Avoid water stagnation in furrow beds.'
      ],
      treatment_ta: [
        'பூஞ்சைக் கொல்லி: மெட்டாலாக்சில் + மேன்கோசெப் (ரிடோமில் 2 கிராம்/லிட்டர்) ஆரம்பத்திலேயே தெளிக்கவும்.',
        'சுகாதாரம்: அறுவடைக்கு 10 நாட்கள் முன் காய்ந்த இலைதழைகளை வெட்டி அப்புறப்படுத்தவும்.',
        'வடிகால்: பார் பாத்திகளில் நீர் தேங்காமல் பார்த்துக் கொள்ளவும்.'
      ],
      treatment_tanglish: [
        'Fungicide: Ridomil MZ (2g/L) alladhu Mancozeb (2g/L) thelikkavum.',
        'Harvest Sanitation: Harvest-kku 10 naatkal mun kodiya vetta vendum.',
        'Drainage maintain panna vendum.'
      ]
    }
  },

  // ================= 5. RICE / PADDY (நெல்) =================
  rice: {
    crop: 'rice',
    name_en: 'Paddy / Rice',
    name_ta: 'நெல்',
    name_tanglish: 'Nel',
    overview: {
      crop: 'rice',
      direct_en: 'Paddy (*Oryza sativa*) is the premier staple cereal crop of Tamil Nadu and India. Renowned high-yielding varieties include CR 1009 Sub 1, ADT 45, CO 51, and TKM 13.',
      direct_ta: 'நெல் (*Oryza sativa*) தமிழ்நாட்டின் முதன்மை உணவுப் பயிராகும். CR 1009 Sub 1, ADT 45, CO 51 மற்றும் TKM 13 ஆகியவை சிறந்த ரகங்களாகும்.',
      direct_tanglish: 'Nel (Paddy) Tamil Nadu-vin premier food crop. CR 1009, ADT 45, CO 51 nalla high yielding varieties.',
      expl_en: 'Paddy thrives in clay loam soils with controlled water management. Major yield bottlenecks include Blast fungus, Bacterial Leaf Blight, and Brown Plant Hopper.',
      expl_ta: 'நெல் சாகுபடிக்கு களிமண் கலந்த வண்டல் மண் சிறந்தது. குலை நோய் (Blast), பாக்டீரியா இலைக்கருகல் மற்றும் புகையான் ஆகியவை முக்கிய நோய்களாகும்.',
      expl_tanglish: 'Nel payirukku kaliman nilam nalladhu. Blast noi matrum Bacterial blight thaakkudhal thadukka vendum.',
      treatment_en: [
        'Practice Alternate Wetting and Drying (AWD) to save 30% water and strengthen tillers.',
        'Spray Tricyclazole 75 WP (0.6g/L) for Rice Blast fungus.',
        'Apply balanced Potash (K) to protect against lodging and fungal blights.'
      ],
      treatment_ta: [
        '"காய்ச்சலும் பாய்ச்சலும்" முறையில் பாசனம் செய்து 30% நீரைச் சேமிக்கவும்.',
        'நெல் குலை நோய்க்கு ட்ரைசைக்ளசோல் 75 WP (0.6 கிராம்/லி) தெளிக்கவும்.',
        'மண்ணில் தகுந்த சாம்பல் சத்து (Potash) இட்டு பயிரை வலுப்படுத்தவும்.'
      ],
      treatment_tanglish: [
        'AWD Kaichalum Paachalum thanneer paasanam seiyavum.',
        'Blast noi-kku Tricyclazole 75 WP (0.6g/L) thelikkavum.',
        'Potash uram serkkavum.'
      ]
    },
    brown_spots: {
      crop: 'rice',
      direct_en: 'Brown spots on paddy leaves are caused by **Brown Spot (*Bipolaris oryzae*)** or **Rice Blast (*Magnaporthe oryzae*)**.',
      direct_ta: 'நெல் இலையில் பழுப்பு நிறப் புள்ளிகள் தோன்றுவதற்கு முக்கிய காரணம்: **நெல் பழுப்பு இலைப்புள்ளி நோய் (*Bipolaris oryzae*)** அல்லது **குலை நோய் (Blast)** ஆகும்.',
      direct_tanglish: 'Nel ilaila pazhuppu pulligal vara mukkiya kaaranam **Brown Spot poonjai noi** alladhu **Blast (Kulai noi)** aagum.',
      expl_en: 'Brown spot causes oval to circular brown lesions with yellow chlorotic halos, frequently associated with potassium-deficient, nutrient-depleted soils. Blast causes spindle-shaped spots with ash-gray centers.',
      expl_ta: 'பழுப்பு இலைப்புள்ளி நோயினால் மஞ்சள் வளையத்துடன் கூடிய நீள்வட்ட பழுப்புப் புள்ளிகள் தோன்றும். குலை நோயினால் கண் வடிவத்தில் சாம்பல் நிற மையம் கொண்ட புள்ளிகள் உருவாகும்.',
      expl_tanglish: 'Brown spot vandhal oval pazhuppu pulli varum. Blast vandhal spindle shape konda saambal nira naduppagudhi pulli varum.',
      treatment_en: [
        'Foliar Fungicide: Spray Tricyclazole 75 WP (0.6g/L) or Azoxystrobin 23 SC (1ml/L) or Mancozeb (2g/L).',
        'Nutrient Correction: Apply top-dressing of Muriate of Potash (MOP @ 20 kg/acre) to correct potassium deficiency.',
        'Seed Treatment: Treat paddy seeds with *Pseudomonas fluorescens* (10g/kg) before nursery sowing.'
      ],
      treatment_ta: [
        'பூஞ்சைக் கொல்லி: ட்ரைசைக்ளசோல் 75 WP (0.6 கிராம்/லிட்டர்) அல்லது அஸாக்சிஸ்ட்ரோபின் (1 மி.லி/லி) தெளிக்கவும்.',
        'சாம்பல் சத்து: பொட்டாஷ் சத்து பற்றாக்குறையைப் போக்க ஏக்கருக்கு 20 கிலோ பொட்டாஷ் உரத்தை மேலுரமாக இடவும்.',
        'விதை நேர்த்தி: விதைப்புக்கு முன் விதைகளை சூடோமோனாஸ் (10 கிராம்/கிலோ) கொண்டு நேர்த்தி செய்யவும்.'
      ],
      treatment_tanglish: [
        'Fungicide: Tricyclazole 75 WP (0.6g/L) alladhu Mancozeb (2g/L) thelikkavum.',
        'Potash: Acre-ku 20 kg Potash uram mel-uramaga idavum.',
        'Seed Treatment: Pseudomonas fluorescens kondu vidhai nerthi seiyavum.'
      ]
    }
  },

  // ================= 6. SOIL FERTILITY (மண் வளம்) =================
  soil_fertility: {
    direct_en: 'You can sustainably improve your agricultural soil fertility by incorporating **green manuring (Sunn hemp or Dhaincha)**, applying **well-decomposed FYM or vermicompost**, practicing **legume crop rotation**, and balancing nutrients through a **Soil Health Card test**.',
    direct_ta: 'விவசாய நிலத்தின் மண் வளத்தை நிலையாகவும் இயற்கையாகவும் உயர்த்த: **பசுந்தாள் உரம் (சணப்பை / தக்கைப்பூண்டு)** வளர்த்து மடக்கி உழுதல், **மக்கிய தொழுவுரம் மற்றும் மண்புழு உரம்** இடுதல், **பயறு வகை பயிர் சுழற்சி**, மற்றும் **மண் வள அட்டை பரிசோதனை** அடிப்படையிலான உரமிடுதல் மிகச் சிறந்த வழிகளாகும்.',
    direct_tanglish: 'Vivasaya mann valamai (soil fertility) adhigarikka: **Pasundhaal uram (Sanappai / Dhaincha)** madakki uzhudhal, **Thozhu uram & Manpuzhu uram** idudhal, **Payaru vagaigaludan Payir Suzharchi**, matrum **Soil Health Card** test eduppadhu mukkiya vazhimuraigal aagum.',
    expl_en: 'Soil fertility depends on Soil Organic Carbon (SOC) and active beneficial microbial biology. Green manuring crops fix up to 80–100 kg of atmospheric nitrogen per hectare, while organic compost enhances cation exchange capacity, aerates compacted soil, and increases water retention.',
    expl_ta: 'மண் வளம் என்பது மண்ணில் உள்ள கரிமக்கரிமம் (Organic Carbon) மற்றும் நன்மை செய்யும் நுண்ணுயிரிகளைப் பொறுத்தது. பசுந்தாள் உரப்பயிர்கள் காற்றில் உள்ள தழைச்சத்தை கிரகித்து மண்ணில் நிலைநிறுத்துகின்றன; மண்புழு உரம் மண்ணின் நீர்ப்பிடிப்புத் திறனையும் காற்றோட்டத்தையும் பெருக்கும்.',
    expl_tanglish: 'Mann valam enbadhu Soil Organic Carbon matrum nalladhu seiyum bacteria-vai poruthadhu. Sanappai pontra payirgal kaatril உள்ள Nitrogen-ai mannil serkkum; thozhu uram mannin thanneer thekkum thiranai adhigarikkum.',
    steps_en: [
      'Green Manuring: Sow Sunn hemp (Crotalaria juncea) or Dhaincha (Sesbania aculeata) and plow it back into the soil at 45 days (flowering stage).',
      'Organic Carbon Boost: Apply 10–12 tonnes/acre of well-rotted Farmyard Manure (FYM) or 2 tonnes/acre of Vermicompost during basal land preparation.',
      'Legume Crop Rotation: Rotate cereal crops (paddy, maize) with pulses (black gram, green gram, cowpea) whose root nodule Rhizobium naturally enrich soil nitrogen.',
      'Bio-Fertilizers: Apply Azospirillum / Azotobacter and Phosphobacteria (2 kg/acre each) mixed with 50 kg of FYM.',
      'Soil Testing: Test your soil every two years via the National Soil Health Card scheme to adjust pH using gypsum (for alkaline soils) or agricultural lime (for acidic soils).'
    ],
    steps_ta: [
      'பசுந்தாள் உரம்: சணப்பை அல்லது தக்கைப்பூண்டு விதைகளை விதைத்து, 45 நாட்களில் பூக்கும் பருவத்தில் நிலத்தில் மடக்கி உழவு செய்ய வேண்டும்.',
      'தொழுவுரம் & மண்புழு உரம்: நிலத் தயாரிப்பின் போது ஏக்கருக்கு 5-6 டிராக்டர் மக்கிய தொழுவுரம் அல்லது 2 டன் மண்புழு உரம் இடவும்.',
      'பயிர் சுழற்சி: நெல் அல்லது மக்காச்சோளத்திற்குப் பிறகு உளுந்து, பாசிப்பயறு பயிரிடவும். இவற்றின் வேர் முடிச்சுகள் மண்ணில் நைட்ரஜனை இயற்கையாக உற்பத்தி செய்யும்.',
      'உயிர் உரங்கள்: அசோஸ்பைரில்லம் மற்றும் பாஸ்போபாக்டீரியா உயிர் உரங்களை (ஏக்கருக்கு 2 கிலோ) தொழுவுரத்துடன் கலந்து நிலத்தில் இடவும்.',
      'மண் பரிசோதனை: மண் வள அட்டை திட்டம் மூலம் 2 ஆண்டுகளுக்கு ஒருமுறை மண் பரிசோதனை செய்து அமில/கார நிலைக்கு ஏற்ப சுண்ணாம்பு அல்லது ஜிப்சம் இடவும்.'
    ],
    steps_tanglish: [
      'Sanappai alladhu Dhaincha pottu 45 naatkalil madakki uzhudhal mannukku natural-aga Nitrogen kidaikkum.',
      'Acre-ku nangu makkiya thozhu uram (10 ton) alladhu 2 ton vermicompost poda vendum.',
      'Nel alladhu corn-ku aprom Ulundhu, Paasippayaru payir suzharchi panna vendum.',
      'Azospirillum matrum Phosphobacteria (acre-ku 2 kg) thozhu urathodu serthu idavum.',
      'Mann Vala Attai (Soil Health Card) portal moolam test panni NPK thevaiyai arinthu uramidavum.'
    ]
  },

  // ================= 7. LOW WATER CROPS (குறைந்த நீர்த் தேவை பயிர்கள்) =================
  low_water_crops: {
    direct_en: 'For agricultural land with low water availability or drought conditions, the most profitable and proven crops recommended by TNAU/ICAR are **Millets (Kambu, Ragi, Sorghum)**, **Pulses (Black Gram, Green Gram, Horse Gram)**, and **Oilseeds (Groundnut, Sesame)**.',
    direct_ta: 'குறைந்த பாசன நீர் வசதி கொண்ட நிலங்களுக்கு தமிழ்நாடு வேளாண்மைப் பல்கலைக்கழகம் (TNAU) பரிந்துரைக்கும் சிறந்த பயிர்கள்: **சிறுதானியங்கள் (கம்பு, ராகி, சோளம், குதிரைவாலி)**, **பயறு வகைகள் (உளுந்து, பாசிப்பயறு, கொள்ளு)** மற்றும் **எண்ணெய் வித்துக்கள் (நிலக்கடலை, எள்)** ஆகும்.',
    direct_tanglish: 'Thanni kammiya (water scarcity) irukkura ungal nilathukku, **Sirudhaaniyangal (Millets - Ragi, Kambu, Cholam)**, **Payaru vagaigal (Pulses - Ulundhu, Paasippayaru, Kollu)**, matrum **Nilakkadalai (Groundnut)** thaan migavum sirandha choices.',
    expl_en: 'Millets require up to 70% less water than flooded paddy and mature in 75–90 days with strong drought tolerance. Short-duration pulses (65–70 days) require only 1 to 2 protective irrigations and enrich the soil with nitrogen. Horticultural options like Drumstick (PKM-1) and Guava thrive exceptionally under drip irrigation.',
    expl_ta: 'சிறுதானியங்கள் நெல்லை விட 70% குறைந்த நீரில் செழித்து வளரும், 75-90 நாட்களில் அறுவடை செய்யலாம். உளுந்து மற்றும் பாசிப்பயறு 65-70 நாட்களில் 1 அல்லது 2 உயிர் தண்ணீரில் நல்ல விளைச்சல் தருவதுடன் நிலத்தின் வளத்தையும் பெருக்கும்.',
    expl_tanglish: 'Millets nel-ai vida 70% kammi thanni-la nalla valarum. 75 to 90 naatkalil harvest pannalam. Pulses 65 naatkal short duration payir, 1-2 thanni vittale nalla vilaichal tharum.',
    steps_en: [
      'Cereals / Millets: Plant Pearl Millet (Kambu - CO 10) or Finger Millet (Ragi - CO 15); both possess high heat and moisture-deficit tolerance.',
      'Pulses: Sow Black Gram (VBN 8) or Green Gram (CO 8) treated with Rhizobium bio-fertilizer.',
      'Oilseeds: In well-drained sandy loam or red soil, plant Groundnut (TMV 13 or VRI 8) under protective sprinkler or drip irrigation.',
      'Horticulture: Consider Cluster Beans or Perennial Drumstick (PKM 1) which require minimal water.',
      'Micro-Irrigation Subsidy: Apply for 75% to 100% government subsidy for Drip Irrigation through the Tamil Nadu Department of Agriculture (Uzhavan App).'
    ],
    steps_ta: [
      'சிறுதானியங்கள்: கம்பு (CO 10) அல்லது ராகி (CO 15) விதைக்கவும்; இவை வறட்சியைத் தாங்கி 80 நாட்களில் மகசூல் தரும்.',
      'பயறு வகைகள்: உளுந்து (VBN 8) அல்லது பாசிப்பயறு (CO 8) விதைகளை ரைசோபியம் உயிர் உர நேர்த்தி செய்து விதைக்கவும்.',
      'எண்ணெய் வித்துக்கள்: செம்மண் நிலங்களில் நிலக்கடலை (TMV 13) குறைந்த பாசன நீரில் அதிக லாபம் தரும்.',
      'தோட்டக்கலை: கொத்தவரங்காய் அல்லது செடி முருங்கை (PKM 1) போன்றவற்றை சொட்டு நீர்ப்பாசனத்தில் பயிரிடலாம்.',
      'சொட்டு நீர்ப்பாசன மானியம்: உழவன் செயலி மூலம் தோட்டக்கலைத் துறையை அணுகி 75% முதல் 100% அரசு மானியத்தில் சொட்டு நீர்ப்பாசனம் அமைத்துக் கொள்ளவும்.'
    ],
    steps_tanglish: [
      'Sirudhaaniyangal: Kambu (Pearl millet) alladhu Ragi podalam, 80 naatkalil harvest pannalam.',
      'Payaru Vagaigal: Ulundhu (Black gram - VBN 8) alladhu Paasippayaru 1-2 thanni paasanathil valarum.',
      'Oilseeds: Red soil/manal paangaana nilam endral Nilakkadalai (Groundnut) podalam.',
      'Thottakkalai: Chedi Murungai (PKM-1) alladhu Kothavarangai kammi thanni-la valarum.',
      'Drip Irrigation: Uzhavan app moolam 75% to 100% arasu maaniyathil sottu neer paasanam amaithukollalam.'
    ]
  },

  // ================= 8. PADDY IRRIGATION SCHEDULE (நெல் பாசனம்) =================
  paddy_irrigation: {
    direct_en: 'The optimal water management system for paddy (rice) is **Alternate Wetting and Drying (AWD - "Kaychalo Paachalo")**, which saves 30% water without reducing yield while maintaining standing water only during critical flowering.',
    direct_ta: 'நெல் பயிரில் அதிக மகசூல் பெறவும் 30% நீரைச் சேமிக்கவும் தமிழ்நாடு வேளாண்மைப் பல்கலைக்கழகம் (TNAU) பரிந்துரைக்கும் முறை **"காய்ச்சலும் பாய்ச்சலும்" (AWD)** பாசன முறையாகும்.',
    direct_tanglish: 'Nel payirukku thanneer paasanam seiyum sariyana murai **"Kaichalum Paachalum" (Alternate Wetting and Drying - AWD)** aagum. Idhu 30% thanneerai semikkum.',
    expl_en: 'Continuous deep flooding suffocates rice roots and breeds anaerobic root-rot fungi. Shallow water is only needed during seedling establishment, while 5 cm standing water is STRICTLY MANDATORY during panicle initiation to flowering. Water stress during flowering creates empty, chaffy grains.',
    expl_ta: 'தொடர்ந்து அதிக நீர் தேங்கி நின்றால் நெல் வேர்களுக்கு காற்றோட்டம் கிடைக்காமல் வேர் அழுகல் ஏற்படும். கதிர் உருவாகும் மற்றும் பூக்கும் பருவத்தில் (35-70 நாட்கள்) 5 செ.மீ நீர் கட்டாயம் நிற்க வேண்டும். இப்பருவத்தில் நீர் குறைந்தால் மணிகள் சாவியாகிவிடும்.',
    expl_tanglish: 'Thodarndhu adhigamaaga thanni nirkavum koodathu. Kathir varum matrum pookkum paruvathil (35-70 naatkal) 5 cm thanni KATTAYAM nirkavum; illaiyendraal nel mani saavi aaidum.',
    steps_en: [
      'Days 1–10 (Establishment): Maintain 2 cm shallow standing water for seedling rooting.',
      'Days 10–35 (Active Tillering): Keep shallow 2 to 5 cm water to encourage maximum productive tillers.',
      'Days 35–70 (Panicle Initiation & Flowering): CRITICAL STAGE — Maintain 5 cm continuous standing water. Never let moisture stress occur here.',
      'Days 70–95 (Grain Filling): Adopt Alternate Wetting and Drying. Re-irrigate only when fine hairline cracks appear on the soil surface.',
      'Pre-Harvest Drainage: Completely drain standing water 7 to 10 days before harvest for uniform ripening and easy harvester movement.'
    ],
    steps_ta: [
      '1 முதல் 10 நாட்கள்: 2 செ.மீ அளவு குறைந்த நீர் பராமரிக்கவும்.',
      '10 முதல் 35 நாட்கள் (தூர் கட்டும் பருவம்): 2 முதல் 5 செ.மீ நீர் வைத்தால் அதிக உற்பத்தித் தூர்கள் உருவாகும்.',
      '35 முதல் 70 நாட்கள் (கதிர் உருவாகும் & பூக்கும் பருவம்): 5 செ.மீ நீர் கட்டாயம் நிற்க வேண்டும். இங்கு தண்ணீர் குறைந்தால் சாவிக் காய் உருவாகும்.',
      '70 முதல் 95 நாட்கள் (பால் பிடிக்கும் பருவம்): "காய்ச்சலும் பாய்ச்சலும்" முறையில் தரை வெடிப்பு தோன்றிய பின் நீர் பாய்ச்சவும்.',
      'அறுவடைக்கு முன் (7–10 நாட்கள் முன்): வயல் நீரை முழுமையாக வடித்துவிடவும்.'
    ],
    steps_tanglish: [
      '1-10 naatkal: 2 cm kuraivaana thanni nirkavum.',
      '10-35 naatkal (Thoor Kattum Paruvam): 2-5 cm thanneer paasanam seiyavum.',
      '35-70 naatkal (Kathir Varum & Pookkum Paruvam): 5 cm thanneer KATTAYAM nirkavum. Thanni koranja saavi kaai aaidum.',
      '70-95 naatkal: Kaichalum Paachalum muraiyil thanni vidavum.',
      'Aruvadai Munpaga (Harvest-ku 7-10 naatkal mun): Thanneerai muzhumaiyaaga vadithu vida vendum.'
    ]
  },

  // ================= 9. SCHEMES ELIGIBILITY & SUBSIDY CRITERIA (அரசு மானியத் தகுதி) =================
  schemes_eligibility: {
    direct_en: 'To be eligible for major central and Tamil Nadu agricultural subsidies (PM-KISAN, PMFBY, Solar Pump, Drip Irrigation, SMAM), a farmer must possess **cultivable agricultural land with valid Patta / Chitta**, an **Aadhaar card linked to an active bank account**, and register via **pmkisan.gov.in** or the **Uzhavan App**.',
    direct_ta: 'மத்திய மற்றும் தமிழ்நாடு அரசின் வேளாண் மானியங்களைப் பெற (PM-KISAN, சோலார் பம்ப், சொட்டு நீர்ப்பாசனம், SMAM இயந்திர மானியம்): விவசாயிக்கு சொந்தமான **விவசாய நிலம் (பட்டா / சிட்டா)**, **வங்கி கணக்குடன் இணைக்கப்பட்ட ஆதார் அட்டை**, மற்றும் **உழவன் செயலி பதிவு** ஆகியவை முக்கிய தகுதிகளாகும்.',
    direct_tanglish: 'Arasu velanmai maaniyagal (subsidy) apply panna mukkiya eligibility: ungal peyaril **vivasaya nilam (Patta / Chitta)**, **Aadhaar linked bank account**, matrum **Uzhavan App / PM-KISAN portal registration** kattayam thevai.',
    expl_en: 'Eligibility criteria vary by specific scheme:\n• **PM-KISAN (₹6,000/yr)**: All landholder farmer families with cultivable land in their name.\n• **TN Solar Pump (70% - 90% Subsidy)**: Small/marginal farmers (up to 5 acres) receive 90% subsidy with open well/borewell and TANGEDCO EB NOC.\n• **Micro Irrigation (PMKSY)**: 100% subsidy for small/marginal farmers and 75% for other farmers in Tamil Nadu.\n• **SMAM Machinery Subsidy**: 40% to 50% capital subsidy for tractors, power tillers, and rotavators.',
    expl_ta: 'முக்கிய திட்டங்களுக்கான தகுதி விவரங்கள்:\n• **பிஎம்-கிசான் (ரூ.6,000 உதவித்தொகை)**: பட்டா உள்ள அனைத்து சிறு/குறு விவசாயிகள்.\n• **சோலார் பம்ப் 90% மானியம்**: 5 ஏக்கருக்குள் நிலம் உள்ள சிறு/குறு விவசாயிகளுக்கு 90% மானியம்; கிணறு/ஆழ்துளைக் கிணறுடன் மின்வாரிய தடையின்மை சான்று (NOC) தேவை.\n• **சொட்டு நீர்ப்பாசனம்**: சிறு/குறு விவசாயிகளுக்கு 100% முழு மானியம்; பிற விவசாயிகளுக்கு 75% மானியம்.\n• **வேளாண் இயந்திரங்கள் (SMAM)**: டிராக்டர், பவர் டில்லருக்கு 40% முதல் 50% வரை மானியம்.',
    expl_tanglish: 'Mukkiya Thittangalin Eligibility:\n• **PM-KISAN (₹6,000/yr)**: Sondha nilam (Patta) irukkura small/marginal vivasayigal apply pannalam.\n• **Solar Pump (90% Subsidy)**: 5 acre-kku kuraivaana small farmers-ku 90% subsidy; borewell/kinaru matrum EB NOC thevai.\n• **Drip Irrigation**: Small/marginal farmers-ku 100% full maaniyam; periya farmers-ku 75% maaniyam.\n• **SMAM Machinery**: Tractor/power tiller-ku 40-50% subsidy kidaikkum.',
    steps_en: [
      'Step 1 - Document Readiness: Gather updated Patta, Chitta, Adangal, Aadhaar Card, active Bank Passbook, and Ration Card.',
      'Step 2 - PM-KISAN Portal: Register or update e-KYC directly at https://pmkisan.gov.in using Aadhaar OTP.',
      'Step 3 - Uzhavan App (Tamil Nadu): Download the Uzhavan App to apply for Solar Pump, Drip Irrigation, and free seed distribution.',
      'Step 4 - Agricultural Engineering Dept (AED): Submit borewell yield test and EB NOC for solar pump installation.',
      'Step 5 - Local Assistance: Contact your Block Assistant Director of Agriculture (ADA) or Village Administrative Officer (VAO).'
    ],
    steps_ta: [
      'படி 1 - ஆவணங்கள்: பட்டா, சிட்டா, அடங்கல், ஆதார் அட்டை, வங்கி பாஸ்புக் மற்றும் குடும்ப அட்டை ஆகியவற்றை தயார் செய்யவும்.',
      'படி 2 - பிஎம்-கிசான் இணையதளம்: https://pmkisan.gov.in தளத்தில் ஆதார் ஓடிபி மூலம் e-KYC புதுப்பிக்கவும்.',
      'படி 3 - உழவன் செயலி: தமிழ்நாடு உழவன் செயலியில் உள்நுழைந்து சோலார் பம்ப் மற்றும் சொட்டு நீர்ப்பாசனத்திற்கு விண்ணப்பிக்கவும்.',
      'படி 4 - மின்வாரிய சான்று: சோலார் பம்ப் அமைக்க கிணறு/ஆழ்துளைக் கிணற்றுக்கான மின்வாரிய தடையின்மை சான்று பெறவும்.',
      'படி 5 - வேளாண் அலுவலகம்: உங்கள் வட்டார வேளாண்மை உதவி இயக்குநர் (ADA) அல்லது கிராம நிர்வாக அலுவலரை (VAO) அணுகவும்.'
    ],
    steps_tanglish: [
      'Padi 1 - Documents: Patta, Chitta, Adangal, Aadhaar, Bank Passbook eduthu veiyunga.',
      'Padi 2 - PM-KISAN: pmkisan.gov.in portal-il Aadhaar e-KYC update pannunga.',
      'Padi 3 - Uzhavan App: Uzhavan app install panni Solar pump matrum Sottu neer paasanathukku apply seiyalam.',
      'Padi 4 - EB NOC: Solar pump-kku TANGEDCO/EB NOC vaangi AED-il samarpikkavum.',
      'Padi 5 - Local ADA: Ungal vattaara Velaanmai Udhavi Iyakkunar (ADA) office-ai thodarbu kollalam.'
    ]
  }
};

/**
 * Language Detector: distinguishes Tamil script, Tanglish (Latin script Tamil), and English.
 */
function detectLanguage(text, userPrefLang) {
  if (!text) return userPrefLang || 'en';

  // 1. Pure Tamil script check (Unicode range \u0B80-\u0BFF)
  const tamilCharCount = (text.match(/[\u0B80-\u0BFF]/g) || []).length;
  if (tamilCharCount >= 2 || (userPrefLang === 'ta' && tamilCharCount > 0)) {
    return 'ta';
  }

  // 2. Tanglish check (Tamil transliterated into English script)
  const lower = text.toLowerCase();
  const tanglishMarkers = [
    'thakkali', 'kathirikai', 'kathari', 'ilaila', 'ilaiyil', 'ilai', 'elai', 'manjal', 'pulli', 'pulligal',
    'ah irukku', 'irukku', 'irukuthu', 'varudhu', 'varugiradhu', 'enna', 'pannalam',
    'panradhu', 'seiyanum', 'seivadhu', 'thanni', 'thanneer', 'paasanam', 'kammiya',
    'irukkura', 'podalam', 'valatha', 'nel', 'nellu', 'payir', 'vayal', 'uram',
    'marundhu', 'thelipadhu', 'noi', 'solunga', 'epdi', 'eppadi', 'edhuku', 'nalla',
    'kollu', 'ulundhu', 'kambu', 'cholam', 'kadala', 'vazhai', 'ooru', 'vivasayam',
    'indha', 'treatment enna', 'eligibility', 'apply panna', 'control panna', 'milagai',
    'karuppu', 'vellai', 'koodiya', 'ippo', 'pathu', 'pathi'
  ];

  let tanglishScore = 0;
  for (const marker of tanglishMarkers) {
    if (lower.includes(marker)) tanglishScore++;
  }

  if (
    tanglishScore >= 2 ||
    (tanglishScore >= 1 && (
      lower.includes('ah irukku') || lower.includes('kammiya') || lower.includes('podalam') ||
      lower.includes('panradhu') || lower.includes('varudhu') || lower.includes('thanni') ||
      lower.includes('thakkali') || lower.includes('kathari') || lower.includes('enna problem') ||
      lower.includes('indha disease') || lower.includes('apply panna') || lower.includes('treatment enna') ||
      lower.includes('control panna') || lower.includes('ippo')
    ))
  ) {
    return 'tanglish';
  }

  if (userPrefLang === 'ta') {
    return 'ta';
  }

  return 'en';
}

/**
 * Extract intent and symptoms from message.
 */
function extractIntentAndEntities(message, history = []) {
  const lower = (message || '').toLowerCase();

  // 1. Detect Symptoms / Condition
  let symptom = null;
  if (lower.includes('black spot') || lower.includes('black spots') || lower.includes('dark spot') || lower.includes('கருப்பு') || lower.includes('karuppu pulli')) {
    symptom = 'black_spots';
  } else if (lower.includes('brown spot') || lower.includes('brown') || lower.includes('பழுப்பு') || lower.includes('pazhuppu') || lower.includes('early blight') || lower.includes('karukal pulli') || lower.includes('phomopsis') || lower.includes('tikka')) {
    symptom = 'brown_spots';
  } else if (lower.includes('powdery mildew') || lower.includes('mildew') || lower.includes('white patch') || lower.includes('white patches') || lower.includes('white powder') || lower.includes('சாம்பல் நோய்') || lower.includes('saambal noi') || lower.includes('vellai pulli')) {
    symptom = 'powdery_mildew';
  } else if (lower.includes('yellow') || lower.includes('மஞ்சள்') || lower.includes('manjal') || lower.includes('chlorosis') || lower.includes('little leaf')) {
    symptom = 'yellow_spots';
  } else if (lower.includes('borer') || lower.includes('shoot borer') || lower.includes('fruit borer') || lower.includes('துளைப்பான்') || lower.includes('thulaipaan') || lower.includes('puzhu') || lower.includes('புழு')) {
    symptom = 'shoot_fruit_borer';
  } else if (lower.includes('fungal') || lower.includes('fungus') || lower.includes('பூஞ்சை') || lower.includes('poonjai') || lower.includes('blight')) {
    symptom = 'fungal';
  }

  // Antecedent resolution for symptom from history if absent in current message
  if (!symptom && Array.isArray(history) && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const prevText = (history[i]?.text || history[i]?.message || '').toLowerCase();
      if (prevText.includes('black spot') || prevText.includes('karuppu')) { symptom = 'black_spots'; break; }
      if (prevText.includes('powdery mildew') || prevText.includes('saambal noi')) { symptom = 'powdery_mildew'; break; }
      if (prevText.includes('brown spot') || prevText.includes('brown') || prevText.includes('pazhuppu') || prevText.includes('karukal')) { symptom = 'brown_spots'; break; }
      if (prevText.includes('yellow') || prevText.includes('manjal')) { symptom = 'yellow_spots'; break; }
      if (prevText.includes('borer') || prevText.includes('thulaipaan')) { symptom = 'shoot_fruit_borer'; break; }
    }
  }

  // 2. Treatment Intent Detection
  const isTreatmentQuery = (
    lower.includes('treat') || lower.includes('cure') || lower.includes('control') || lower.includes('manage') ||
    lower.includes('spray') || lower.includes('medicine') || lower.includes('pesticide') || lower.includes('fungicide') ||
    lower.includes('bactericide') || lower.includes('சிகிச்சை') || lower.includes('மருந்து') || lower.includes('கட்டுப்படுத்த') ||
    lower.includes('குணப்படுத்த') || lower.includes('marundhu') || lower.includes('thelikkanum') || lower.includes('kattupadutha') ||
    lower.includes('how can i treat it') || lower.includes('how to treat') || lower.includes('treat it') ||
    lower.includes('how to control') || lower.includes('control panna') || lower.includes('indha disease') ||
    lower.includes('treatment enna') || lower.includes('enna treatment')
  );

  // 3. Intent Classification across Agricultural Domains
  let intent = 'general';

  // Out of Scope Check
  const outOfScopePatterns = [
    /\b(cricket|football|movie|cinema|actor|actress|song|car|bike|laptop|iphone|crypto|bitcoin)\b/,
    /\b(python code|javascript code|react code|html code|write a program|solve equation)\b/,
    /\b(capital of|president of|prime minister of|who is|who won|score)\b/
  ];
  for (const pat of outOfScopePatterns) {
    if (pat.test(lower)) {
      intent = 'out_of_scope';
      return { intent, symptom, isTreatmentQuery };
    }
  }

  if (
    (lower.includes('subsidy') || lower.includes('scheme') || lower.includes('திட்டம்') || lower.includes('மானிய')) &&
    (lower.includes('eligibility') || lower.includes('eligible') || lower.includes('apply') || lower.includes('தகுதி') || lower.includes('விண்ணப்பிக்க') || lower.includes('vinnapikka') || lower.includes('thevai'))
  ) {
    intent = 'schemes_eligibility';
  } else if (
    lower.includes('soil fertility') || lower.includes('improve soil') || lower.includes('soil health') ||
    lower.includes('மண் வளம்') || lower.includes('மண்ணின் வளம்') || lower.includes('mann valam') || lower.includes('mannai valam')
  ) {
    intent = 'soil_fertility';
  } else if (
    (lower.includes('water kammi') || lower.includes('kammiya') || lower.includes('low water') || lower.includes('water scarcity') || lower.includes('drought') || lower.includes('குறைந்த நீர்') || lower.includes('வறட்சி')) &&
    (lower.includes('crop') || lower.includes('podalam') || lower.includes('payir') || lower.includes('plant') || lower.includes('cultivate') || lower.includes('land'))
  ) {
    intent = 'low_water_crops';
  } else if (
    (lower.includes('water') || lower.includes('irrigation') || lower.includes('watering') || lower.includes('பாசனம்') || lower.includes('தண்ணீர்') || lower.includes('thanni')) &&
    (lower.includes('paddy') || lower.includes('rice') || lower.includes('schedule') || lower.includes('stage') || lower.includes('nellu') || lower.includes('kaichalo'))
  ) {
    intent = 'irrigation';
  } else if (
    (lower.includes('powdery mildew')) ||
    (lower.includes('mildew') && (lower.includes('prevent') || lower.includes('control') || lower.includes('thadukka'))) ||
    (lower.includes('சாம்பல் நோய்') && (lower.includes('தடுக்க') || lower.includes('கட்டுப்படுத்த'))) ||
    (lower.includes('saambal noi') && (lower.includes('thadukka') || lower.includes('kattupadutha')))
  ) {
    intent = isTreatmentQuery ? 'disease_treatment' : 'powdery_mildew';
  } else if (isTreatmentQuery) {
    intent = 'disease_treatment';
  } else if (
    symptom ||
    lower.includes('disease') || lower.includes('problem') || lower.includes('causes') || lower.includes('காரணம்') || lower.includes('kaaranam') || lower.includes('noi') || lower.includes('நோய்')
  ) {
    intent = 'disease_causes';
  } else if (
    lower.includes('scheme') || lower.includes('subsidy') || lower.includes('திட்டம்') || lower.includes('மானிய') ||
    lower.includes('pm-kisan') || lower.includes('pmfby') || lower.includes('solar pump') || lower.includes('காப்பீடு')
  ) {
    intent = 'schemes';
  } else if (
    lower.includes('weather') || lower.includes('rain') || lower.includes('வானிலை') || lower.includes('மழை') || lower.includes('temperature')
  ) {
    intent = 'weather';
  } else if (/^(hi|hello|vanakkam|வணக்கம்|greetings|hey)\b/i.test(lower.trim())) {
    intent = 'greeting';
  }

  return { intent, symptom, isTreatmentQuery };
}

/**
 * Format verified sources into clickable markdown citation links.
 */
function formatSourceCitations(sources, lang) {
  if (!Array.isArray(sources) || sources.length === 0) return '';

  let header = '';
  if (lang === 'ta') {
    header = '\n\n**சரிபார்க்கப்பட்ட மூலங்கள் (Verified Online Sources):**\n';
  } else if (lang === 'tanglish') {
    header = '\n\n**Verified Sources (Thagaval Moolangal):**\n';
  } else {
    header = '\n\n**Verified Sources:**\n';
  }

  const citations = sources.map((s) => {
    const org = s.organization ? ` — *${s.organization}*` : '';
    return `• [${s.title}](${s.url})${org}`;
  });

  return header + citations.join('\n');
}

/**
 * Assemble response adhering to the 4-part structure:
 * 1. Direct answer
 * 2. Simple explanation
 * 3. What to do next
 * 4. Sources
 */
function assembleStructuredResponse({ direct, explanation, nextSteps, sources, lang }) {
  let directHeader = '**Direct Answer:**';
  let explHeader = '**Simple Explanation:**';
  let nextHeader = '**What to Do Next:**';

  if (lang === 'ta') {
    directHeader = '**நேரடி பதில் (Direct Answer):**';
    explHeader = '**எளிய விளக்கம் (Simple Explanation):**';
    nextHeader = '**அடுத்து என்ன செய்ய வேண்டும் (What to Do Next):**';
  } else if (lang === 'tanglish') {
    directHeader = '**Direct Answer:**';
    explHeader = '**Simple Explanation:**';
    nextHeader = '**Aduthu Enna Seiyanum (What to Do Next):**';
  }

  const parts = [];

  if (direct) {
    parts.push(`${directHeader}\n${direct}`);
  }

  if (explanation) {
    parts.push(`${explHeader}\n${explanation}`);
  }

  if (Array.isArray(nextSteps) && nextSteps.length > 0) {
    const formattedSteps = nextSteps
      .map((step, idx) => (/^\d+\./.test(step.trim()) ? step : `${idx + 1}. ${step}`))
      .join('\n');
    parts.push(`${nextHeader}\n${formattedSteps}`);
  }

  let fullResponse = parts.join('\n\n');
  const citations = formatSourceCitations(sources, lang);
  if (citations) {
    fullResponse += citations;
  }

  return fullResponse;
}

/**
 * Formats cross-crop discrepancy note if the user text asks about a different crop than the uploaded image.
 */
function formatImageDiscrepancyNotice(discrepancy, lang) {
  if (!discrepancy) return '';
  const { imageCrop, imageDisease, userCrop } = discrepancy;
  const imgLabel = imageCrop.toUpperCase();
  const userLabel = userCrop.toUpperCase();
  const disLabel = imageDisease ? ` (${imageDisease})` : '';

  if (lang === 'ta') {
    return `> 💡 **குறிப்பு:** நீங்கள் சமீபத்தில் பதிவேற்றிய படம் **${imgLabel}${disLabel}** என அடையாளம் காணப்பட்டது, ஆனால் உங்கள் தற்போதைய கேள்வி **${userLabel}** பற்றியது. உங்கள் **${userLabel}** பயிருக்கான துல்லியமான தீர்வு கீழே வழங்கப்பட்டுள்ளது:\n\n`;
  } else if (lang === 'tanglish') {
    return `> 💡 **Note:** Neenga upload panna photo **${imgLabel}${disLabel}**, aanaal ippo ungal kelvi **${userLabel}** pathi irukku. Ungal **${userLabel}** payirukku sariyana thirvu:\n\n`;
  } else {
    return `> 💡 **Notice:** Your recently analyzed image was diagnosed as **${imgLabel}${disLabel}**, whereas your current inquiry is about **${userLabel}**. Here is the certified guidance specifically for **${userLabel}**:\n\n`;
  }
}

/**
 * Generates clarifying question when user asks a disease query without specifying any crop.
 */
function generateCropClarificationResponse(lang) {
  if (lang === 'ta') {
    return assembleStructuredResponse({
      direct: 'தயவுசெய்து நீங்கள் எந்தப் பயிரைக் குறிப்பிடுகிறீர்கள் என்பதைத் தெரிவிக்கவும் (எ.கா: தக்காளி, கத்தரி, மிளகாய், நெல், உருளைக்கிழங்கு, நிலக்கடலை, பீன்ஸ்).',
      explanation: 'ஒவ்வொரு பயிருக்கும் நோய்க்கான காரணங்களும் பூஞ்சைக் கொல்லி மருந்துகளின் அளவுகளும் மாறுபடும். பயிரின் பெயரைக் குறிப்பிட்டால் ICAR மற்றும் TNAU வழிகாட்டுதல்படி துல்லியமான தீர்வை வழங்க முடியும்.',
      nextSteps: [
        'உங்கள் பயிரின் பெயரைத் தட்டச்சு செய்யவும் (எ.கா: "கத்தரி", "தக்காளி", "மிளகாய்").',
        'இலையில் தோன்றும் அறிகுறிகளைக் குறிப்பிடவும் (எ.கா: பழுப்புப் புள்ளி, மஞ்சள் நிறம், குருத்து வாடல்).',
        'துல்லியமான கணிப்புக்கு எங்களது "Plant Disease" பக்கத்தில் இலை புகைப்படத்தைப் பதிவேற்றலாம்.'
      ],
      sources: [],
      lang
    });
  } else if (lang === 'tanglish') {
    return assembleStructuredResponse({
      direct: 'Neenga endha payir (crop) patri kekkuringa nu mention pannunga (e.g., Thakkali, Kathirikai, Milagai, Nel, Potato, Beans)?',
      explanation: 'Ovvoru crop-kum disease pathogen matrum TNAU certified fungicide dosage differ aagum. Crop name sonneenga na accurate thirvu solla mudiyum.',
      nextSteps: [
        'Ungal crop name type pannunga (e.g., "Kathirikai", "Thakkali", "Milagai").',
        'Ilai arikurigalai sollunga (brown spot, manjal ilai, kuruthu vaadudhal).',
        'Alladhu "Plant Disease" tab-il leaf photo upload panni instant AI test pannalam.'
      ],
      sources: [],
      lang
    });
  } else {
    return assembleStructuredResponse({
      direct: 'Please specify which crop you are inquiring about (e.g., Tomato, Brinjal, Chilli, Paddy, Potato, Groundnut, Bean).',
      explanation: 'Different crops are infected by distinct fungal/bacterial pathogens, and approved fungicide dosages differ strictly across plant species. Stating your crop identity ensures an accurate ICAR/TNAU certified diagnosis.',
      nextSteps: [
        'State your crop name clearly (e.g., "Brinjal", "Tomato", "Chilli", "Paddy").',
        'Describe the leaf symptoms (e.g., brown spots, yellowing, curled margins, wilting).',
        'Alternatively, upload a close-up leaf photograph in our "Plant Disease" tab for automated visual AI identification.'
      ],
      sources: [],
      lang
    });
  }
}

/**
 * Core Grounded Response Generator routing by crop identity first.
 */
function generateGroundedResponse(intent, crop, symptom, lang, originalMessage, webResearch = {}, imageDiscrepancyNotice = null) {
  const sources = webResearch.sources || [];
  const weather = webResearch.weather || null;
  const discrepancyPrefix = formatImageDiscrepancyNotice(imageDiscrepancyNotice, lang);

  // 1. OUT OF SCOPE
  if (intent === 'out_of_scope') {
    if (lang === 'ta') {
      return (
        'மன்னிக்கவும்! நான் வேளாண்மை, பயிர் மேலாண்மை, மண் வளம் மற்றும் அரசு விவசாய மானியங்கள் தொடர்பான கேள்விகளுக்கு மட்டுமே பதிலளிக்க வடிவமைக்கப்பட்ட அக்ரிகனெக்ட் AI உதவியாளர் 🌾.\n\n' +
        'தயவுசெய்து உங்கள் பயிர்கள், பயிர் நோய்கள், பாசனம் அல்லது உழவன் திட்டங்கள் குறித்த கேள்விகளைக் கேளுங்கள்.'
      );
    } else if (lang === 'tanglish') {
      return (
        'Mannikkavum! Naan AgriConnect AI Farming Assistant 🌾. Vivasayam, Payir noigal, Mann valam, matrum Arasu Velanmai Thittangal patri mattume ennaal bathil solla mudiyum.\n\n' +
        'Dhayavu seidhu farming related kelvigalai kelungal!'
      );
    } else {
      return (
        'I apologize, but as the AgriConnect AI Farming Assistant 🌾, my expertise is dedicated exclusively to agriculture, crop disease diagnosis, soil fertility, irrigation, and government farming subsidies.\n\n' +
        'Please feel free to ask any question related to farming and crop management.'
      );
    }
  }

  // 2. GREETING
  if (intent === 'greeting') {
    if (lang === 'ta') {
      return (
        'வணக்கம்! நான் உங்கள் அக்ரிகனெக்ட் AI விவசாய உதவியாளர் 🌾.\n\n' +
        'உங்களுக்கு பின்வரும் தலைப்புகளில் உதவத் தயார்:\n' +
        '• கத்தரி, தக்காளி, மிளகாய் உள்ளிட்ட பயிர் நோய்கள் மற்றும் TNAU சிகிச்சை\n' +
        '• மண் வளம் அதிகரித்தல் மற்றும் இயற்கை உரங்கள்\n' +
        '• குறைந்த நீர் வசதிக்கான வறட்சி தாங்கும் மாற்றுப் பயிர்கள்\n' +
        '• நெல் பாசன அட்டவணை (காய்ச்சலும் பாய்ச்சலும் முறை)\n' +
        '• அரசு மானியங்கள் மற்றும் திட்டங்கள் (PM-KISAN, PMFBY, Solar Pump)\n\n' +
        'உங்களுடைய விவசாயக் கேள்வியை தமிழில் கேட்கலாம் அல்லது தட்டச்சு செய்யலாம்!'
      );
    } else if (lang === 'tanglish') {
      return (
        'Vanakkam! Naan ungaloda AgriConnect AI Vivasaya Thozhan 🌾.\n\n' +
        'Ungalukku enna help thevai? Kathirikai, Thakkali, Milagai payir noigal, Mann valam, Kammi thannikku yetha crops, Nel thanneer paasanam, alladhu Arasu thittangal patri edhuvanaalum kelungal, udaney bathil tharugiren!'
      );
    } else {
      return (
        'Greetings! I am your AgriConnect AI Farming Assistant 🌾.\n\n' +
        'I am here to assist you with:\n' +
        '• Diagnosing crop diseases (Brinjal, Tomato, Chilli, Paddy, etc.)\n' +
        '• Improving soil fertility and organic carbon\n' +
        '• Selecting drought-tolerant crops for low-water lands\n' +
        '• Scientific irrigation schedules (e.g. Paddy AWD)\n' +
        '• Central and State agricultural subsidies (PM-KISAN, PMFBY, Solar Pumps)\n\n' +
        'How may I assist your farm today?'
      );
    }
  }

  // 3. WEATHER
  if (intent === 'weather' && weather) {
    if (lang === 'ta') {
      return assembleStructuredResponse({
        direct: `**${weather.location}** பகுதிக்கான நிகழ்நேர வானிலை நிலவரம்: வெப்பநிலை **${weather.temperature}** (குறைந்தபட்சம்: ${weather.minTemp}, அதிகபட்சம்: ${weather.maxTemp}), ஈரப்பதம் **${weather.humidity}**, மழைப்பொழிவு **${weather.precipitation}**, தற்போதைய நிலை: **${weather.condition}**.`,
        explanation: 'காற்றில் அதிக ஈரப்பதம் நிலவும் போது பயிர்களில் பூஞ்சை நோய்கள் மற்றும் இலைக்கருகல் வேகமாகப் பரவும் வாய்ப்புள்ளது.',
        nextSteps: [
          'மழை வாய்ப்பு உள்ள போது இலைகளில் பூஞ்சைக் கொல்லி மருந்து தெளிப்பதைத் தற்காலிகமாக ஒத்திவைக்கவும்.',
          'வயல் வடிகால் வாய்க்கால்களை தூர்வாரி நீர் தேங்காமல் பார்த்துக் கொள்ளவும்.'
        ],
        sources,
        lang
      });
    } else if (lang === 'tanglish') {
      return assembleStructuredResponse({
        direct: `**${weather.location}** live weather: Temperature **${weather.temperature}**, Eerappadham (Humidity) **${weather.humidity}**, Mazhai (Precipitation) **${weather.precipitation}**, Nilavaram: **${weather.condition}**.`,
        explanation: 'Kaatril eerappadham adhigamaanaal poonjai karukal noi vegamaaga paravum vaaippu irukku.',
        nextSteps: [
          'Mazhai peyyum pothu foliar spray thelikka vendam.',
          'Vayalil thanni thengaamal vadigaal amaikkavum.'
        ],
        sources,
        lang
      });
    } else {
      return assembleStructuredResponse({
        direct: `Real-time agro-meteorological report for **${weather.location}**: Temperature **${weather.temperature}** (Min: ${weather.minTemp}, Max: ${weather.maxTemp}), Relative Humidity **${weather.humidity}**, Precipitation **${weather.precipitation}**, Conditions: **${weather.condition}**.`,
        explanation: 'High ambient humidity combined with warm temperatures accelerates spore germination for foliar blights.',
        nextSteps: [
          'Hold off foliar chemical sprays or top-dressing nitrogen fertilizers if rain is imminent.',
          'Ensure drainage channels in low-lying delta areas are clear to prevent waterlogging.'
        ],
        sources,
        lang
      });
    }
  }

  // 4. SOIL FERTILITY IMPROVEMENT
  if (intent === 'soil_fertility') {
    const data = KNOWLEDGE_BASE.soil_fertility;
    return assembleStructuredResponse({
      direct: lang === 'ta' ? data.direct_ta : (lang === 'tanglish' ? data.direct_tanglish : data.direct_en),
      explanation: lang === 'ta' ? data.expl_ta : (lang === 'tanglish' ? data.expl_tanglish : data.expl_en),
      nextSteps: lang === 'ta' ? data.steps_ta : (lang === 'tanglish' ? data.steps_tanglish : data.steps_en),
      sources,
      lang
    });
  }

  // 5. LOW-WATER / DROUGHT RESILIENT CROPS
  if (intent === 'low_water_crops') {
    const data = KNOWLEDGE_BASE.low_water_crops;
    return assembleStructuredResponse({
      direct: lang === 'ta' ? data.direct_ta : (lang === 'tanglish' ? data.direct_tanglish : data.direct_en),
      explanation: lang === 'ta' ? data.expl_ta : (lang === 'tanglish' ? data.expl_tanglish : data.expl_en),
      nextSteps: lang === 'ta' ? data.steps_ta : (lang === 'tanglish' ? data.steps_tanglish : data.steps_en),
      sources,
      lang
    });
  }

  // 6. PADDY IRRIGATION SCHEDULE
  if (intent === 'irrigation' || (crop === 'rice' && (originalMessage || '').toLowerCase().includes('water'))) {
    const data = KNOWLEDGE_BASE.paddy_irrigation;
    return assembleStructuredResponse({
      direct: lang === 'ta' ? data.direct_ta : (lang === 'tanglish' ? data.direct_tanglish : data.direct_en),
      explanation: lang === 'ta' ? data.expl_ta : (lang === 'tanglish' ? data.expl_tanglish : data.expl_en),
      nextSteps: lang === 'ta' ? data.steps_ta : (lang === 'tanglish' ? data.steps_tanglish : data.steps_en),
      sources,
      lang
    });
  }

  // 7. SCHEMES & SUBSIDIES
  if (intent === 'schemes_eligibility') {
    const data = KNOWLEDGE_BASE.schemes_eligibility;
    return assembleStructuredResponse({
      direct: lang === 'ta' ? data.direct_ta : (lang === 'tanglish' ? data.direct_tanglish : data.direct_en),
      explanation: lang === 'ta' ? data.expl_ta : (lang === 'tanglish' ? data.expl_tanglish : data.expl_en),
      nextSteps: lang === 'ta' ? data.steps_ta : (lang === 'tanglish' ? data.steps_tanglish : data.steps_en),
      sources,
      lang
    });
  }

  if (intent === 'schemes') {
    if (lang === 'ta') {
      return assembleStructuredResponse({
        direct: 'மத்திய மற்றும் தமிழ்நாடு அரசின் முக்கிய வேளாண் மானியத் திட்டங்கள் நேரடி வங்கி பரிமாற்றம் (DBT) மற்றும் உழவன் செயலி மூலம் விவசாயிகளுக்கு வழங்கப்படுகின்றன.',
        explanation: 'PM-KISAN மூலம் ஆண்டுக்கு ₹6,000 நேரடி நிதி உதவி 3 தவணைகளாகவும், PMFBY மூலம் பயிர் காப்பீட்டு பாதுகாப்பும், தமிழ்நாடு முதலமைச்சரின் சோலார் பம்ப் திட்டத்தின் கீழ் 90% அரசு மானியமும் வழங்கப்படுகிறது.',
        nextSteps: [
          'PM-KISAN: pmkisan.gov.in இணையதளம் அல்லது பொது சேவை மையம் (CSC) மூலம் ஆதார் மற்றும் பட்டா ஆவணங்களுடன் விண்ணப்பிக்கலாம்.',
          'பயிர் காப்பீடு (PMFBY): உழவன் செயலி அல்லது வங்கிகள் மூலம் குறைந்த பிரீமியத்தில் பதிவு செய்யலாம்.',
          'சோலார் பம்ப்: 5 முதல் 10 HP வரை 90% மானியத்தில் அமைக்க உழவன் செயலியில் விண்ணப்பிக்கவும்.'
        ],
        sources,
        lang
      });
    } else if (lang === 'tanglish') {
      return assembleStructuredResponse({
        direct: 'Arasu velanmai thittangal (Govt Schemes) PM-KISAN, PMFBY Crop Insurance, matrum TN CM Solar Pump Scheme thaan vivasayigalukku mukkiya schemes aagum.',
        explanation: 'PM-KISAN moolam ₹6,000 varushathukku direct bank account-il 3 thavanaiyaaga varum. PMFBY vella/varatchi nashtathukku kaappeedhu tharum. Uzhavan app moolam solar pump-ukku 90% varai maaniyam kidaikkum.',
        nextSteps: [
          'PM-KISAN apply panna: pmkisan.gov.in-il Aadhaar and Patta kondu register seiyavum.',
          'Crop Insurance (PMFBY): Uzhavan App alladhu bank branch moolam enroll pannalam.',
          'Solar Pump 90% Subsidy: Uzhavan app-il Horticulture/AED section moolam apply pannalam.'
        ],
        sources,
        lang
      });
    } else {
      return assembleStructuredResponse({
        direct: 'Official Indian Central & State Agricultural Welfare Schemes provide direct income support, natural risk insurance, and solar irrigation subsidies through accredited portals.',
        explanation: 'PM-KISAN delivers ₹6,000/year in 3 installments directly to landholding farmers. PMFBY covers non-preventable yield losses. Tamil Nadu offers up to 90% capital subsidy for solar pumps.',
        nextSteps: [
          'PM-KISAN Enrollment: Apply online via https://pmkisan.gov.in or CSC centers with Patta and Aadhaar.',
          'Crop Insurance (PMFBY): Insure notified crops before seasonal cutoff deadlines via https://pmfby.gov.in.',
          'Solar Pump Subsidy: Apply via Tamil Nadu Uzhavan App or Agricultural Engineering Department.'
        ],
        sources,
        lang
      });
    }
  }

  // ================= 8. CROP DISEASE ROUTING =================
  const isDiseaseQuery = (
    intent === 'disease_causes' ||
    intent === 'disease_treatment' ||
    intent === 'powdery_mildew' ||
    symptom !== null
  );

  if (isDiseaseQuery) {
    // A. Ambiguous crop handling: if disease query has no active crop, prompt user to name their crop
    if (!crop) {
      return generateCropClarificationResponse(lang);
    }

    // B. BRINJAL SPECIFIC ROUTING
    if (crop === 'brinjal') {
      let data = null;
      if (symptom === 'brown_spots') {
        data = KNOWLEDGE_BASE.brinjal.brown_spots;
      } else if (symptom === 'yellow_spots') {
        data = KNOWLEDGE_BASE.brinjal.yellow_spots;
      } else if (symptom === 'shoot_fruit_borer') {
        data = KNOWLEDGE_BASE.brinjal.shoot_fruit_borer;
      } else {
        data = KNOWLEDGE_BASE.brinjal.brown_spots;
      }

      validateCropConsistency(data, 'brinjal');

      const response = assembleStructuredResponse({
        direct: lang === 'ta' ? data.direct_ta : (lang === 'tanglish' ? data.direct_tanglish : data.direct_en),
        explanation: lang === 'ta' ? data.expl_ta : (lang === 'tanglish' ? data.expl_tanglish : data.expl_en),
        nextSteps: lang === 'ta' ? data.treatment_ta : (lang === 'tanglish' ? data.treatment_tanglish : data.treatment_en),
        sources,
        lang
      });
      return discrepancyPrefix + response;
    }

    // C. TOMATO SPECIFIC ROUTING
    if (crop === 'tomato') {
      let data = null;
      if (symptom === 'yellow_spots') {
        data = KNOWLEDGE_BASE.tomato.yellow_spots;
      } else {
        data = KNOWLEDGE_BASE.tomato.brown_spots;
      }

      validateCropConsistency(data, 'tomato');

      const response = assembleStructuredResponse({
        direct: lang === 'ta' ? data.direct_ta : (lang === 'tanglish' ? data.direct_tanglish : data.direct_en),
        explanation: lang === 'ta' ? data.expl_ta : (lang === 'tanglish' ? data.expl_tanglish : data.expl_en),
        nextSteps: lang === 'ta' ? (data.treatment_ta || data.steps_ta) : (lang === 'tanglish' ? (data.treatment_tanglish || data.steps_tanglish) : (data.treatment_en || data.steps_en)),
        sources,
        lang
      });
      return discrepancyPrefix + response;
    }

    // D. CHILLI SPECIFIC ROUTING
    if (crop === 'chilli') {
      let data = null;
      if (symptom === 'powdery_mildew' || intent === 'powdery_mildew') {
        data = KNOWLEDGE_BASE.chilli.powdery_mildew;
      } else {
        data = KNOWLEDGE_BASE.chilli.black_spots;
      }

      validateCropConsistency(data, 'chilli');

      const response = assembleStructuredResponse({
        direct: lang === 'ta' ? data.direct_ta : (lang === 'tanglish' ? data.direct_tanglish : data.direct_en),
        explanation: lang === 'ta' ? data.expl_ta : (lang === 'tanglish' ? data.expl_tanglish : data.expl_en),
        nextSteps: lang === 'ta' ? data.treatment_ta : (lang === 'tanglish' ? data.treatment_tanglish : data.treatment_en),
        sources,
        lang
      });
      return discrepancyPrefix + response;
    }

    // E. POTATO SPECIFIC ROUTING
    if (crop === 'potato') {
      const data = KNOWLEDGE_BASE.potato.brown_spots;
      validateCropConsistency(data, 'potato');

      const response = assembleStructuredResponse({
        direct: lang === 'ta' ? data.direct_ta : (lang === 'tanglish' ? data.direct_tanglish : data.direct_en),
        explanation: lang === 'ta' ? data.expl_ta : (lang === 'tanglish' ? data.expl_tanglish : data.expl_en),
        nextSteps: lang === 'ta' ? data.treatment_ta : (lang === 'tanglish' ? data.treatment_tanglish : data.treatment_en),
        sources,
        lang
      });
      return discrepancyPrefix + response;
    }

    // F. RICE / PADDY SPECIFIC ROUTING
    if (crop === 'rice') {
      const data = KNOWLEDGE_BASE.rice.brown_spots;
      validateCropConsistency(data, 'rice');

      const response = assembleStructuredResponse({
        direct: lang === 'ta' ? data.direct_ta : (lang === 'tanglish' ? data.direct_tanglish : data.direct_en),
        explanation: lang === 'ta' ? data.expl_ta : (lang === 'tanglish' ? data.expl_tanglish : data.expl_en),
        nextSteps: lang === 'ta' ? data.treatment_ta : (lang === 'tanglish' ? data.treatment_tanglish : data.treatment_en),
        sources,
        lang
      });
      return discrepancyPrefix + response;
    }

    // G. OTHER CROPS (STRICTLY NON-TOMATO)
    const cropDisplay = crop.charAt(0).toUpperCase() + crop.slice(1);
    if (lang === 'ta') {
      const response = assembleStructuredResponse({
        direct: `உங்கள் **${cropDisplay}** பயிரில் தோன்றும் அறிகுறிகள் குறித்து TNAU மற்றும் ICAR பரிந்துரைக்கும் வழிகாட்டுதல்கள்:`,
        explanation: `ஒவ்வொரு பயிருக்கும் அதற்கான பிரத்யேக பூஞ்சை மற்றும் பாக்டீரியா நோய்த்தொற்றுகள் ஏற்படுகின்றன. அறிகுறிகளைக் கண்டறிந்தவுடன் உரிய பாதுகாப்பு நடவடிக்கைகளை எடுப்பது அவசியம்.`,
        nextSteps: [
          'பாதிக்கப்பட்ட இலைகள் மற்றும் காய்ந்த தழைகளை உடனடியாக அப்புறப்படுத்தி வயலை தூய்மையாக வைக்கவும்.',
          'பூஞ்சை தொற்றுக்கு மேன்கோசெப் (Mancozeb 2g/L) அல்லது காப்பர் ஆக்ஸிகுளோரைடு (2.5g/L) தெளிக்கவும்.',
          'துல்லியமான நோய் உறுதிப்படுத்தலுக்கு எங்களது "Plant Disease" பக்கத்தில் இலை படத்தை பதிவேற்றலாம்.'
        ],
        sources,
        lang
      });
      return discrepancyPrefix + response;
    } else if (lang === 'tanglish') {
      const response = assembleStructuredResponse({
        direct: `Ungal **${cropDisplay}** payiril vara disease pathi TNAU matrum ICAR certified aalosanai:`,
        explanation: `Ovvoru crop-kum specific fungal matrum bacterial pathogens irukkum. Arambave arikurigal theriyum pothu kattu padutha vendum.`,
        nextSteps: [
          'Baadhikkapatta ilaikalai parithu veliye azhikkavum.',
          'Poonjai noi irundhal Mancozeb 75 WP (2g/L) alladhu Copper Oxychloride (2.5g/L) thelikkalam.',
          'Instant AI diagnosis-ku AgriConnect "Plant Disease" tab-il photo upload panni test pannunga.'
        ],
        sources,
        lang
      });
      return discrepancyPrefix + response;
    } else {
      const response = assembleStructuredResponse({
        direct: `Regarding your inquiry on disease symptoms in **${cropDisplay}**:`,
        explanation: `Pathogen infection in ${cropDisplay} should be addressed with species-specific ICAR and TNAU agronomic practices to avoid crop injury.`,
        nextSteps: [
          'Sanitize the plot by safely removing and destroying severely infected foliage.',
          'Apply certified protective foliar sprays (such as Mancozeb 75 WP @ 2g/L or bio-control *Pseudomonas fluorescens* @ 10g/L).',
          'Upload a close-up photo in our "Plant Disease" tab for automated visual AI verification.'
        ],
        sources,
        lang
      });
      return discrepancyPrefix + response;
    }
  }

  // 9. GENERAL AGRICULTURAL FALLBACK (Never default to tomato!)
  const cropMention = crop ? `for **${crop.charAt(0).toUpperCase() + crop.slice(1)}**` : '';
  if (lang === 'ta') {
    return assembleStructuredResponse({
      direct: `உங்கள் விவசாயக் கேள்வி ${crop ? `(பயிர்: ${crop})` : ''} குறித்து ICAR மற்றும் தமிழ்நாடு வேளாண்மைப் பல்கலைக்கழக வழிகாட்டுதல்கள்:`,
      explanation: 'விவசாயத்தில் பயிர் பாதுகாப்பு, மண் வளம் மற்றும் பாசன மேலாண்மையில் அறிவியல் பூர்வ பரிந்துரைகளைப் பின்பற்றுவது மகசூலை அதிகரிக்கவும் செலவைக் குறைக்கவும் உதவும்.',
      nextSteps: [
        'பயிரின் குறிப்பிட்ட அறிகுறிகளை தெளிவாகக் குறிப்பிடவும் (எ.கா: இலை மஞ்சள் ஆகுதல், கருகல் புள்ளிகள்).',
        'இலைகளில் நோய்த்தொற்று இருப்பின், "Plant Disease" பக்கத்தில் புகைப்படத்தை பதிவேற்றி உடனடியாக பரிசோதிக்கலாம்.',
        'வட்டார வேளாண் விரிவாக்க அலுவலர் அல்லது கேவிகே (KVK) மையத்தை அணுகி கூடுதல் ஆலோசனை பெறலாம்.'
      ],
      sources,
      lang
    });
  } else if (lang === 'tanglish') {
    return assembleStructuredResponse({
      direct: `Ungal kelvi ${cropMention} patri TNAU matrum ICAR aalosanai:`,
      explanation: 'Vivasayathil sariyana aalosanai panna payir peyar matrum arikurigal mukkiyam.',
      nextSteps: [
        'Payir peyar matrum arikuriyai konjam vilakkamaaga sollunga.',
        'Ilaiyil noi irundhal AgriConnect "Plant Disease" tab-il photo upload panni check pannalam.',
        'Thevaippattal ungal local KVK alladhu Uzhavan app-il check pannalam.'
      ],
      sources,
      lang
    });
  } else {
    return assembleStructuredResponse({
      direct: `Regarding your agricultural inquiry ${cropMention}:`,
      explanation: 'Applying science-based cultural practices, timely sanitation, and ICAR/TNAU certified agronomic recommendations optimizes crop productivity.',
      nextSteps: [
        'Specify the crop name, current growth stage, and observed symptoms for targeted guidance.',
        'If foliar discoloration or leaf spotting is observed, upload a close-up photo in our "Plant Disease" tab for automated AI visual diagnosis.',
        'Consult your local Krishi Vigyan Kendra (KVK) or Agricultural Extension Officer for field-specific inputs.'
      ],
      sources,
      lang
    });
  }
}

/**
 * Optional External Generative LLM Integration (Google Gemini or OpenAI).
 */
async function callExternalLLM(message, lang, history, sources = [], activeCrop = null) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return null;
  }

  const sourcesContext = sources.map((s) => `- ${s.title}: ${s.snippet} (${s.url})`).join('\n');

  const systemInstruction = `
You are AgriConnect AI, an expert, factual agricultural assistant supporting Indian farmers, particularly in Tamil Nadu and across India.
Adhere strictly to Indian Council of Agricultural Research (ICAR) and Tamil Nadu Agricultural University (TNAU) agronomic guidelines.

Key Rules:
1. Format all answers using this 4-part structure:
   - Direct Answer: Answer the main question first clearly.
   - Simple Explanation: Explain unfamiliar terms in simple, everyday language.
   - What to Do Next: Provide practical, actionable steps.
   - Sources: Display verified sources with clickable links.
2. Active Crop: ${activeCrop ? activeCrop.toUpperCase() : 'Not yet specified (ask clarifying question if disease question lacks crop)'}.
   NEVER recommend tomato advice if the user is asking about brinjal, chilli, or another crop!
3. Always respond in the matching language / dialect:
   - If user asks in Tamil script, respond in fluent, simple Tamil.
   - If user asks in Tanglish, respond in natural Tanglish.
   - If user asks in English, respond in clear English.
4. Answer the user's specific question directly. Do NOT generate unrelated generic advice.
5. Never fabricate crop yields, pesticide doses, or disease diagnoses.
6. If verified sources are provided below, cite them accurately.
Verified Web Research Context:
${sourcesContext || 'No external web search context available; relying on verified baseline.'}
`.trim();

  // Try Google Gemini
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history.slice(-4)) {
          contents.push({
            role: item.sender === 'user' ? 'user' : 'model',
            parts: [{ text: item.text || item.message }]
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: `${systemInstruction}\n\nUser Question (${lang}): ${message}` }]
      });

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { reply: text, provider: 'gemini' };
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed or timed out:', err.message);
    }
  }

  // Try OpenAI
  if (openaiKey) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const messages = [{ role: 'system', content: systemInstruction }];
      if (Array.isArray(history)) {
        for (const item of history.slice(-4)) {
          messages.push({
            role: item.sender === 'user' ? 'user' : 'assistant',
            content: item.text || item.message
          });
        }
      }
      messages.push({ role: 'user', content: message });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.3
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) {
          return { reply: text, provider: 'openai' };
        }
      }
    } catch (err) {
      console.warn('OpenAI API call failed or timed out:', err.message);
    }
  }

  return null;
}

/**
 * Save chat record to SQLite database with both crop_context and disease_context.
 */
async function saveChatRecord({ userId = null, conversationId, sender, message, language, intent, cropContext, diseaseContext }) {
  try {
    const db = await getDb();
    const convId = conversationId || `conv_${Date.now()}`;
    await db.run(
      `INSERT INTO chat_history (user_id, conversation_id, sender, message, language, intent, crop_context, disease_context)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, convId, sender, message, language || null, intent || null, cropContext || null, diseaseContext || null]
    );
    return convId;
  } catch (err) {
    console.error('Failed to save chat record to database:', err.message);
    return null;
  }
}

/**
 * Fetch chat history for an authenticated user with strict user isolation.
 */
async function getUserChatHistory({ userId, conversationId = null, limit = 50 }) {
  try {
    const db = await getDb();
    let query = `
      SELECT id, conversation_id, sender, message, language, intent, crop_context, disease_context, created_at
      FROM chat_history
      WHERE user_id = ?
    `;
    const params = [userId];

    if (conversationId) {
      query += ` AND conversation_id = ?`;
      params.push(conversationId);
    }

    query += ` ORDER BY created_at ASC LIMIT ?`;
    params.push(Math.min(limit, 100));

    return await db.all(query, params);
  } catch (err) {
    console.error('Failed to get user chat history:', err.message);
    return [];
  }
}

/**
 * Clear chat history for an authenticated user with strict user isolation.
 */
async function clearUserChatHistory({ userId, conversationId = null }) {
  try {
    const db = await getDb();
    if (conversationId) {
      await db.run(`DELETE FROM chat_history WHERE user_id = ? AND conversation_id = ?`, [userId, conversationId]);
    } else {
      await db.run(`DELETE FROM chat_history WHERE user_id = ?`, [userId]);
    }
    return true;
  } catch (err) {
    console.error('Failed to clear user chat history:', err.message);
    return false;
  }
}

/**
 * Main Chat Processing Entry Point.
 */
async function processChatMessage({
  message,
  lang: userPrefLang,
  history = [],
  userId = null,
  conversationId = null,
  location = null,
  cropContext = null,
  diseaseContext = null,
  imagePrediction = null
}) {
  const trimmed = (message || '').trim();
  if (!trimmed) {
    return {
      success: false,
      reply: 'Please provide a question or topic to receive farming guidance.'
    };
  }

  // 1. Language detection
  const detectedLang = detectLanguage(trimmed, userPrefLang);

  // 2. Multi-turn crop & context resolution (handles immediate crop switching & antecedents)
  const resolved = resolveCropAndContext({
    message: trimmed,
    history,
    requestCrop: cropContext,
    requestDisease: diseaseContext,
    imagePrediction
  });

  const activeCrop = resolved.activeCrop;
  const activeDisease = resolved.diseaseContext;

  // 3. Intent and symptom extraction
  const { intent, symptom } = extractIntentAndEntities(trimmed, history);

  // 4. Intelligent Web Research with crop filtering
  let webResearchResult = { success: false, sources: [], web_search_performed: false };
  if (intent !== 'out_of_scope' && intent !== 'greeting') {
    webResearchResult = await performWebResearch({
      query: trimmed,
      lang: detectedLang,
      location,
      category: intent,
      cropContext: activeCrop
    });
  }

  // 5. Generate structured response
  let replyText = null;
  let provider = 'verified_knowledge_engine';

  const llmResult = await callExternalLLM(trimmed, detectedLang, history, webResearchResult.sources || [], activeCrop);
  if (llmResult && llmResult.reply) {
    replyText = llmResult.reply;
    provider = llmResult.provider;
  } else {
    // Generate grounded ICAR/TNAU response with real-time web research citations
    replyText = generateGroundedResponse(
      intent,
      activeCrop,
      symptom,
      detectedLang,
      trimmed,
      webResearchResult,
      resolved.imageDiscrepancy
    );
  }

  // 6. Database persistence with strict user isolation
  const convId = conversationId || (history?.[0]?.conversation_id) || `conv_${Date.now()}`;
  if (userId) {
    await saveChatRecord({
      userId,
      conversationId: convId,
      sender: 'user',
      message: trimmed,
      language: detectedLang,
      intent,
      cropContext: activeCrop,
      diseaseContext: activeDisease
    });

    await saveChatRecord({
      userId,
      conversationId: convId,
      sender: 'ai',
      message: replyText,
      language: detectedLang,
      intent,
      cropContext: activeCrop,
      diseaseContext: activeDisease
    });
  }

  const hasExternalKey = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

  return {
    success: true,
    reply: replyText,
    conversation_id: convId,
    web_search_performed: Boolean(webResearchResult.web_search_performed),
    sources: webResearchResult.sources || [],
    weather: webResearchResult.weather || null,
    meta: {
      provider,
      provider_note: provider !== 'verified_knowledge_engine'
        ? `Generated via ${provider} with ICAR/TNAU guidelines and web research.`
        : (webResearchResult.web_search_performed
            ? 'Responded using AgriConnect Verified Knowledge Engine supplemented with Live Online Agricultural Research.'
            : (hasExternalKey
                ? 'External LLM service call timed out or failed; safely responded using AgriConnect Verified Knowledge Engine.'
                : 'External LLM key (GEMINI_API_KEY or OPENAI_API_KEY) not set in backend/.env. Running on AgriConnect Verified Knowledge Engine (ICAR/TNAU certified guidelines).')),
      detected_language: detectedLang,
      crop_context: activeCrop,
      disease_context: activeDisease,
      symptom_context: symptom,
      intent,
      is_crop_switched: resolved.isCropSwitched,
      image_discrepancy: resolved.imageDiscrepancy
    }
  };
}

module.exports = {
  processChatMessage,
  detectLanguage,
  extractIntentAndEntities,
  extractCropFromText,
  resolveCropAndContext,
  validateCropConsistency,
  generateGroundedResponse,
  saveChatRecord,
  getUserChatHistory,
  clearUserChatHistory,
  CANONICAL_CROPS,
  CROP_SYNONYMS,
  KNOWLEDGE_BASE
};
