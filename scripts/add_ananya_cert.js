const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, addDoc, collection, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyClCqpj7jbSS58zyV9mMd4VvIENUMJrJnU",
    authDomain: "verify-ed.firebaseapp.com",
    projectId: "verify-ed",
    storageBucket: "verify-ed.firebasestorage.app",
    messagingSenderId: "157239847",
    appId: "1:157239847:web:74926be3ce20c4bc139c02",
    databaseURL: "https://verify-ed-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addData() {
    const certNumber = "JUT/2024/01578";
    const sanitizedId = certNumber.replace(/[\/\s]/g, '_');

    try {
        // 1. Add Certificate
        console.log("Adding certificate...");
        await setDoc(doc(db, "certificates", sanitizedId), {
            certNumber: certNumber,
            name: "Ananya Sharma",
            institution: "XYZ Institute of Engineering & Technology",
            year: "2023",
            degree: "Bachelor of Technology in Computer Science & Engineering",
            createdAt: serverTimestamp(),
            imageUrl: "https://firebasestorage.googleapis.com/v0/b/verify-ed.firebasestorage.app/o/certificates%2FJUT_2024_01578_placeholder.png?alt=media" // Placeholder URL
        });
        console.log("Certificate added!");

        // 2. Add OCR Scan Result
        console.log("Adding OCR scan log...");
        await addDoc(collection(db, "ocr_scans"), {
            extractedFields: {
                certNumber: certNumber,
                name: "Ananya Sharma",
                institution: "XYZ Institute of Engineering & Technology",
                year: "2023",
                degree: "Bachelor of Technology in Computer Science & Engineering"
            },
            signature: {
                detected: true,
                confidence: 0.98,
                region: "Bottom Left & Right"
            },
            theme: {
                name: "Classic Academic",
                primaryColor: "#F5F5DC"
            },
            font: {
                type: "Serif & Calligraphic",
                confidence: 0.95
            },
            overallConfidence: 0.97,
            fileName: "Ananya_Sharma_JUT_2024_01578.jpg",
            userId: "manual_upload",
            scannedAt: serverTimestamp(),
            crossReference: {
                matched: true,
                score: 100
            }
        });
        console.log("OCR scan log added!");
        process.exit(0);
    } catch (error) {
        console.error("Error adding data:", error);
        process.exit(1);
    }
}

addData();
