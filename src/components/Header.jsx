import { useAuth } from '../contexts/AuthContext';

export default function Header({ onLoginClick }) {
    const { isLoggedIn, isAdmin, logout, currentUser } = useAuth();

    const handleLoginLogout = (e) => {
        e.preventDefault();
        if (isLoggedIn) {
            logout();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            onLoginClick();
        }
    };

    return (
        <header>
            <div className="container header-content">
                <div className="logo">
                    <i className="fas fa-graduation-cap"></i>
                    <span>VerifyEd</span>
                </div>
                <nav id="main-nav">
                    <ul>
                        <li><a href="#home">Home</a></li>
                        <li><a href="#features">Features</a></li>
                        <li><a href="#verify">Verify</a></li>
                        <li><a href="#about">About</a></li>
                        <li>
                            <a href="#" id="openLogin" onClick={handleLoginLogout}>
                                {isLoggedIn
                                    ? `Logout (${isAdmin ? 'Admin' : 'User'})`
                                    : 'Login'}
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </header>
    );
}
