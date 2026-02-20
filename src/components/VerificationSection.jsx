import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Tesseract from 'tesseract.js';
import { useAuth } from '../contexts/AuthContext';
import { verifyCertificateInDB, isBlacklisted } from '../services/certificateService';

export default function VerificationSection({ onVerificationResult, onLoginClick }) {
    const { isLoggedIn } = useAuth();
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
        if (!isLoggedIn) {
            alert('Please log in to upload and verify a certificate.');
            onLoginClick();
            return;
        }

        // Only process images for OCR
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG) for OCR analysis.');
            return;
        }

        setOcrRunning(true);
        setOcrProgress(0);

        if (uploadTextRef.current) {
            uploadTextRef.current.innerHTML = `<h3><i class="fas fa-spinner fa-spin"></i> Running OCR Analysis...</h3><p>${file.name}</p>`;
        }

        try {
            const imageUrl = URL.createObjectURL(file);

            const { data } = await Tesseract.recognize(imageUrl, 'eng', {
                logger: (m) => {
                    if (m.status === 'recognizing text') {
                        setOcrProgress(Math.round(m.progress * 100));
                    }
                },
            });

            URL.revokeObjectURL(imageUrl);
            const text = data.text;
            console.log('OCR Extracted Text:', text);

            // --- Extract fields using regex patterns ---
            // Certificate number patterns
            const certPatterns = [
                /(?:certificate\s*(?:no|number|#|id)[.:;\s]*)\s*([A-Z0-9\-\/]+)/i,
                /(?:reg(?:istration)?\s*(?:no|number|#|id)[.:;\s]*)\s*([A-Z0-9\-\/]+)/i,
                /(?:roll\s*(?:no|number|#)[.:;\s]*)\s*([A-Z0-9\-\/]+)/i,
                /\b([A-Z]{2,5}[\-\/][0-9]{4,8})\b/,
                /\b(UPLD-[0-9]+)\b/i,
            ];
            let extractedCertNumber = '';
            for (const pattern of certPatterns) {
                const match = text.match(pattern);
                if (match) {
                    extractedCertNumber = match[1].trim();
                    break;
                }
            }

            // Year patterns (look for 4-digit years between 1990-2030)
            const yearMatch = text.match(/\b(199[0-9]|20[0-2][0-9]|2030)\b/);
            const extractedYear = yearMatch ? yearMatch[1] : '';

            // Name patterns
            const namePatterns = [
                /(?:name\s*(?:of\s*(?:the\s*)?(?:candidate|student|graduate))?)[.:;\s]+([A-Z][a-zA-Z\s.]+)/i,
                /(?:this\s*is\s*to\s*certify\s*that)\s+([A-Z][a-zA-Z\s.]+?)\s+(?:has|son|daughter|s\/o|d\/o)/i,
                /(?:awarded\s*to)\s+([A-Z][a-zA-Z\s.]+)/i,
            ];
            let extractedName = '';
            for (const pattern of namePatterns) {
                const match = text.match(pattern);
                if (match) {
                    extractedName = match[1].trim();
                    break;
                }
            }

            // Institution patterns
            const instPatterns = [
                /(?:university|institute|college|school|academy)[\s:]+([A-Za-z\s.,]+)/i,
                /(university\s+of\s+[A-Za-z\s]+)/i,
                /([A-Za-z\s]+\s+university)/i,
            ];
            let extractedInstitution = '';
            for (const pattern of instPatterns) {
                const match = text.match(pattern);
                if (match) {
                    extractedInstitution = match[1].trim();
                    break;
                }
            }

            // Auto-fill the form fields with extracted data
            if (extractedCertNumber) setCertNumber(extractedCertNumber);
            if (extractedName) setGraduateName(extractedName);
            if (extractedYear) setYear(extractedYear);

            setOcrRunning(false);
            setOcrProgress(0);

            if (uploadTextRef.current) {
                uploadTextRef.current.innerHTML = `<h3>Upload Certificate</h3><p>Drag & drop your certificate file here or click to browse</p>`;
            }

            const fieldsFound = [extractedCertNumber, extractedName, extractedYear].filter(Boolean).length;
            if (fieldsFound > 0) {
                alert(`OCR Complete! Extracted ${fieldsFound} field(s). Review the form below and click "Verify Certificate".`);
            } else {
                alert('OCR could not extract structured data from this image. Please enter the details manually.');
            }

            // Auto-verify if we found a cert number and name
            if (extractedCertNumber && extractedName) {
                try {
                    const blacklisted = await isBlacklisted(extractedCertNumber);
                    const result = await verifyCertificateInDB(extractedCertNumber, extractedName);
                    if (result.found && !blacklisted) {
                        onVerificationResult({ valid: true, ...result.certificate, method: 'OCR + Blockchain Verified', blockchain: result.blockchain });
                    } else {
                        onVerificationResult({ valid: false, certNumber: extractedCertNumber, method: 'OCR Scan' });
                    }
                } catch {
                    onVerificationResult({ valid: false, certNumber: extractedCertNumber, method: 'OCR Scan' });
                }
            }
        } catch (error) {
            console.error('OCR Error:', error);
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

    return (
        <section className="verification-section" id="verify">
            {!isLoggedIn && (
                <div className="feature-overlay" id="verification-overlay">
                    <h3><i className="fas fa-lock"></i> Features Locked</h3>
                    <p>Please log in to your account to access the certificate verification tools.</p>
                    <button className="btn btn-primary" onClick={onLoginClick}>
                        Login to Verify
                    </button>
                </div>
            )}
            <div className="container verification-container">
                <h2 className="section-title">Verify a Certificate</h2>

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
                                <i className="fas fa-eye"></i> OCR Analyzing... {ocrProgress}%
                            </p>
                        </div>
                    )}
                    <p>Supported formats: JPG, PNG (Max size: 10MB) — OCR Powered</p>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="application/pdf, image/jpeg, image/png"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files.length > 0) handleFileUpload(e.target.files[0]); }}
                    />
                </div>

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
        </section>
    );
}
