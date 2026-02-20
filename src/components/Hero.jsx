import { useAuth } from '../contexts/AuthContext';

export default function Hero({ onShowVerification, onShowDashboard, onLoginClick }) {
    const { isLoggedIn, isAdmin } = useAuth();

    const handleInstitutionClick = () => {
        if (isAdmin) {
            onShowDashboard();
        } else {
            alert('Please log in as an Admin/Institution to access this panel.');
            onLoginClick();
        }
    };

    return (
        <section className="hero" id="home">
            <div className="container">
                <h1>Detect Fake Degrees with Advanced Verification</h1>
                <p>
                    VerifyEd helps educational institutions, employers, and government bodies
                    authenticate academic certificates using AI, OCR, and blockchain technology.
                </p>
                <p className="sr-only">
                    VerifyEd helps educational institutions, employers, and government bodies
                    authenticate academic certificates using AI, OCR, and blockchain technology.
                </p>
                <div className="hero-buttons">
                    <button className="btn btn-primary" onClick={onShowVerification}>
                        Verify a Certificate
                    </button>
                    <button
                        id="heroInstitutionBtn"
                        className="btn btn-outline"
                        onClick={handleInstitutionClick}
                    >
                        {isAdmin ? 'Admin Panel' : 'Institution Login'}
                    </button>
                </div>
            </div>
        </section>
    );
}
