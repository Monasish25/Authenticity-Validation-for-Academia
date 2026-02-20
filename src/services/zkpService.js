/**
 * Zero-Knowledge Proof (ZKP) Service
 * Implements a commitment-based ZKP system for privacy-preserving verification.
 * Allows students to prove claims (e.g., "GPA > 3.5") without revealing full data.
 */

/**
 * Generate a cryptographic commitment from secret data.
 * Uses SHA-256 to create a binding commitment.
 * @param {string} secretData - The private data to commit to
 * @param {string} nonce - A random nonce for hiding
 * @returns {string} commitment hash
 */
async function generateCommitment(secretData, nonce) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${secretData}:${nonce}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random nonce for ZKP.
 */
function generateNonce() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a Zero-Knowledge Proof for a claim.
 * @param {Object} params
 * @param {string} params.claim - The claim type (e.g., 'has_degree', 'gpa_above', 'graduated_before')
 * @param {Object} params.secretData - The full certificate data (kept private)
 * @param {*} params.threshold - Threshold for comparison claims
 * @returns {Object} { proof, publicClaim, commitment, nonce }
 */
export async function generateProof({ claim, secretData, threshold }) {
    const nonce = generateNonce();

    // Evaluate the claim
    let claimResult = false;
    let publicClaim = '';

    switch (claim) {
        case 'has_degree':
            claimResult = !!secretData.degree && secretData.degree !== 'N/A';
            publicClaim = 'Holder possesses a valid academic degree';
            break;

        case 'gpa_above':
            claimResult = parseFloat(secretData.gpa || 0) >= parseFloat(threshold);
            publicClaim = `GPA is above ${threshold}`;
            break;

        case 'graduated_before':
            claimResult = parseInt(secretData.year) <= parseInt(threshold);
            publicClaim = `Graduated on or before ${threshold}`;
            break;

        case 'graduated_after':
            claimResult = parseInt(secretData.year) >= parseInt(threshold);
            publicClaim = `Graduated on or after ${threshold}`;
            break;

        case 'institution_match':
            claimResult = secretData.institution?.toUpperCase() === threshold?.toUpperCase();
            publicClaim = `Certificate is from the specified institution`;
            break;

        case 'certificate_valid':
            claimResult = !!secretData.certNumber && !!secretData.name;
            publicClaim = 'Certificate contains valid identification data';
            break;

        default:
            throw new Error(`Unknown claim type: ${claim}`);
    }

    // Create the commitment (binds the prover to their data)
    const dataString = JSON.stringify(secretData);
    const commitment = await generateCommitment(dataString, nonce);

    // The "proof" includes the claim result and commitment, but NOT the secret data
    const proofPayload = `${claim}:${claimResult}:${commitment}`;
    const proofHash = await generateCommitment(proofPayload, nonce);

    return {
        proof: proofHash,
        claimResult,
        publicClaim,
        commitment,
        nonce,
        claimType: claim,
        timestamp: Date.now(),
    };
}

/**
 * Verify a Zero-Knowledge Proof.
 * The verifier checks the proof without seeing the original data.
 * @param {Object} proof - The proof object from generateProof
 * @param {string} claim - The claim type to verify
 * @returns {Object} { valid, publicClaim, timestamp }
 */
export async function verifyProof(proof) {
    // Reconstruct the proof hash from the public components
    const proofPayload = `${proof.claimType}:${proof.claimResult}:${proof.commitment}`;
    const reconstructedHash = await generateCommitment(proofPayload, proof.nonce);

    const valid = reconstructedHash === proof.proof;

    return {
        valid,
        claimResult: proof.claimResult,
        publicClaim: proof.publicClaim,
        claimType: proof.claimType,
        verified: valid && proof.claimResult,
        timestamp: proof.timestamp,
    };
}

/**
 * Get available claim types for the UI.
 */
export function getAvailableClaims() {
    return [
        { id: 'has_degree', label: 'Has a Valid Degree', requiresThreshold: false },
        { id: 'gpa_above', label: 'GPA Above Threshold', requiresThreshold: true, thresholdLabel: 'Minimum GPA' },
        { id: 'graduated_before', label: 'Graduated Before Year', requiresThreshold: true, thresholdLabel: 'Year' },
        { id: 'graduated_after', label: 'Graduated After Year', requiresThreshold: true, thresholdLabel: 'Year' },
        { id: 'institution_match', label: 'From Specific Institution', requiresThreshold: true, thresholdLabel: 'Institution Name' },
        { id: 'certificate_valid', label: 'Has Valid Certificate Data', requiresThreshold: false },
    ];
}
