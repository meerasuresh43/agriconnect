import React, { createContext, useContext, useState } from 'react';
import { translations } from '../utils/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem('agri_lang') || 'en');

  const toggleLanguage = (newLang) => {
    const selected = newLang || (lang === 'en' ? 'ta' : 'en');
    setLang(selected);
    localStorage.setItem('agri_lang', selected);
  };

  const t = (keyPath) => {
    const keys = keyPath.split('.');
    let current = translations[lang];
    for (const key of keys) {
      if (current && current[key] !== undefined) {
        current = current[key];
      } else {
        // Fallback to English if Tamil key missing
        let fallback = translations['en'];
        for (const fk of keys) {
          if (fallback && fallback[fk] !== undefined) {
            fallback = fallback[fk];
          } else {
            return keyPath;
          }
        }
        return fallback;
      }
    }
    return current;
  };

  // Helper to dynamically translate Database strings (soil types, water sources, crops, status, electricity) to Tamil
  const translateText = (text) => {
    if (!text || lang === 'en') return text;
    
    let str = String(text);

    // Soil Types
    str = str.replace(/Alluvial Soil/gi, 'வண்டல் மண் (Alluvial Soil)');
    str = str.replace(/Alluvial/gi, 'வண்டல் மண்');
    str = str.replace(/Red Loamy Soil/gi, 'செம்மண் (Red Loamy Soil)');
    str = str.replace(/Red Soil/gi, 'செம்மண்');
    str = str.replace(/Red & Black Mix/gi, 'செம்மண் & கரிசல் மண் கலவை');
    str = str.replace(/Black Cotton Soil/gi, 'கரிசல் மண் (Black Cotton Soil)');
    str = str.replace(/Black Soil/gi, 'கரிசல் மண்');
    str = str.replace(/Clay Loam/gi, 'களிமண் (Clay Loam)');
    str = str.replace(/Clay Soil/gi, 'களிமண்');
    str = str.replace(/Laterite Soil/gi, 'சரளை மண் (Laterite Soil)');
    str = str.replace(/Sandy Soil/gi, 'மணல் மண் (Sandy Soil)');

    // Water Sources
    str = str.replace(/Canal & Borewell/gi, 'வாய்க்கால் & ஆழ்துளைக் கிணறு');
    str = str.replace(/Canal Water/gi, 'வாய்க்கால் பாசனம் (Canal)');
    str = str.replace(/Canal/gi, 'வாய்க்கால் பாசனம்');
    str = str.replace(/Borewell/gi, 'ஆழ்துளைக் கிணறு (Borewell)');
    str = str.replace(/Open Well/gi, 'திறந்தவெளி கிணறு (Well)');
    str = str.replace(/Well/gi, 'கிணற்றுப் பாசனம்');
    str = str.replace(/Rainfed Only/gi, 'மானாவாரி மட்டும் (Rainfed)');
    str = str.replace(/Rainfed/gi, 'மானாவாரி (Rainfed)');

    // Previous Crops
    str = str.replace(/Paddy \(Samba\)/gi, 'நெல் (சம்பா)');
    str = str.replace(/Paddy \(Rice\)/gi, 'நெல் (Paddy / Rice)');
    str = str.replace(/Paddy/gi, 'நெல் (Paddy)');
    str = str.replace(/Rice/gi, 'நெல்');
    str = str.replace(/Turmeric/gi, 'மஞ்சள் (Turmeric)');
    str = str.replace(/Cotton/gi, 'பருத்தி (Cotton)');
    str = str.replace(/Groundnut/gi, 'நிலக்கடலை (Groundnut)');
    str = str.replace(/Sugarcane/gi, 'கரும்பு (Sugarcane)');
    str = str.replace(/Banana/gi, 'வாழை (Banana)');
    str = str.replace(/Maize \/ Corn/gi, 'மக்காச்சோளம் (Maize)');
    str = str.replace(/Maize/gi, 'மக்காச்சோளம்');
    str = str.replace(/Black Gram/gi, 'உளுந்து (Black Gram)');
    str = str.replace(/Pulses/gi, 'பயறு வகைகள் (Pulses)');
    str = str.replace(/Tapioca/gi, 'மரவள்ளிக்கிழங்கு');
    str = str.replace(/Mango/gi, 'மாம்பழம் / மாந்தோப்பு');

    // Electricity
    str = str.replace(/24\/7 Free Agri Electricity/gi, '24/7 இலவச விவசாய மின்சாரம்');
    str = str.replace(/24\/7 Free Agri Connection/gi, '24/7 இலவச விவசாய மின்சாரம்');
    str = str.replace(/12 Hours Drip Irrigation Grid/gi, '12 மணி நேர சொட்டு நீர் பாசன மின்சாரத் திட்டம்');
    str = str.replace(/8 Hours Commercial Tariff/gi, '8 மணி நேர விவசாய மின்சாரம்');
    str = str.replace(/Available/gi, 'மின்சார வசதி உள்ளது');

    // Statuses
    str = str.replace(/^available$/gi, 'கிடைக்கக்கூடியது');
    str = str.replace(/^rented$/gi, 'வாடகைக்கு எடுக்கப்பட்டது');
    str = str.replace(/^pending$/gi, 'காத்திருப்பில்');
    str = str.replace(/^accepted$/gi, 'ஏற்றுக்கொள்ளப்பட்டது');
    str = str.replace(/^rejected$/gi, 'நிராகரிக்கப்பட்டது');
    str = str.replace(/^unlisted$/gi, 'பட்டியலில் இருந்து நீக்கப்பட்டது');
    str = str.replace(/^approved$/gi, 'அனுமதிக்கப்பட்டது');

    return str;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: toggleLanguage, toggleLanguage, t, translateText }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
