const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const upload = require('../middleware/upload');
const { getDb } = require('../db');

const FLASK_API_URL = process.env.PLANT_DISEASE_API_URL || 'http://localhost:5001/api/predict';

// Knowledge Base for Plant Diseases
const DISEASE_DATABASE = [
  {
    key: 'tomato_late_blight',
    name: 'Tomato Late Blight (தக்காளி லேட் பிளைட் நோய்)',
    scientificName: 'Phytophthora infestans',
    symptoms: [
      'Dark water-soaked lesions on leaves and stems turning dark brown to black.',
      'White fungal growth under leaves during humid weather.',
      'Rapid wilting and decay of foliage and tomato fruits.'
    ],
    symptomsTa: [
      'இலைகள் மற்றும் தண்டுகளில் கருமையான நீர் ஊறிய புண்கள் தோன்றல்.',
      'ஈரப்பதமான வானிலையில் இலைகளின் கீழ் வெண்மையான பூசண வளர்ச்சி.',
      'இலைகள் மற்றும் தக்காளி பழங்கள் விரைவாக வாடி அழுகுதல்.'
    ],
    recoverySteps: [
      '1. Immediately prune and remove severely infected lower leaves and stems.',
      '2. Destroy infected plant material outside the field (do not compost).',
      '3. Improve air circulation by proper spacing and staking tomato plants.',
      '4. Avoid overhead irrigation; drip irrigate at root zone in early morning.',
      '5. Organic Treatment: Spray Neem Oil (5ml/L water with liquid soap) or Trichoderma viride.',
      '6. Verified Chemical Treatment: Spray Copper Oxychloride (2.5g/L) or Mancozeb (2g/L) at initial symptom appearance as recommended by TNAU/ICAR.',
      '7. Prevention: Use resistant hybrids (e.g., Arka Rakshak) and follow crop rotation.'
    ],
    prevention: 'Maintain clean field hygiene, avoid high humidity around canopy, practice 3-year crop rotation with non-solanaceous crops.',
    confidenceRange: [92, 98]
  },
  {
    key: 'tomato_yellow_leaf_curl',
    name: 'Tomato Yellow Leaf Curl Virus (TYLCV) (தக்காளி மஞ்சள் சுருள் நோய்)',
    scientificName: 'Begomovirus transmitted by Whitefly (Bemisia tabaci)',
    symptoms: [
      'Severe stunting of young tomato plants.',
      'Upward curling and yellowing of leaf margins.',
      'Prominent reduction in leaf size and poor fruit set.'
    ],
    symptomsTa: [
      'இளம் தக்காளி செடிகள் மிகக் குறைவாக வளருதல்.',
      'இலை விளிம்புகள் மேல்நோக்கி சுருண்டு மஞ்சளாதல்.',
      'இலை அளவு கணிசமாகக் குறைந்து பூக்கள் உதிர்தல்.'
    ],
    recoverySteps: [
      '1. Immediately rogue out and burn severely virus-infected plants.',
      '2. Install Yellow Sticky Traps (12-15 traps/acre) to catch adult whiteflies.',
      '3. Cover young nursery beds with 40-mesh insect-proof net.',
      '4. Organic Treatment: Spray Neem Seed Kernel Extract (NSKE 5%) or Verticillium lecanii.',
      '5. Vector Control: Spray Imidacloprid 17.8 SL (0.3ml/L) or Thiamethoxam 25 WG (0.2g/L) as per agricultural university guidance.',
      '6. Prevention: Grow border crops like Maize or Sorghum (3-4 rows) around tomato field to obstruct whitefly movement.'
    ],
    prevention: 'Control whitefly vector from nursery stage using sticky traps and insect nets.',
    confidenceRange: [89, 96]
  },
  {
    key: 'rice_blast',
    name: 'Paddy / Rice Blast (நெல் குலை நோய்)',
    scientificName: 'Magnaporthe oryzae (Pyricularia oryzae)',
    symptoms: [
      'Spindle-shaped / diamond-shaped lesions on leaves with reddish-brown borders.',
      'Nodal infection causing stem breakage (Neck Blast / Node Blast).',
      'Chaffy, unfilled grains on affected panicles.'
    ],
    symptomsTa: [
      'இலைகளில் சுழல் வடிவில் / வைர வடிவில் பழுப்பு நிற விளிம்புகளுடன் புண்கள்.',
      'கணு பகுதியில் கருப்பு நிற அழுகல் ஏற்பட்டு தண்டு உடைதல் (கழுத்து அழுகல்).',
      'பாதிக்கப்பட்ட கதிர்களில் சாவிக் காய்கள் உருவாதல்.'
    ],
    recoverySteps: [
      '1. Avoid excessive application of Nitrogenous fertilizers (urea); split application into 3-4 doses.',
      '2. Drain standing water for 2-3 days if field is heavily waterlogged.',
      '3. Seed Treatment: Treat seeds with Pseudomonas fluorescens (10g/kg seed).',
      '4. Foliar Spray: Spray Tricyclazole 75 WP (0.6g/L) or Carbendazim 50 WP (1g/L) during early tiller stage and neck emergence stage.',
      '5. Organic Control: Spray 10% Cow dung extract or Pseudomonas fluorescens (10g/L).'
    ],
    prevention: 'Use blast-resistant paddy varieties (ADT 43, CO 51, TPS 5) and avoid late sowing.',
    confidenceRange: [90, 97]
  },
  {
    key: 'cotton_bacterial_blight',
    name: 'Cotton Bacterial Blight / Angular Leaf Spot (பருத்தி பாக்டீரியா நோய்)',
    scientificName: 'Xanthomonas citri pv. malvacearum',
    symptoms: [
      'Angular water-soaked spots bounded by leaf veins.',
      'Black arm lesions on main stem and branches.',
      'Boll rot with sunken dark brown spots.'
    ],
    symptomsTa: [
      'இலை நரம்புகளுக்கு இடைப்பட்ட கோண வடிவ நீர் ஊறிய புள்ளிகள்.',
      'முக்கிய தண்டு மற்றும் கிளைகளில் கருப்பு நிறக் காயம்.',
      'பருத்திக் காய்களில் பள்ளமான கருப்பு நிற அழுகல்.'
    ],
    recoverySteps: [
      '1. Remove and burn diseased plant debris after harvest.',
      '2. Spray Streptomycin Sulphate + Tetracycline Combination (Plantomycin 0.5g/L) along with Copper Oxychloride (2g/L).',
      '3. Avoid working in wet fields to prevent mechanical spread of bacteria.',
      '4. Seed Delinting: Delint cotton seeds with concentrated Sulphuric Acid prior to sowing.'
    ],
    prevention: 'Use delinted certified seeds and avoid excessive overhead irrigation.',
    confidenceRange: [88, 95]
  },
  {
    key: 'groundnut_tikka_leafspot',
    name: 'Groundnut Tikka Leaf Spot (நிலக்கடலை டிக்கா நோய்)',
    scientificName: 'Cercospora arachidicola / Cercosporidium personatum',
    symptoms: [
      'Circular dark brown to black spots surrounded by prominent yellow halo on upper leaf surface.',
      'Premature defoliation leaving bare stems.',
      'Reduced pod development and yield reduction.'
    ],
    symptomsTa: [
      'மேல் இலையில் மஞ்சள் நிற வளையத்துடன் கூடிய வட்டவடிவக் கருப்புப் புள்ளிகள்.',
      'இலைகள் முன்னரே உதிர்ந்து வெற்றுத் தண்டுகள் மட்டும் நிற்றல்.',
      'காய்கள் சரியாகப் பிடிக்காமல் விளைச்சல் குறைதல்.'
    ],
    recoverySteps: [
      '1. Collect and destroy fallen infected leaves from ground.',
      '2. Foliar Spray: Spray Mancozeb (2g/L) or Carbendazim (1g/L) or Difenoconazole (1ml/L) at 30 and 45 days after sowing.',
      '3. Organic Spray: Spray Panchagavya 3% or Vermicompost wash.',
      '4. Maintain balanced Potash and Phosphorus nutrition.'
    ],
    prevention: 'Practice crop rotation with maize or sorghum, avoid continuous groundnut cropping.',
    confidenceRange: [91, 98]
  }
];

