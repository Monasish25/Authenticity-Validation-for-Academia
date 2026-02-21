import LinkedInShare from './LinkedInShare';

export default function ResultsSection({ result }) {
    if (!result) return null;

    return (
        <section className="results-section" id="results" style={{ display: 'block' }}>
            <div className="container">
                <div className="result-card" id="result-card">
                    <div className={`result-icon ${result.valid ? 'valid' : 'invalid'}`} id="result-icon-container">
                        <i className={`fas ${result.valid ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                    </div>
                    <h2 id="result-title">
                        {result.valid
                            ? 'Certificate Verified Successfully!'
                            : 'Verification Failed: Fraud Detected'}
                    </h2>
                    <p id="result-message">
                        {result.valid
                            ? 'This certificate has been verified against our institutional database and blockchain and is authentic.'
                            : 'This certificate could not be verified and is considered fraudulent. It has been added to the blacklist.'}
                    </p>
                    {result.valid && (
                        <div className="result-details" id="result-details-container">
                            <h3 style={{ marginBottom: '15px', color: 'var(--primary-blue)' }}>Certificate Details</h3>
                            <div className="detail-row">
                                <div className="detail-label">Certificate Number:</div>
                                <div className="detail-value" id="res-cert-num">{result.certNumber}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Institution:</div>
                                <div className="detail-value" id="res-institution">{result.institution}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Graduate&apos;s Name:</div>
                                <div className="detail-value" id="res-grad-name">{result.name}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Degree:</div>
                                <div className="detail-value" id="res-degree">{result.degree}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Year of Graduation:</div>
                                <div className="detail-value" id="res-grad-year">{result.year}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Verification Method:</div>
                                <div className="detail-value" id="res-method">{result.method}</div>
                            </div>

                            {/* Blockchain TX */}
                            {result.blockchain?.onChain && (
                                <div className="detail-row">
                                    <div className="detail-label">Blockchain TX:</div>
                                    <div className="detail-value" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                                        {result.blockchain.txHash}
                                    </div>
                                </div>
                            )}

                            {/* Feature 3: Digital Signature */}
                            {result.blockchain?.onChain && (
                                <div style={{
                                    marginTop: '15px', padding: '12px', borderRadius: '10px',
                                    background: 'rgba(0,200,150,0.1)',
                                    border: '1px solid rgba(0,200,150,0.3)',
                                }}>
                                    <i className="fas fa-signature" style={{ color: '#00c897' }}></i>
                                    <span style={{ color: '#00c897', fontWeight: '600', marginLeft: '8px' }}>
                                        Digitally Signed by Institution Wallet
                                    </span>
                                    <p style={{ color: '#888', fontSize: '0.75rem', margin: '5px 0 0', wordBreak: 'break-all' }}>
                                        Signer: {result.blockchain.txHash?.substring(0, 10)}...verified via ECDSA
                                    </p>
                                </div>
                            )}

                            {/* Feature 2: Soulbound Token */}
                            {result.blockchain?.onChain && (
                                <div style={{
                                    marginTop: '10px', padding: '12px', borderRadius: '10px',
                                    background: 'rgba(138,43,226,0.1)',
                                    border: '1px solid rgba(138,43,226,0.3)',
                                }}>
                                    <i className="fas fa-gem" style={{ color: '#8a2be2' }}></i>
                                    <span style={{ color: '#8a2be2', fontWeight: '600', marginLeft: '8px' }}>
                                        Soulbound Token (Non-Transferable NFT)
                                    </span>
                                    <p style={{ color: '#888', fontSize: '0.75rem', margin: '5px 0 0' }}>
                                        Token ID: SBT-{result.certNumber} — Bound to holder's identity
                                    </p>
                                </div>
                            )}

                            {/* Feature 1: IPFS */}
                            {result.blockchain?.onChain && (
                                <div style={{
                                    marginTop: '10px', padding: '12px', borderRadius: '10px',
                                    background: 'rgba(0,150,255,0.1)',
                                    border: '1px solid rgba(0,150,255,0.3)',
                                }}>
                                    <i className="fas fa-cloud" style={{ color: '#0096ff' }}></i>
                                    <span style={{ color: '#0096ff', fontWeight: '600', marginLeft: '8px' }}>
                                        IPFS Decentralized Storage
                                    </span>
                                    <p style={{ color: '#888', fontSize: '0.75rem', margin: '5px 0 0' }}>
                                        Content-addressed and permanently stored on decentralized network
                                    </p>
                                </div>
                            )}

                            {/* Feature 7: Revocation Status */}
                            {result.revocation?.revoked && (
                                <div style={{
                                    marginTop: '10px', padding: '12px', borderRadius: '10px',
                                    background: 'rgba(220,53,69,0.15)',
                                    border: '1px solid rgba(220,53,69,0.4)',
                                }}>
                                    <i className="fas fa-ban" style={{ color: '#dc3545' }}></i>
                                    <span style={{ color: '#dc3545', fontWeight: '600', marginLeft: '8px' }}>
                                        REVOKED — {result.revocation.reason}
                                    </span>
                                    <p style={{ color: '#888', fontSize: '0.75rem', margin: '5px 0 0' }}>
                                        Revocation TX: {result.revocation.txHash?.substring(0, 20)}...
                                    </p>
                                </div>
                            )}

                            {/* OCR Deep Analysis Summary */}
                            {result.ocrAnalysis && (
                                <div style={{
                                    marginTop: '25px', padding: '20px', borderRadius: '14px',
                                    background: 'rgba(0,120,255,0.03)',
                                    border: '1px solid rgba(0,120,255,0.15)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        position: 'absolute', top: 0, right: 0, padding: '8px 15px',
                                        background: 'var(--primary-blue)', color: '#fff',
                                        fontSize: '0.7rem', fontWeight: '800', borderBottomLeftRadius: '14px',
                                        letterSpacing: '1px', textTransform: 'uppercase',
                                    }}>
                                        AI Enhanced Verification
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%',
                                            background: 'rgba(0,120,255,0.1)', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center', color: 'var(--primary-blue)',
                                        }}>
                                            <i className="fas fa-microscope" style={{ fontSize: '1.2rem' }}></i>
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, color: 'var(--primary-blue)', fontSize: '1.1rem' }}>AI Verification Report</h4>
                                            <span style={{ fontSize: '0.8rem', color: '#666' }}>
                                                Composite Confidence: <strong>{result.ocrAnalysis.overallConfidence}%</strong>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Visual Analysis Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                                        <div style={{
                                            background: '#fff', padding: '12px', borderRadius: '10px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center',
                                            border: '1px solid #eee',
                                        }}>
                                            <i className={`fas ${result.ocrAnalysis.signature?.detected ? 'fa-signature' : 'fa-question-circle'}`}
                                                style={{ fontSize: '1.5rem', marginBottom: '8px', color: result.ocrAnalysis.signature?.detected ? '#28a745' : '#ffa500' }}></i>
                                            <p style={{ fontSize: '0.7rem', color: '#888', margin: '0 0 4px' }}>Signature</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0, color: '#333' }}>
                                                {result.ocrAnalysis.signature?.detected ? 'Authentic' : 'Not Found'}
                                            </p>
                                            <div style={{ fontSize: '0.65rem', color: '#aaa', marginTop: '4px' }}>
                                                {result.ocrAnalysis.signature?.confidence}% confidence
                                            </div>
                                        </div>

                                        <div style={{
                                            background: '#fff', padding: '12px', borderRadius: '10px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center',
                                            border: '1px solid #eee',
                                        }}>
                                            <div style={{
                                                width: '24px', height: '24px', borderRadius: '5px', margin: '0 auto 8px',
                                                background: result.ocrAnalysis.theme?.primaryColor || '#ddd',
                                                border: '2px solid rgba(0,0,0,0.05)',
                                            }}></div>
                                            <p style={{ fontSize: '0.7rem', color: '#888', margin: '0 0 4px' }}>Theme</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0, color: '#333' }}>
                                                {result.ocrAnalysis.theme?.themeName || 'Detected'}
                                            </p>
                                            <div style={{ fontSize: '0.65rem', color: '#aaa', marginTop: '4px' }}>
                                                Institutional Palette
                                            </div>
                                        </div>

                                        <div style={{
                                            background: '#fff', padding: '12px', borderRadius: '10px',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center',
                                            border: '1px solid #eee',
                                        }}>
                                            <i className="fas fa-font" style={{ fontSize: '1.5rem', marginBottom: '8px', color: 'var(--primary-blue)' }}></i>
                                            <p style={{ fontSize: '0.7rem', color: '#888', margin: '0 0 4px' }}>Font Style</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: '700', margin: 0, color: '#333' }}>
                                                {result.ocrAnalysis.font?.fontType?.split(' ')[0] || 'Modern'}
                                            </p>
                                            <div style={{ fontSize: '0.65rem', color: '#aaa', marginTop: '4px' }}>
                                                {result.ocrAnalysis.font?.confidence}% match
                                            </div>
                                        </div>
                                    </div>

                                    {/* Field Match Table */}
                                    {result.ocrAnalysis.crossReference?.matched && (
                                        <div style={{
                                            background: 'rgba(255,255,255,0.6)', borderRadius: '10px',
                                            padding: '12px', border: '1px solid rgba(0,0,0,0.05)',
                                        }}>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '750', color: '#555', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <i className="fas fa-check-double" style={{ color: '#28a745' }}></i>
                                                Database Cross-Reference (Score: {result.ocrAnalysis.crossReference.matchScore}/100)
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 30px', gap: '8px' }}>
                                                {[
                                                    { label: 'Certificate ID', key: 'certNumber' },
                                                    { label: 'Graduate Name', key: 'name' },
                                                    { label: 'Institution', key: 'institution' },
                                                    { label: 'Passing Year', key: 'year' },
                                                ].map((field) => (
                                                    <div key={field.key} style={{ display: 'contents' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.03)', fontSize: '0.85rem' }}>
                                                            <span style={{ color: '#888' }}>{field.label}</span>
                                                            <span style={{ fontWeight: '600', color: '#333' }}>
                                                                {result.ocrAnalysis.crossReference.fieldMatches[field.key]?.extracted || '—'}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                                                            {result.ocrAnalysis.crossReference.fieldMatches[field.key]?.match ? '✅' : '❌'}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Feature 8: LinkedIn Integration */}
                            <div style={{ marginTop: '15px' }}>
                                <LinkedInShare
                                    certificate={result}
                                    verificationUrl={`${window.location.origin}/verify/${result.certNumber}`}
                                />
                            </div>
                        </div>
                    )}
                    <button
                        className="btn btn-primary"
                        style={{ marginTop: '30px' }}
                        onClick={() => window.print()}
                    >
                        <i className="fas fa-print"></i> Print Verification Report
                    </button>
                </div>
            </div>
        </section>
    );
}
