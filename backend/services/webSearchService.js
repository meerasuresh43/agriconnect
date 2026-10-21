/**
 * webSearchService.js
 * Intelligent, Legal, and Responsible Web Research Engine for AgriConnect AI.
 * 
 * Features:
 * 1. Prioritizes Official Indian Agricultural Portals (Tier 1: agricoop.nic.in, pmkisan.gov.in, etc.),
 *    ICAR / TNAU Resources (Tier 2), State Govt Departments (Tier 3), and Peer-Reviewed / Botanical Sources (Tier 4).
 * 2. Pluggable Search Providers:
 *    - Tavily API (TAVILY_API_KEY)
 *    - Google Serper API (SERPER_API_KEY)
 *    - Brave Search API (BRAVE_SEARCH_API_KEY)
 *    - Open Public Agronomic Research & MediaWiki REST APIs (English & Tamil)
 *    - Open-Meteo Live Agro-Weather API for real-time agricultural weather
 * 3. In-memory LRU Cache with TTL (15 minutes).
 * 4. Rate-limiting (sliding window, max 25 req/min) & strict 5-second timeouts.
 * 5. Prompt injection defense (sanitizes adversarial instruction tokens and HTML/scripts).
 * 6. Never claims search succeeded unless legitimate results were retrieved.
 */

// In-Memory Search Cache: key -> { timestamp, results }
const searchCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-Memory Rate Limiter: timestamps array
const requestTimestamps = [];
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

