import React from 'react';
import { Sprout, ShieldCheck, Phone, Mail, MapPin, Heart } from 'lucide-react';

export const Footer = () => {

  return (
    <footer className="bg-white border-t border-agri-soft mt-16 text-agri-deep">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-agri-dark font-bold text-lg">
              <div className="w-8 h-8 rounded-full bg-agri-light flex items-center justify-center border border-agri-soft">
                <Sprout className="w-5 h-5 text-agri-dark" />
              </div>
              <span className="font-extrabold tracking-wide">AgriConnect AI</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Empowering farmers & land owners across Tamil Nadu & India with transparent agricultural land renting and AI-powered crop health intelligence.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-agri-dark font-semibold bg-agri-light px-2.5 py-1 rounded-md w-fit border border-agri-soft">
              <ShieldCheck className="w-4 h-4 text-agri-dark" />
              <span>Verified Aadhaar / Land Verification</span>
            </div>
          </div>

          {/* Col 2 */}
          <div>
            <h4 className="text-xs font-bold text-agri-dark uppercase tracking-wider mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li><a href="/" className="hover:text-agri-dark transition">Available Land Listings</a></li>
              <li><a href="/ai-assistant" className="hover:text-agri-dark transition">Plant Disease AI Classifier</a></li>
              <li><a href="/ai-assistant" className="hover:text-agri-dark transition">Smart Crop Recommendation</a></li>
              <li><a href="/ai-assistant" className="hover:text-agri-dark transition">Government Agri Schemes</a></li>
            </ul>
          </div>

          {/* Col 3 */}
          <div>
            <h4 className="text-xs font-bold text-agri-dark uppercase tracking-wider mb-3">Agricultural Hubs</h4>
            <ul className="space-y-2 text-xs text-slate-600 font-medium">
              <li>Thanjavur Paddy Belts</li>
              <li>Coimbatore Red Soil Farmlands</li>
              <li>Madurai Black Cotton Lands</li>
              <li>Salem & Erode Horticulture Zones</li>
            </ul>
          </div>

          {/* Col 4 */}
          <div>
            <h4 className="text-xs font-bold text-agri-dark uppercase tracking-wider mb-3">Helpline & Support</h4>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-agri-dark" />
                <span>Toll-Free: 1800-180-1551 (Kisan Call Center)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-agri-dark" />
                <span>support@agriconnect.ai</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-agri-dark" />
                <span>Chennai, Tamil Nadu, India</span>
              </div>
            </div>
          </div>

        </div>

        <div className="border-t border-agri-soft mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} AgriConnect AI. All Rights Reserved.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Dedicated to Indian Farming Communities <Heart className="w-3.5 h-3.5 text-agri-dark fill-agri-medium" />
          </p>
        </div>
      </div>
    </footer>
  );
};
