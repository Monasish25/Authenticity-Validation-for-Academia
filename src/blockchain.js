import Web3 from 'web3';

const GANACHE_URL = import.meta.env.VITE_GANACHE_URL || 'http://127.0.0.1:7545';

// ABI for the CertificateStore contract
const CONTRACT_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [{ "name": "certNumber", "type": "string" }, { "name": "dataHash", "type": "bytes32" }],
        "name": "addCertificate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "certNumber", "type": "string" }, { "name": "dataHash", "type": "bytes32" }],
        "name": "verifyCertificate",
        "outputs": [
            { "name": "isValid", "type": "bool" },
            { "name": "isBlacklisted", "type": "bool" },
            { "name": "timestamp", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "name": "certNumber", "type": "string" }],
        "name": "blacklistCertificate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "certNumber", "type": "string" }],
        "name": "unblacklistCertificate",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "name": "certNumber", "type": "string" }],
        "name": "certificateExists",
        "outputs": [{ "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    }
];

// Contract bytecode (simplified - in production, compile from Solidity)
const CONTRACT_BYTECODE = '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610f9c806100606000396000f3fe608060405234801561001057600080fd5b50600436106100575760003560e01c80631f7b6d321461005c5780633c1f08f41461007a57806341c0e1b5146100aa5780638da5cb5b146100b4578063d4b83992146100d2575b600080fd5b610064610102565b60405161007191906109a5565b60405180910390f35b610094600480360381019061008f91906107e1565b610115565b6040516100a19190610976565b60405180910390f35b6100b261029e565b005b6100bc610335565b6040516100c99190610940565b60405180910390f35b6100ec60048036038101906100e791906107e1565b610359565b6040516100f99190610976565b60405180910390f35b6000600280549050905090565b60006001826040516101219190610929565b908152602001604051809103902060000160009054906101000a900460ff169050919050565b600073ffffffffffffffffffffffffffffffffffffffff1660008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16146102975760008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146102965760008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461024557600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b5b5b50565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146102f657600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60006001826040516103699190610929565b908152602001604051809103902060000160019054906101000a900460ff169050919050565b600080fd5b600080fd5b600080fd5b600080fd5b600080fd5b60008083601f8401126103bd576103bc610398565b5b8235905067ffffffffffffffff8111156103da576103d961039d565b5b6020830191508360018202830111156103f6576103f56103a2565b5b9250929050565b60006020828403121561041357610412610393565b5b813567ffffffffffffffff81111561042e5761042d610398565b5b61043a848285016103a7565b91505092915050565b61044c816109c0565b82525050565b60006020820190506104676000830184610443565b92915050565b610476816109d2565b82525050565b6000602082019050610491600083018461046d565b92915050565b600081519050919050565b600082825260208201905092915050565b60005b838110156104d15780820151818401526020810190506104b6565b60008484015250505050565b6000601f19601f8301169050919050565b60006104f982610497565b61050381856104a2565b93506105138185602086016104b3565b61051c816104dd565b840191505092915050565b6000602082019050818103600083015261054181846104ee565b905092915050565b600061055482610497565b61055e81856104a2565b935061056e8185602086016104b3565b610577816104dd565b840191505092915050565b6000602082019050818103600083015261059c818461054a565b905092915050565b6105ad816109fe565b82525050565b60006020820190506105c860008301846105a4565b92915050565b600082825260208201905092915050565b60006105ea82610497565b6105f481856105ce565b93506106048185602086016104b3565b61060d816104dd565b840191505092915050565b6000602082019050818103600083015261063281846105df565b905092915050565b600081905092915050565b600061065082610497565b61065a818561063a565b935061066a8185602086016104b3565b80840191505092915050565b60006106828284610645565b915081905092915050565b600060608201905061069e600083018661046d565b6106ab602083018561046d565b6106b860408301846105a4565b949350505050565b6106c9816109c0565b81146106d457600080fd5b50565b6000813590506106e6816106c0565b92915050565b6000806040838503121561070357610702610393565b5b600083013567ffffffffffffffff81111561072157610720610398565b5b61072d858286016103a7565b92505060206107368582860161013e565b9150509250929050565b600061074b82610497565b61075581856105ce565b93506107658185602086016104b3565b61076e816104dd565b840191505092915050565b600060208201905081810360008301526107938184610740565b905092915050565b6107a4816109d2565b81146107af57600080fd5b50565b6000813590506107c18161079b565b92915050565b6000602082840312156107dd576107dc610393565b5b5f80fd5b6000602082840312156107f7576107f6610393565b5b813567ffffffffffffffff81111561081257610811610398565b5b61081e848285016103a7565b91505092915050565b600082825260208201905092915050565b600061084382610497565b61084d8185610827565b935061085d8185602086016104b3565b610866816104dd565b840191505092915050565b6000602082019050818103600083015261088b8184610838565b905092915050565b600081519050919050565b600082825260208201905092915050565b60006108ba82610893565b6108c4818561089e565b93506108d48185602086016104b3565b6108dd816104dd565b840191505092915050565b6000602082019050818103600083015261090281846108af565b905092915050565b600061091582610893565b61091f818561063a565b935061092f8185602086016104b3565b80840191505092915050565b6000610947828461090a565b915081905092915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b600061097d82610952565b9050919050565b600060208201905061099960008301846105b3565b92915050565b60006020820190506109b460008301846105a4565b92915050565b60008115159050919050565b60006109d1826109ba565b9050919050565b6000819050919050565b6000819050919050565b60006109f7826109e2565b9050919050565b6000610a09826109d8565b905091905056fea264697066735822122000000000000000000000000000000000000000000000000000000000000000000064736f6c63430008130033';

let web3 = null;
let contract = null;
let account = null;
let isConnected = false;

export async function initBlockchain() {
    try {
        web3 = new Web3(GANACHE_URL);
        const accounts = await web3.eth.getAccounts();
        if (accounts.length === 0) {
            console.warn('No Ganache accounts found. Blockchain features disabled.');
            return false;
        }
        account = accounts[0];
        isConnected = true;
        console.log('Connected to Ganache blockchain at', GANACHE_URL);
        return true;
    } catch (error) {
        console.warn('Could not connect to Ganache:', error.message);
        isConnected = false;
        return false;
    }
}

export function isBlockchainConnected() {
    return isConnected;
}

// Generate a SHA-256 hash of certificate data
export function hashCertificateData(certData) {
    if (!web3) return null;
    const dataString = JSON.stringify({
        certNumber: certData.certNumber,
        name: certData.name,
        institution: certData.institution,
        year: certData.year,
    });
    return web3.utils.sha3(dataString);
}

// Store certificate hash on the blockchain (simulated via transaction)
export async function storeCertificateOnChain(certData) {
    if (!isConnected || !web3) {
        console.warn('Blockchain not connected. Skipping on-chain storage.');
        return { success: false, txHash: null };
    }

    try {
        const dataHash = hashCertificateData(certData);
        // Store the hash as transaction data
        const tx = await web3.eth.sendTransaction({
            from: account,
            to: account,
            value: '0',
            data: web3.utils.utf8ToHex(JSON.stringify({
                type: 'CERT_STORE',
                certNumber: certData.certNumber,
                hash: dataHash,
                timestamp: Date.now(),
            })),
            gas: 100000,
        });

        console.log('Certificate stored on chain. TX:', tx.transactionHash);
        return { success: true, txHash: tx.transactionHash, dataHash };
    } catch (error) {
        console.error('Blockchain storage error:', error);
        return { success: false, txHash: null };
    }
}

// Verify certificate hash on the blockchain
export async function verifyCertificateOnChain(certData) {
    if (!isConnected || !web3) {
        return { verified: false, onChain: false };
    }

    try {
        const dataHash = hashCertificateData(certData);
        // Get the latest block number
        const latestBlock = await web3.eth.getBlockNumber();
        // Search recent transactions for matching certificate data
        const searchRange = Math.min(Number(latestBlock), 100);

        for (let i = Number(latestBlock); i >= Number(latestBlock) - searchRange && i >= 0; i--) {
            const block = await web3.eth.getBlock(i, true);
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.input && tx.input !== '0x') {
                        try {
                            const decoded = web3.utils.hexToUtf8(tx.input);
                            const txData = JSON.parse(decoded);
                            if (txData.type === 'CERT_STORE' && txData.certNumber === certData.certNumber) {
                                return {
                                    verified: txData.hash === dataHash,
                                    onChain: true,
                                    txHash: tx.hash,
                                    blockNumber: i,
                                    timestamp: txData.timestamp,
                                };
                            }
                        } catch {
                            // Not our transaction format, skip
                        }
                    }
                }
            }
        }

        return { verified: false, onChain: false };
    } catch (error) {
        console.error('Blockchain verification error:', error);
        return { verified: false, onChain: false };
    }
}

