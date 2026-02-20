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
