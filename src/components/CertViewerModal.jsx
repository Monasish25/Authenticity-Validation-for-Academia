export default function CertViewerModal({ isOpen, onClose, certData }) {
    if (!isOpen || !certData) return null;

    return (
        <div className="modal-backdrop" id="certViewerModal" style={{ display: 'flex' }}>
            <div className="modal-content cert-viewer-content" style={{ display: 'block' }}>
                <button className="modal-close" id="closeCertViewer" onClick={onClose}>
                    &times;
                </button>
                <div className="cert-viewer-grid">
                    <div className="cert-viewer-preview" id="certViewerPreview" style={{ background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                        {certData.imageUrl ? (
                            <img
                                src={certData.imageUrl}
                                alt="Certificate Preview"
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: '450px',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                                onError={(e) => {
                                    console.warn("Preview image failed to load, trying fallback...");
                                    e.target.onerror = null;
                                    e.target.src = '/Certificates/ananya_sharma.png';
                                }}
                            />
                        ) : (
                            <div className="file-placeholder">
                                <i className="fas fa-file-image"></i>
                                <p>No preview image available</p>
                            </div>
                        )}
                    </div>
                    <div className="cert-viewer-details">
                        <h3>Certificate Details</h3>
                        <div className="detail-row">
                            <div className="detail-label">Cert #:</div>
                            <div className="detail-value" id="viewerCertNum">{certData.certNumber}</div>
                        </div>
                        <div className="detail-row">
                            <div className="detail-label">Name:</div>
                            <div className="detail-value" id="viewerGradName">{certData.name}</div>
                        </div>
                        <div className="detail-row">
                            <div className="detail-label">Institution:</div>
                            <div className="detail-value" id="viewerInstitution">{certData.institution}</div>
                        </div>
                        <div className="detail-row">
                            <div className="detail-label">Degree:</div>
                            <div className="detail-value" id="viewerDegree">{certData.degree || 'N/A'}</div>
                        </div>
                        <div className="detail-row">
                            <div className="detail-label">Year:</div>
                            <div className="detail-value" id="viewerGradYear">{certData.year}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
