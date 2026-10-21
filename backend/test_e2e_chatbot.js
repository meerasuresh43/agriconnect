/**
 * test_e2e_chatbot.js
 * Comprehensive End-to-End Test Suite for AgriConnect AI Farming Assistant with Web Research.
 */

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('======================================================================');
  console.log('🌾 AgriConnect AI Farming Assistant End-to-End Verification Test Suite');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  async function assertCase(name, fn) {
    total++;
    try {
      console.log(`[Test ${total}] Testing: ${name}...`);
      await fn();
      console.log(`✅ PASSED: ${name}\n`);
      passed++;
    } catch (err) {
      console.error(`❌ FAILED: ${name} -> ${err.message}\n`);
    }
  }

  // 1. Tanglish Tomato Leaf Yellowing
  await assertCase('Tanglish Tomato Yellowing ("Tomato leaf yellow ah irukku, enna problem?")', async () => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Tomato leaf yellow ah irukku, enna problem?' })
    });
    const data = await res.json();
    if (!data.success) throw new Error('API returned success=false');
    if (data.detected_language !== 'tanglish' && data.meta?.detected_language !== 'tanglish') {
      throw new Error(`Expected tanglish, got ${data.meta?.detected_language}`);
    }
    if (!data.reply.includes('Direct Answer') || !data.reply.includes('Simple Explanation') || !data.reply.includes('Aduthu Enna Seiyanum')) {
      throw new Error('Reply missing required 4-part structure');
    }
    if (!data.reply.toLowerCase().includes('tylcv') && !data.reply.toLowerCase().includes('whitefly') && !data.reply.toLowerCase().includes('vella ee')) {
      throw new Error('Reply does not address tomato yellowing causes');
    }
    console.log(`   Language: ${data.meta?.detected_language}, Sources: ${data.sources?.length}`);
  });

  // 2. Pure Tamil Tomato Yellowing
  await assertCase('Tamil Tomato Yellowing ("தக்காளி இலையில் மஞ்சள் நிறம் வருகிறது, என்ன காரணம்?")', async () => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'தக்காளி இலையில் மஞ்சள் நிறம் வருகிறது, என்ன காரணம்?' })
    });
    const data = await res.json();
    if (!data.success) throw new Error('API returned success=false');
    if (data.meta?.detected_language !== 'ta') throw new Error(`Expected ta, got ${data.meta?.detected_language}`);
    if (!data.reply.includes('நேரடி பதில்') || !data.reply.includes('எளிய விளக்கம்')) {
      throw new Error('Reply missing Tamil 4-part structure');
    }
    console.log(`   Language: ${data.meta?.detected_language}, Sources: ${data.sources?.length}`);
  });

  // 3. English Tomato Yellowing
  await assertCase('English Tomato Yellowing ("Why are my tomato leaves turning yellow?")', async () => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Why are my tomato leaves turning yellow?' })
    });
    const data = await res.json();
    if (!data.success) throw new Error('API returned success=false');
    if (data.meta?.detected_language !== 'en') throw new Error(`Expected en, got ${data.meta?.detected_language}`);
    if (!data.reply.includes('Direct Answer') || !data.reply.includes('What to Do Next')) {
      throw new Error('Reply missing English 4-part structure');
    }
    console.log(`   Language: ${data.meta?.detected_language}, Sources: ${data.sources?.length}`);
  });

  // 4. Soil Fertility Improvement
  await assertCase('Soil Fertility ("How can I improve soil fertility?")', async () => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'How can I improve soil fertility?' })
    });
    const data = await res.json();
    if (!data.success) throw new Error('API returned success=false');
    if (!data.reply.toLowerCase().includes('green manur') && !data.reply.toLowerCase().includes('fym') && !data.reply.toLowerCase().includes('soil health')) {
      throw new Error('Reply does not contain verified soil fertility methods');
    }
    if (!data.sources || data.sources.length === 0) {
      throw new Error('Expected web research sources for soil fertility');
    }
    console.log(`   Web Search Performed: ${data.web_search_performed}, First Source: ${data.sources[0]?.title} (${data.sources[0]?.url})`);
  });

  // 5. Low-Water / Drought Crops in Tanglish
  await assertCase('Low-Water Crops Tanglish ("Nalla water kammiya irukkura land-ku enna crop podalam?")', async () => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Nalla water kammiya irukkura land-ku enna crop podalam?' })
    });
    const data = await res.json();
    if (!data.success) throw new Error('API returned success=false');
    if (!data.reply.toLowerCase().includes('millet') && !data.reply.toLowerCase().includes('kambu') && !data.reply.toLowerCase().includes('ragi')) {
      throw new Error('Reply does not recommend millets/pulses');
    }
    console.log(`   Language: ${data.meta?.detected_language}, Sources: ${data.sources?.length}`);
  });

  // 6. Multi-Turn Context Tracking (Antecedent Resolution)
  await assertCase('Multi-Turn Context Tracking ("My tomato leaves have brown spots" -> "How can I treat it?")', async () => {
    // Turn 1
    const res1 = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'My tomato leaves have brown spots.' })
    });
    const data1 = await res1.json();
    if (!data1.success) throw new Error('Turn 1 failed');

    // Turn 2: Follow-up referencing "it"
    const res2 = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How can I treat it?',
        history: [
          { sender: 'user', text: 'My tomato leaves have brown spots.' },
          { sender: 'ai', text: data1.reply }
        ]
      })
    });
    const data2 = await res2.json();
    if (!data2.success) throw new Error('Turn 2 failed');
    if (data2.meta?.crop_context !== 'tomato') {
      throw new Error(`Expected inherited crop_context='tomato', got ${data2.meta?.crop_context}`);
    }
    if (!data2.reply.toLowerCase().includes('mancozeb') && !data2.reply.toLowerCase().includes('copper oxychloride') && !data2.reply.toLowerCase().includes('fungicide')) {
      throw new Error('Follow-up treatment did not provide early blight / brown spot treatment');
    }
    console.log(`   Turn 2 Inherited Crop: ${data2.meta?.crop_context}, Symptom: ${data2.meta?.symptom_context}`);
  });

  // 7. Live Weather & Agro-Meteorology
  await assertCase('Live Weather & Agro-Meteorology ("Thanjavur weather for paddy irrigation")', async () => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Thanjavur weather for paddy irrigation' })
    });
    const data = await res.json();
    if (!data.success) throw new Error('API returned success=false');
    if (!data.weather || !data.weather.temperature) {
      throw new Error('Expected live weather data from Open-Meteo');
    }
    console.log(`   Live Weather: ${data.weather.temperature}, Humidity: ${data.weather.humidity}, Location: ${data.weather.location}`);
  });

  // 8. Government Scheme with Official Portal Citation
  await assertCase('Government Scheme Research ("PM Kisan Samman Nidhi eligibility and benefits")', async () => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'PM Kisan Samman Nidhi eligibility and benefits' })
    });
    const data = await res.json();
    if (!data.success) throw new Error('API returned success=false');
    const hasPmkisanUrl = data.sources?.some(s => s.url.includes('pmkisan.gov.in'));
    if (!hasPmkisanUrl) {
      throw new Error('Expected official pmkisan.gov.in portal link in sources');
    }
    console.log(`   Verified Official Portal: ${data.sources.find(s => s.url.includes('pmkisan.gov.in')).url}`);
  });

  // 9. Out of Scope Polite Boundary
  await assertCase('Out of Scope Filtering ("Who won the cricket match yesterday?")', async () => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Who won the cricket match yesterday?' })
    });
    const data = await res.json();
    if (!data.success) throw new Error('API returned success=false');
    if (data.meta?.intent !== 'out_of_scope') throw new Error(`Expected intent out_of_scope, got ${data.meta?.intent}`);
    if (!data.reply.toLowerCase().includes('agriculture') && !data.reply.toLowerCase().includes('farming')) {
      throw new Error('Reply did not explain agricultural scope');
    }
    console.log(`   Intent: ${data.meta?.intent}, Out-of-Scope Politeness Verified`);
  });

  // 10. Plant Disease Visual Model Bridge (/api/ai/disease-detect)
  await assertCase('Existing Plant Disease Model Integrity (/api/ai/disease-detect)', async () => {
    const res = await fetch(`${BASE_URL}/ai/disease-detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sampleDiseaseKey: 'bean_rust', lang: 'en' })
    });
    const data = await res.json();
    if (!data.success) throw new Error('Disease detection bridge failed: ' + (data.message || 'unknown'));
    if (!data.diseaseName && !data.predicted_class) {
      throw new Error('Disease detection did not return valid prediction');
    }
    console.log(`   Detected Disease: ${data.diseaseName || data.predicted_class}, Confidence: ${data.confidence}%`);
  });

  // 11. User Isolated Chat History Persistence
  await assertCase('User Chat History Persistence & Isolation', async () => {
    const jwt = require('jsonwebtoken');
    const { getDb } = require('./db');
    const db = await getDb();
    const secret = 'agriconnect_super_secret_jwt_key_2026';

    // Insert temporary test users into DB
    await db.run(`INSERT OR IGNORE INTO users (id, farmer_user_id, name, email, password_hash, role, status) VALUES (9001, 'FAR-9001', 'Test Farmer 1', 'farmer1@test.com', 'hash', 'farmer', 'active')`);
    await db.run(`INSERT OR IGNORE INTO users (id, farmer_user_id, name, email, password_hash, role, status) VALUES (9002, 'FAR-9002', 'Test Farmer 2', 'farmer2@test.com', 'hash', 'farmer', 'active')`);

    const user1Token = jwt.sign({ id: 9001, role: 'farmer' }, secret);
    const user2Token = jwt.sign({ id: 9002, role: 'farmer' }, secret);

    // User 1 sends message
    await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({ message: 'User 1 private question about paddy irrigation' })
    });

    // User 1 gets history
    const res1 = await fetch(`${BASE_URL}/ai/chat/history`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    const data1 = await res1.json();
    if (!data1.success) throw new Error('User 1 fetch history failed');
    if (!data1.history.some(h => h.message.includes('User 1 private question'))) {
      throw new Error('User 1 message not found in User 1 history');
    }

    // User 2 gets history - MUST NOT see User 1's messages!
    const res2 = await fetch(`${BASE_URL}/ai/chat/history`, {
      headers: { 'Authorization': `Bearer ${user2Token}` }
    });
    const data2 = await res2.json();
    if (!data2.success) throw new Error('User 2 fetch history failed');
    const user1Leak = data2.history.some(h => h.message.includes('User 1 private question'));
    if (user1Leak) {
      throw new Error('CRITICAL SECURITY VIOLATION: User 2 history contains User 1 messages!');
    }

    // Clean up temporary test records
    await db.run(`DELETE FROM chat_history WHERE user_id IN (9001, 9002)`);
    await db.run(`DELETE FROM users WHERE id IN (9001, 9002)`);

    console.log(`   User 1 Records: ${data1.count}, User 2 Records: ${data2.count} (Strict User Isolation Confirmed)`);
  });

  console.log('======================================================================');
  console.log(`🎉 Final Test Summary: ${passed} / ${total} Tests Passed (${Math.round((passed / total) * 100)}%)`);
  console.log('======================================================================');
}

runTests().catch(console.error);
