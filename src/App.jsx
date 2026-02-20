import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { initBlockchain } from './blockchain';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import LoginModal from './components/LoginModal';
import VerificationSection from './components/VerificationSection';
import ResultsSection from './components/ResultsSection';
import AboutSection from './components/AboutSection';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import CertViewerModal from './components/CertViewerModal';
import Footer from './components/Footer';
import ZKPVerifier from './components/ZKPVerifier';
import PublicVerifier from './components/PublicVerifier';

function AppContent() {
  const { isLoggedIn, isAdmin } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [certViewerOpen, setCertViewerOpen] = useState(false);
  const [certViewerData, setCertViewerData] = useState(null);
  const [blockchainReady, setBlockchainReady] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success', visible: false, fadeOut: false });

  const showToast = (message, type = 'success') => {
    console.log(`[GlobalToast] Triggered: "${message}" (${type})`);
    setToast({ message, type, visible: true, fadeOut: false });

    if (window.globalToastTimeout) clearTimeout(window.globalToastTimeout);
    if (window.globalFadeTimeout) clearTimeout(window.globalFadeTimeout);

    window.globalToastTimeout = setTimeout(() => {
      setToast(prev => ({ ...prev, fadeOut: true }));
      window.globalFadeTimeout = setTimeout(() => {
        setToast({ message: '', type: 'success', visible: false, fadeOut: false });
      }, 500);
    }, 3000);
  };

  // Feature 6: Check if we're on /verify route for public portal
  const isPublicVerifyRoute = window.location.pathname.startsWith('/verify');

  useEffect(() => {
    initBlockchain().then((connected) => {
      setBlockchainReady(connected);
      if (connected) {
        console.log('✅ Blockchain connected');
      } else {
        console.warn('⚠️ Blockchain not available — running in Firestore-only mode');
      }
    });
  }, []);

  // Feature 6: Render Public Verifier separately
  if (isPublicVerifyRoute) {
    return <PublicVerifier />;
  }

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Header onLoginClick={() => setShowLogin(true)} />

      <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />

      <Hero
        onShowVerification={() => scrollTo('verify')}
        onShowDashboard={() => scrollTo('admin-dashboard')}
        onLoginClick={() => setShowLogin(true)}
      />

      <Features />

      <VerificationSection
        onVerificationResult={(result) => {
          setVerificationResult(result);
          setTimeout(() => scrollTo('results'), 100);
        }}
        onLoginClick={() => setShowLogin(true)}
      />

      <ResultsSection result={verificationResult} />

      {/* Feature 4: Zero-Knowledge Proof Verifier */}
      <section id="zkp" style={{ padding: '40px 5%', maxWidth: '1200px', margin: '0 auto' }}>
        <ZKPVerifier />
      </section>

      <AboutSection />

      {isLoggedIn && <Dashboard />}

      <AdminDashboard
        onOpenCertViewer={(certNumber, name, institution, year) => {
          setCertViewerData({ certNumber, name, institution, year });
          setCertViewerOpen(true);
        }}
        showToast={showToast}
      />

      <CertViewerModal
        isOpen={certViewerOpen}
        onClose={() => setCertViewerOpen(false)}
        certData={certViewerData}
      />

      <Footer />

      {/* Global Toast Notification */}
      {toast.visible && (
        <div className="toast-container">
          <div className={`toast ${toast.type === 'error' ? 'error' : ''} ${toast.fadeOut ? 'fade-out' : ''}`}>
            <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}`}></i>
            {toast.message}
          </div>
        </div>
      )}

      {!blockchainReady && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: 'rgba(255,165,0,0.9)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            zIndex: 9999,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          ⚠️ Blockchain offline — running in Firestore-only mode
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
