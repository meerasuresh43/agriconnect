import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { 
  Bot, Mic, MicOff, Send, Upload, Sparkles, AlertTriangle, ShieldCheck, 
  CheckCircle2, RotateCcw, ExternalLink, Leaf, Volume2, AlertCircle, RefreshCw, Languages
} from 'lucide-react';

export const AiAssistant = () => {
  const { lang, toggleLanguage, t, translateText } = useLanguage();
  const [activeTab, setActiveTab] = useState('disease'); // 'disease', 'cropRec', 'schemes', 'chat'

  // --- 1. Disease Detection State ---
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [diseaseResult, setDiseaseResult] = useState(null);

  // --- 2. Crop Recommendation State ---
  const [cropInputs, setCropInputs] = useState({
    location: 'Thanjavur, Tamil Nadu',
    soil_type: 'Alluvial Soil',
    water_source: 'Canal & Borewell',
    season: 'Kharif / Samba',
    previous_crop: 'Black Gram',
    area_acres: '4.0'
  });
  const [recLoading, setRecLoading] = useState(false);
  const [cropResults, setCropResults] = useState(null);

  // --- 3. Government Schemes State ---
  const [schemes, setSchemes] = useState([]);
  const [schemeSearch, setSchemeSearch] = useState('');

  // --- 4. Chat & Bilingual Voice Assistant State ---
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: lang === 'ta' 
        ? 'வணக்கம்! நான் உங்கள் அக்ரிகனெக்ட் AI விவசாய உதவியாளன் 🌾. பயிர் நோய், உரப் பரிந்துரை அல்லது அரசு திட்டங்கள் குறித்து என்னிடம் கேட்கலாம்.'
        : 'Greetings! I am your AgriConnect AI Farming Assistant 🌾. Feel free to ask about crop diseases, fertilizers, or government agriculture subsidies in English or Tamil.'
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState('auto'); // 'auto', 'ta', 'en'
  const [micError, setMicError] = useState('');
  const [emptyRecognitionNotice, setEmptyRecognitionNotice] = useState(false);
  const [autoLangNotice, setAutoLangNotice] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recognitionRef = useRef(null);
  const hasRecognizedTextRef = useRef(false);
  const chatEndRef = useRef(null);

  const fetchSchemes = async () => {
    try {
      const res = await api.get('/ai/schemes', { params: { search: schemeSearch, lang } });
      if (res.data.success) {
        setSchemes(res.data.schemes);
      }
    } catch (err) {
      console.error('Fetch schemes error:', err);
    }
  };

  const refetchCropRecs = async () => {
    try {
      const res = await api.post('/ai/crop-recommendation', { ...cropInputs, lang });
      if (res.data.success) {
        setCropResults(res.data.recommendations);
      }
    } catch (err) {
      console.error('Crop rec refetch error:', err);
    }
  };

  // Re-fetch government schemes whenever search OR language changes!
  useEffect(() => {
    fetchSchemes();
  }, [schemeSearch, lang]);

  // Re-fetch crop recommendations if language changes while results are displayed
  useEffect(() => {
    if (cropResults) {
      refetchCropRecs();
    }
  }, [lang]);

  // Handle Plant Disease Upload & Analysis
  const handleDiseaseDetect = async (sampleKey = null, forceLowConf = false) => {
    setDetecting(true);
    setDiseaseResult(null);

    try {
      const formData = new FormData();
      formData.append('lang', lang);
      if (selectedFile) formData.append('image', selectedFile);
      if (sampleKey) formData.append('sampleDiseaseKey', sampleKey);
      if (forceLowConf) formData.append('forceLowConfidence', 'true');

      const res = await api.post('/ai/disease-detect', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setDiseaseResult(res.data);
      }
    } catch (err) {
      console.error('Disease detection error:', err);
    } finally {
      setDetecting(false);
    }
  };

  // Handle Crop Recommendation Submission
  const handleGetCropRecs = async (e) => {
    if (e) e.preventDefault();
    setRecLoading(true);
    try {
      const res = await api.post('/ai/crop-recommendation', { ...cropInputs, lang });
      if (res.data.success) {
        setCropResults(res.data.recommendations);
      }
    } catch (err) {
      console.error('Crop rec error:', err);
    } finally {
      setRecLoading(false);
    }
  };

  // Handle General AI Chat Submission (Prevent duplicate submission & no auto-send)
  const handleSendChat = async (textToSend) => {
    if (isSubmitting) return;
    const text = (textToSend || inputMsg).trim();
    if (!text) return;

    // Stop active speech recognition safely if running
    stopSpeechRecognition();

    setIsSubmitting(true);
    setMessages((prev) => [...prev, { id: prev.length + 1, sender: 'user', text }]);
    setInputMsg('');
    setInterimText('');
    setAutoLangNotice('');
    setEmptyRecognitionNotice(false);

    try {
      const res = await api.post('/ai/chat', { message: text, lang });
      if (res.data?.success) {
        setMessages((prev) => [...prev, { id: prev.length + 1, sender: 'ai', text: res.data.reply }]);
        speakText(res.data.reply);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          sender: 'ai',
          text: lang === 'ta'
            ? 'மன்னிக்கவும், பதில் பெறுவதில் பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
            : 'Sorry, there was an error processing your query. Please try again.'
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean stop for speech recognition to prevent duplicate listeners
  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimText('');
  };

  // Bilingual Voice Speech-To-Text (Web Speech API) with Native ta-IN / en-IN Support
  const startSpeechRecognition = () => {
    setMicError('');
    setEmptyRecognitionNotice(false);
    setAutoLangNotice('');

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setMicError(
        lang === 'ta'
          ? 'உங்கள் உலாவியில் குரல் அறிதல் ஆதரிக்கப்படவில்லை. தயவுசெய்து Google Chrome அல்லது Microsoft Edge உலாவியைப் பயன்படுத்தவும். கீழே தட்டச்சு செய்து கேள்விகளைக் கேட்கலாம்.'
          : 'Speech Recognition is not supported by your current browser. Native speech recognition is available in Google Chrome and Microsoft Edge. You can still type your questions directly into the input box below.'
      );
      return;
    }

    // Stop existing instance to prevent duplicate listeners
    stopSpeechRecognition();
    hasRecognizedTextRef.current = false;

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure recognition language based on mode
      // Tamil: ta-IN, English: en-IN, Auto: starts with app context and inspects transcript
      if (voiceMode === 'ta') {
        recognition.lang = 'ta-IN';
      } else if (voiceMode === 'en') {
        recognition.lang = 'en-IN';
      } else {
        // Auto mode: default to Tamil if UI is Tamil, else en-IN or navigator language
        recognition.lang = (lang === 'ta' || (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('ta'))) ? 'ta-IN' : 'en-IN';
      }

      recognition.interimResults = true;
      recognition.continuous = true;

      recognition.onstart = () => {
        setIsListening(true);
        setMicError('');
        setEmptyRecognitionNotice(false);
      };

      recognition.onresult = (event) => {
        let currentInterim = '';
        let currentFinal = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += transcriptText;
          } else {
            currentInterim += transcriptText;
          }
        }

        const combinedText = (currentFinal || currentInterim).trim();
        if (combinedText) {
          hasRecognizedTextRef.current = true;
          setEmptyRecognitionNotice(false);

          // In Auto mode: inspect spoken text Unicode to detect language and give helpful guidance
          if (voiceMode === 'auto') {
            const hasTamil = /[\u0B80-\u0BFF]/.test(combinedText);
            const hasLatin = /[a-zA-Z]/.test(combinedText);
            if (hasTamil) {
              setAutoLangNotice(
                lang === 'ta'
                  ? 'தானியங்கி பயன்முறை: தமிழ் மொழி கண்டறியப்பட்டது.'
                  : 'Auto Mode: Tamil detected. Preserving spoken Tamil text.'
              );
            } else if (hasLatin) {
              setAutoLangNotice(
                lang === 'ta'
                  ? 'தானியங்கி பயன்முறை: ஆங்கில மொழி கண்டறியப்பட்டது. நீங்கள் தமிழில் பேசினால், தயவுசெய்து "தமிழ்" பொத்தானைத் தேர்ந்தெடுக்கவும்.'
                  : 'Auto Mode: English detected. If speaking Tamil, please switch to the "Tamil (தமிழ்)" mode for higher accuracy.'
              );
            }
          }
        }

        // Put recognized text directly into the chatbot input box without auto-submitting
        // Spoken language is preserved: Tamil stays Tamil, English stays English
        if (currentFinal) {
          setInputMsg((prev) => (prev ? prev.trim() + ' ' + currentFinal.trim() : currentFinal.trim()));
          setInterimText('');
        } else if (currentInterim) {
          setInterimText(currentInterim);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setMicError(
            lang === 'ta'
              ? 'மைக்ரோஃபோன் அனுமதி மறுக்கப்பட்டது. தயவுசெய்து உலாவி அமைப்புகளில் மைக்ரோஃபோனை அனுமதிக்கவும்.'
              : 'Microphone permission was denied. Please allow microphone access in your browser settings (click the lock/tune icon in the browser address bar) and click Retry.'
          );
        } else if (event.error === 'no-speech') {
          setEmptyRecognitionNotice(true);
          setMicError(
            lang === 'ta'
              ? 'குரல் எதுவும் கேட்கவில்லை. உங்கள் மைக்ரோஃபோனில் தெளிவாகப் பேசி மீண்டும் முயற்சிக்கவும்.'
              : 'No speech was detected. Please check your microphone and speak clearly, or click Retry.'
          );
        } else if (event.error === 'audio-capture') {
          setMicError(
            lang === 'ta'
              ? 'உங்கள் சாதனத்தில் மைக்ரோஃபோன் கண்டறியப்படவில்லை.'
              : 'No microphone was found on your device. Please plug in or enable a microphone.'
          );
        } else if (event.error === 'network') {
          setMicError(
            lang === 'ta'
              ? 'குரல் அறிதல் சேவை பிணையப் பிழை. இணைய இணைப்பைச் சரிபார்க்கவும் அல்லது மொழி பயன்முறையை மாற்றவும்.'
              : 'Network error connecting to speech recognition service. Please check your connection or switch language mode.'
          );
        } else {
          setMicError(`Voice input error (${event.error}). You can also type your question directly below.`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText('');
        if (!hasRecognizedTextRef.current && !micError) {
          setEmptyRecognitionNotice(true);
        }
      };

      recognition.start();
    } catch (err) {
      console.error('Mic start error:', err);
      setIsListening(false);
      setMicError('Unable to start microphone. Please check browser microphone permissions.');
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopSpeechRecognition();
    } else {
      startSpeechRecognition();
    }
  };

  // Text-To-Speech Voice Output
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => {
      stopSpeechRecognition();
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-agri-light via-agri-soft/40 to-white p-6 sm:p-8 rounded-3xl border border-agri-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-agri-dark text-xs font-bold border border-agri-soft mb-2">
              <Bot className="w-4 h-4 text-agri-dark" />
              <span>Smart Agri Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-agri-deep">{t('ai.title')}</h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl">{t('ai.subtitle')}</p>
          </div>

          {/* Bilingual Switcher */}
          <button
            onClick={() => toggleLanguage()}
            className="px-4 py-2 bg-white text-agri-dark border border-agri-soft rounded-2xl text-xs font-extrabold hover:bg-agri-light transition shadow-sm self-start md:self-center flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-agri-dark" />
            <span>{lang === 'en' ? 'Switch to Tamil (தமிழ்)' : 'Switch to English'}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-agri-soft overflow-x-auto gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('disease')}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'disease' ? 'border-agri-dark text-agri-dark' : 'border-transparent text-slate-500 hover:text-agri-deep'
            }`}
          >
            <Leaf className="w-4 h-4" />
            <span>{t('ai.tabDisease')}</span>
          </button>

          <button
            onClick={() => setActiveTab('cropRec')}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'cropRec' ? 'border-agri-dark text-agri-dark' : 'border-transparent text-slate-500 hover:text-agri-deep'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('ai.tabCropRec')}</span>
          </button>

          <button
            onClick={() => setActiveTab('schemes')}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'schemes' ? 'border-agri-dark text-agri-dark' : 'border-transparent text-slate-500 hover:text-agri-deep'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t('ai.tabSchemes')}</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'chat' ? 'border-agri-dark text-agri-dark' : 'border-transparent text-slate-500 hover:text-agri-deep'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{t('ai.tabChat')}</span>
          </button>
        </div>

        {/* TAB 1: PLANT DISEASE DETECTION */}
        {activeTab === 'disease' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Upload & Sample Buttons */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-agri-soft shadow-agri space-y-4">
                <h3 className="text-base font-bold text-agri-deep border-b border-agri-soft pb-2">
                  {t('ai.uploadTitle')}
                </h3>

                <label className="relative border-2 border-dashed border-agri-medium hover:border-agri-dark bg-agri-light/40 hover:bg-agri-light rounded-2xl p-6 text-center cursor-pointer block transition flex flex-col items-center justify-center space-y-3 min-h-[200px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                        setPreviewUrl(URL.createObjectURL(e.target.files[0]));
                      }
                    }}
                    className="hidden"
                  />

                  {previewUrl ? (
                    <img src={previewUrl} alt="Leaf Preview" className="h-40 w-full object-cover rounded-xl shadow" />
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-agri-light border border-agri-soft flex items-center justify-center text-agri-dark">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-agri-deep">{t('ai.uploadDesc')}</div>
                    </>
                  )}
                </label>

                <button
                  onClick={() => handleDiseaseDetect()}
                  disabled={detecting}
                  className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-agri-dark hover:bg-agri-deep transition shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{detecting ? t('ai.detecting') : t('ai.detectBtn')}</span>
                </button>

                {/* Quick Sample Image Buttons */}
                <div className="pt-3 border-t border-agri-soft space-y-2">
                  <div className="text-[11px] font-bold text-slate-500">{t('ai.sampleImages')}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => handleDiseaseDetect('bean_rust')}
                      className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-medium hover:bg-amber-100"
                    >
                      🫘 Bean Rust
                    </button>
                    <button
                      onClick={() => handleDiseaseDetect('bean_leaf')}
                      className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-medium hover:bg-emerald-100"
                    >
                      🫘 Healthy Bean Leaf
                    </button>
                    <button
                      onClick={() => handleDiseaseDetect('apple_scab')}
                      className="px-2.5 py-1 bg-agri-light text-agri-dark border border-agri-soft rounded-lg font-medium hover:bg-agri-soft"
                    >
                      🍎 Apple Scab
                    </button>
                    <button
                      onClick={() => handleDiseaseDetect('banana_leaf')}
                      className="px-2.5 py-1 bg-agri-light text-agri-dark border border-agri-soft rounded-lg font-medium hover:bg-agri-soft"
                    >
                      🍌 Banana Leaf
                    </button>
                    <button
                      onClick={() => handleDiseaseDetect('tomato_late_blight')}
                      className="px-2.5 py-1 bg-agri-light text-agri-dark border border-agri-soft rounded-lg font-medium hover:bg-agri-soft"
                    >
                      🍅 Tomato Late Blight
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: AI Disease Diagnosis & Recovery Guide */}
            <div className="lg:col-span-7 space-y-6">
              {detecting ? (
                <div className="bg-white p-12 rounded-3xl border border-agri-soft shadow-agri text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-agri-dark border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-agri-dark">{t('ai.detecting')}</p>
                </div>
              ) : diseaseResult ? (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-agri-soft shadow-agri space-y-6">
                  
                  {diseaseResult.uncertain ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                        <span>{diseaseResult.diseaseName}</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed font-medium">{diseaseResult.warningMessage}</p>
                      <p className="text-[11px] text-amber-700 italic">{diseaseResult.recommendation}</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-agri-soft pb-4">
                        <div>
                          <div className="text-xs text-slate-500 font-semibold">Detected Condition</div>
                          <h2 className="text-xl font-extrabold text-agri-deep">{diseaseResult.diseaseName}</h2>
                          <div className="text-xs text-slate-600 italic mt-0.5">{diseaseResult.scientificName}</div>
                          {diseaseResult.expert_system && (
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                diseaseResult.expert_system.urgency === 'Critical' ? 'bg-red-100 text-red-800 border border-red-200' :
                                diseaseResult.expert_system.urgency === 'High' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                🛡️ {diseaseResult.expert_system.urgency} Action
                              </span>
                              {diseaseResult.fuzzy_urgency && (
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                  📊 Fuzzy Urgency: {diseaseResult.fuzzy_urgency.intervention_urgency_score}/10
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="bg-agri-light border border-agri-soft px-4 py-2 rounded-2xl text-center self-start sm:self-center">
                          <div className="text-xs text-slate-500 font-bold">AI Confidence</div>
                          <div className="text-xl font-black text-agri-dark">{diseaseResult.confidence}%</div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-agri-dark uppercase tracking-wider">{t('ai.symptomsTitle')}</h4>
                        <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                          {diseaseResult.symptoms.map((symptom, idx) => (
                            <li key={idx} className="flex items-start gap-2 bg-agri-light/40 p-2 rounded-xl">
                              <CheckCircle2 className="w-4 h-4 text-agri-dark flex-shrink-0 mt-0.5" />
                              <span>{symptom}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-agri-dark uppercase tracking-wider">{t('ai.recoveryTitle')}</h4>
                        <div className="space-y-2 text-xs text-slate-800">
                          {diseaseResult.recoverySteps.map((step, idx) => (
                            <div key={idx} className="p-3 bg-white border border-agri-soft rounded-xl shadow-sm leading-relaxed">
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 font-medium">
                        {diseaseResult.disclaimer}
                      </div>
                    </>
                  )}

                </div>
              ) : (
                <div className="bg-agri-light/40 border border-dashed border-agri-soft rounded-3xl p-12 text-center space-y-3">
                  <Leaf className="w-12 h-12 text-agri-medium mx-auto" />
                  <h4 className="text-sm font-bold text-agri-deep">No Image Analyzed Yet</h4>
                  <p className="text-xs text-slate-600">Upload a leaf photo on the left or select a sample image to diagnose crop diseases.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: CROP RECOMMENDATION ENGINE */}
        {activeTab === 'cropRec' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Form Column */}
            <div className="lg:col-span-5 space-y-6">
              <form onSubmit={handleGetCropRecs} className="bg-white p-6 rounded-3xl border border-agri-soft shadow-agri space-y-4">
                <h3 className="text-base font-bold text-agri-deep border-b border-agri-soft pb-2">
                  {t('ai.cropFormTitle')}
                </h3>

                <p className="text-xs text-slate-600">{t('ai.cropFormDesc')}</p>

                <div>
                  <label className="block text-xs font-bold text-agri-deep mb-1">
                    {lang === 'ta' ? 'இடம் / மாவட்டம்' : 'Location / District'}
                  </label>
                  <input
                    type="text"
                    value={cropInputs.location}
                    onChange={(e) => setCropInputs({ ...cropInputs, location: e.target.value })}
                    className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-agri-deep mb-1">{t('details.soilType')}</label>
                  <select
                    value={cropInputs.soil_type}
                    onChange={(e) => setCropInputs({ ...cropInputs, soil_type: e.target.value })}
                    className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium"
                  >
                    <option value="Alluvial Soil">{t('soilOptions.alluvial')}</option>
                    <option value="Red Loamy Soil">{t('soilOptions.red')}</option>
                    <option value="Black Cotton Soil">{t('soilOptions.black')}</option>
                    <option value="Clay Loam">{t('soilOptions.clay')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-agri-deep mb-1">{t('details.waterSource')}</label>
                  <select
                    value={cropInputs.water_source}
                    onChange={(e) => setCropInputs({ ...cropInputs, water_source: e.target.value })}
                    className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium"
                  >
                    <option value="Canal & Borewell">{lang === 'ta' ? 'வாய்க்கால் & ஆழ்துளைக் கிணறு' : 'Canal & Borewell'}</option>
                    <option value="Well & Borewell">{lang === 'ta' ? 'கிணறு & சொட்டு நீர் பாசனம்' : 'Well & Drip Irrigation'}</option>
                    <option value="Rainfed">{lang === 'ta' ? 'மானாவாரி மட்டும் (Rainfed)' : 'Rainfed Only'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-agri-deep mb-1">{t('details.previousCrops')}</label>
                  <input
                    type="text"
                    value={cropInputs.previous_crop}
                    onChange={(e) => setCropInputs({ ...cropInputs, previous_crop: e.target.value })}
                    className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium"
                  />
                </div>

                <button
                  type="submit"
                  disabled={recLoading}
                  className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-agri-dark hover:bg-agri-deep transition shadow-md"
                >
                  {recLoading ? (lang === 'ta' ? 'ஆராயப்படுகிறது...' : 'Calculating Recommendations...') : t('ai.getRecs')}
                </button>
              </form>
            </div>

            {/* Results Column */}
            <div className="lg:col-span-7 space-y-4">
              {recLoading ? (
                <div className="bg-white p-12 rounded-3xl border border-agri-soft text-center space-y-3">
                  <div className="w-8 h-8 border-4 border-agri-dark border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs font-bold text-agri-dark">
                    {lang === 'ta' ? 'மண் தகுதிகள் மற்றும் மகசூல் பகுப்பாய்வு செய்யப்படுகிறது...' : 'Analyzing soil suitability & yield metrics...'}
                  </p>
                </div>
              ) : cropResults ? (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-agri-deep">
                    {lang === 'ta' ? 'வரிசைப்படுத்தப்பட்ட பயிர் பரிந்துரைகள்' : 'Ranked Crop Recommendations'}
                  </h3>
                  {cropResults.map((rec, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-agri-soft shadow-agri space-y-3">
                      <div className="flex justify-between items-center border-b border-agri-soft pb-2">
                        <div>
                          <h4 className="text-lg font-black text-agri-deep">{translateText(rec.crop)}</h4>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {translateText(rec.suitability)}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-500 font-bold">
                            {lang === 'ta' ? 'பொருத்த மதிப்பெண்' : 'Match Score'}
                          </div>
                          <div className="text-xl font-black text-agri-dark">{rec.matchScore}%</div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="text-xs font-bold text-agri-dark uppercase">
                          {lang === 'ta' ? 'பரிந்துரைக்கான காரணங்கள்:' : 'WHY Recommended:'}
                        </div>
                        <ul className="space-y-1 text-xs text-slate-700 font-medium">
                          {rec.reasons.map((r, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-1.5">
                              <span className="text-agri-dark font-bold">•</span>
                              <span>{translateText(r)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-agri-light/40 border border-dashed border-agri-soft rounded-3xl p-12 text-center space-y-3">
                  <Sparkles className="w-12 h-12 text-agri-medium mx-auto" />
                  <h4 className="text-sm font-bold text-agri-deep">
                    {lang === 'ta' ? 'பயிர் பரிந்துரை பெற தயார்' : 'Ready for Crop Recommendation'}
                  </h4>
                  <p className="text-xs text-slate-600">
                    {lang === 'ta' 
                      ? 'உங்கள் நிலத்தின் மண் மற்றும் பாசன விவரங்களை உள்ளிட்டு அதிக லாபம் தரும் பயிர்களை கண்டறியவும்.'
                      : 'Submit your land soil & water details to discover ideal crops with high profit margins.'}
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: GOVERNMENT SCHEMES */}
        {activeTab === 'schemes' && (
          <div className="space-y-6">
            
            {/* Scheme Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-agri-soft shadow-agri flex items-center gap-3">
              <input
                type="text"
                placeholder={t('ai.schemeSearchPlaceholder')}
                value={schemeSearch}
                onChange={(e) => setSchemeSearch(e.target.value)}
                className="w-full p-2.5 bg-agri-light/40 border border-agri-soft rounded-xl text-xs font-medium focus:outline-none focus:border-agri-dark"
              />
            </div>

            {/* Scheme Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {schemes.map((scheme) => (
                <div key={scheme.id} className="bg-white p-6 rounded-2xl border border-agri-soft shadow-agri flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-base font-extrabold text-agri-deep leading-snug">{scheme.scheme_name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-agri-light text-agri-dark border border-agri-soft whitespace-nowrap">
                        {scheme.state}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{scheme.purpose}</p>

                    <div className="space-y-1.5 text-xs bg-agri-light/50 p-3 rounded-xl border border-agri-soft/50">
                      <div><strong className="text-agri-dark">{lang === 'ta' ? 'தகுதி:' : 'Eligibility:'}</strong> {scheme.eligibility}</div>
                      <div><strong className="text-agri-dark">{lang === 'ta' ? 'நன்மைகள்:' : 'Benefits:'}</strong> {scheme.benefits}</div>
                    </div>
                  </div>

                  <a
                    href={scheme.official_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-agri-dark hover:bg-agri-deep transition shadow-sm"
                  >
                    <span>{t('ai.officialPortal')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 4: BILINGUAL AI CHAT & REAL-TIME VOICE TYPING */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-3xl border border-agri-soft shadow-agri flex flex-col h-[620px] overflow-hidden">
            
            {/* Chat Header */}
            <div className="p-4 bg-agri-light border-b border-agri-soft flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white border border-agri-soft flex items-center justify-center text-agri-dark shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold text-agri-deep">AgriConnect AI Voice & Chat Assistant</h3>
                  <p className="text-[10px] text-slate-600">
                    Bilingual Voice Input: <strong className="text-agri-dark font-bold">Tamil (ta-IN) & English (en-IN)</strong>
                  </p>
                </div>
              </div>

              {/* Language Selector: Auto / Tamil / English */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-agri-soft shadow-xs text-xs">
                <Languages className="w-3.5 h-3.5 text-agri-dark ml-1 hidden sm:inline" />
                <button
                  type="button"
                  onClick={() => {
                    setVoiceMode('auto');
                    setAutoLangNotice('');
                    if (isListening) stopSpeechRecognition();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    voiceMode === 'auto'
                      ? 'bg-agri-dark text-white shadow-xs'
                      : 'text-slate-600 hover:text-agri-deep hover:bg-agri-light'
                  }`}
                  title="Automatically recognize whether you speak Tamil or English"
                >
                  Auto (தானியங்கு)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceMode('ta');
                    setAutoLangNotice('');
                    if (isListening) stopSpeechRecognition();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    voiceMode === 'ta'
                      ? 'bg-agri-dark text-white shadow-xs'
                      : 'text-slate-600 hover:text-agri-deep hover:bg-agri-light'
                  }`}
                  title="Configure voice input for Tamil (ta-IN)"
                >
                  Tamil (தமிழ்)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceMode('en');
                    setAutoLangNotice('');
                    if (isListening) stopSpeechRecognition();
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    voiceMode === 'en'
                      ? 'bg-agri-dark text-white shadow-xs'
                      : 'text-slate-600 hover:text-agri-deep hover:bg-agri-light'
                  }`}
                  title="Configure voice input for English (en-IN)"
                >
                  English
                </button>
              </div>

              <button
                onClick={() => setMessages([])}
                className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1 font-semibold ml-auto sm:ml-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('ai.clearChat')}</span>
              </button>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-agri-light border border-agri-soft flex items-center justify-center text-agri-dark flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'user'
                        ? 'bg-agri-light/60 text-agri-deep border border-agri-soft rounded-tr-none'
                        : 'bg-agri-light text-agri-deep border border-agri-soft rounded-tl-none font-medium shadow-sm'
                    }`}
                  >
                    {msg.text}
                    {msg.sender === 'ai' && (
                      <button
                        onClick={() => speakText(msg.text)}
                        className="mt-2 flex items-center gap-1 text-[10px] font-bold text-agri-dark hover:underline"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Speak Answer
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Listening Animation & Voice Status Banner */}
            {isListening && (
              <div className="px-4 py-2.5 bg-agri-light border-t border-b border-agri-soft text-agri-dark text-xs font-bold flex flex-wrap items-center justify-between gap-2 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-1">
                    <span className="w-1.5 h-3 bg-agri-dark rounded-full animate-pulse" />
                    <span className="w-1.5 h-5 bg-agri-dark rounded-full animate-bounce" />
                    <span className="w-1.5 h-4 bg-agri-dark rounded-full animate-pulse" />
                    <span className="w-1.5 h-6 bg-agri-dark rounded-full animate-bounce" />
                    <span className="w-1.5 h-3 bg-agri-dark rounded-full animate-pulse" />
                  </div>
                  <span>
                    🎙️ Listening ({voiceMode === 'ta' ? 'Tamil ta-IN' : voiceMode === 'en' ? 'English en-IN' : 'Auto Tamil/English'})... Words appear in the box below.
                  </span>
                </div>
                <div className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded-full border border-agri-soft">
                  Review & edit before sending
                </div>
              </div>
            )}

            {/* Auto Mode Detection Notice */}
            {autoLangNotice && !micError && (
              <div className="px-4 py-2 bg-blue-50 border-t border-b border-blue-200 text-blue-900 text-xs font-medium flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>{autoLangNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoLangNotice('')}
                  className="text-[10px] font-bold text-blue-700 hover:underline"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Empty Recognition Handling & Retry */}
            {emptyRecognitionNotice && !micError && (
              <div className="px-4 py-2.5 bg-amber-50 border-t border-b border-amber-200 text-amber-900 text-xs font-medium flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>No speech was detected. Please speak clearly into your microphone or try again.</span>
                </div>
                <button
                  type="button"
                  onClick={startSpeechRecognition}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry Voice Input</span>
                </button>
              </div>
            )}

            {/* Error & Permission Handling Banner */}
            {micError && (
              <div className="px-4 py-2.5 bg-red-50 border-t border-b border-red-200 text-red-900 text-xs font-medium flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{micError}</span>
                </div>
                <button
                  type="button"
                  onClick={startSpeechRecognition}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Chat Input Toolbar */}
            <div className="p-3 bg-agri-light/30 border-t border-agri-soft flex items-center gap-2">
              
              {/* Responsive Microphone Voice Button inside Input Area */}
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`p-3 rounded-2xl transition shadow-sm flex items-center justify-center flex-shrink-0 ${
                  isListening 
                    ? 'bg-red-600 text-white ring-4 ring-red-200 animate-pulse' 
                    : 'bg-agri-dark text-white hover:bg-agri-deep'
                }`}
                title={isListening ? 'Click to stop voice input' : 'Click to start voice input (Tamil / English)'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text Input displaying Spoken & Typed Words - User Reviews & Edits Before Sending */}
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={
                    isListening 
                      ? (voiceMode === 'ta' ? 'பேசுங்கள்... வார்த்தைகள் இங்கே தோன்றும் (பிறகு அனுப்பலாம்)' : 'Listening... Spoken words will appear here (edit before sending)')
                      : t('ai.chatPlaceholder')
                  }
                  value={inputMsg + (interimText ? (inputMsg ? ' ' : '') + interimText : '')}
                  onChange={(e) => {
                    setInputMsg(e.target.value);
                    setInterimText('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isSubmitting) {
                      handleSendChat();
                    }
                  }}
                  className={`w-full p-3 bg-white border rounded-2xl text-xs font-medium focus:outline-none transition ${
                    isListening ? 'border-agri-dark ring-2 ring-agri-soft' : 'border-agri-soft focus:border-agri-dark'
                  }`}
                />
                {interimText && (
                  <span className="absolute right-3 top-3 text-[10px] font-semibold text-agri-dark italic bg-agri-light px-2 py-0.5 rounded">
                    Listening...
                  </span>
                )}
              </div>

              {/* Send Button - Required to Submit (No Auto-submit) */}
              <button
                type="button"
                disabled={isSubmitting || (!inputMsg.trim() && !interimText.trim())}
                onClick={() => handleSendChat()}
                className={`p-3 rounded-2xl transition shadow-sm flex items-center justify-center flex-shrink-0 ${
                  isSubmitting || (!inputMsg.trim() && !interimText.trim())
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-agri-dark text-white hover:bg-agri-deep'
                }`}
                title="Send Question"
              >
                <Send className="w-5 h-5" />
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};