// ===== Feature 7: On-Chain Revocation List (CRL) =====
// Enhanced blacklist with reason and audit trail
export async function blacklistOnChain(certNumber, reason = 'Revoked by administrator') {
    if (!isConnected || !web3) {
        return { success: false };
    }

    try {
        const tx = await web3.eth.sendTransaction({
            from: account,
            to: account,
            value: '0',
            data: web3.utils.utf8ToHex(JSON.stringify({
                type: 'CERT_REVOKE',
                certNumber: certNumber,
                reason: reason,
                revokedBy: account,
                timestamp: Date.now(),
            })),
            gas: 100000,
        });

        return { success: true, txHash: tx.transactionHash, reason };
    } catch (error) {
        console.error('Blockchain revocation error:', error);
        return { success: false };
    }
}

// Check the on-chain revocation status
export async function checkRevocationOnChain(certNumber) {
    if (!isConnected || !web3) {
        return { revoked: false, onChain: false };
    }

    try {
        const latestBlock = await web3.eth.getBlockNumber();
        const searchRange = Math.min(Number(latestBlock), 100);

        for (let i = Number(latestBlock); i >= Number(latestBlock) - searchRange && i >= 0; i--) {
            const block = await web3.eth.getBlock(i, true);
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.input && tx.input !== '0x') {
                        try {
                            const decoded = web3.utils.hexToUtf8(tx.input);
                            const txData = JSON.parse(decoded);
                            if (txData.type === 'CERT_REVOKE' && txData.certNumber === certNumber) {
                                return {
                                    revoked: true,
                                    onChain: true,
                                    reason: txData.reason,
                                    revokedBy: txData.revokedBy,
                                    txHash: tx.hash,
                                    blockNumber: i,
                                    timestamp: txData.timestamp,
                                };
                            }
                        } catch { /* skip */ }
                    }
                }
            }
        }

        return { revoked: false, onChain: true };
    } catch (error) {
        console.error('Revocation check error:', error);
        return { revoked: false, onChain: false };
    }
}

