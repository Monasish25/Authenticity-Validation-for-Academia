import { useState } from 'react';
import { verifyCertificateInDB, isBlacklisted } from '../services/certificateService';
import { getSoulboundToken, checkRevocationOnChain } from '../blockchain';

/**
 * Feature 6: Public Verifier Portal
 * A no-login-required page for employers to verify certificates.
 */
export default function PublicVerifier() {
    const [certId, setCertId] = useState('');
    const [name, setName] = useState('');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (!certId || !name) {
            alert('Please enter both certificate number and graduate name.');
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const blacklisted = await isBlacklisted(certId);
            const dbResult = await verifyCertificateInDB(certId, name);

            let sbtData = null;
            let revocationData = null;
            try {
                sbtData = await getSoulboundToken(certId.toUpperCase());
                revocationData = await checkRevocationOnChain(certId.toUpperCase());
            } catch { /* blockchain may be offline */ }

            if (dbResult.found && !blacklisted) {
                setResult({
                    valid: true,
                    certificate: dbResult.certificate,
                    blockchain: dbResult.blockchain,
                    sbt: sbtData,
                    revocation: revocationData,
                });
            } else {
                setResult({
                    valid: false,
                    reason: blacklisted ? 'Certificate has been revoked.' : 'Certificate not found in database.',
                    revocation: revocationData,
                });
            }
        } catch (error) {
            console.error('Public verification error:', error);
            setResult({ valid: false, reason: 'Verification service temporarily unavailable.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0a0e27 0%, #1a1a3e 50%, #0d1117 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* Header Badge */}
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '20px',
                padding: '40px',
                maxWidth: '600px',
                width: '100%',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <i className="fas fa-globe" style={{ fontSize: '3rem', color: 'var(--primary-blue)', marginBottom: '10px' }}></i>
                    <h2 style={{ color: '#fff', margin: '10px 0 5px' }}>Public Certificate Verifier</h2>
                    <p style={{ color: '#888', fontSize: '0.9rem' }}>
                        No account required. Powered by Blockchain verification.
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="Certificate Number (e.g., JAC-2023-001)"
                        value={certId}
                        onChange={(e) => setCertId(e.target.value)}
                        style={{
                            padding: '14px', borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.3)', color: '#fff',
                            fontSize: '1rem',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Graduate Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        style={{
                            padding: '14px', borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.3)', color: '#fff',
                            fontSize: '1rem',
                        }}
                    />
                    <button
                        onClick={handleVerify}
                        disabled={loading}
                        style={{
                            padding: '14px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, var(--primary-blue), var(--secondary-blue))',
                            color: '#fff', border: 'none', cursor: 'pointer',
                            fontWeight: '700', fontSize: '1.1rem',
                            opacity: loading ? 0.6 : 1,
                        }}
                    >
                        {loading ? (
                            <><i className="fas fa-spinner fa-spin"></i> Verifying...</>
                        ) : (
                            <><i className="fas fa-search"></i> Verify Certificate</>
                        )}
                    </button>
                </div>

                {/* Result */}
                {result && (
                    <div style={{
                        marginTop: '25px',
                        padding: '25px',
                        borderRadius: '14px',
                        background: result.valid
                            ? 'rgba(40, 167, 69, 0.1)'
                            : 'rgba(220, 53, 69, 0.1)',
                        border: `2px solid ${result.valid ? '#28a745' : '#dc3545'}`,
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                            <i className={`fas ${result.valid ? 'fa-check-circle' : 'fa-times-circle'}`}
                                style={{ fontSize: '3rem', color: result.valid ? '#28a745' : '#dc3545' }}></i>
                            <h3 style={{ color: result.valid ? '#28a745' : '#dc3545', margin: '10px 0' }}>
                                {result.valid ? 'CERTIFICATE VERIFIED' : 'VERIFICATION FAILED'}
                            </h3>
                        </div>

                        {result.valid && result.certificate && (
                            <div style={{ color: '#ccc', fontSize: '0.95rem' }}>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    <p><strong>Name:</strong> {result.certificate.name}</p>
                                    <p><strong>Institution:</strong> {result.certificate.institution}</p>
                                    <p><strong>Year:</strong> {result.certificate.year}</p>
                                    <p><strong>Degree:</strong> {result.certificate.degree || 'N/A'}</p>
                                </div>

                                {/* Blockchain Badge */}
                                {result.blockchain?.onChain && (
                                    <div style={{
                                        marginTop: '15px', padding: '10px',
                                        borderRadius: '8px', background: 'rgba(40,167,69,0.15)',
                                        textAlign: 'center',
                                    }}>
                                        <i className="fas fa-link" style={{ color: '#28a745' }}></i>
                                        <span style={{ color: '#28a745', fontWeight: '600', marginLeft: '8px' }}>
                                            Blockchain Verified — TX: {result.blockchain.txHash?.substring(0, 16)}...
                                        </span>
                                    </div>
                                )}

                                {/* SBT Badge */}
                                {result.sbt && (
                                    <div style={{
                                        marginTop: '10px', padding: '10px',
                                        borderRadius: '8px', background: 'rgba(138,43,226,0.15)',
                                        textAlign: 'center',
                                    }}>
                                        <i className="fas fa-gem" style={{ color: '#8a2be2' }}></i>
                                        <span style={{ color: '#8a2be2', fontWeight: '600', marginLeft: '8px' }}>
                                            Soulbound Token: {result.sbt.tokenId}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {!result.valid && (
                            <p style={{ color: '#dc3545', textAlign: 'center' }}>
                                {result.reason}
                            </p>
                        )}

                        {result.revocation?.revoked && (
                            <div style={{
                                marginTop: '10px', padding: '10px',
                                borderRadius: '8px', background: 'rgba(220,53,69,0.2)',
                                textAlign: 'center',
                            }}>
                                <i className="fas fa-ban" style={{ color: '#dc3545' }}></i>
                                <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                                    Revoked: {result.revocation.reason}
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <p style={{ color: '#555', marginTop: '20px', fontSize: '0.85rem' }}>
                VerifyEd — Blockchain-Powered Academic Verification
            </p>
        </div>
    );
}