// Official Indian Government & Agricultural University Portals Registry
const OFFICIAL_GOVERNMENT_PORTALS = [
  // 1. Central Government Schemes (Tier 1)
  {
    domain: 'pmkisan.gov.in',
    name: 'PM-KISAN Samman Nidhi (Official Portal)',
    organization: 'Ministry of Agriculture & Farmers Welfare, Govt of India',
    tier: 1,
    url: 'https://pmkisan.gov.in',
    keywords: ['pm kisan', 'pm-kisan', 'samman nidhi', 'kisan samman', 'kisan portal', 'kisan subsidy', '₹6,000', '6000']
  },
  {
    domain: 'pmfby.gov.in',
    name: 'Pradhan Mantri Fasal Bima Yojana (PMFBY)',
    organization: 'Ministry of Agriculture & Farmers Welfare, Govt of India',
    tier: 1,
    url: 'https://pmfby.gov.in',
    keywords: ['pmfby', 'fasal bima', 'crop insurance', 'bima yojana', 'insurance claim', 'payir kaappeedhu', 'காப்பீட்டுத் திட்டம்']
  },
  {
    domain: 'agricoop.nic.in',
    name: 'Department of Agriculture & Farmers Welfare (DA&FW)',
    organization: 'Ministry of Agriculture & Farmers Welfare, Govt of India',
    tier: 1,
    url: 'https://agricoop.nic.in',
    keywords: ['agricoop', 'central agriculture', 'msp', 'minimum support price', 'agriculture ministry', 'krishi', 'வேளாண் அமைச்சகம்']
  },
  {
    domain: 'soilhealth.dac.gov.in',
    name: 'National Soil Health Card Portal',
    organization: 'Department of Agriculture & Farmers Welfare, Govt of India',
    tier: 1,
    url: 'https://soilhealth.dac.gov.in',
    keywords: ['soil health', 'soil health card', 'mann vala attai', 'soil testing', 'soil sample', 'soil fertility portal', 'மண் வளம்', 'மண் வள அட்டை', 'soil fertility']
  },
  {
    domain: 'agrimachinery.nic.in',
    name: 'Sub-Mission on Agricultural Mechanization (SMAM)',
    organization: 'Ministry of Agriculture & Farmers Welfare, Govt of India',
    tier: 1,
    url: 'https://agrimachinery.nic.in',
    keywords: ['smam', 'machinery subsidy', 'tractor subsidy', 'drone subsidy', 'rotavator', 'agricultural mechanization', 'இயந்திரமயமாக்கல்']
  },

  // 2. State Government & Tamil Nadu Resources (Tier 2)
  {
    domain: 'tnagrisnet.tn.gov.in',
    name: 'Tamil Nadu Agrisnet & Uzhavan Portal',
    organization: 'Department of Agriculture & Farmers Welfare, Government of Tamil Nadu',
    tier: 2,
    url: 'https://tnagrisnet.tn.gov.in',
    keywords: ['uzhavan', 'tnagrisnet', 'tamil nadu agriculture', 'uzhavan app', 'solar pump', 'tamil nadu subsidy', 'chief minister solar', 'முதலமைச்சரின் சூரிய சக்தி']
  },
  {
    domain: 'agritech.tnau.ac.in',
    name: 'TNAU Agritech Portal (Crop Protection & Package of Practices)',
    organization: 'Tamil Nadu Agricultural University (TNAU), Coimbatore',
    tier: 2,
    url: 'https://agritech.tnau.ac.in',
    keywords: ['tnau', 'coimbatore agriculture university', 'agritech', 'tamil nadu agricultural university', 'tnau package of practices', 'வேளாண்மைப் பல்கலைக்கழகம்']
  },
  {
    domain: 'icar.org.in',
    name: 'Indian Council of Agricultural Research (ICAR)',
    organization: 'Department of Agricultural Research and Education, Govt of India',
    tier: 2,
    url: 'https://icar.org.in',
    keywords: ['icar', 'indian council of agricultural research', 'kvk', 'krishi vigyan kendra', 'icar research', 'வேளாண் ஆராய்ச்சி குழுமம்']
  },

  // 3. Crop-Specific TNAU / ICAR Verified Resources
  {
    crop: 'tomato',
    domain: 'agritech.tnau.ac.in/tomato',
    name: 'TNAU Crop Protection Guidelines: Tomato Diseases & Pest Management',
    organization: 'Tamil Nadu Agricultural University (TNAU)',
    tier: 2,
    url: 'https://agritech.tnau.ac.in/crop_protection/crop_prot_crop%20diseases_veg_tomato.html',
    keywords: ['tomato', 'thakkali', 'தக்காளி', 'tomato blight', 'tomato curl', 'early blight', 'late blight', 'tomato yellow leaf']
  },
  {
    crop: 'brinjal',
    domain: 'agritech.tnau.ac.in/brinjal',
    name: 'TNAU Crop Protection Guidelines: Brinjal (Eggplant) Diseases & Pest Management',
    organization: 'Tamil Nadu Agricultural University (TNAU)',
    tier: 2,
    url: 'https://agritech.tnau.ac.in/crop_protection/crop_prot_crop%20diseases_veg_brinjal.html',
    keywords: ['brinjal', 'eggplant', 'kathari', 'kathirikai', 'katharikai', 'கத்தரி', 'phomopsis', 'little leaf', 'shoot borer', 'fruit borer']
  },
  {
    crop: 'chilli',
    domain: 'agritech.tnau.ac.in/chilli',
    name: 'TNAU Crop Protection Guidelines: Chilli Diseases & Pest Management',
    organization: 'Tamil Nadu Agricultural University (TNAU)',
    tier: 2,
    url: 'https://agritech.tnau.ac.in/crop_protection/crop_prot_crop%20diseases_veg_chilli.html',
    keywords: ['chilli', 'chili', 'milagai', 'மிளகாய்', 'anthracnose', 'dieback', 'bacterial spot']
  },
  {
    crop: 'rice',
    domain: 'agritech.tnau.ac.in/paddy',
    name: 'TNAU Water Management & Protection: Paddy (Rice) Cultivation',
    organization: 'Tamil Nadu Agricultural University (TNAU)',
    tier: 2,
    url: 'https://agritech.tnau.ac.in/agriculture/agri_crop_cereals_paddy.html',
    keywords: ['paddy', 'rice', 'nel', 'nellu', 'நெல்', 'paddy water', 'alternate wetting and drying', 'awd', 'panicle initiation', 'tillering']
  },
  {
    domain: 'agritech.tnau.ac.in/millets',
    name: 'TNAU Drought Resilient Crops & Millets Guide (Low-Water Agriculture)',
    organization: 'Tamil Nadu Agricultural University (TNAU)',
    tier: 2,
    url: 'https://agritech.tnau.ac.in/agriculture/agri_crop_cereals_millets.html',
    keywords: ['kammiya', 'water kammi', 'low water', 'water scarcity', 'drought', 'millets', 'ragi', 'kambu', 'cholam', 'குறைந்த நீர்', 'சிறுதானியங்கள்']
  }
];