// POST /api/ai/disease-detect - Analyze uploaded leaf image via Flask 3.0 MobileNetV2 service
router.post('/disease-detect', upload.single('image'), async (req, res) => {
  try {
    const { lang, sampleDiseaseKey, weather, irrigation, season, forceLowConfidence } = req.body;
    const isTamil = lang === 'ta';

    let imagePath = null;
    let originalName = 'leaf_upload.jpg';
    let mimeType = 'image/jpeg';

    if (req.file) {
      imagePath = req.file.path;
      originalName = req.file.originalname || path.basename(req.file.path);
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (sampleDiseaseKey) {
      // Map sample keys to actual verified dataset images on disk
      const sampleMap = {
        'bean_rust': path.join(__dirname, '../../data/plantwild/plantwild/images/bean rust/1.jpg'),
        'bean_leaf': path.join(__dirname, '../../data/plantwild/plantwild/images/bean leaf/1.jpg'),
        'bean_halo_blight': path.join(__dirname, '../../data/plantwild/plantwild/images/bean halo blight/11.jpg'),
        'bean_mosaic_virus': path.join(__dirname, '../../data/plantwild/plantwild/images/bean mosaic virus/10.jpg'),
        'apple_black_rot': path.join(__dirname, '../../data/plantwild/plantwild/images/apple black rot/google_0082.jpg'),
        'apple_leaf': path.join(__dirname, '../../data/plantwild/plantwild/images/apple leaf/1.jpg'),
        'apple_mosaic_virus': path.join(__dirname, '../../data/plantwild/plantwild/images/apple mosaic virus/1.jpg'),
        'apple_rust': path.join(__dirname, '../../data/plantwild/plantwild/images/apple rust/1.jpg'),
        'apple_scab': path.join(__dirname, '../../data/plantwild/plantwild/images/apple scab/1.jpg'),
        'banana_leaf': path.join(__dirname, '../../data/plantwild/plantwild/images/banana leaf/1.jpg'),
        'tomato_late_blight': path.join(__dirname, '../../data/plantwild/plantwild/images/tomato late blight/10.jpg')
      };
      imagePath = sampleMap[sampleDiseaseKey];
      if (imagePath && fs.existsSync(imagePath)) {
        originalName = path.basename(imagePath);
      } else {
        imagePath = null;
      }
    }

    if (!imagePath || !fs.existsSync(imagePath)) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file of the crop leaf.'
      });
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const blob = new Blob([imageBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('image', blob, originalName);
    formData.append('lang', isTamil ? 'ta' : 'en');
    if (weather) formData.append('weather', weather);
    if (irrigation) formData.append('irrigation', irrigation);
    if (season) formData.append('season', season);
    if (forceLowConfidence === 'true') {
      formData.append('lesion_coverage', '15.0');
      formData.append('humidity', '30.0');
    }

    // Call Flask AI service (configured via environment variable PLANT_DISEASE_API_URL)
    const flaskResponse = await fetch(FLASK_API_URL, {
      method: 'POST',
      body: formData
    });

    if (!flaskResponse.ok) {
      const errData = await flaskResponse.json().catch(() => ({}));
      return res.status(flaskResponse.status).json({
        success: false,
        message: errData.message || 'AI Disease Detection model returned an error.'
      });
    }

    const result = await flaskResponse.json();
    return res.json(result);

  } catch (error) {
    console.error('Disease detection bridge error:', error);
    // Graceful error handling if Flask API is unreachable / offline
    if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        service_offline: true,
        message: 'AI Disease Detection service (Flask 3.0 API) is currently offline or unreachable on port 5001. Please ensure the Python service is running.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'AI Disease Detection service encountered an internal error.'
    });
  }
});

