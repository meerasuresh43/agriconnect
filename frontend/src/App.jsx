import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

import { Home } from './pages/Home';
import { LandDetails } from './pages/LandDetails';
import { AddLand } from './pages/AddLand';
import { AiAssistant } from './pages/AiAssistant';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { AdminPanel } from './pages/AdminPanel';
import { AdminLogin } from './pages/AdminLogin';

export function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <div className="flex flex-col min-h-screen bg-white">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/lands/:id" element={<LandDetails />} />
                <Route path="/ai-assistant" element={<AiAssistant />} />
                <Route path="/login" element={<Login />} />
                <Route path="/login/owner" element={<Login defaultRole="owner" />} />
                <Route path="/register" element={<Register />} />
                <Route path="/admin/login" element={<Login defaultRole="admin" />} />

                {/* Land Owner Protected Route */}
                <Route
                  path="/add-land"
                  element={
                    <ProtectedRoute allowedRoles={['owner']}>
                      <AddLand />
                    </ProtectedRoute>
                  }
                />

                {/* Dashboard Protected Route */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['owner', 'farmer', 'admin', 'main_admin']}>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Panel Protected Route */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'main_admin']}>
                      <AdminPanel />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
