// --- State Variables ---
let isAdminLoggedIn = false;
let isUserLoggedIn = false;
let blacklistedCerts = new Set(); // To store blacklisted certificate numbers
let scanFailureTimeout;

// This mock database simulates a server-side list of valid certificates
const validCertificates = [
    { certNumber: 'RU2023156789', name: 'Priya Sharma', institution: 'Ranchi University', year: '2023', degree: 'Bachelor of Science in Computer Science' },
    { certNumber: 'JUT2022987654', name: 'Rohan Kumar', institution: 'JUT, Ranchi', year: '2022', degree: 'Bachelor of Technology in Civil Engineering' },
    // Added new certificate data for Manoj Kumar
    { certNumber: 'UPLD-334851', name: 'Manoj Kumar', institution: 'Jharkhand University of Technology', year: '2022', degree: 'Bachelor of Science in Computer Science' }
];

// Function to show verification section
function showVerification() {
    document.getElementById('verify').scrollIntoView({ behavior: 'smooth' });
}

// Function to show dashboard (simulated)
function showDashboard() {
    if (isAdminLoggedIn) {
         document.getElementById('admin-dashboard').scrollIntoView({ behavior: 'smooth' });
    } else {
         alert("Please log in as an Admin/Institution to access this panel.");
         loginModal.style.display = 'flex';
    }
}

// --- MODIFIED VERIFICATION FUNCTION ---
function verifyCertificate(data) {
    const spinner = document.getElementById('verification-spinner');
    spinner.style.display = 'block';

    setTimeout(() => {
        spinner.style.display = 'none';

        // Get result elements
        const resultsSection = document.getElementById('results');
        const iconContainer = document.getElementById('result-icon-container');
        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        const detailsContainer = document.getElementById('result-details-container');

        const certFound = validCertificates.find(cert =>
            cert.certNumber.toUpperCase() === data.certNumber.toUpperCase() &&
            cert.name.toUpperCase() === data.name.toUpperCase()
        );

        // --- IF-ELSE VERIFICATION LOGIC ---
        if (certFound && !blacklistedCerts.has(data.certNumber.toUpperCase())) {
            // Certificate is valid and not blacklisted
            iconContainer.className = 'result-icon valid';
            iconContainer.innerHTML = '<i class="fas fa-check-circle"></i>';
            resultTitle.textContent = 'Certificate Verified Successfully!';
            resultMessage.textContent = 'This certificate has been verified against our institutional database and is authentic.';

            // Populate details dynamically from the found certificate
            document.getElementById('res-cert-num').textContent = certFound.certNumber;
            document.getElementById('res-institution').textContent = certFound.institution;
            document.getElementById('res-grad-name').textContent = certFound.name;
            document.getElementById('res-degree').textContent = certFound.degree;
            document.getElementById('res-grad-year').textContent = certFound.year;
            document.getElementById('res-method').textContent = data.method;

            detailsContainer.style.display = 'block';
        } else {
            // Certificate is fraudulent or blacklisted
            iconContainer.className = 'result-icon invalid';
            iconContainer.innerHTML = '<i class="fas fa-times-circle"></i>';
            resultTitle.textContent = 'Verification Failed: Fraud Detected';
            resultMessage.textContent = 'This certificate could not be verified and is considered fraudulent. It has been added to the blacklist.';
            detailsContainer.style.display = 'none'; // Hide details for fraudulent certs

            // Add the fraudulent certificate to the blacklist
            if (!blacklistedCerts.has(data.certNumber.toUpperCase())) {
                blacklistedCerts.add(data.certNumber.toUpperCase());
                const blacklistedList = document.getElementById('blacklisted-list');
                const listItem = document.createElement('li');
                listItem.className = 'blacklisted-item';
                listItem.innerHTML = `
                    <span>${data.certNumber.toUpperCase()}</span>
                    <button class="btn btn-warning unblacklist-btn">Un-blacklist</button>
                `;
                blacklistedList.prepend(listItem);
            }
        }

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }, 1000);
}

function printResult() {
    alert("Printing verification report...");
}