// POST /api/ai/crop-recommendation - Recommend crops based on land specs
router.post('/crop-recommendation', async (req, res) => {
  try {
    const { location, soil_type, water_source, season, previous_crop, area_acres, lang } = req.body;
    const isTamil = lang === 'ta';

    const soil = (soil_type || '').toLowerCase();
    const water = (water_source || '').toLowerCase();

    let recommendations = [];

    if (soil.includes('alluvial') || water.includes('canal') || soil.includes('வண்டல்')) {
      recommendations = [
        {
          crop: isTamil ? 'நெல் (Paddy / Rice)' : 'Paddy (Rice)',
          suitability: isTamil ? 'மிக உயர்ந்த பொருத்தம் (High Suitability)' : 'High Suitability',
          matchScore: 96,
          reasons: isTamil ? [
            'வண்டல் மண் நீரையும் ஊட்டச்சத்துக்களையும் நீண்ட நேரம் தேக்கி வைக்கும் திறன் கொண்டது.',
            'வாய்க்கால் பாசன வசதி நெல் சாகுபடிக்கு உகந்த நீர் இருப்பை உறுதி செய்கிறது.',
            'முந்தைய பயிர் சுழற்சிக்கு ஏற்றவாறு நல்ல மகசூல் தரும்.'
          ] : [
            'Alluvial soil retains water and nutrients perfectly required for flooded paddy cultivation.',
            'Canal water availability ensures consistent irrigation during critical tillering stages.',
            'High market demand and minimum support price (MSP) support.'
          ]
        },
        {
          crop: isTamil ? 'வாழை (Banana - Grand Naine)' : 'Banana (Grand Naine / Poovan)',
          suitability: isTamil ? 'நல்ல பொருத்தம் (Good Suitability)' : 'Good Suitability',
          matchScore: 88,
          reasons: isTamil ? [
            'ஆற்றுப்ப்படுகை வண்டல் மண் மற்றும் நல்ல வடிகால் வசதி வாழை மரங்களின் வேர் வளர்ச்சிக்கு உகந்தது.',
            'ஆண்டு முழுதும் பாசன நீர் இருப்பது வாழைக்குத் தேவை.'
          ] : [
            'Deep alluvial loam supports robust root architecture and high bunch weight.',
            'Perennial water availability fulfills high evapotranspiration demand.'
          ]
        },
        {
          crop: isTamil ? 'கரும்பு (Sugarcane)' : 'Sugarcane',
          suitability: isTamil ? 'மிதமான பொருத்தம் (Moderate Suitability)' : 'Moderate Suitability',
          matchScore: 78,
          reasons: isTamil ? [
            'அதிக உற்பத்தித் திறன் கொண்ட நீண்டகால பணப்பயிர்.',
            'அருகிலுள்ள சர்க்கரை ஆலைகளுக்கு நேரடியாக விற்பனை செய்ய வாய்ப்பு.'
          ] : [
            'Long duration cash crop suitable for fertile soils with reliable irrigation.',
            'Assured mill contract purchasing in sugar factory zones.'
          ]
        }
      ];
    } else if (soil.includes('red') || soil.includes('loam') || soil.includes('செம்மண்')) {
      recommendations = [
        {
          crop: isTamil ? 'நிலக்கடலை (Groundnut)' : 'Groundnut',
          suitability: isTamil ? 'மிக உயர்ந்த பொருத்தம் (High Suitability)' : 'High Suitability',
          matchScore: 94,
          reasons: isTamil ? [
            'செம்மண் நிலக்கடலையின் காய்கள் எளிதில் மண்ணில் இறங்கி பெருக்க உதவும்.',
            'குறைந்த நீர் நுகர்வு மற்றும் மண்ணில் நைட்ரஜனை நிலைநிறுத்தும் பண்பு.'
          ] : [
            'Red loamy soil provides loose texture essential for easy peg penetration and pod formation.',
            'Nitrogen-fixing leguminous crop improves soil fertility naturally.'
          ]
        },
        {
          crop: isTamil ? 'மக்காச்சோளம் (Maize / Corn)' : 'Maize (Hybrid Corn)',
          suitability: isTamil ? 'நல்ல பொருத்தம் (Good Suitability)' : 'Good Suitability',
          matchScore: 89,
          reasons: isTamil ? [
            'குறுகிய காலப் பயிர் (100-110 நாட்கள்) மற்றும் கோழித்தீவன ஆலைகளில் நல்ல தேவை.',
            'கிணற்றுப் பாசனத்திற்கு மிக உகந்தது.'
          ] : [
            'Short 105-day duration with massive demand from poultry feed industry.',
            'Moderate water requirement adaptable to drip or furrow irrigation.'
          ]
        },
        {
          crop: isTamil ? 'மஞ்சள் (Turmeric)' : 'Turmeric (Erode Local)',
          suitability: isTamil ? 'மிதமான பொருத்தம் (Moderate Suitability)' : 'Moderate Suitability',
          matchScore: 82,
          reasons: isTamil ? [
            'செம்மண் மற்றும் வடிகால் வசதியுள்ள நிலங்களில் மஞ்சள் கிழங்கு நன்கு திரளும்.',
            'அதிக சந்தை மதிப்புள்ள பாரம்பரிய பணப்பயிர்.'
          ] : [
            'Well-drained red loam prevents rhizome rot and enhances curcumin percentage.',
            'High value commercial yield.'
          ]
        }
      ];
    } else {
      recommendations = [
        {
          crop: isTamil ? 'பருத்தி (Cotton)' : 'Cotton (Bt Hybrid)',
          suitability: isTamil ? 'மிக உயர்ந்த பொருத்தம் (High Suitability)' : 'High Suitability',
          matchScore: 92,
          reasons: isTamil ? [
            'கரிசல் மண் ஈரப்பதத்தை நீண்ட நாள் சேமித்து பருத்தி விளைச்சலை அதிகரிக்கும்.',
            'வறட்சியைத் தாங்கி வளரும் ஆழமான வேரமைப்பு.'
          ] : [
            'Black soil has high cation exchange and moisture holding capacity ideal for cotton.',
            'Deep taproot system tolerates moisture stress.'
          ]
        },
        {
          crop: isTamil ? 'உளுந்து / பாசிப்பயறு (Black Gram / Green Gram)' : 'Black Gram / Pulses',
          suitability: isTamil ? 'நல்ல பொருத்தம் (Good Suitability)' : 'Good Suitability',
          matchScore: 86,
          reasons: isTamil ? [
            '70-75 நாட்களில் அறுவடை செய்யலாம், குறைந்த நீர்த்தேவை.',
            'முந்தைய பயிரின் மிச்ச ஊட்டச்சத்துக்களைப் பயன்படுத்திக் கொள்ளும்.'
          ] : [
            'Ultra-short 70-day crop cycle requiring minimal supplementary watering.',
            'Excellent green manure residual fertility boost.'
          ]
        },
        {
          crop: isTamil ? 'கம்பு / திணை (Millets - Pearl Millet / Sorghum)' : 'Millets (Ragi / Bajra / Sorghum)',
          suitability: isTamil ? 'மிதமான பொருத்தம் (Moderate Suitability)' : 'Moderate Suitability',
          matchScore: 81,
          reasons: isTamil ? [
            'வறட்சி மற்றும் தீவிர தட்பவெப்ப நிலைகளைத் தாங்கும் திறன்.',
            'சமீபகால சிறுதானிய உணவுத் தேவையில் அதிக லாபம்.'
          ] : [
            'Climate-resilient superfood crop thriving in warm temperatures and dry soil.',
            'Surging commercial health-food consumer demand.'
          ]
        }
      ];
    }

    res.json({
      success: true,
      inputSummary: { location, soil_type, water_source, season, previous_crop, area_acres },
      recommendations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Crop recommendation failed.' });
  }
});

// GET /api/ai/schemes - Search & Filter Government Schemes (Bilingual Tamil + English)
router.get('/schemes', async (req, res) => {
  try {
    const { state, search, lang } = req.query;
    const isTamil = lang === 'ta';
    const db = await getDb();

    let query = 'SELECT * FROM government_schemes WHERE 1=1';
    const params = [];

    if (state && state !== 'All') {
      query += ' AND (state LIKE ? OR state LIKE "%All India%")';
      params.push(`%${state}%`);
    }

    if (search) {
      query += ' AND (scheme_name LIKE ? OR purpose LIKE ? OR eligibility LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const rawSchemes = await db.all(query, params);

    const schemes = rawSchemes.map((s) => {
      if (!isTamil) return s;

      let name = s.scheme_name;
      let purpose = s.purpose;
      let eligibility = s.eligibility;
      let benefits = s.benefits;
      let application_info = s.application_info;
      let state = 'அகில இந்தியா / தமிழ்நாடு';

      if (s.scheme_name.includes('PM-KISAN') || s.scheme_name.includes('Samman Nidhi')) {
        name = 'பிரதான் மந்திரி கிசான் சம்மான் நிதி (PM-KISAN)';
        purpose = 'இந்தியாவின் அனைத்து நிலமுள்ள விவசாய குடும்பங்களுக்கும் ஆண்டுக்கு ₹6,000 நேரடி வங்கி நிதி உதவி.';
        eligibility = 'சொந்தமாக விவசாய நிலம் வைத்துள்ள அனைத்து விவசாய குடும்பங்களும் தகுதியானவர்கள்.';
        benefits = 'ஆண்டுக்கு ₹6,000 நிதி உதவி 3 சம தவணைகளாக (தலா ₹2,000) நேரடியாக வங்கி கணக்கில் செலுத்தப்படும்.';
        application_info = 'PM-KISAN இணையதளம் அல்லது பொது சேவை மையம் (CSC) மூலம் ஆதார் மற்றும் பட்டா சான்றுடன் விண்ணப்பிக்கலாம்.';
      } else if (s.scheme_name.includes('Fasal Bima') || s.scheme_name.includes('PMFBY')) {
        name = 'பிரதான் மந்திரி பயிர் காப்பீட்டுத் திட்டம் (PMFBY)';
        purpose = 'இயற்கை சீற்றங்கள், வெள்ளம், வறட்சி, பூச்சித் தாக்குதல் மற்றும் மகசூல் இழப்பில் இருந்து பயிர் பாதுகாப்பு.';
        eligibility = 'குத்தகை விவசாயிகள் உட்பட அறிவிக்கப்பட்ட பயிர்களை சாகுபடி செய்யும் அனைத்து விவசாயிகள்.';
        benefits = 'விதைப்பு முதல் அறுவடை வரை முழுமையான பயிர் காப்பீட்டு பாதுகாப்பு. குறைந்தபட்ச பிரீமியம் 1.5% முதல் 2% மட்டுமே.';
        application_info = 'உழவன் செயலி, வங்கி கிளைகள் அல்லது PMFBY இணையதளம் மூலம் விண்ணப்பிக்கலாம்.';
      } else if (s.scheme_name.includes('Solar Powered Pump') || s.scheme_name.includes('Chief Minister')) {
        name = 'முதலமைச்சரின் சூரிய சக்தியால் இயங்கும் பம்ப் செட் திட்டம்';
        purpose = 'விவசாயிகளுக்கு 90% அரசு மானியத்தில் சோலார் விவசாய பம்ப் செட்டுகள் அமைத்தல்.';
        eligibility = 'தமிழ்நாட்டில் சொந்தமாக விவசாய நிலம் வைத்துள்ள விவசாயிகள் மற்றும் விவசாய குழுக்கள்.';
        benefits = '5 HP முதல் 10 HP வரையிலான சோலார் பம்புகளுக்கு 90% அரசு மானியம் மற்றும் 25 ஆண்டுகள் சோலார் வாரண்டி.';
        application_info = 'உழவன் செயலி அல்லது வேளாண் பொறியியல் துறை (AED) மூலம் விண்ணப்பிக்கலாம்.';
        state = 'தமிழ்நாடு';
      } else if (s.scheme_name.includes('Mechanization') || s.scheme_name.includes('SMAM')) {
        name = 'வேளாண் இயந்திரமயமாக்கல் துணை இயக்கம் (SMAM)';
        purpose = 'டிராக்டர்கள், பவர் டில்லர்கள், ரொட்டவேட்டர்கள் மற்றும் அறுவடை இயந்திரங்கள் வாங்க அரசு மானியம்.';
        eligibility = 'சிறு, குறு விவசாயிகள், பெண் விவசாயிகள் மற்றும் பதிவு செய்யப்பட்ட FPO குழுக்கள்.';
        benefits = 'வேளாண் கருவிகள் வாங்க 40% முதல் 50% வரை அரசு மானியம்.';
        application_info = 'agrimachinery.nic.in இணையதளம் அல்லது மாவட்ட வேளாண் அலுவலர் மூலம் விண்ணப்பிக்கலாம்.';
      } else if (s.scheme_name.includes('Soil Health') || s.scheme_name.includes('Mridaparikshak')) {
        name = 'மண் வள அட்டை திட்டம் (Soil Health Card Scheme)';
        purpose = 'இலவச மண் பரிசோதனை மற்றும் நிலத்தின் தேவைக்கேற்ற உரப் பரிந்துரைகள் வழக்கம்.';
        eligibility = 'அனைத்து நில உரிமையாளர்கள் மற்றும் விவசாய நிலம் கொண்ட விவசாயிகள்.';
        benefits = 'மண்ணின் N, P, K மற்றும் நுண் சத்து அளவை அறிந்து 20-30% வரை உரச் செலவைக் குறைக்கலாம்.';
        application_info = 'வட்டார வேளாண் உதவி இயக்குனர் அல்லது வேளாண் விரிவாக்க அலுவலரை அணுகவும்.';
      } else if (s.scheme_name.includes('KUSUM')) {
        name = 'பி.எம்-குசும் சோலார் திட்டம் (PM-KUSUM Component B & C)';
        purpose = 'மின்சார பம்புகளை சோலார் மயமாக்கல் மற்றும் தரிசு நிலங்களில் சோலார் மின் உற்பத்தி நிலையம் அமைத்தல்.';
        eligibility = 'விவசாய நிலம் வைத்துள்ள தனிநபர் விவசாயிகள், பஞ்சாயத்துகள் மற்றும் FPO அமைப்புகள்.';
        benefits = '60% வரை மத்திய/மாநில அரசு மானியம். உபரி மின்சாரத்தை மின்சார வாரியத்திற்கு (TANGEDCO) விற்று நிலையான வருமானம் பெறலாம்.';
        application_info = 'TANGEDCO அல்லது புதிய மற்றும் புதுப்பிக்கத்தக்க எரிசக்தி அமைச்சகம் (MNRE) மூலம் விண்ணப்பிக்கலாம்.';
      }

      return {
        ...s,
        scheme_name: name,
        purpose,
        eligibility,
        benefits,
        application_info,
        state
      };
    });

    res.json({ success: true, count: schemes.length, schemes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch government schemes.' });
  }
});

// POST /api/ai/chat - General AI Assistant Queries (Bilingual Tamil + English)
router.post('/chat', async (req, res) => {
  try {
    const { message, lang } = req.body;
    const msg = (message || '').toLowerCase();
    const isTamil = lang === 'ta' || /[ஃ-ஹ]/.test(message);

    let reply = '';

    if (msg.includes('yellow') || msg.includes('மஞ்சள்') || msg.includes('இலை')) {
      reply = isTamil
        ? 'தக்காளி அல்லது செடிகளில் இலைகள் மஞ்சளாவதற்கு முக்கிய காரணங்கள்:\n1. நைட்ரஜன் சத்து குறைபாடு - இலைகளுக்கு காம்ப்ளக்ஸ் உரம் அல்லது வேப்பம் புண்ணாக்கு இடவும்.\n2. லேட் பிளைட் / மஞ்சள் சுருள் வைரஸ் - தயவுசெய்து எங்களது "நோய் கண்டறிதல்" (Plant Disease Detection) பக்கத்தில் இலை படத்தை பதிவேற்றம் செய்யவும்.\n3. அதிக நீர் தேங்குவது - பாசனத்தைக் குறைத்து வடிகால் வசதியை சீர்செய்யவும்.'
        : 'Yellowing leaves can indicate:\n1. Nitrogen Deficiency: Apply well-rotted FYM or Neem Cake.\n2. Virus or Blight Infection: Upload a photo in our "Disease Detection" tab for instant identification.\n3. Waterlogging: Ensure proper root zone drainage.';
    } else if (msg.includes('rent') || msg.includes('வாடகை') || msg.includes('நிலம்')) {
      reply = isTamil
        ? 'அக்ரிகனெக்ட் தளம் மூலம் நீங்கள் விவசாய நிலங்களை வாடகைக்கு எடுக்க அல்லது உங்கள் நிலத்தைப் பட்டியலிடலாம்:\n1. "Lands" பக்கத்தில் கிடைக்கும் நிலங்களை வரைபடம் மற்றும் பட்டியல் மூலம் தேடலாம்.\n2. நில விவரப் பக்கத்தில் "Send Rental Request" பொத்தானைக் கிளிக் செய்து நில உரிமையாளருக்கு கோரிக்கை அனுப்பலாம்.'
        : 'On AgriConnect AI, you can easily discover agricultural lands for rent:\n1. Browse the "Lands" page using our Interactive Map or Filters.\n2. Click "Send Rental Request" on any land listing to directly connect with the verified land owner.';
    } else if (msg.includes('scheme') || msg.includes('திட்டம்') || msg.includes('PM-KISAN') || msg.includes('மாநியம்')) {
      reply = isTamil
        ? 'முக்கிய அரசு வேளாண் திட்டங்கள்:\n1. பி.எம்-கிசான்: ஆண்டுக்கு ₹6,000 நிதியுதவி (pmkisan.gov.in)\n2. முதல்வரின் சூரியசக்தி பம்ப் செட் திட்டம்: 90% மானியம் (உழவன் செயலி / tnagrisnet.tn.gov.in)\n3. பயிர் காப்பீட்டுத் திட்டம் (PMFBY).\n\n"Government Schemes"Tab-இல் விரிவாக பார்க்கவும்.'
        : 'Key Agricultural Government Schemes:\n1. PM-KISAN: ₹6,000 annual direct bank transfer.\n2. CM Solar Pump Scheme (Tamil Nadu): 90% subsidy on solar agriculture pumps.\n3. PMFBY Crop Insurance.\n\nExplore our Government Schemes tab for full eligibility details and official links.';
    } else {
      reply = isTamil
        ? `வணக்கம்! நான் உங்கள் அக்ரிகனெக்ட் AI விவசாய உதவியாளன் 🌾. உங்களுடைய கேள்வியான "${message}" குறித்து உதவ தயார். நீங்கள் நோய் கண்டறிதல், பயிர் பரிந்துரை அல்லது அரசு திட்டங்கள் பற்றி கேட்கலாம்.`
        : `Greetings! I am your AgriConnect AI Farming Assistant 🌾. Regarding "${message}", I can help you detect plant diseases, recommend suitable crops for your soil, or guide you through government agriculture subsidies. How can I assist you further?`;
    }

    res.json({ success: true, reply });
  } catch (error) {
    res.status(500).json({ success: false, message: 'AI chat response error.' });
  }
});

module.exports = router;
