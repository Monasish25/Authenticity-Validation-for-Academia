/**
 * Feature 8: LinkedIn Integration
 * Generates a "Add to LinkedIn Profile" button for verified certificates.
 */
export default function LinkedInShare({ certificate, verificationUrl }) {
    if (!certificate) return null;

    const baseUrl = 'https://www.linkedin.com/profile/add';
    const params = new URLSearchParams({
        startTask: 'CERTIFICATION_NAME',
        name: `${certificate.degree || 'Academic Certificate'} — ${certificate.institution || 'VerifyEd'}`,
        organizationName: certificate.institution || 'VerifyEd Academic Verification',
        issueYear: certificate.year || new Date().getFullYear().toString(),
        issueMonth: '1',
        certId: certificate.certNumber || '',
        certUrl: verificationUrl || `${window.location.origin}/verify/${certificate.certNumber}`,
    });

    const linkedInUrl = `${baseUrl}?${params.toString()}`;

    return (
        <a
            href={linkedInUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                background: '#0077B5',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'background 0.3s ease',
                cursor: 'pointer',
                marginTop: '10px',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#005f8d'}
            onMouseOut={(e) => e.currentTarget.style.background = '#0077B5'}
        >
            <i className="fab fa-linkedin" style={{ fontSize: '1.2rem' }}></i>
            Add to LinkedIn Profile
        </a>
    );
}
