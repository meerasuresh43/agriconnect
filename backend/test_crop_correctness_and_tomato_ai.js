/**
 * test_crop_correctness_and_tomato_ai.js
 * Comprehensive automated regression test verifying:
 * 1. Priority 1: Crop-specific responses (Brinjal brown spots never returns Tomato, immediate crop switching, multi-turn inheritance, ambiguous crop clarification).
 * 2. Priority 2: Tomato disease detector accuracy (>90% on clear tomato late blight, blur rejection on blurry image).
 * 3. Priority 3: Disease detector integration into chatbot (inheriting image context, detecting cross-crop mismatch).
 */

const fs = require('fs');
const path = require('path');

const BACKEND_URL = 'http://localhost:5000';
const FLASK_URL = 'http://127.0.0.1:5001';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 AgriConnect Automated Test Suite: Crop Correctness & Tomato AI');
  console.log('================================================================\n');

  // =================================================================
  // TEST 1: PRIORITY 1 - CROP SPECIFIC CHATBOT CORRECTNESS
  // =================================================================
  console.log('--- TEST GROUP 1: Crop-Specific Chatbot Correctness ---');

  // 1A. Brinjal brown spots in Tanglish
  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Brinjal leaf brown-ah irukku, enna problem?'
      })
    });
    const data = await res.json();
    assert(data.success === true, '1A: API response success is true');
    assert(data.meta?.crop_context === 'brinjal', `1A: crop_context is 'brinjal' (got '${data.meta?.crop_context}')`);
    assert(data.meta?.detected_language === 'tanglish', `1A: language detected as tanglish (got '${data.meta?.detected_language}')`);
    assert(
      data.reply.toLowerCase().includes('phomopsis') || data.reply.toLowerCase().includes('cercospora') || data.reply.includes('Kathirikai'),
      '1A: Reply discusses Brinjal pathogens (Phomopsis / Cercospora / Kathirikai)'
    );
    assert(
      !data.reply.toLowerCase().includes('alternaria solani') && !data.reply.toLowerCase().includes('thakkali') && !data.reply.includes('Tomato Early Blight'),
      '1A: Reply NEVER mentions Tomato Early Blight or Thakkali'
    );
  } catch (err) {
    assert(false, `1A error: ${err.message}`);
  }

  // 1B. Brinjal brown spots in Tamil Script
  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'கத்தரி இலையில் பழுப்பு நிற புள்ளி இருக்கு, என்ன காரணம்?'
      })
    });
    const data = await res.json();
    assert(data.success === true, '1B: API response success is true');
    assert(data.meta?.crop_context === 'brinjal', `1B: crop_context is 'brinjal' (got '${data.meta?.crop_context}')`);
    assert(data.meta?.detected_language === 'ta', `1B: language detected as Tamil 'ta' (got '${data.meta?.detected_language}')`);
    assert(
      data.reply.includes('போமாப்சிஸ்') || data.reply.includes('செர்கோஸ்போரா') || data.reply.includes('கத்தரி'),
      '1B: Reply contains Tamil Brinjal disease terms (போமாப்சிஸ் / கத்தரி)'
    );
    assert(!data.reply.includes('தக்காளி'), '1B: Reply does NOT contain தக்காளி (tomato)');
  } catch (err) {
    assert(false, `1B error: ${err.message}`);
  }

  // 1C. Immediate Crop Switching: User asks about Tomato then switches to Brinjal
  try {
    const turn1Res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Tomato leaf yellow ah irukku' })
    });
    const turn1Data = await turn1Res.json();
    assert(turn1Data.meta?.crop_context === 'tomato', '1C Turn 1: crop_context is tomato');

    // Turn 2: User explicitly switches crop to Brinjal
    const turn2Res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Ippo brinjal pathi sollu',
        history: [{ sender: 'user', text: 'Tomato leaf yellow ah irukku' }, { sender: 'ai', text: turn1Data.reply }]
      })
    });
    const turn2Data = await turn2Res.json();
    assert(turn2Data.meta?.crop_context === 'brinjal', `1C Turn 2: crop_context successfully switched to 'brinjal' (got '${turn2Data.meta?.crop_context}')`);
    assert(turn2Data.meta?.is_crop_switched === true, '1C Turn 2: is_crop_switched flag is true');
    assert(
      turn2Data.reply.toLowerCase().includes('brinjal') || turn2Data.reply.includes('Kathirikai') || turn2Data.reply.includes('கத்தரி'),
      '1C Turn 2: Reply explains Brinjal management'
    );
  } catch (err) {
    assert(false, `1C error: ${err.message}`);
  }

  // 1D. Multi-turn Antecedent Inheritance
  try {
    const turn1Res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Brinjal plant la problem' })
    });
    const turn1 = await turn1Res.json();

    const turn2Res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Leaf brown-ah irukku enna pannanum?',
        history: [{ sender: 'user', text: 'Brinjal plant la problem' }, { sender: 'ai', text: turn1.reply }]
      })
    });
    const turn2 = await turn2Res.json();
    assert(turn2.meta?.crop_context === 'brinjal', `1D Turn 2: Inherited crop 'brinjal' (got '${turn2.meta?.crop_context}')`);

    // Turn 3: Follow-up asking for treatment without naming crop or disease
    const turn3Res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Indha disease-ku treatment enna?',
        history: [
          { sender: 'user', text: 'Brinjal plant la problem' },
          { sender: 'ai', text: turn1.reply },
          { sender: 'user', text: 'Leaf brown-ah irukku enna pannanum?' },
          { sender: 'ai', text: turn2.reply }
        ]
      })
    });
    const turn3 = await turn3Res.json();
    assert(turn3.meta?.crop_context === 'brinjal', `1D Turn 3: Preserved crop 'brinjal' across multi-turn (got '${turn3.meta?.crop_context}')`);
    assert(
      turn3.reply.toLowerCase().includes('mancozeb') || turn3.reply.toLowerCase().includes('copper oxychloride') || turn3.reply.toLowerCase().includes('phomopsis'),
      '1D Turn 3: Provided Brinjal certified treatment steps'
    );
    assert(!turn3.reply.toLowerCase().includes('thakkali') && !turn3.reply.includes('Tomato'), '1D Turn 3: Zero tomato leakage in brinjal follow-up');
  } catch (err) {
    assert(false, `1D error: ${err.message}`);
  }

  // 1E. Ambiguous Crop Query Clarification
  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Leaf brown-ah irukku enna problem?' // No crop mentioned, empty history
      })
    });
    const data = await res.json();
    assert(data.success === true, '1E: API response success is true');
    assert(data.meta?.crop_context === null, `1E: crop_context is null for ambiguous query (got '${data.meta?.crop_context}')`);
    assert(
      data.reply.toLowerCase().includes('endha payir') || data.reply.toLowerCase().includes('specify which crop') || data.reply.includes('பயிரின் பெயரை'),
      '1E: System asks a clarifying question requesting crop identity instead of assuming tomato'
    );
  } catch (err) {
    assert(false, `1E error: ${err.message}`);
  }

  // =================================================================
  // TEST 2: PRIORITY 2 - TOMATO DISEASE DETECTOR
  // =================================================================
  console.log('\n--- TEST GROUP 2: Tomato Disease Detector Health & Calibration ---');

  // 2A. Clear Tomato Late Blight Sample
  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/disease-detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleDiseaseKey: 'tomato_late_blight', lang: 'en' })
    });
    const data = await res.json();
    assert(data.success === true, '2A: Disease detect API returns success: true');
    assert(data.diseaseName.includes('Tomato Late Blight'), `2A: Detected condition is Tomato Late Blight (got '${data.diseaseName}')`);
    assert(data.confidence >= 90, `2A: High confidence prediction >= 90% (got ${data.confidence}%)`);
    assert(data.confidence_level === 'High', `2A: Calibrated confidence level is 'High' (got '${data.confidence_level}')`);
    assert(data.uncertain === false || data.uncertain === undefined, '2A: Not marked uncertain or suppressed');
    assert(Array.isArray(data.symptoms) && data.symptoms.length > 0, '2A: Returns clear symptom descriptions');
    assert(Array.isArray(data.recoverySteps) && data.recoverySteps.length > 0, '2A: Returns actionable recovery steps');
  } catch (err) {
    assert(false, `2A error: ${err.message}`);
  }

  // 2B. Discrete Blur Detection
  try {
    // Read the created blurred leaf image (Gaussian blurred leaf)
    const blurredFilePath = path.join(__dirname, '../ai_service/test_blurred_leaf.jpg');
    const blurBytes = fs.readFileSync(blurredFilePath);
    const boundary = '----WebKitFormBoundaryBlurTest123';

    const bodyParts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="blurred.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
      blurBytes,
      `\r\n--${boundary}--\r\n`
    ];
    const bodyBuffer = Buffer.concat(bodyParts.map(p => typeof p === 'string' ? Buffer.from(p) : p));

    const res = await fetch(`${FLASK_URL}/api/predict`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: bodyBuffer
    });
    assert(res.status === 400, `2B: Severe blur is rejected with HTTP 400 (got ${res.status})`);
    const errData = await res.json();
    assert(errData.error === 'BLURRED_IMAGE' || errData.error_code === 'BLURRED_IMAGE', `2B: Error code is BLURRED_IMAGE (got error='${errData.error}', code='${errData.error_code}')`);
  } catch (err) {
    assert(false, `2B error: ${err.message}`);
  }

  // =================================================================
  // TEST 3: PRIORITY 3 - CONNECT DISEASE DETECTOR TO CHATBOT
  // =================================================================
  console.log('\n--- TEST GROUP 3: Detector Bridge to Chatbot & Discrepancy Alert ---');

  // 3A. Chat inherits crop & disease from image prediction
  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How can I treat this disease in my field?', // No crop mentioned in text
        imagePrediction: {
          crop: 'brinjal',
          diseaseName: 'Eggplant Cercospora Leaf Spot'
        }
      })
    });
    const data = await res.json();
    assert(data.success === true, '3A: API response success is true');
    assert(data.meta?.crop_context === 'brinjal', `3A: Inherited crop 'brinjal' from image prediction (got '${data.meta?.crop_context}')`);
    assert(
      data.reply.toLowerCase().includes('brinjal') || data.reply.toLowerCase().includes('mancozeb') || data.reply.toLowerCase().includes('cercospora'),
      '3A: Chatbot answers with Brinjal Cercospora treatment based on image context'
    );
  } catch (err) {
    assert(false, `3A error: ${err.message}`);
  }

  // 3B. Cross-crop discrepancy detection
  try {
    const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Brinjal leaf-ku enna spray podalam?', // Asking about Brinjal
        imagePrediction: {
          crop: 'tomato', // But image was Tomato Late Blight
          diseaseName: 'Tomato Late Blight'
        }
      })
    });
    const data = await res.json();
    assert(data.success === true, '3B: API response success is true');
    assert(data.meta?.crop_context === 'brinjal', `3B: User requested crop 'brinjal' takes precedence (got '${data.meta?.crop_context}')`);
    assert(data.meta?.image_discrepancy !== null, '3B: Cross-crop image_discrepancy flag detected');
    assert(
      data.reply.includes('Note:') || data.reply.includes('Notice:') || data.reply.includes('குறிப்பு:'),
      '3B: Reply includes polite discrepancy notice acknowledging uploaded Tomato image'
    );
    assert(
      data.reply.toLowerCase().includes('brinjal') || data.reply.toLowerCase().includes('phomopsis') || data.reply.includes('Kathirikai'),
      '3B: Directly answers for Brinjal despite the Tomato image upload'
    );
  } catch (err) {
    assert(false, `3B error: ${err.message}`);
  }

  // Summary
  console.log('\n================================================================');
  console.log(`📊 Test Results: ${passed} PASSED, ${failed} FAILED (Total: ${passed + failed})`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