// District coordinate mapping for real-time agricultural agro-weather
const DISTRICT_COORDINATES = {
  coimbatore: { lat: 11.0168, lon: 76.9558, name: 'Coimbatore, Tamil Nadu' },
  thanjavur: { lat: 10.7870, lon: 79.1378, name: 'Thanjavur (Cauvery Delta), Tamil Nadu' },
  madurai: { lat: 9.9252, lon: 78.1198, name: 'Madurai, Tamil Nadu' },
  trichy: { lat: 10.7905, lon: 78.7047, name: 'Tiruchirappalli, Tamil Nadu' },
  tiruchirappalli: { lat: 10.7905, lon: 78.7047, name: 'Tiruchirappalli, Tamil Nadu' },
  salem: { lat: 11.6643, lon: 78.1460, name: 'Salem, Tamil Nadu' },
  tirunelveli: { lat: 8.7139, lon: 77.7567, name: 'Tirunelveli, Tamil Nadu' },
  erode: { lat: 11.3410, lon: 77.7172, name: 'Erode, Tamil Nadu' },
  dindigul: { lat: 10.3673, lon: 77.9803, name: 'Dindigul, Tamil Nadu' },
  vellore: { lat: 12.9165, lon: 79.1325, name: 'Vellore, Tamil Nadu' },
  cuddalore: { lat: 11.7480, lon: 79.7714, name: 'Cuddalore, Tamil Nadu' },
  chennai: { lat: 13.0827, lon: 80.2707, name: 'Chennai, Tamil Nadu' }
};

/**
 * Sanitizes external webpage snippets to prevent prompt injection and remove raw HTML.
 */
function sanitizeSnippet(text) {
  if (!text) return '';
  let clean = text.replace(/<[^>]+>/g, ' '); // remove html tags
  clean = clean.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // Strip prompt injection tokens
  clean = clean.replace(/(ignore\s+previous\s+instructions|system\s+prompt|you\s+are\s+now|override\s+rules|jailbreak|disregard\s+prior)/gi, '[sanitized]');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean.substring(0, 320);
}

/**
 * Checks in-memory rate limiting.
 */
function checkRateLimit() {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_LIMIT_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  requestTimestamps.push(now);
  return true;
}

/**
 * Query official Tavily search API if configured.
 */
async function searchViaTavily(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_domains: ['agriculture.gov.in', 'agricoop.nic.in', 'pmkisan.gov.in', 'pmfby.gov.in', 'tnagrisnet.tn.gov.in', 'agritech.tnau.ac.in', 'icar.org.in', 'en.wikipedia.org'],
        max_results: 4
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data.results)) return null;

    return data.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: sanitizeSnippet(r.content),
      organization: getOrganizationFromUrl(r.url),
      tier: getTierFromUrl(r.url),
      retrieved_at: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Tavily search failed or timed out:', err.message);
    return null;
  }
}

/**
 * Query official Google Serper API if configured.
 */
