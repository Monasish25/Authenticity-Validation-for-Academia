/**
 * IPFS Decentralized Storage Service
 * Simulates IPFS content-addressing using SHA-256 CIDs.
 * In production, replace with Pinata/Infura IPFS gateway.
 */

import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const IPFS_COLLECTION = 'ipfs_objects';

/**
 * Generate a CID (Content Identifier) from file data.
 * Uses SHA-256 hashing to create a deterministic, content-addressed ID.
 */
async function generateCID(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(typeof content === 'string' ? content : JSON.stringify(content));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    // Prefix with Qm to mimic IPFS CIDv0 format
    return `Qm${hashHex.substring(0, 44)}`;
}

/**
 * Upload content to IPFS (simulated).
 * Stores the content hash and metadata in Firestore.
 * @param {Object} certData - Certificate data to store
 * @param {File|null} file - Optional file object
 * @returns {Object} { cid, size, timestamp }
 */
export async function uploadToIPFS(certData, file = null) {
    const contentPayload = {
        certNumber: certData.certNumber,
        name: certData.name,
        institution: certData.institution,
        year: certData.year,
        degree: certData.degree || 'N/A',
    };

    const cid = await generateCID(contentPayload);
    const size = new TextEncoder().encode(JSON.stringify(contentPayload)).length;

    // Store the IPFS object metadata in Firestore
    await addDoc(collection(db, IPFS_COLLECTION), {
        cid,
        certNumber: certData.certNumber,
        contentHash: cid,
        fileName: file ? file.name : `${certData.certNumber}.json`,
        fileSize: file ? file.size : size,
        mimeType: file ? file.type : 'application/json',
        pinned: true,
        gateway: 'local-simulation',
        createdAt: serverTimestamp(),
    });

    return {
        cid,
        size: file ? file.size : size,
        gateway: 'local-simulation',
        url: `ipfs://${cid}`,
        httpUrl: `https://ipfs.io/ipfs/${cid}`,
    };
}

/**
 * Retrieve IPFS object metadata by CID.
 */
export async function getFromIPFS(cid) {
    const q = query(collection(db, IPFS_COLLECTION), where('cid', '==', cid));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

/**
 * Get IPFS metadata for a certificate number.
 */
export async function getIPFSByCertNumber(certNumber) {
    const q = query(
        collection(db, IPFS_COLLECTION),
        where('certNumber', '==', certNumber.toUpperCase())
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
}

export { generateCID };
