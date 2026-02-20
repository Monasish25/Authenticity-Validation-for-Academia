import { useState } from 'react';
import { generateProof, verifyProof, getAvailableClaims } from '../services/zkpService';

/**
 * Feature 4: Zero-Knowledge Proof Verifier
 * Allows employers to verify claims without seeing full certificate data.
 */
export default function ZKPVerifier() {
    const [selectedClaim, setSelectedClaim] = useState('');
    const [threshold, setThreshold] = useState('');
    const [certNumber, setCertNumber] = useState('');
    const [proofResult, setProofResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const claims = getAvailableClaims();
    const activeClaim = claims.find(c => c.id === selectedClaim);

    const handleGenerateAndVerify = async () => {
        if (!selectedClaim || !certNumber) {
            alert('Please enter a certificate number and select a claim.');
            return;
        }

        setLoading(true);
        try {
            // In a real system, the student would generate this proof offline
            // and share only the proof (not their data) with the verifier.
            const mockSecretData = {
                certNumber: certNumber,
                name: 'Confidential',
                institution: 'Confidential',
                year: '2023',
                degree: 'Bachelor of Technology',
                gpa: '3.8',
            };

            const proof = await generateProof({
                claim: selectedClaim,
                secretData: mockSecretData,
                threshold: threshold || null,
            });

            const verification = await verifyProof(proof);
            setProofResult(verification);
        } catch (error) {
            console.error('ZKP error:', error);
            alert('ZKP verification failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="zkp-verifier" style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '16px',
            padding: '30px',
            margin: '20px 0',
            border: '1px solid rgba(255,255,255,0.1)',
        }}>
            <h3 style={{ color: 'var(--primary-blue)', marginBottom: '15px' }}>
                <i className="fas fa-user-secret"></i> Zero-Knowledge Proof Verifier
            </h3>
            <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '20px' }}>
                Verify claims about a certificate <strong>without revealing</strong> the holder's private data.
            </p>

            <div style={{ display: 'grid', gap: '12px', maxWidth: '500px' }}>
                <input
                    type="text"
                    placeholder="Certificate Number"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    style={{
                        padding: '12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0,0,0,0.3)', color: '#fff',
                    }}
                />

                <select
                    value={selectedClaim}
                    onChange={(e) => setSelectedClaim(e.target.value)}
                    style={{
                        padding: '12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(0,0,0,0.3)', color: '#fff',
                    }}
                >
                    <option value="">Select a claim to verify...</option>
                    {claims.map(claim => (
                        <option key={claim.id} value={claim.id}>{claim.label}</option>
                    ))}
                </select>

                {activeClaim?.requiresThreshold && (
                    <input
                        type="text"
                        placeholder={activeClaim.thresholdLabel}
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                        style={{
                            padding: '12px', borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.3)', color: '#fff',
                        }}
                    />
                )}

                <button
                    onClick={handleGenerateAndVerify}
                    disabled={loading}
                    style={{
                        padding: '12px 24px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, var(--primary-blue), var(--secondary-blue))',
                        color: '#fff', border: 'none', cursor: 'pointer',
                        fontWeight: '600', fontSize: '1rem',
                        opacity: loading ? 0.6 : 1,
                    }}
                >
                    {loading ? (
                        <><i className="fas fa-spinner fa-spin"></i> Verifying...</>
                    ) : (
                        <><i className="fas fa-shield-alt"></i> Verify Claim (ZKP)</>
                    )}
                </button>
            </div>

            {proofResult && (
                <div style={{
                    marginTop: '20px',
                    padding: '20px',
                    borderRadius: '12px',
                    background: proofResult.verified
                        ? 'rgba(40, 167, 69, 0.15)'
                        : 'rgba(220, 53, 69, 0.15)',
                    border: `1px solid ${proofResult.verified ? '#28a745' : '#dc3545'}`,
                }}>
                    <h4 style={{ color: proofResult.verified ? '#28a745' : '#dc3545' }}>
                        <i className={`fas ${proofResult.verified ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                        {' '}ZKP Result: {proofResult.verified ? 'CLAIM VERIFIED' : 'CLAIM NOT VERIFIED'}
                    </h4>
                    <p style={{ color: '#ccc', margin: '10px 0 5px' }}>
                        <strong>Claim:</strong> {proofResult.publicClaim}
                    </p>
                    <p style={{ color: '#888', fontSize: '0.85rem' }}>
                        <i className="fas fa-lock"></i> No private data was revealed during this verification.
                    </p>
                </div>
            )}
        </div>
    );
}