// Get full revocation audit trail for a certificate
export async function getRevocationHistory(certNumber) {
    if (!isConnected || !web3) return [];

    const history = [];
    try {
        const latestBlock = await web3.eth.getBlockNumber();
        const searchRange = Math.min(Number(latestBlock), 200);

        for (let i = Number(latestBlock); i >= Number(latestBlock) - searchRange && i >= 0; i--) {
            const block = await web3.eth.getBlock(i, true);
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.input && tx.input !== '0x') {
                        try {
                            const decoded = web3.utils.hexToUtf8(tx.input);
                            const txData = JSON.parse(decoded);
                            if (txData.certNumber === certNumber &&
                                (txData.type === 'CERT_REVOKE' || txData.type === 'CERT_BLACKLIST')) {
                                history.push({
                                    action: txData.type === 'CERT_REVOKE' ? 'Revoked' : 'Blacklisted',
                                    reason: txData.reason || 'No reason provided',
                                    revokedBy: txData.revokedBy || 'Unknown',
                                    txHash: tx.hash,
                                    blockNumber: i,
                                    timestamp: txData.timestamp,
                                });
                            }
                        } catch { /* skip */ }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Revocation history error:', error);
    }
    return history;
}

// ===== Feature 2: Soulbound Token (SBT) Minting =====
let sbtTokenCounter = 0;

export async function mintSoulboundToken(certData, recipientAddress = null) {
    if (!isConnected || !web3) {
        return { success: false, tokenId: null };
    }

    try {
        sbtTokenCounter++;
        const tokenId = `SBT-${Date.now()}-${sbtTokenCounter}`;
        const recipient = recipientAddress || account;

        const tx = await web3.eth.sendTransaction({
            from: account,
            to: account,
            value: '0',
            data: web3.utils.utf8ToHex(JSON.stringify({
                type: 'SBT_MINT',
                tokenId,
                certNumber: certData.certNumber,
                recipient,
                name: certData.name,
                institution: certData.institution,
                year: certData.year,
                transferable: false, // Soulbound = non-transferable
                timestamp: Date.now(),
            })),
            gas: 100000,
        });

        return {
            success: true,
            tokenId,
            txHash: tx.transactionHash,
            recipient,
            transferable: false,
        };
    } catch (error) {
        console.error('SBT minting error:', error);
        return { success: false, tokenId: null };
    }
}

export async function getSoulboundToken(certNumber) {
    if (!isConnected || !web3) return null;

    try {
        const latestBlock = await web3.eth.getBlockNumber();
        const searchRange = Math.min(Number(latestBlock), 100);

        for (let i = Number(latestBlock); i >= Number(latestBlock) - searchRange && i >= 0; i--) {
            const block = await web3.eth.getBlock(i, true);
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (tx.input && tx.input !== '0x') {
                        try {
                            const decoded = web3.utils.hexToUtf8(tx.input);
                            const txData = JSON.parse(decoded);
                            if (txData.type === 'SBT_MINT' && txData.certNumber === certNumber) {
                                return {
                                    tokenId: txData.tokenId,
                                    recipient: txData.recipient,
                                    transferable: false,
                                    txHash: tx.hash,
                                    blockNumber: i,
                                    timestamp: txData.timestamp,
                                };
                            }
                        } catch { /* skip */ }
                    }
                }
            }
        }
    } catch (error) {
        console.error('SBT lookup error:', error);
    }
    return null;
}

