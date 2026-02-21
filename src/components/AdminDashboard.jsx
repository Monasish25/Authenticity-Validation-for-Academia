import { useState, useEffect, useRef } from 'react';
import {
    addCertificate,
    getCertificates,
    deleteCertificate as deleteCertFromDB,
    addToBlacklist,
    removeFromBlacklist,
    getBlacklist,
    updateCertificate,
    uploadCertificateImage,
    saveOcrScanResult,
} from '../services/certificateService';
import { useAuth } from '../contexts/AuthContext';
import { getPendingCerts, approveCert } from '../services/multiSigService';
import { analyzeFullCertificate } from '../services/ocrAnalysisService';

export default function AdminDashboard({ onOpenCertViewer, showToast }) {
    const { isAdmin } = useAuth();
    const [certificates, setCertificates] = useState([]);
    const [blacklist, setBlacklist] = useState([]);
    const [newCert, setNewCert] = useState({ certNumber: '', name: '', institution: '', year: '', degree: '' });
    const [blacklistInput, setBlacklistInput] = useState('');
    const [removingItems, setRemovingItems] = useState(new Set());
    const [pendingCerts, setPendingCerts] = useState([]);
    const [isOcrScanning, setIsOcrScanning] = useState(false);
    const [uploadingForCert, setUploadingForCert] = useState(null);
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, filename: '' });

    const adminFileInputRef = useRef(null);
    const certScanInputRef = useRef(null);
    const tableImageInputRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [certs, bl, pending] = await Promise.all([
                getCertificates(),
                getBlacklist(),
                getPendingCerts().catch(() => []),
            ]);
            setCertificates(certs);
            setBlacklist(bl);
            setPendingCerts(pending);
        } catch (error) {
            console.error('Error loading admin data:', error);
        }
    };

    const handleAddCertificate = async (e) => {
        e.preventDefault();
        try {
            const result = await addCertificate({
                certNumber: newCert.certNumber,
                name: newCert.name,
                institution: newCert.institution,
                year: newCert.year,
                degree: newCert.degree || 'Bachelor of Technology',
            });
            setCertificates((prev) => [...prev, result]);
            setNewCert({ certNumber: '', name: '', institution: '', year: '', degree: '' });
            showToast(`Successfully added certificate ${result.certNumber}`);
        } catch (error) {
            console.error('Error adding certificate:', error);
            // Better error detection: check code, message, or internal error string
            const isDuplicate =
                error.code === 'cert/already-exists' ||
                error.message?.includes('already exists') ||
                (error.inner?.message && error.inner.message.includes('already exists'));

            if (isDuplicate) {
                showToast('Certificate number already exists in database!', 'error');
            } else {
                showToast(error.message || 'Failed to add certificate.', 'error');
            }
        }
    };

    const handleOcrScan = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsOcrScanning(true);
        try {
            const analysis = await analyzeFullCertificate(file);
            const { extractedFields } = analysis;
            setNewCert({
                certNumber: extractedFields.certNumber || '',
                name: extractedFields.name || '',
                institution: extractedFields.institution || '',
                year: extractedFields.year || '',
                degree: extractedFields.degree || '',
            });
            showToast('OCR Scan completed! Form auto-filled.');
        } catch (error) {
            console.error('Admin OCR error:', error);
            showToast('OCR scan failed.', 'error');
        } finally {
            setIsOcrScanning(false);
            if (certScanInputRef.current) certScanInputRef.current.value = '';
        }
    };

    const handleActionUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !uploadingForCert) return;

        try {
            showToast('Uploading certificate image...');
            const imageUrl = await uploadCertificateImage(uploadingForCert.certNumber, file);
            await updateCertificate(uploadingForCert.id, { imageUrl });

            // Update local state
            setCertificates(prev => prev.map(c =>
                c.id === uploadingForCert.id ? { ...c, imageUrl } : c
            ));

            showToast('Certificate image updated successfully!');
        } catch (error) {
            console.error('Image upload error:', error);
            showToast('Failed to upload image.', 'error');
        } finally {
            setUploadingForCert(null);
            if (tableImageInputRef.current) tableImageInputRef.current.value = '';
        }
    };

    const handleBlacklistSubmit = async (e) => {
        e.preventDefault();
        const certToBlacklist = blacklistInput.trim().toUpperCase();
        if (!certToBlacklist) return;

        if (blacklist.some((b) => b.certNumber === certToBlacklist)) {
            showToast('This certificate is already blacklisted.', 'error');
            return;
        }

        try {
            await addToBlacklist(certToBlacklist);
            setBlacklist((prev) => [{ certNumber: certToBlacklist, id: Date.now().toString() }, ...prev]);
            setBlacklistInput('');
            showToast(`${certToBlacklist} added to blacklist.`);
        } catch (error) {
            console.error('Error blacklisting:', error);
            showToast('Blacklist update failed.', 'error');
        }
    };

    const handleUnblacklist = async (certNumber) => {
        if (confirm(`Are you sure you want to remove ${certNumber} from the blacklist?`)) {
            setRemovingItems((prev) => new Set([...prev, certNumber]));
            try {
                await removeFromBlacklist(certNumber);
                setTimeout(() => {
                    setBlacklist((prev) => prev.filter((b) => b.certNumber !== certNumber));
                    setRemovingItems((prev) => {
                        const next = new Set(prev);
                        next.delete(certNumber);
                        return next;
                    });
                    showToast(`${certNumber} removed from blacklist.`);
                }, 500);
            } catch (error) {
                console.error('Error unblacklisting:', error);
                showToast('Un-blacklist failed.', 'error');
            }
        }
    };

    const handleAdminFiles = async (files) => {
        if (!isAdmin) {
            showToast('Please log in as Admin to upload.', 'error');
            return;
        }

        const filesToProcess = Array.from(files).filter(
            (file) =>
                file.type === 'application/pdf' ||
                file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.type === 'application/vnd.ms-excel' ||
                file.name.endsWith('.csv')
        );

        if (filesToProcess.length === 0) {
            showToast('No valid files selected.', 'error');
            return;
        }

        let successCount = 0;
        setIsBulkUploading(true);
        setBulkProgress({ current: 0, total: filesToProcess.length, filename: '' });

        showToast(`Processing ${filesToProcess.length} file(s)...`);

        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i];
            setBulkProgress(prev => ({ ...prev, current: i + 1, filename: file.name }));

            try {
                if (file.type === 'application/pdf') {
                    // PDF processing: Run full OCR and visual analysis
                    const analysis = await analyzeFullCertificate(file);
                    const { extractedFields, overallConfidence } = analysis;

                    if (!extractedFields.certNumber) {
                        console.warn(`Could not extract cert number from PDF: ${file.name}. Using filename as fallback.`);
                        // Fallback: Use filename without extension if cert number regex fails
                        extractedFields.certNumber = file.name.split('.')[0].replace(/\s+/g, '_').toUpperCase();
                    }

                    // Convert dataURL to Blob for upload
                    const response = await fetch(analysis.previewUrl);
                    const blob = await response.blob();
                    const imageFile = new File([blob], `${extractedFields.certNumber}_preview.png`, { type: 'image/png' });

                    // Upload preview image
                    const imageUrl = await uploadCertificateImage(extractedFields.certNumber, imageFile);

                    // Add certificate to database - ensure all fields are passed
                    const certResult = await addCertificate({
                        certNumber: extractedFields.certNumber,
                        name: extractedFields.name || `Unknown (${file.name})`,
                        institution: extractedFields.institution || 'Unknown Institution',
                        year: extractedFields.year || 'N/A',
                        degree: extractedFields.degree || 'N/A',
                        imageUrl,
                        analysisConfidence: overallConfidence
                    });

                    // Save OCR analysis log for audit trail
                    await saveOcrScanResult(analysis, 'Admin_Bulk_PDF');

                    setCertificates((prev) => [certResult, ...prev]);
                    successCount++;
                } else {
                    // Fallback for CSV/Excel (keep existing mock behavior for now or implement parser)
                    const mockCert = {
                        certNumber: `${file.name.split('.').pop().toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
                        name: `Scanned Graduate ${i + 1}`,
                        institution: `Institution ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
                        year: String(2020 + Math.floor(Math.random() * 5)),
                        degree: 'Dummy Bulk Upload Degree',
                    };
                    const result = await addCertificate(mockCert);
                    setCertificates((prev) => [...prev, result]);
                    successCount++;
                }
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
            }
        }

        setIsBulkUploading(false);
        setBulkProgress({ current: 0, total: 0, filename: '' });

        if (successCount > 0) {
            showToast(`Successfully processed ${successCount} certificate(s).`);
        } else {
            showToast('Bulk upload failed or no certificates recognized.', 'error');
        }
    };

    if (!isAdmin) return null;

    return (
        <section className="admin-dashboard-section" id="admin-dashboard" style={{ display: 'block' }}>
            <div className="container">
                <h2 className="section-title">Admin Document Management</h2>
                <div className="admin-grid">
                    <div className="admin-form-container">
                        <h3>Add New Certificate</h3>
                        <form id="add-certificate-form" onSubmit={handleAddCertificate}>
                            <div className="form-group" style={{ marginBottom: '20px' }}>
                                <label>AI Assistant</label>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'var(--primary-blue)', color: '#fff' }}
                                    onClick={() => certScanInputRef.current?.click()}
                                    disabled={isOcrScanning}
                                >
                                    <i className={isOcrScanning ? "fas fa-spinner fa-spin" : "fas fa-magic"}></i>
                                    {isOcrScanning ? 'Scanning Certificate...' : 'Fill Form using AI OCR'}
                                </button>
                                <input
                                    type="file"
                                    ref={certScanInputRef}
                                    hidden
                                    accept="image/*"
                                    onChange={handleOcrScan}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newCertNumber">Certificate Number</label>
                                <input
                                    type="text"
                                    id="newCertNumber"
                                    required
                                    value={newCert.certNumber}
                                    onChange={(e) => setNewCert((p) => ({ ...p, certNumber: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newGradName">Graduate&apos;s Name</label>
                                <input
                                    type="text"
                                    id="newGradName"
                                    required
                                    value={newCert.name}
                                    onChange={(e) => setNewCert((p) => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newInstitution">Institution</label>
                                <input
                                    type="text"
                                    id="newInstitution"
                                    required
                                    value={newCert.institution}
                                    onChange={(e) => setNewCert((p) => ({ ...p, institution: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newGradYear">Graduation Year</label>
                                <input
                                    type="number"
                                    id="newGradYear"
                                    required
                                    value={newCert.year}
                                    onChange={(e) => setNewCert((p) => ({ ...p, year: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="newDegree">Degree / Qualification</label>
                                <input
                                    type="text"
                                    id="newDegree"
                                    required
                                    placeholder="e.g. B.Tech Computer Science"
                                    value={newCert.degree}
                                    onChange={(e) => setNewCert((p) => ({ ...p, degree: e.target.value }))}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                                Add Certificate
                            </button>
                        </form>
                    </div>
                    <div className="admin-table-container">
                        <div
                            className="admin-upload-area"
                            id="adminDropZone"
                            onClick={() => adminFileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('drag-over');
                                if (e.dataTransfer.files.length) handleAdminFiles(e.dataTransfer.files);
                            }}
                        >
                            <input
                                type="file"
                                ref={adminFileInputRef}
                                multiple
                                hidden
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
                                onChange={(e) => { if (e.target.files.length) handleAdminFiles(e.target.files); }}
                            />
                            <div className="upload-icon"><i className="fas fa-file-csv"></i></div>
                            <div className="upload-text">
                                <h3>Bulk Upload Certificates</h3>
                                <p>Drag & drop a CSV, Excel, or PDF file here, or click to browse.</p>
                            </div>

                            {isBulkUploading && (
                                <div className="bulk-progress-container">
                                    <div className="bulk-progress-info">
                                        <span>Scanning {bulkProgress.current} of {bulkProgress.total}</span>
                                        <span className="bulk-current-file">{bulkProgress.filename}</span>
                                    </div>
                                    <div className="progress-bar-bg">
                                        <div
                                            className="progress-bar-fill"
                                            style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <h3>Manage Certificates</h3>
                        <div className="table-scroll-container">
                            <table className="certificates-table">
                                <thead>
                                    <tr>
                                        <th>Cert #</th>
                                        <th>Name</th>
                                        <th>Institution</th>
                                        <th>Degree</th>
                                        <th>Year</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody id="certificates-tbody">
                                    {certificates.map((cert) => (
                                        <tr key={cert.id}>
                                            <td>{cert.certNumber}</td>
                                            <td>{cert.name}</td>
                                            <td>{cert.institution}</td>
                                            <td>{cert.degree || 'N/A'}</td>
                                            <td>{cert.year}</td>
                                            <td>
                                                {cert.imageUrl ? (
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '5px 15px', fontSize: '0.8rem' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onOpenCertViewer(cert.certNumber, cert.name, cert.institution, cert.degree, cert.year, cert.imageUrl);
                                                        }}
                                                    >
                                                        <i className="fas fa-eye"></i> Preview
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '5px 15px', fontSize: '0.8rem', background: '#f39c12' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setUploadingForCert(cert);
                                                            tableImageInputRef.current?.click();
                                                        }}
                                                    >
                                                        <i className="fas fa-plus-circle"></i> Add Image
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <input
                            type="file"
                            ref={tableImageInputRef}
                            hidden
                            accept="image/*"
                            onChange={handleActionUpload}
                        />
                    </div>
                </div>

                <div className="blacklist-container">
                    <h3>
                        <i className="fas fa-exclamation-triangle"></i>
                        Blacklist Management
                    </h3>
                    <p className="blacklist-description">
                        Enter a certificate number below to mark it as fraudulent or revoked.
                        This will prevent it from being successfully verified by any user.
                    </p>
                    <form id="blacklist-form" onSubmit={handleBlacklistSubmit}>
                        <div className="form-group">
                            <label htmlFor="blacklistCertNumber">Certificate Number to Blacklist</label>
                            <input
                                type="text"
                                id="blacklistCertNumber"
                                placeholder="e.g., FAKE202312345"
                                required
                                value={blacklistInput}
                                onChange={(e) => setBlacklistInput(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn btn-danger" style={{ width: '100%' }}>
                            <i className="fas fa-ban"></i> Add to Blacklist
                        </button>
                    </form>
                    <div className="blacklist-list-container">
                        <h4>Currently Blacklisted Certificates:</h4>
                        <ul id="blacklisted-list">
                            {blacklist.map((item) => (
                                <li
                                    key={item.id || item.certNumber}
                                    className={`blacklisted-item ${removingItems.has(item.certNumber) ? 'removing' : ''}`}
                                >
                                    <span>{item.certNumber}</span>
                                    <button
                                        className="btn btn-warning unblacklist-btn"
                                        onClick={() => handleUnblacklist(item.certNumber)}
                                    >
                                        Un-blacklist
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Feature 5: Multi-Signature Pending Approvals */}
                <div className="blacklist-container" style={{ marginTop: '30px' }}>
                    <h3>
                        <i className="fas fa-file-signature"></i>
                        {' '}Multi-Signature Pending Approvals
                    </h3>
                    <p className="blacklist-description">
                        Certificates below require {'>'}1 admin signature before being finalized on-chain.
                    </p>
                    {pendingCerts.length === 0 ? (
                        <p style={{ color: '#888', fontStyle: 'italic', padding: '15px 0' }}>
                            No pending certificates awaiting approval.
                        </p>
                    ) : (
                        <ul id="pending-list">
                            {pendingCerts.map((item) => (
                                <li
                                    key={item.id}
                                    className="blacklisted-item"
                                    style={{ borderColor: 'rgba(255,165,0,0.3)' }}
                                >
                                    <span>
                                        <strong>{item.certNumber}</strong> — {item.name} | {item.signatureCount}/{item.requiredSignatures} signatures
                                    </span>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                                        onClick={async () => {
                                            try {
                                                const result = await approveCert(item.id, 'admin@verifyed.com');
                                                if (result.approved) {
                                                    showToast(`Certificate ${item.certNumber} has been finalized on-chain!`);
                                                    loadData();
                                                } else {
                                                    showToast(`Approved! ${result.signaturesNeeded} more signature(s) needed.`, 'warning');
                                                    loadData();
                                                }
                                            } catch (error) {
                                                showToast('Approval error: ' + error.message, 'error');
                                            }
                                        }}
                                    >
                                        <i className="fas fa-check"></i> Approve
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section >
    );
}
