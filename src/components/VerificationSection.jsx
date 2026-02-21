import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../contexts/AuthContext';
import { verifyCertificateInDB, isBlacklisted, saveOcrScanResult, crossReferenceCertificate } from '../services/certificateService';
import { analyzeFullCertificate } from '../services/ocrAnalysisService';

export default function VerificationSection({ onVerificationResult, onLoginClick }) {
    const { isLoggedIn, user } = useAuth();
    const [certNumber, setCertNumber] = useState('');
    const [institution, setInstitution] = useState('');
    const [graduateName, setGraduateName] = useState('');
    const [year, setYear] = useState('');
    const [isSpinning, setIsSpinning] = useState(false);
    const [scannerActive, setScannerActive] = useState(false);
    const [scannerStatus, setScannerStatus] = useState("Scanner is off. Click \"Start Scanner\" to begin.");
    const [scannedResult, setScannedResult] = useState(null);
    const [scanSuccess, setScanSuccess] = useState(false);
    const [scanFailure, setScanFailure] = useState(false);
    const [ocrProgress, setOcrProgress] = useState(0);
    const [ocrRunning, setOcrRunning] = useState(false);
    const [ocrAnalysis, setOcrAnalysis] = useState(null);

    const html5QrCodeRef = useRef(null);
    const scanFailureTimeoutRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const uploadTextRef = useRef(null);

    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                try { html5QrCodeRef.current.stop(); } catch { }
            }
            if (scanFailureTimeoutRef.current) clearTimeout(scanFailureTimeoutRef.current);
        };
    }, []);

    const handleVerify = async () => {
        const instSelect = document.getElementById('institution');
        const instText = instSelect?.options[instSelect.selectedIndex]?.text || institution;

        if (!certNumber || instText === 'Select institution' || !graduateName || !year) {
            alert('Please fill all the fields to verify the certificate.');
            return;
        }

        setIsSpinning(true);

        setTimeout(async () => {
            setIsSpinning(false);

            try {
                const blacklisted = await isBlacklisted(certNumber);
                const result = await verifyCertificateInDB(certNumber, graduateName);

                if (result.found && !blacklisted) {
                    onVerificationResult({
                        valid: true,
                        certNumber: result.certificate.certNumber,
                        institution: result.certificate.institution,
                        name: result.certificate.name,
                        degree: result.certificate.degree,
                        year: result.certificate.year,
                        method: 'Manual Input + Blockchain Verified',
                        blockchain: result.blockchain,
                    });
                } else {
                    onVerificationResult({
                        valid: false,
                        certNumber,
                        method: 'Manual Input',
                    });
                }
            } catch (error) {
                console.error('Verification error:', error);
                onVerificationResult({
                    valid: false,
                    certNumber,
                    method: 'Manual Input',
                });
            }
        }, 1000);
    };

    const handleFileUpload = async (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG) for OCR analysis.');
            return;
        }

        setOcrRunning(true);
        setOcrProgress(0);
        setOcrAnalysis(null);

        if (uploadTextRef.current) {
            uploadTextRef.current.innerHTML = `<h3><i class="fas fa-spinner fa-spin"></i> Running Deep OCR Analysis...</h3><p>${file.name}</p>`;
        }

        try {
            // Run full deep analysis via the new service
            const analysis = await analyzeFullCertificate(file, (progress) => {
                setOcrProgress(progress);
            });

            console.log('Full OCR Analysis Result:', analysis);

            // Auto-fill the form fields
            if (analysis.extractedFields.certNumber) setCertNumber(analysis.extractedFields.certNumber);
            if (analysis.extractedFields.name) setGraduateName(analysis.extractedFields.name);
            if (analysis.extractedFields.year) setYear(analysis.extractedFields.year);

            // Cross-reference against Firestore database
            const crossRef = await crossReferenceCertificate(analysis.extractedFields);
            analysis.crossReference = crossRef;

            // Save OCR scan result to Firestore
            const userId = user?.email || user?.uid || 'anonymous';
            await saveOcrScanResult(analysis, userId);

            // Set the analysis result for display
            setOcrAnalysis(analysis);

            setOcrRunning(false);
            setOcrProgress(0);

            if (uploadTextRef.current) {
                uploadTextRef.current.innerHTML = `<h3>Upload Certificate</h3><p>Drag & drop your certificate file here or click to browse</p>`;
            }

            // --- Auto-Verification Flow ---

            // If we have a cross-reference match, attempt full verification
            if (crossRef.matched && analysis.extractedFields.certNumber) {
                try {
                    const blacklisted = await isBlacklisted(analysis.extractedFields.certNumber);
                    const result = await verifyCertificateInDB(
                        analysis.extractedFields.certNumber,
                        analysis.extractedFields.name || ''
                    );
                    if (result.found && !blacklisted) {
                        onVerificationResult({
                            valid: true,
                            ...result.certificate,
                            method: 'AI Deep Analysis + Blockchain Verified',
                            blockchain: result.blockchain,
                            ocrAnalysis: analysis,
                        });
                    } else {
                        onVerificationResult({
                            valid: false,
                            certNumber: analysis.extractedFields.certNumber,
                            name: analysis.extractedFields.name || 'Unknown',
                            institution: analysis.extractedFields.institution || 'Unknown',
                            year: analysis.extractedFields.year || 'Unknown',
                            method: 'AI Deep Analysis (Database Match Failed)',
                            ocrAnalysis: analysis,
                        });
                    }
                } catch {
                    onVerificationResult({
                        valid: false,
                        certNumber: analysis.extractedFields.certNumber,
                        method: 'AI Deep Analysis',
                        ocrAnalysis: analysis,
                    });
                }
            } else {
                // No DB match found, but we still show the result of the analysis
                onVerificationResult({
                    valid: false,
                    certNumber: analysis.extractedFields.certNumber || 'Not Detected',
                    name: analysis.extractedFields.name || 'Not Detected',
                    institution: analysis.extractedFields.institution || 'Not Detected',
                    year: analysis.extractedFields.year || 'Not Detected',
                    method: 'AI Deep Analysis (No Database Entry Found)',
                    ocrAnalysis: analysis,
                });
            }
        } catch (error) {
            console.error('OCR Analysis Error:', error);
            setOcrRunning(false);
            setOcrProgress(0);
            if (uploadTextRef.current) {
                uploadTextRef.current.innerHTML = `<h3>Upload Certificate</h3><p>Drag & drop your certificate file here or click to browse</p>`;
            }
            alert('OCR analysis failed. Please try again or enter details manually.');
        }
    };

    const startScanner = () => {
        if (!html5QrCodeRef.current) {
            html5QrCodeRef.current = new Html5Qrcode('new-qr-reader');
        }

        html5QrCodeRef.current
            .start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    clearTimeout(scanFailureTimeoutRef.current);
                    setScanFailure(false);
                    setScanSuccess(true);
                    setScannedResult(decodedText);
                    setScannerStatus('QR Code Detected!');

                    const videoEl = document.querySelector('#new-qr-reader video');
                    if (videoEl && previewCanvasRef.current) {
                        const ctx = previewCanvasRef.current.getContext('2d');
                        previewCanvasRef.current.width = videoEl.videoWidth;
                        previewCanvasRef.current.height = videoEl.videoHeight;
                        ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
                    }
                    stopScanner();
                },
                () => { }
            )
            .then(() => {
                setScannerActive(true);
                setScannerStatus('Scanner active. Point at a QR code.');
                setScannedResult(null);
                setScanSuccess(false);
                setScanFailure(false);

                scanFailureTimeoutRef.current = setTimeout(() => {
                    setScanFailure(true);
                    setScannerStatus('No QR code detected. Please try again.');
                }, 5000);
            })
            .catch((err) => {
                console.error('Failed to start QR scanner', err);
                setScannerStatus('Failed to start camera. Please grant permission.');
            });
    };

    const stopScanner = () => {
        clearTimeout(scanFailureTimeoutRef.current);
        if (html5QrCodeRef.current) {
            html5QrCodeRef.current
                .stop()
                .then(() => {
                    setScannerActive(false);
                    setScannerStatus("Scanner is off. Click 'Start Scanner' to begin.");
                })
                .catch(() => {
                    setScannerActive(false);
                });
        }
    };

    const verifyScannedCertificate = async () => {
        if (!scannedResult) return;

        let scannedData;
        if (scannedResult === 'https://qrco.de/bgJuuC') {
            scannedData = {
                certNumber: 'UPLD-334851',
                institution: 'Jharkhand University of Technology',
                name: 'Manoj Kumar',
                degree: 'Bachelor of Science in Computer Science',
                year: '2022',
                method: 'QR Code Scan + Blockchain',
            };
        } else {
            scannedData = {
                certNumber: scannedResult,
                name: 'Fraud Attempt',
                institution: 'Unknown Institution',
                year: 'N/A',
                degree: 'N/A',
                method: 'QR Code Scan',
            };
        }

        try {
            const blacklisted = await isBlacklisted(scannedData.certNumber);
            const result = await verifyCertificateInDB(scannedData.certNumber, scannedData.name);
            if (result.found && !blacklisted) {
                onVerificationResult({ valid: true, ...result.certificate, method: scannedData.method, blockchain: result.blockchain });
            } else {
                onVerificationResult({ valid: false, certNumber: scannedData.certNumber, method: scannedData.method });
            }
        } catch {
            onVerificationResult({ valid: false, certNumber: scannedData.certNumber, method: scannedData.method });
        }
    };

    // --- Styles for the analysis report ---
    const reportCardStyle = {
        marginTop: '25px',
        padding: '25px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, rgba(10,14,39,0.95), rgba(26,26,62,0.95))',
        border: '1px solid rgba(100,150,255,0.2)',
        color: '#fff',
        backdropFilter: 'blur(10px)',
    };

    const fieldRowStyle = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderRadius: '8px',
        marginBottom: '6px',
        background: 'rgba(255,255,255,0.05)',
        fontSize: '0.9rem',
    };

    const badgeStyle = (type) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontWeight: '600',
        background: type === 'success' ? 'rgba(40,167,69,0.2)' : type === 'warning' ? 'rgba(255,165,0,0.2)' : 'rgba(220,53,69,0.2)',
        color: type === 'success' ? '#28a745' : type === 'warning' ? '#ffa500' : '#dc3545',
        border: `1px solid ${type === 'success' ? 'rgba(40,167,69,0.4)' : type === 'warning' ? 'rgba(255,165,0,0.4)' : 'rgba(220,53,69,0.4)'}`,
    });

    const sectionHeaderStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px',
        fontSize: '1rem',
        fontWeight: '700',
        color: 'var(--primary-blue)',
    };

    return (
        <section className="verification-section" id="verify">
            <div className="container verification-container">
                <h2 className="section-title">Verify a Certificate</h2>
                <p style={{ textAlign: 'center', color: '#666', marginTop: '-20px', marginBottom: '25px', fontSize: '0.9rem' }}>
                    Upload your certificate image for deep AI analysis and database verification.
                </p>

                {/* Upload Area */}
                <div
                    className="upload-area"
                    id="dropZone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#d5e5fd'; }}
                    onDragLeave={(e) => { e.currentTarget.style.backgroundColor = '#e1effe'; }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.backgroundColor = '#e1effe';
                        if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]);
                    }}
                >
                    <div className="upload-icon"><i className="fas fa-file-upload"></i></div>
                    <div className="upload-text" ref={uploadTextRef}>
                        <h3>Upload Certificate</h3>
                        <p>Drag & drop your certificate file here or click to browse</p>
                    </div>
                    {ocrRunning && (
                        <div style={{ width: '80%', margin: '10px auto' }}>
                            <div style={{ background: '#e0e0e0', borderRadius: '10px', overflow: 'hidden', height: '12px' }}>
                                <div style={{
                                    width: `${ocrProgress}%`,
                                    height: '100%',
                                    background: 'linear-gradient(90deg, var(--primary-blue), var(--secondary-blue))',
                                    borderRadius: '10px',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                            <p style={{ textAlign: 'center', fontSize: '0.85rem', marginTop: '5px', color: 'var(--primary-blue)' }}>
                                <i className="fas fa-brain"></i> Deep Analysis... {ocrProgress}%
                            </p>
                        </div>
                    )}
                    <p>Supported formats: JPG, PNG (Max size: 10MB) — AI-Powered Deep Analysis</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/pdf, image/jpeg, image/png"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files.length > 0) handleFileUpload(e.target.files[0]); }}
                    />
                </div>

                {/* ===== OCR Deep Analysis Report ===== */}
                {ocrAnalysis && (
                    <div style={reportCardStyle}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <i className="fas fa-microscope" style={{ fontSize: '2.5rem', color: 'var(--primary-blue)' }}></i>
                            <h3 style={{ margin: '10px 0 5px', color: '#fff' }}>OCR Deep Analysis Report</h3>
                            <div style={{
                                display: 'inline-block',
                                padding: '6px 20px',
                                borderRadius: '20px',
                                fontWeight: '700',
                                fontSize: '1.1rem',
                                background: ocrAnalysis.overallConfidence >= 70
                                    ? 'rgba(40,167,69,0.2)' : ocrAnalysis.overallConfidence >= 40
                                        ? 'rgba(255,165,0,0.2)' : 'rgba(220,53,69,0.2)',
                                color: ocrAnalysis.overallConfidence >= 70
                                    ? '#28a745' : ocrAnalysis.overallConfidence >= 40
                                        ? '#ffa500' : '#dc3545',
                                border: `1px solid ${ocrAnalysis.overallConfidence >= 70 ? 'rgba(40,167,69,0.4)' : ocrAnalysis.overallConfidence >= 40 ? 'rgba(255,165,0,0.4)' : 'rgba(220,53,69,0.4)'}`,
                            }}>
                                Confidence: {ocrAnalysis.overallConfidence}%
                            </div>
                        </div>

                        {/* Extracted Fields */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={sectionHeaderStyle}>
                                <i className="fas fa-file-alt"></i> Extracted Fields ({ocrAnalysis.fieldsFound}/5)
                            </div>
                            {[
                                { label: 'Certificate ID', key: 'certNumber', icon: 'fa-id-card' },
                                { label: 'Name', key: 'name', icon: 'fa-user' },
                                { label: 'Institution', key: 'institution', icon: 'fa-university' },
                                { label: 'Year of Passing', key: 'year', icon: 'fa-calendar' },
                                { label: 'Degree', key: 'degree', icon: 'fa-graduation-cap' },
                            ].map(({ label, key, icon }) => (
                                <div key={key} style={fieldRowStyle}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className={`fas ${icon}`} style={{ color: 'var(--primary-blue)', width: '18px' }}></i>
                                        <strong>{label}:</strong>
                                    </span>
                                    <span style={{ color: ocrAnalysis.extractedFields[key] ? '#e0e0e0' : '#666' }}>
                                        {ocrAnalysis.extractedFields[key] || 'Not detected'}
                                        {ocrAnalysis.extractedFields[key] && <i className="fas fa-check" style={{ marginLeft: '6px', color: '#28a745' }}></i>}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Signature Detection */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={sectionHeaderStyle}>
                                <i className="fas fa-signature"></i> Signature Detection
                            </div>
                            <div style={fieldRowStyle}>
                                <span><strong>Signature Present:</strong></span>
                                <span style={badgeStyle(ocrAnalysis.signature.detected ? 'success' : 'warning')}>
                                    <i className={`fas ${ocrAnalysis.signature.detected ? 'fa-check-circle' : 'fa-question-circle'}`}></i>
                                    {ocrAnalysis.signature.detected ? 'Detected' : 'Not Detected'}
                                </span>
                            </div>
                            <div style={fieldRowStyle}>
                                <span><strong>Confidence:</strong></span>
                                <span>{ocrAnalysis.signature.confidence}%</span>
                            </div>
                            <div style={fieldRowStyle}>
                                <span><strong>Analysis Region:</strong></span>
                                <span style={{ color: '#aaa' }}>{ocrAnalysis.signature.region}</span>
                            </div>
                        </div>

                        {/* Theme Detection */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={sectionHeaderStyle}>
                                <i className="fas fa-palette"></i> Theme & Color Analysis
                            </div>
                            <div style={fieldRowStyle}>
                                <span><strong>Theme:</strong></span>
                                <span style={badgeStyle('success')}>
                                    <i className="fas fa-swatchbook"></i>
                                    {ocrAnalysis.theme.themeName}
                                </span>
                            </div>
                            <div style={fieldRowStyle}>
                                <span><strong>Dominant Colors:</strong></span>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {ocrAnalysis.theme.dominantColors.slice(0, 5).map((color, i) => (
                                        <div key={i} style={{
                                            width: '24px', height: '24px', borderRadius: '6px',
                                            background: color.rgb, border: '2px solid rgba(255,255,255,0.3)',
                                            cursor: 'pointer',
                                        }} title={`${color.hex} (${color.percentage}%)`}></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Font Detection */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={sectionHeaderStyle}>
                                <i className="fas fa-font"></i> Font Analysis
                            </div>
                            <div style={fieldRowStyle}>
                                <span><strong>Font Type:</strong></span>
                                <span style={badgeStyle('success')}>
                                    <i className="fas fa-text-height"></i>
                                    {ocrAnalysis.font.fontType}
                                </span>
                            </div>
                            <div style={fieldRowStyle}>
                                <span><strong>OCR Confidence:</strong></span>
                                <span>{ocrAnalysis.font.confidence}%</span>
                            </div>
                            <div style={{ ...fieldRowStyle, flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                <strong>Analysis:</strong>
                                <span style={{ color: '#aaa', fontSize: '0.85rem' }}>{ocrAnalysis.font.details}</span>
                            </div>
                        </div>

                        {/* Firestore Cross-Reference */}
                        {ocrAnalysis.crossReference && (
                            <div style={{ marginBottom: '10px' }}>
                                <div style={sectionHeaderStyle}>
                                    <i className="fas fa-database"></i> Firestore Database Cross-Reference
                                </div>
                                {ocrAnalysis.crossReference.matched ? (
                                    <>
                                        <div style={{
                                            padding: '12px',
                                            borderRadius: '10px',
                                            background: 'rgba(40,167,69,0.1)',
                                            border: '1px solid rgba(40,167,69,0.3)',
                                            marginBottom: '12px',
                                            textAlign: 'center',
                                        }}>
                                            <i className="fas fa-check-circle" style={{ color: '#28a745', marginRight: '8px' }}></i>
                                            <strong style={{ color: '#28a745' }}>
                                                Match Found — Score: {ocrAnalysis.crossReference.matchScore}/100
                                            </strong>
                                        </div>
                                        {Object.entries(ocrAnalysis.crossReference.fieldMatches).map(([key, val]) => (
                                            <div key={key} style={fieldRowStyle}>
                                                <span style={{ flex: 1 }}>
                                                    <strong style={{ textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}:</strong>
                                                </span>
                                                <span style={{ flex: 1, color: '#aaa', textAlign: 'center' }}>
                                                    {val.extracted || '—'}
                                                </span>
                                                <span style={{
                                                    flex: 0, width: '30px', textAlign: 'center',
                                                    color: val.match ? '#28a745' : '#dc3545',
                                                    fontSize: '1.1rem',
                                                }}>
                                                    {val.match ? '✅' : '❌'}
                                                </span>
                                                <span style={{ flex: 1, color: '#aaa', textAlign: 'center' }}>
                                                    {val.dbValue || '—'}
                                                </span>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 12px', fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                                            <span>OCR Extracted</span>
                                            <span>Firestore DB</span>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{
                                        padding: '12px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,165,0,0.1)',
                                        border: '1px solid rgba(255,165,0,0.3)',
                                        textAlign: 'center',
                                    }}>
                                        <i className="fas fa-exclamation-triangle" style={{ color: '#ffa500', marginRight: '8px' }}></i>
                                        <strong style={{ color: '#ffa500' }}>
                                            No matching certificate found in Firestore database
                                        </strong>
                                    </div>
                                )}
                            </div>
                        )}

                        <p style={{ textAlign: 'center', color: '#555', fontSize: '0.75rem', marginTop: '15px' }}>
                            <i className="fas fa-cloud-upload-alt"></i> This scan result has been saved to Firestore for audit trail.
                        </p>
                    </div>
                )}

                <div style={{ position: 'relative', width: '100%' }}>
                    {!isLoggedIn && (
                        <div className="feature-overlay" style={{ borderRadius: '1rem', background: 'rgba(0,0,0,0.05)', backdropFilter: 'blur(6px)' }}>
                            <div style={{ padding: '30px', background: '#fff', borderRadius: '15px', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                                <i className="fas fa-lock" style={{ fontSize: '2.5rem', color: 'var(--primary-blue)', marginBottom: '15px' }}></i>
                                <h3>Advanced Tools Locked</h3>
                                <p style={{ color: '#666', marginBottom: '20px' }}>Login to use the QR scanner and manual entry features.</p>
                                <button className="btn btn-primary" onClick={onLoginClick}>Login to Unlock</button>
                            </div>
                        </div>
                    )}

                    <div className="or-divider">OR</div>

                    {/* QR Scanner */}
                    <div className="qr-scanner-container">
                        <h3 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--primary-blue)' }}>
                            Scan Certificate QR Code
                        </h3>
                        <div id="new-qr-reader" className={`${scanSuccess ? 'scan-success' : ''} ${scanFailure ? 'scan-failure' : ''}`}>
                            <div className={`scanner-laser ${scanSuccess ? 'scan-success' : ''} ${scanFailure ? 'scan-failure' : ''}`}
                                style={{ display: scannerActive ? 'block' : 'none' }}
                            ></div>
                        </div>
                        <div className="scanner-controls">
                            <button
                                id="start-scanner"
                                className="btn btn-primary"
                                disabled={scannerActive}
                                onClick={startScanner}
                            >
                                <i className="fas fa-camera"></i> Start Scanner
                            </button>
                            <button
                                id="stop-scanner"
                                className="btn btn-outline"
                                disabled={!scannerActive}
                                onClick={stopScanner}
                            >
                                <i className="fas fa-stop"></i> Stop Scanner
                            </button>
                        </div>
                        <div id="scanner-status" className="scanner-status">{scannerStatus}</div>
                        {scannedResult && (
                            <div id="scanned-result" className="scanned-result" style={{ display: 'block' }}>
                                <h4>Scan Preview:</h4>
                                <canvas ref={previewCanvasRef} style={{ width: '150px', borderRadius: '5px', border: '1px solid #ccc', marginTop: '5px' }}></canvas>
                                <h4 style={{ marginTop: '10px' }}>Scanned Certificate ID:</h4>
                                <p id="scanned-certificate-id">{scannedResult}</p>
                                <button className="btn btn-primary" onClick={verifyScannedCertificate}>
                                    Verify This Certificate
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="or-divider">OR</div>

                    {/* Manual Input */}
                    <div className="manual-input">
                        <h3 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--primary-blue)' }}>
                            Enter Certificate Details Manually
                        </h3>
                        <div className="form-group">
                            <label htmlFor="certificateNumber">Certificate Number</label>
                            <input
                                type="text"
                                id="certificateNumber"
                                placeholder="Enter certificate number"
                                value={certNumber}
                                onChange={(e) => setCertNumber(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="institution">Educational Institution</label>
                            <select id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)}>
                                <option value="">Select institution</option>
                                <option value="BBMKU">BINOD BIHARI MAHTO KOYALANCHAL UNIVERSITY, DHANBAD</option>
                                <option value="DSPMU">DR SHYAMA PRASAD MUKHERJEE UNIVERSITY, RANCHI</option>
                                <option value="JWU">JAMSHEDPUR WOMEN&apos;S UNIVERSITY</option>
                                <option value="JRSU">JHARKHAND RAKSHA SHAKTI UNIVERSITY</option>
                                <option value="KU">KOLHAN UNIVERSITY, CHAIBASA</option>
                                <option value="NPU">NILAMBER PITAMBER UNIVERSITY, PALAMU</option>
                                <option value="RU">RANCHI UNIVERSITY, RANCHI</option>
                                <option value="SKMU">SIDO KANHU MURMU UNIVERSITY, DUMKA</option>
                                <option value="JUT">Jharkhand University of Technology</option>
                                <option value="NLU">National Law University, Ranchi</option>
                                <option value="IIM">IIM Ranchi</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="graduateName">Graduate&apos;s Name</label>
                            <input
                                type="text"
                                id="graduateName"
                                placeholder="Enter graduate's full name"
                                value={graduateName}
                                onChange={(e) => setGraduateName(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="year">Year of Graduation</label>
                            <input
                                type="number"
                                id="year"
                                placeholder="Enter graduation year"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleVerify}>
                            Verify Certificate
                        </button>
                        {isSpinning && <div className="spinner" style={{ display: 'block' }}></div>}
                    </div>
                </div>
            </div>
        </section>
    );
}