// ===== Feature 3: Digital Signatures (ECDSA) =====

export async function signCertificate(certData) {
    if (!isConnected || !web3) {
        return { success: false, signature: null };
    }

    try {
        const dataHash = hashCertificateData(certData);
        const signature = await web3.eth.sign(dataHash, account);

        // Store the signed record on-chain
        const tx = await web3.eth.sendTransaction({
            from: account,
            to: account,
            value: '0',
            data: web3.utils.utf8ToHex(JSON.stringify({
                type: 'CERT_SIGN',
                certNumber: certData.certNumber,
                dataHash,
                signature,
                signerAddress: account,
                timestamp: Date.now(),
            })),
            gas: 100000,
        });

        return {
            success: true,
            signature,
            signerAddress: account,
            dataHash,
            txHash: tx.transactionHash,
        };
    } catch (error) {
        console.error('Digital signature error:', error);
        return { success: false, signature: null };
    }
}

export async function verifySignature(certData, signature, signerAddress) {
    if (!isConnected || !web3) {
        return { valid: false };
    }

    try {
        const dataHash = hashCertificateData(certData);
        const recoveredAddress = await web3.eth.accounts.recover(dataHash, signature);
        const valid = recoveredAddress.toLowerCase() === signerAddress.toLowerCase();
        return { valid, recoveredAddress, expectedAddress: signerAddress };
    } catch (error) {
        console.error('Signature verification error:', error);
        return { valid: false };
    }
}

export { web3 };
