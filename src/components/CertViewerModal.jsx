export default function CertViewerModal({ isOpen, onClose, certData }) {
    if (!isOpen || !certData) return null;

    return (
        <div className="modal-backdrop" id="certViewerModal" style={{ display: 'flex' }}>
            <div className="modal-content cert-viewer-content" style={{ display: 'block' }}>
                <button className="modal-close" id="closeCertViewer" onClick={onClose}>
                    &times;
                </button>
                <div className="cert-viewer-grid">
                    <div className="cert-viewer-preview" id="certViewerPreview">
                        <h3 style={{ textAlign: 'center' }}>Certificate Preview</h3>
                        <div className="file-placeholder">
                            <i className="fas fa-file-pdf"></i>
                            <p>
                                Simulated preview for <span id="previewFileName">{certData.name} Certificate.pdf</span>
                            </p>
                        </div>
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
                            <div className="detail-label">Year:</div>
                            <div className="detail-value" id="viewerGradYear">{certData.year}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
