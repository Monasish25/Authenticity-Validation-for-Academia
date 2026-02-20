// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateStore {
    struct Certificate {
        bytes32 dataHash;
        uint256 timestamp;
        bool exists;
        bool blacklisted;
    }

    mapping(string => Certificate) private certificates;
    address public owner;

    event CertificateAdded(string certNumber, bytes32 dataHash, uint256 timestamp);
    event CertificateBlacklisted(string certNumber, uint256 timestamp);
    event CertificateUnblacklisted(string certNumber, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function addCertificate(string memory certNumber, bytes32 dataHash) public onlyOwner {
        require(!certificates[certNumber].exists, "Certificate already exists");
        certificates[certNumber] = Certificate({
            dataHash: dataHash,
            timestamp: block.timestamp,
            exists: true,
            blacklisted: false
        });
        emit CertificateAdded(certNumber, dataHash, block.timestamp);
    }

    function verifyCertificate(string memory certNumber, bytes32 dataHash) public view returns (bool isValid, bool isBlacklisted, uint256 timestamp) {
        Certificate memory cert = certificates[certNumber];
        if (!cert.exists) {
            return (false, false, 0);
        }
        return (cert.dataHash == dataHash, cert.blacklisted, cert.timestamp);
    }

    function blacklistCertificate(string memory certNumber) public onlyOwner {
        require(certificates[certNumber].exists, "Certificate does not exist");
        certificates[certNumber].blacklisted = true;
        emit CertificateBlacklisted(certNumber, block.timestamp);
    }

    function unblacklistCertificate(string memory certNumber) public onlyOwner {
        require(certificates[certNumber].exists, "Certificate does not exist");
        certificates[certNumber].blacklisted = false;
        emit CertificateUnblacklisted(certNumber, block.timestamp);
    }

    function certificateExists(string memory certNumber) public view returns (bool) {
        return certificates[certNumber].exists;
    }
}