// MODIFIED to handle the specific QR code for Manoj Kumar
function verifyScannedCertificate() {
    const certId = document.getElementById('scanned-certificate-id').textContent;
    if (certId) {
        let scannedData;
        if (certId === 'https://qrco.de/bgJuuC') {
            scannedData = {
                certNumber: 'UPLD-334851',
                institution: 'Jharkhand University of Technology',
                name: 'Manoj Kumar',
                degree: 'Bachelor of Science in Computer Science',
                year: '2022',
                method: 'Database Match'
            };
        } else {
            // For any other QR code, treat as a fraud attempt
            scannedData = {
                certNumber: certId,
                name: 'Fraud Attempt',
                institution: 'Unknown Institution',
                year: 'N/A',
                degree: 'N/A',
                method: 'QR Code Scan'
            };
        }
        verifyCertificate(scannedData);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const loginModal = document.getElementById('loginModal');
    const closeModal = document.getElementById('closeModal');
    const openLogin = document.getElementById('openLogin');
    const modalTabs = document.querySelectorAll('.modal-tab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginButton = document.getElementById('loginBtn');
    const signupButton = document.getElementById('signupBtn');
    const verificationOverlay = document.getElementById('verification-overlay');
    const overlayLoginBtn = document.getElementById('overlayLoginBtn');
    const heroInstitutionBtn = document.getElementById('heroInstitutionBtn');
    const manualVerifyBtn = document.querySelector('.manual-input .btn-primary');

    // Demo accounts
    const DEMO_ACCOUNTS = {
        user: { email: 'user@demo.com', pass: 'password123' },
        admin: { email: 'admin@demo.com', pass: 'admin123' }
    };

    // Modal open/close
    openLogin.addEventListener('click', (e) => {
        e.preventDefault();
        if(openLogin.textContent.startsWith('Logout')) {
            isAdminLoggedIn = false;
            isUserLoggedIn = false;
            openLogin.textContent = 'Login';
            document.getElementById('admin-dashboard').style.display = 'none';
            heroInstitutionBtn.textContent = 'Institution Login';
            verificationOverlay.style.display = 'flex';
            alert('You have been logged out.');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            loginModal.style.display = 'flex';
        }
    });
    closeModal.addEventListener('click', () => {
        loginModal.style.display = 'none';
    });

    // Tab switching
    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if (tab.dataset.tab === 'login') {
                loginForm.classList.add('active');
                signupForm.classList.remove('active');
            } else {
                loginForm.classList.remove('active');
                signupForm.classList.add('active');
            }
        });
    });

    // Login logic
    loginButton.onclick = function() {
        const selectedRole = document.querySelector('#loginForm .role-btn.active').dataset.role;
        const emailInput = document.getElementById('loginEmail').value;
        const passwordInput = document.getElementById('loginPassword').value;

        if (DEMO_ACCOUNTS[selectedRole] && emailInput === DEMO_ACCOUNTS[selectedRole].email && passwordInput === DEMO_ACCOUNTS[selectedRole].pass) {
            loginModal.style.display = 'none';
            verificationOverlay.style.display = 'none';

            if (selectedRole === 'admin') {
                isAdminLoggedIn = true;
                isUserLoggedIn = true;
                document.getElementById('admin-dashboard').style.display = 'block';
                document.getElementById('admin-dashboard').scrollIntoView({ behavior: 'smooth' });
                openLogin.textContent = 'Logout (Admin)';
                heroInstitutionBtn.textContent = 'Admin Panel';
                alert('Admin login successful! Verification features unlocked.');
            } else {
                isUserLoggedIn = true;
                isAdminLoggedIn = false;
                openLogin.textContent = 'Logout (User)';
                alert('User login successful! Verification features unlocked.');
                document.getElementById('verify').scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            const loginModalContent = document.querySelector('#loginModal .modal-content');
            loginModalContent.classList.add('shake-element');
            setTimeout(() => loginModalContent.classList.remove('shake-element'), 820);
            alert('Invalid credentials. Please check the email and password and try again.');
        }
    };

    // Sign-up logic (demo only)
    signupBtn.onclick = function(e) {
        e.preventDefault();
        alert('Sign-up is disabled in demo. Use the provided demo accounts.');
    };

    // Overlay login button
    overlayLoginBtn.addEventListener('click', () => {
        loginModal.style.display = 'flex';
    });

    // Handle role selection buttons
    document.querySelectorAll('.role-selector').forEach(selector => {
        selector.addEventListener('click', (e) => {
            if (e.target.classList.contains('role-btn')) {
                e.target.parentNode.querySelector('.active').classList.remove('active');
                e.target.classList.add('active');
            }
        });
    });

    // Handle manual verification
    manualVerifyBtn.addEventListener('click', () => {
        const certNumber = document.getElementById('certificateNumber').value;
        const institution = document.getElementById('institution').options[document.getElementById('institution').selectedIndex].text;
        const name = document.getElementById('graduateName').value;
        const year = document.getElementById('year').value;
        
        if (!certNumber || institution === 'Select institution' || !name || !year) {
            alert("Please fill all the fields to verify the certificate.");
            return;
        }

        // Create a data object from manual input
        const manualData = {
            certNumber: certNumber,
            institution: institution,
            name: name,
            year: year,
            degree: 'Bachelor of Science in Computer Science', // dummy data
            method: 'Manual Input'
        };
        verifyCertificate(manualData);
    });

    // --- ADMIN DASHBOARD FUNCTIONS ---
    document.getElementById('add-certificate-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const certNum = document.getElementById('newCertNumber').value;
        const gradName = document.getElementById('newGradName').value;
        const institution = document.getElementById('newInstitution').value;
        const gradYear = document.getElementById('newGradYear').value;

        // Add the new certificate to the mock database
        validCertificates.push({
            certNumber: certNum,
            name: gradName,
            institution: institution,
            year: gradYear,
            degree: 'Bachelor of Technology in Civil Engineering' // Dummy degree
        });

        addCertificateToTable(certNum, gradName, institution, gradYear);
        document.getElementById('add-certificate-form').reset();
    });

    function addCertificateToTable(certNum, gradName, institution, gradYear) {
        const tableBody = document.getElementById('certificates-tbody');
        const newRow = tableBody.insertRow();
        newRow.setAttribute('onclick', `openCertViewer('${certNum}', '${gradName}', '${institution}', '${gradYear}')`);
        newRow.innerHTML = `
            <td>${certNum}</td>
            <td>${gradName}</td>
            <td>${institution}</td>
            <td>${gradYear}</td>
            <td><button class="btn btn-danger" onclick="event.stopPropagation(); deleteCertificate(this)">Delete</button></td>
        `;
    }

    window.deleteCertificate = function(button) {
        if (confirm('Are you sure you want to delete this certificate record?')) {
            const row = button.closest('tr');
            const certNum = row.querySelector('td:first-child').textContent;
            // Remove from the mock database as well
            const index = validCertificates.findIndex(cert => cert.certNumber === certNum);
            if (index > -1) {
                validCertificates.splice(index, 1);
            }
            row.remove();
        }
    }

    // --- BLACKLIST FUNCTIONALITY ---
    const blacklistForm = document.getElementById('blacklist-form');
    const blacklistedList = document.getElementById('blacklisted-list');
    const blacklistInput = document.getElementById('blacklistCertNumber');

    blacklistForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const certToBlacklist = blacklistInput.value.trim().toUpperCase();
        if (certToBlacklist && !blacklistedCerts.has(certToBlacklist)) {
            blacklistedCerts.add(certToBlacklist);

            const listItem = document.createElement('li');
            listItem.className = 'blacklisted-item';
            listItem.innerHTML = `
                <span>${certToBlacklist}</span>
                <button class="btn btn-warning unblacklist-btn">Un-blacklist</button>
            `;
            blacklistedList.prepend(listItem);
            blacklistInput.value = '';
        } else if (blacklistedCerts.has(certToBlacklist)) {
            alert('This certificate is already on the blacklist.');
        }
    });

    blacklistedList.addEventListener('click', function(e) {
        if (e.target.classList.contains('unblacklist-btn')) {
            const listItem = e.target.closest('.blacklisted-item');
            const certToUnblacklist = listItem.querySelector('span').textContent;

            if (confirm(`Are you sure you want to remove ${certToUnblacklist} from the blacklist?`)) {
                blacklistedCerts.delete(certToUnblacklist);
                listItem.classList.add('removing');
                listItem.addEventListener('animationend', () => {
                    listItem.remove();
                });
            }
        }
    });

    // --- ADMIN DRAG-AND-DROP UPLOAD LOGIC ---
    const adminDropZone = document.getElementById('adminDropZone');
    const adminFileInput = document.getElementById('adminFileInput');

    if (adminDropZone) {
        adminDropZone.addEventListener('click', () => {
            adminFileInput.click();
        });
        adminFileInput.addEventListener('change', (e) => {
            if (e.target.files.length) {
                handleAdminFiles(e.target.files);
            }
        });
        adminDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            adminDropZone.classList.add('drag-over');
        });
        adminDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            adminDropZone.classList.remove('drag-over');
        });
        adminDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.backgroundColor = '#e1effe';
            const files = e.dataTransfer.files;
            if (files.length) {
                handleAdminFiles(files);
            }
        });
        
        function handleAdminFiles(files) {
            if (!isAdminLoggedIn) {
                alert("Please log in as an Admin/Institution to upload files.");
                return;
            }
            
            // Allow all accepted file types for bulk upload
            const filesToProcess = Array.from(files).filter(file => 
                file.type === 'application/pdf' || 
                file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                file.type === 'application/vnd.ms-excel' ||
                file.type === '.csv' ||
                file.name.endsWith('.csv')
            );
            
            if (filesToProcess.length === 0) {
                 alert("No valid files (PDF, CSV, or Excel) were selected for bulk upload.");
                 return;
            }

            adminDropZone.querySelector('.upload-text h3').textContent = `Processing ${filesToProcess.length} file(s)...`;
            adminDropZone.querySelector('.upload-text p').textContent = 'Please wait...';

            let filesProcessed = 0;
            const totalFiles = filesToProcess.length;

            filesToProcess.forEach((file, index) => {
                setTimeout(() => {
                    const mockCert = {
                        certNum: `${file.type.includes('pdf') ? 'PDF' : file.name.split('.')[1].toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
                        gradName: `Scanned Graduate ${index + 1}`,
                        institution: `Institution ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`,
                        gradYear: 2020 + Math.floor(Math.random() * 5)
                    };

                    validCertificates.push({
                         certNumber: mockCert.certNum,
                         name: mockCert.gradName,
                         institution: mockCert.institution,
                         year: mockCert.gradYear,
                         degree: 'Dummy Bulk Upload Degree' // Dummy degree for bulk upload
                    });

                    addCertificateToTable(mockCert.certNum, mockCert.gradName, mockCert.institution, mockCert.gradYear);
                    filesProcessed++;
                    
                    if (filesProcessed === totalFiles) {
                        alert(`${totalFiles} certificate(s) successfully "scanned" and added.`);
                        adminDropZone.querySelector('.upload-text h3').textContent = 'Bulk Upload Certificates';
                        adminDropZone.querySelector('.upload-text p').textContent = 'Drag & drop a CSV, Excel, or PDF file here, or click to browse.';
                    }
                }, 1000 * (index + 1));
            });
        }
    }

    // --- ENHANCEMENT FOR FILE UPLOAD FUNCTIONALITY ---
    const dropZone = document.getElementById('dropZone');
    const uploadTextContainer = dropZone.querySelector('.upload-text');
    const originalUploadText = uploadTextContainer.innerHTML;
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf, image/jpeg, image/png';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    const handleCertificateFile = (file) => {
        if (!file) {
            alert("No file selected or the file type is not supported.");
            return;
        }
        if (!isUserLoggedIn && !isAdminLoggedIn) {
            alert("Please log in to upload and verify a certificate.");
            document.getElementById('loginModal').style.display = 'flex';
            return;
        }
        uploadTextContainer.innerHTML = `<h3><i class="fas fa-spinner fa-spin"></i> Analyzing Certificate...</h3><p>${file.name}</p>`;
        setTimeout(() => {
            // Updated to a let variable as per the request
            let extractedData = {
                certNumber: `UPLD-${Math.floor(100000 + Math.random() * 900000)}`,
                institution: 'JUT',
                name: 'Rohan Kumar',
                year: '2022',
                degree: 'Bachelor of Technology in Civil Engineering',
                method: 'AI-Powered OCR'
            };
            
            document.getElementById('certificateNumber').value = extractedData.certNumber;
            document.getElementById('institution').value = extractedData.institution;
            document.getElementById('graduateName').value = extractedData.name;
            document.getElementById('year').value = extractedData.year;
            uploadTextContainer.innerHTML = originalUploadText;
            alert("Certificate analysis complete! Now verifying details...");
            verifyCertificate(extractedData);
        }, 1500);
    };

    dropZone.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        if (e.target.files.length > 0) handleCertificateFile(e.target.files[0]);
    };
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#d5e5fd';
    };
    dropZone.ondragleave = () => {
        dropZone.style.backgroundColor = '#e1effe';
    };
    dropZone.ondrop = (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '#e1effe';
        if (e.dataTransfer.files.length > 0) handleCertificateFile(e.dataTransfer.files[0]);
    };

    // --- QR SCANNER LOGIC ---
    const newScannerContainer = document.getElementById('new-qr-reader');
    const laser = document.querySelector('.scanner-laser');
    const startScannerBtn = document.getElementById('start-scanner');
    const stopScannerBtn = document.getElementById('stop-scanner');
    const scannerStatus = document.getElementById('scanner-status');
    const scannedResultDiv = document.getElementById('scanned-result');
    const scannedIdEl = document.getElementById('scanned-certificate-id');
    const previewCanvas = document.getElementById('scan-preview');
    const previewCtx = previewCanvas.getContext('2d');

    const html5QrCode = new Html5Qrcode("new-qr-reader");

    const onScanSuccess = (decodedText, decodedResult) => {
        clearTimeout(scanFailureTimeout); // Stop the failure timeout
        newScannerContainer.classList.remove('scan-failure');
        newScannerContainer.classList.add('scan-success');
        laser.classList.add('scan-success');
        laser.classList.remove('scan-failure');

        scannedIdEl.textContent = decodedText;
        scannerStatus.textContent = `QR Code Detected!`;
        const videoElement = newScannerContainer.querySelector('video');
        if (videoElement) {
            const videoWidth = videoElement.videoWidth;
            const videoHeight = videoElement.videoHeight;
            previewCanvas.width = videoWidth;
            previewCanvas.height = videoHeight;
            previewCtx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);
        }
        scannedResultDiv.style.display = 'block';
        stopScanner();
    };

    const onScanFailure = (error) => {
        // Do nothing on each failure, wait for the timeout
    };

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    const startScanner = () => {
        html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess, onScanFailure)
            .then(() => {
                scannerStatus.textContent = "Scanner active. Point at a QR code.";
                laser.style.display = 'block';
                startScannerBtn.disabled = true;
                stopScannerBtn.disabled = false;
                scannedResultDiv.style.display = 'none';
                newScannerContainer.classList.remove('scan-success', 'scan-failure');
                laser.classList.remove('scan-success', 'scan-failure');

                // Set a timeout for simulated scan failure after 5 seconds
                scanFailureTimeout = setTimeout(() => {
                    newScannerContainer.classList.add('scan-failure');
                    laser.classList.add('scan-failure');
                    scannerStatus.textContent = "No QR code detected. Please try again.";
                }, 5000);

            })
            .catch(err => {
                console.error("Failed to start QR scanner", err);
                scannerStatus.textContent = "Failed to start camera. Please grant permission.";
            });
    };
    const stopScanner = () => {
        clearTimeout(scanFailureTimeout);
        html5QrCode.stop()
            .then(() => {
                startScannerBtn.disabled = false;
                stopScannerBtn.disabled = true;
                laser.style.display = 'none';
                scannerStatus.textContent = "Scanner is off. Click 'Start Scanner' to begin.";
            })
            .catch(err => {
                console.log("Scanner already stopped or failed to stop.", err);
                startScannerBtn.disabled = false;
                stopScannerBtn.disabled = true;
                laser.style.display = 'none';
            });
    };
    startScannerBtn.addEventListener('click', startScanner);
    stopScannerBtn.addEventListener('click', stopScanner);

    // --- INTERSECTION OBSERVER FOR ANIMATIONS ---
    const animatedElements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    }, {
        threshold: 0.1
    });

    animatedElements.forEach(element => {
        observer.observe(element);
    });

    // --- NEW CERTIFICATE VIEWER MODAL LOGIC ---
    const certViewerModal = document.getElementById('certViewerModal');
    const closeCertViewerBtn = document.getElementById('closeCertViewer');
    
    // Function to open the modal and populate data
    window.openCertViewer = function(certNum, gradName, institution, gradYear) {
        document.getElementById('viewerCertNum').textContent = certNum;
        document.getElementById('viewerGradName').textContent = gradName;
        document.getElementById('viewerInstitution').textContent = institution;
        document.getElementById('viewerGradYear').textContent = gradYear;
        document.getElementById('previewFileName').textContent = `${gradName} Certificate.pdf`; // Mock filename

        certViewerModal.style.display = 'flex';
    };

    // Function to close the modal
    closeCertViewerBtn.addEventListener('click', () => {
        certViewerModal.style.display = 'none';
    });

    // Close modal if user clicks outside of it
    window.addEventListener('click', (e) => {
        if (e.target === certViewerModal) {
            certViewerModal.style.display = 'none';
        }
    });

    // Stop propagation for delete button to prevent modal from opening
    document.querySelectorAll('.certificates-table .btn-danger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
});