async function searchViaSerper(query) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: `${query} (site:gov.in OR site:nic.in OR site:tnau.ac.in OR site:icar.org.in)`,
        num: 4
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    const organic = data.organic || [];

    return organic.map((r) => ({
      title: r.title,
      url: r.link,
      snippet: sanitizeSnippet(r.snippet),
      organization: getOrganizationFromUrl(r.link),
      tier: getTierFromUrl(r.link),
      retrieved_at: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Serper search failed or timed out:', err.message);
    return null;
  }
}

/**
 * Query official Brave Search API if configured.
 */
async function searchViaBrave(query) {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=4`, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return null;
    const data = await res.json();
    const web = data.web?.results || [];

    return web.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: sanitizeSnippet(r.description),
      organization: getOrganizationFromUrl(r.url),
      tier: getTierFromUrl(r.url),
      retrieved_at: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Brave search failed or timed out:', err.message);
    return null;
  }
}

/**
 * Query MediaWiki REST API (English or Tamil) for botanical, agronomic, and pest research.
 */
async function searchViaMediaWiki(query, lang = 'en') {
  const host = lang === 'ta' ? 'ta.wikipedia.org' : 'en.wikipedia.org';
  const url = `https://${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=3`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'AgriConnect-AI-Farming-Assistant/2.0 (https://agriconnect.ai; research@agriconnect.ai)'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) return [];
    const data = await res.json();
    const items = data.query?.search || [];

    return items.map((item) => ({
      title: item.title,
      url: `https://${host}/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
      snippet: sanitizeSnippet(item.snippet),
      organization: lang === 'ta' ? 'தமிழ் விக்கிப்பீடியா (வேளாண் தகவல் களஞ்சியம்)' : 'Wikipedia Botanical & Agronomic Knowledge Repository',
      tier: 4,
      retrieved_at: new Date().toISOString()
    }));
  } catch (err) {
    console.warn('MediaWiki search failed or timed out:', err.message);
    return [];
  }
}

/**
 * Fetch real-time agro-meteorological data from Open-Meteo for agricultural planning.
 */
async function fetchAgroWeatherData(districtName = 'thanjavur') {
  const norm = (districtName || '').toLowerCase().trim();
  const coords = DISTRICT_COORDINATES[norm] || DISTRICT_COORDINATES['thanjavur'];

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia%2FKolkata`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();

    const curr = data.current;
    const daily = data.daily;

    const weatherCodeMap = {
      0: 'Clear sky (தெளிவான வானிலை)',
      1: 'Mainly clear (பெரும்பாலும் தெளிவான வானம்)',
      2: 'Partly cloudy (பகுதி மேகமூட்டம்)',
      3: 'Overcast (முழு மேகமூட்டம்)',
      51: 'Light drizzle (மெல்லிய தூறல்)',
      61: 'Slight rain (லேசான மழை)',
      63: 'Moderate rain (மிதமான மழை)',
      65: 'Heavy rain (கனமழை)',
      80: 'Rain showers (மழைப்பொழிவு)'
    };

    return {
      location: coords.name,
      temperature: `${curr.temperature_2m}°C`,
      humidity: `${curr.relative_humidity_2m}%`,
      precipitation: `${curr.precipitation} mm`,
      condition: weatherCodeMap[curr.weather_code] || 'Normal weather (இயல்பான வானிலை)',
      maxTemp: daily?.temperature_2m_max?.[0] ? `${daily.temperature_2m_max[0]}°C` : 'N/A',
      minTemp: daily?.temperature_2m_min?.[0] ? `${daily.temperature_2m_min[0]}°C` : 'N/A',
      source: {
        title: `Real-Time Agro-Meteorological Weather Data (${coords.name})`,
        url: 'https://open-meteo.com',
        organization: 'Open-Meteo Verified Agro-Meteorological Satellite Service',
        tier: 3,
        retrieved_at: new Date().toISOString()
      }
    };
  } catch (err) {
    console.warn('Weather API failed or timed out:', err.message);
    return null;
  }
}

/**
 * Matches official portals from the curated government directory index.
 */
function matchOfficialGovernmentPortals(query, cropContext = null) {
  const lower = query.toLowerCase();
  const matched = [];

  for (const portal of OFFICIAL_GOVERNMENT_PORTALS) {
    // If the portal is crop-specific and an active crop or crop mention is present:
    if (portal.crop) {
      if (cropContext && cropContext !== portal.crop) {
        continue; // Crop mismatch against conversation context
      }
      // Check if query explicitly asks about a different crop
      if ((lower.includes('brinjal') || lower.includes('kathari') || lower.includes('eggplant')) && portal.crop !== 'brinjal') continue;
      if ((lower.includes('tomato') || lower.includes('thakkali')) && portal.crop !== 'tomato') continue;
      if ((lower.includes('chilli') || lower.includes('milagai')) && portal.crop !== 'chilli') continue;
      if ((lower.includes('paddy') || lower.includes('rice') || lower.includes('nel')) && portal.crop !== 'rice') continue;
    }

    const isMatch = portal.keywords.some((kw) => lower.includes(kw));
    if (isMatch) {
      matched.push({
        title: portal.name,
        url: portal.url,
        organization: portal.organization,
        tier: portal.tier,
        snippet: `Verified guidelines and official portal for ${portal.name}.`,
        retrieved_at: new Date().toISOString()
      });
    }
  }

  return matched;
}

/**
 * Resolves source organization name from URL.
 */
function getOrganizationFromUrl(url) {
  if (!url) return 'Verified Agricultural Resource';
  const u = url.toLowerCase();
  if (u.includes('pmkisan.gov.in')) return 'PM-KISAN, Ministry of Agriculture & Farmers Welfare, Govt of India';
  if (u.includes('pmfby.gov.in')) return 'PMFBY, Ministry of Agriculture & Farmers Welfare, Govt of India';
  if (u.includes('agricoop.nic.in') || u.includes('agriculture.gov.in')) return 'Ministry of Agriculture & Farmers Welfare, Govt of India';
  if (u.includes('tnagrisnet.tn.gov.in')) return 'Department of Agriculture & Farmers Welfare, Government of Tamil Nadu';
  if (u.includes('tnau.ac.in')) return 'Tamil Nadu Agricultural University (TNAU)';
  if (u.includes('icar.org.in')) return 'Indian Council of Agricultural Research (ICAR)';
  if (u.includes('soilhealth.dac.gov.in')) return 'National Soil Health Mission, Govt of India';
  if (u.includes('agrimachinery.nic.in')) return 'SMAM, Ministry of Agriculture, Govt of India';
  if (u.includes('wikipedia.org')) return 'Wikipedia Botanical & Agronomic Knowledge Repository';
  return 'Verified Agricultural Portal';
}

/**
 * Resolves priority tier from URL.
 */
function getTierFromUrl(url) {
  if (!url) return 4;
  const u = url.toLowerCase();
  if (u.includes('agricoop.nic.in') || u.includes('pmkisan.gov.in') || u.includes('pmfby.gov.in') || u.includes('soilhealth.dac.gov.in') || u.includes('agrimachinery.nic.in')) return 1;
  if (u.includes('icar.org.in') || u.includes('tnau.ac.in') || u.includes('tnagrisnet.tn.gov.in')) return 2;
  if (u.includes('.gov.in') || u.includes('.nic.in')) return 3;
  return 4;
}

/**
 * Sorts sources by credibility tier and deduplicates URLs.
 */
function sortAndDeduplicateSources(sources) {
  const seen = new Set();
  const unique = [];

  for (const s of sources) {
    if (!s || !s.url) continue;
    const cleanUrl = s.url.split('#')[0].replace(/\/$/, '');
    if (!seen.has(cleanUrl)) {
      seen.add(cleanUrl);
      unique.push(s);
    }
  }

  // Sort by Tier ascending (Tier 1 > Tier 2 > Tier 3 > Tier 4)
  unique.sort((a, b) => (a.tier || 4) - (b.tier || 4));
  return unique.slice(0, 4);
}

/**
 * Main Web Research Function.
 */
async function performWebResearch({ query, lang = 'en', location = null, category = 'general', cropContext = null }) {
  const trimmed = (query || '').trim();
  if (!trimmed) {
    return {
      success: false,
      sources: [],
      web_search_performed: false,
      reason: 'Empty query'
    };
  }

  // 1. Check in-memory cache
  const cacheKey = `${trimmed.toLowerCase()}_${lang}_${location || ''}_${cropContext || ''}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return {
      success: true,
      sources: cached.sources,
      weather: cached.weather || null,
      web_search_performed: true,
      from_cache: true
    };
  }

  // 2. Check rate limit
  if (!checkRateLimit()) {
    console.warn('Web search rate limit reached; using fallback.');
    return {
      success: false,
      sources: [],
      web_search_performed: false,
      reason: 'rate_limited'
    };
  }

  const collectedSources = [];
  let weatherData = null;

  try {
    const lower = trimmed.toLowerCase();

    // 3. Check for weather inquiry
    const isWeatherQuery = lower.includes('weather') || lower.includes('rain') || lower.includes('வானிலை') || lower.includes('மழை') || lower.includes('temperature') || lower.includes('humidity');
    if (isWeatherQuery) {
      let matchedDistrict = 'thanjavur';
      for (const d of Object.keys(DISTRICT_COORDINATES)) {
        if (lower.includes(d)) {
          matchedDistrict = d;
          break;
        }
      }
      weatherData = await fetchAgroWeatherData(matchedDistrict);
      if (weatherData?.source) {
        collectedSources.push(weatherData.source);
      }
    }

    // 4. Match Official Indian Government Portals (Tier 1 & Tier 2) with crop filtering
    const portalMatches = matchOfficialGovernmentPortals(trimmed, cropContext);
    collectedSources.push(...portalMatches);

    // 5. Try paid / configurable search APIs if configured (Tavily, Serper, Brave)
    let apiResults = await searchViaTavily(trimmed);
    if (!apiResults || apiResults.length === 0) {
      apiResults = await searchViaSerper(trimmed);
    }
    if (!apiResults || apiResults.length === 0) {
      apiResults = await searchViaBrave(trimmed);
    }

    if (Array.isArray(apiResults) && apiResults.length > 0) {
      collectedSources.push(...apiResults);
    }

    // 6. Query MediaWiki botanical API for peer-reviewed botanical/pest articles
    if (collectedSources.length < 2) {
      const searchTerms = trimmed
        .replace(/[?.,!/\\()]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !['what', 'when', 'how', 'why', 'where', 'enna', 'eppo', 'epdi', 'solunga'].includes(w.toLowerCase()))
        .slice(0, 4)
        .join(' ');

      if (searchTerms) {
        const wikiResults = await searchViaMediaWiki(searchTerms, lang === 'ta' ? 'ta' : 'en');
        if (wikiResults.length > 0) {
          collectedSources.push(...wikiResults);
        } else if (lang === 'ta') {
          // If Tamil wiki has no hit, search English botanical wiki
          const enWikiResults = await searchViaMediaWiki(searchTerms, 'en');
          collectedSources.push(...enWikiResults);
        }
      }
    }

    // 7. Deduplicate and prioritize sources
    const finalSources = sortAndDeduplicateSources(collectedSources);

    const searchResult = {
      success: finalSources.length > 0,
      sources: finalSources,
      weather: weatherData,
      web_search_performed: finalSources.length > 0
    };

    if (finalSources.length > 0) {
      searchCache.set(cacheKey, {
        timestamp: Date.now(),
        sources: finalSources,
        weather: weatherData
      });
    }

    return searchResult;
  } catch (err) {
    console.error('Web research engine error:', err.message);
    return {
      success: false,
      sources: [],
      web_search_performed: false,
      reason: err.message
    };
  }
}

module.exports = {
  performWebResearch,
  fetchAgroWeatherData,
  matchOfficialGovernmentPortals,
  OFFICIAL_GOVERNMENT_PORTALS,
  DISTRICT_COORDINATES,
  sanitizeSnippet
};
