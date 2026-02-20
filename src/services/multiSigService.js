/**
 * Multi-Signature Approval Service
 * Requires multiple admin approvals before a certificate is finalized on-chain.
 */

import {
    collection, addDoc, getDocs, updateDoc, doc,
    query, where, serverTimestamp, arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import { storeCertificateOnChain } from '../blockchain';

const PENDING_COLLECTION = 'pending_certificates';
const REQUIRED_SIGNATURES = 2; // Minimum approvals needed

/**
 * Create a pending certificate that needs multi-sig approval.
 */
export async function createPendingCert(certData, creatorEmail) {
    const docRef = await addDoc(collection(db, PENDING_COLLECTION), {
        certNumber: certData.certNumber,
        name: certData.name,
        institution: certData.institution,
        year: certData.year,
        degree: certData.degree || 'N/A',
        status: 'pending',
        requiredSignatures: REQUIRED_SIGNATURES,
        signatures: [creatorEmail],
        signatureCount: 1,
        createdBy: creatorEmail,
        createdAt: serverTimestamp(),
    });
    return { id: docRef.id, status: 'pending', signaturesNeeded: REQUIRED_SIGNATURES - 1 };
}

/**
 * Approve a pending certificate. If threshold is met, finalize on-chain.
 */
export async function approveCert(certId, approverEmail) {
    const docRef = doc(db, PENDING_COLLECTION, certId);

    // Get the current doc to check signatures
    const pendingDocs = await getDocs(
        query(collection(db, PENDING_COLLECTION), where('__name__', '==', certId))
    );

    if (pendingDocs.empty) throw new Error('Pending certificate not found');

    const certDoc = pendingDocs.docs[0].data();

    // Check if already signed by this user
    if (certDoc.signatures.includes(approverEmail)) {
        throw new Error('You have already approved this certificate');
    }

    const newSignatureCount = certDoc.signatureCount + 1;
    const isFinalized = newSignatureCount >= certDoc.requiredSignatures;

    await updateDoc(docRef, {
        signatures: arrayUnion(approverEmail),
        signatureCount: newSignatureCount,
        status: isFinalized ? 'approved' : 'pending',
        ...(isFinalized && { approvedAt: serverTimestamp() }),
    });

    // If threshold met, store on blockchain
    let blockchainResult = null;
    if (isFinalized) {
        blockchainResult = await storeCertificateOnChain({
            certNumber: certDoc.certNumber,
            name: certDoc.name,
            institution: certDoc.institution,
            year: certDoc.year,
        });
    }

    return {
        approved: isFinalized,
        signatureCount: newSignatureCount,
        requiredSignatures: certDoc.requiredSignatures,
        blockchain: blockchainResult,
    };
}

/**
 * Get all pending certificates.
 */
export async function getPendingCerts() {
    const q = query(collection(db, PENDING_COLLECTION), where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get approved multi-sig certificates.
 */
export async function getApprovedCerts() {
    const q = query(collection(db, PENDING_COLLECTION), where('status', '==', 'approved'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

export { REQUIRED_SIGNATURES };
