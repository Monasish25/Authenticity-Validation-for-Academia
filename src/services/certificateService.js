import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    where,
    getDoc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
    storeCertificateOnChain,
    verifyCertificateOnChain,
    blacklistOnChain,
    signCertificate,
    mintSoulboundToken,
    checkRevocationOnChain,
} from '../blockchain';
import { uploadToIPFS } from './ipfsService';

const CERTIFICATES_COLLECTION = 'certificates';
const BLACKLIST_COLLECTION = 'blacklist';

// --- Helpers ---
const sanitizeCertNumber = (num) => num.replace(/\//g, '_').toUpperCase();

// --- Certificate CRUD ---

export async function addCertificate(certData) {
    const sanitizedId = sanitizeCertNumber(certData.certNumber);
    const docRef = doc(db, CERTIFICATES_COLLECTION, sanitizedId);

    // Check if it already exists
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const error = new Error('Certificate already exists');
        error.code = 'cert/already-exists';
        throw error;
    }

    // Store in Firestore with specific ID
    await setDoc(docRef, {
        certNumber: certData.certNumber.toUpperCase(),
        name: certData.name,
        institution: certData.institution,
        year: certData.year,
        degree: certData.degree || 'N/A',
        createdAt: serverTimestamp(),
    });

    // Feature 1: Upload to IPFS
    let ipfsResult = null;
    try {
        ipfsResult = await uploadToIPFS(certData);
    } catch (e) {
        console.warn('IPFS upload skipped:', e.message);
    }

    // Store hash on blockchain
    const blockchainResult = await storeCertificateOnChain(certData);

    // Feature 3: Digitally sign the certificate
    let signatureResult = null;
    try {
        signatureResult = await signCertificate(certData);
    } catch (e) {
        console.warn('Digital signature skipped:', e.message);
    }

    // Feature 2: Mint Soulbound Token
    let sbtResult = null;
    try {
        sbtResult = await mintSoulboundToken(certData);
    } catch (e) {
        console.warn('SBT minting skipped:', e.message);
    }

    return {
        id: docRef.id,
        ...certData,
        blockchain: blockchainResult,
        ipfs: ipfsResult,
        signature: signatureResult,
        sbt: sbtResult,
    };
}

export async function getCertificates() {
    const querySnapshot = await getDocs(collection(db, CERTIFICATES_COLLECTION));
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}

export async function deleteCertificate(docId) {
    await deleteDoc(doc(db, CERTIFICATES_COLLECTION, docId));
}

export async function verifyCertificateInDB(certNumber, name) {
    const q = query(
        collection(db, CERTIFICATES_COLLECTION),
        where('certNumber', '==', certNumber.toUpperCase())
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { found: false, certificate: null };
    }

    const certDoc = querySnapshot.docs[0];
    const certData = certDoc.data();

    // Check if the name matches (case insensitive)
    const nameMatch = certData.name.toUpperCase() === name.toUpperCase();

    // Check blockchain verification
    const blockchainResult = await verifyCertificateOnChain({
        certNumber: certData.certNumber,
        name: certData.name,
        institution: certData.institution,
        year: certData.year,
    });

    // Feature 7: Check on-chain revocation
    let revocationResult = null;
    try {
        revocationResult = await checkRevocationOnChain(certData.certNumber);
    } catch (e) {
        console.warn('On-chain revocation check skipped:', e.message);
    }

    return {
        found: nameMatch,
        certificate: certData,
        blockchain: blockchainResult,
        revocation: revocationResult,
    };
}

// --- Blacklist Operations ---

export async function addToBlacklist(certNumber, reason = 'Revoked by administrator') {
    await addDoc(collection(db, BLACKLIST_COLLECTION), {
        certNumber: certNumber.toUpperCase(),
        reason,
        createdAt: serverTimestamp(),
    });

    // Feature 7: Also revoke on blockchain with reason
    await blacklistOnChain(certNumber.toUpperCase(), reason);
}

export async function removeFromBlacklist(certNumber) {
    const q = query(
        collection(db, BLACKLIST_COLLECTION),
        where('certNumber', '==', certNumber.toUpperCase())
    );
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (docSnap) => {
        await deleteDoc(doc(db, BLACKLIST_COLLECTION, docSnap.id));
    });
}

export async function getBlacklist() {
    const querySnapshot = await getDocs(collection(db, BLACKLIST_COLLECTION));
    return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));
}

export async function isBlacklisted(certNumber) {
    const q = query(
        collection(db, BLACKLIST_COLLECTION),
        where('certNumber', '==', certNumber.toUpperCase())
    );
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
}
