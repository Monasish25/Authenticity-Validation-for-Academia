import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('login');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirm, setSignupConfirm] = useState('');
    const [termsAgreed, setTermsAgreed] = useState(false);
    const [loginRole, setLoginRole] = useState('user');
    const [signupRole, setSignupRole] = useState('user');
    const [shake, setShake] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, signup, googleSignIn, githubSignIn } = useAuth();

    const handleLogin = async () => {
        setError('');
        setSuccess('');
        setLoading(true);
        try {
            await login(loginEmail, loginPassword, loginRole);
            onClose();
            if (loginRole === 'admin') {
                document.getElementById('admin-dashboard')?.scrollIntoView({ behavior: 'smooth' });
            } else {
                document.getElementById('verify')?.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (err) {
            setShake(true);
            setTimeout(() => setShake(false), 820);
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (signupPassword !== signupConfirm) {
            setError('Passwords do not match.');
            return;
        }
        if (!termsAgreed) {
            setError('You must agree to the Terms and Privacy Policy.');
            return;
        }

        setLoading(true);
        try {
            await signup(signupEmail, signupPassword, signupName, signupRole);
            // Clear signup fields
            setSignupName('');
            setSignupEmail('');
            setSignupPassword('');
            setSignupConfirm('');
            setTermsAgreed(false);
            // Switch to login tab with success message
            setActiveTab('login');
            setSuccess('Account created successfully! Please login with your credentials.');
        } catch (err) {
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async (role) => {
        setError('');
        setLoading(true);
        try {
            await googleSignIn(role);
            onClose();
        } catch (err) {
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    const handleGithubSignIn = async (role) => {
        setError('');
        setLoading(true);
        try {
            await githubSignIn(role);
            onClose();
        } catch (err) {
            setError(getErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    // User-friendly error messages
    function getErrorMessage(code) {
        switch (code) {
            case 'auth/unauthorized-domain':
                return 'This domain is not authorized. Please contact the administrator.';
            case 'auth/invalid-email':
                return 'Please enter a valid email address.';
            case 'auth/user-not-found':
                return 'No account found with this email. Please sign up first.';
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Invalid credentials. Please check your email and password.';
            case 'auth/email-already-in-use':
                return 'This email is already registered. Please login instead.';
            case 'auth/weak-password':
                return 'Password must be at least 6 characters.';
            case 'auth/popup-closed-by-user':
                return 'Sign-in popup was closed. Please try again.';
            case 'auth/account-exists-with-different-credential':
                return 'An account already exists with this email using a different sign-in method.';
            case 'auth/popup-blocked':
                return 'Pop-up was blocked by your browser. Please allow pop-ups for this site.';
            case 'auth/too-many-requests':
                return 'Too many failed attempts. Please try again later.';
            default:
                return 'Authentication failed. Please try again.';
        }
    }

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" id="loginModal" style={{ display: 'flex' }}>
            <div className={`modal-content ${shake ? 'shake-element' : ''}`}>
                <button className="modal-close" id="closeModal" onClick={onClose}>
                    &times;
                </button>
                <div className="modal-tabs">
                    <div
                        className={`modal-tab ${activeTab === 'login' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
                    >
                        Login
                    </div>
                    <div
                        className={`modal-tab ${activeTab === 'signup' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('signup'); setError(''); setSuccess(''); }}
                    >
                        Sign Up
                    </div>
                </div>

                {success && (
                    <div style={{ color: '#00c897', fontSize: '0.85rem', textAlign: 'center', marginBottom: '0.5rem', padding: '8px 12px', background: 'rgba(0,200,151,0.1)', borderRadius: '8px' }}>
                        <i className="fas fa-check-circle" style={{ marginRight: '6px' }}></i>
                        {success}
                    </div>
                )}

                {error && (
                    <div style={{ color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '0.5rem', padding: '8px 12px', background: 'rgba(220,53,69,0.1)', borderRadius: '8px' }}>
                        <i className="fas fa-exclamation-circle" style={{ marginRight: '6px' }}></i>
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <div className={`modal-form ${activeTab === 'login' ? 'active' : ''}`} id="loginForm">
                    <div className="role-selector">
                        <button
                            className={`role-btn ${loginRole === 'user' ? 'active' : ''}`}
                            onClick={() => setLoginRole('user')}
                        >
                            User
                        </button>
                        <button
                            className={`role-btn ${loginRole === 'admin' ? 'active' : ''}`}
                            onClick={() => setLoginRole('admin')}
                        >
                            Admin
                        </button>
                    </div>
                    <h2>Welcome Back</h2>

                    <div className="social-login">
                        <button className="social-btn google" onClick={() => handleGoogleSignIn(loginRole)} disabled={loading} title="Sign in with Google">
                            <i className="fab fa-google"></i>
                        </button>
                        <button className="social-btn github" onClick={() => handleGithubSignIn(loginRole)} disabled={loading} title="Sign in with GitHub">
                            <i className="fab fa-github"></i>
                        </button>
                    </div>

                    <div className="modal-divider">or use your email</div>

                    <div className="form-group">
                        <label htmlFor="loginEmail">Email Address</label>
                        <input
                            type="email"
                            id="loginEmail"
                            placeholder="Enter your email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="loginPassword">Password</label>
                        <input
                            type="password"
                            id="loginPassword"
                            placeholder="Enter your password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        />
                    </div>

                    <div className="forgot-password">
                        <a href="#" style={{ color: 'var(--primary-blue)', textDecoration: 'none' }}>
                            Forgot Password?
                        </a>
                    </div>

                    <button
                        id="loginBtn"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={handleLogin}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Login'}
                    </button>
                </div>

                {/* Signup Form */}
                <div className={`modal-form ${activeTab === 'signup' ? 'active' : ''}`} id="signupForm">
                    <div className="role-selector">
                        <button
                            className={`role-btn ${signupRole === 'user' ? 'active' : ''}`}
                            onClick={() => setSignupRole('user')}
                        >
                            User
                        </button>
                        <button
                            className={`role-btn ${signupRole === 'admin' ? 'active' : ''}`}
                            onClick={() => setSignupRole('admin')}
                        >
                            Admin
                        </button>
                    </div>
                    <h2>Create Account</h2>

                    <div className="social-login">
                        <button className="social-btn google" onClick={() => handleGoogleSignIn(signupRole)} disabled={loading} title="Sign up with Google">
                            <i className="fab fa-google"></i>
                        </button>
                        <button className="social-btn github" onClick={() => handleGithubSignIn(signupRole)} disabled={loading} title="Sign up with GitHub">
                            <i className="fab fa-github"></i>
                        </button>
                    </div>

                    <div className="modal-divider">or use your email</div>

                    <div className="form-group">
                        <label htmlFor="signupName">Full Name</label>
                        <input
                            type="text"
                            id="signupName"
                            placeholder="Enter your full name"
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="signupEmail">Email Address</label>
                        <input
                            type="email"
                            id="signupEmail"
                            placeholder="Enter your email"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="signupPassword">Password</label>
                        <input
                            type="password"
                            id="signupPassword"
                            placeholder="Create a password"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="signupConfirm">Confirm Password</label>
                        <input
                            type="password"
                            id="signupConfirm"
                            placeholder="Confirm your password"
                            value={signupConfirm}
                            onChange={(e) => setSignupConfirm(e.target.value)}
                        />
                    </div>

                    <div className="terms-check">
                        <input
                            type="checkbox"
                            id="termsAgree"
                            checked={termsAgreed}
                            onChange={(e) => setTermsAgreed(e.target.checked)}
                        />
                        <label htmlFor="termsAgree">
                            I agree to the{' '}
                            <a href="#" style={{ color: 'var(--primary-blue)' }}>Terms</a> and{' '}
                            <a href="#" style={{ color: 'var(--primary-blue)' }}>Privacy Policy</a>
                        </label>
                    </div>

                    <button
                        id="signupBtn"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        onClick={handleSignup}
                        disabled={loading}
                    >
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </div>
            </div>
        </div>
    );
}
