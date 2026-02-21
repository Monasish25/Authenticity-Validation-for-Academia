/**
 * OCR Deep Analysis Service
 * Performs comprehensive certificate analysis:
 * - Enhanced text extraction (cert ID, name, institution, year)
 * - Signature detection via canvas pixel analysis
 * - Theme/color detection via dominant color sampling
 * - Font style estimation from OCR word data
 * - Confidence scoring
 * - Firestore logging of every scan
 */

import Tesseract from 'tesseract.js';

// ===== 1. Enhanced Text Extraction =====

const CERT_PATTERNS = [
    /(?:certificate\s*(?:no|number|#|id|serial|s\/n)[.:;\s]*)[\s]*([A-Z0-9\-\/]{4,20})/i,
    /(?:reg(?:istration)?\s*(?:no|number|#|id)[.:;\s]*)[\s]*([A-Z0-9\-\/]{4,20})/i,
    /(?:roll\s*(?:no|number|#)[.:;\s]*)[\s]*([A-Z0-9\-\/]{4,20})/i,
    /(?:serial\s*(?:no|number|#)[.:;\s]*)[\s]*([A-Z0-9\-\/]{4,20})/i,
    /(?:ref(?:erence)?\s*(?:no|number|#)[.:;\s]*)[\s]*([A-Z0-9\-\/]{4,20})/i,
    /\b([A-Z]{2,5}[\-\/][0-9]{4,10})\b/,
    /\b(UPLD-[0-9]{6,10})\b/i,
    /\b([A-Z]{3,6}-\d{4}-\d{3,10})\b/,
    /(?:S\/N|UID|ID|CERT)[.:;\s]*\s*([A-Z0-9\-]{6,20})/i,
];

const NAME_PATTERNS = [
    /(?:name\s*(?:of\s*(?:the\s*)?(?:candidate|student|graduate|holder))?)[.:;\s]+([A-Z][A-Z\s.']{2,50})/i,
    /(?:this\s*is\s*to\s*certify\s*that)\s+(?:Mr\.|Mrs\.|Ms\.|Dr\.)?\s*([A-Z][A-Z\s.']{2,50}?)\s+(?:has|son|daughter|s\/o|d\/o|of|completed|successfully|is\s*awarded)/i,
    /(?:awarded\s*to)\s+([A-Z][A-Z\s.']{2,50})/i,
    /(?:conferred\s*(?:upon|on))\s+([A-Z][A-Z\s.']{2,50})/i,
    /(?:presented\s*to)\s+([A-Z][A-Z\s.']{2,50})/i,
    /(?:certify\s*that\s*(?:Mr\.|Mrs\.|Ms\.|Dr\.)?)\s*([A-Z][A-Z\s.']{2,50})/i,
    /(?:graduated?|alumnus)\s+([A-Z][A-Z\s.']{2,50})/i,
];

const INSTITUTION_PATTERNS = [
    /(?:university|institute|college|school|academy|polytechnic|board|vidyalaya)[\s:of]+([A-Z][A-Z0-9\s.,]{3,80})/i,
    /(university\s+of\s+[A-Z][A-Z\s]{3,60})/i,
    /([A-Z][A-Z\s]{3,60}\s+university)/i,
    /([A-Z][A-Z\s]{3,60}\s+institute\s+of\s+[A-Z\s]{3,40})/i,
    /(Indian\s+Institute\s+of\s+[A-Z][A-Z\s]{3,40})/i,
    /(National\s+(?:Law\s+)?University[A-Z][A-Z\s,]{0,40})/i,
    /(?:issued?\s*by|awarded\s*by)\s+([A-Z][A-Z\s.,]{3,80})/i,
    /^([A-Z][A-Z\s.,]{3,80})\s+(?:University|Institute|College|Academy)/i,
];

const YEAR_PATTERN = /\b(19[89][0-9]|20[0-2][0-9]|2030)\b/g;

const DEGREE_PATTERNS = [
    /(?:degree\s*(?:of|in)?)\s*([A-Z][A-Za-z\s.]+(?:Engineering|Science|Arts|Commerce|Technology|Law|Medicine|Management|Philosophy|Business|Design))/i,
    /\b(Bachelor\s+of\s+[A-Z][A-Za-z\s.]{3,50})\b/i,
    /\b(Master\s+of\s+[A-Z][A-Za-z\s.]{3,50})\b/i,
    /\b(Doctor\s+of\s+[A-Z][A-Za-z\s.]{3,50})\b/i,
    /\b(B\.?(?:Tech|Sc|A|Com|E|Ed|Arch|Pharm|BA|B\.Sc|B\.Com)\.?(?:\s*\([^)]+\))?)\b/i,
    /\b(M\.?(?:Tech|Sc|A|Com|E|Ed|BA|Phil|MBA|M\.Sc|M\.A)\.?(?:\s*\([^)]+\))?)\b/i,
    /\b(Ph\.?D\.?)\b/i,
    /\b(Diploma\s+in\s+[A-Z][A-Za-z\s.]{3,50})\b/i,
    /(?:qualification\s*of)\s+([A-Z][A-Za-z\s.]{3,60})/i,
    /\b(?:BDS|MBBS|BAMS|BHMS|B\.?P\.?T|LLB|LLM)\b/i,
];

function extractTextField(text, patterns) {
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1].trim().replace(/\s+/g, ' ');
        }
    }
    return '';
}

function extractYear(text) {
    const matches = [...text.matchAll(YEAR_PATTERN)];
    if (matches.length === 0) return '';
    // Prefer a year that appears near keywords like "year", "batch", "passing", "graduation"
    const contextPatterns = /(?:year|batch|passing|graduation|graduated|passed|date)\s*(?:of|:)?\s*(199[0-9]|20[0-2][0-9]|2030)/i;
    const contextMatch = text.match(contextPatterns);
    if (contextMatch) return contextMatch[1];
    // Otherwise return the latest year found
    const years = matches.map(m => parseInt(m[1]));
    return String(Math.max(...years));
}

export function extractFieldsFromText(text) {
    return {
        certNumber: extractTextField(text, CERT_PATTERNS),
        name: extractTextField(text, NAME_PATTERNS),
        institution: extractTextField(text, INSTITUTION_PATTERNS),
        year: extractYear(text),
        degree: extractTextField(text, DEGREE_PATTERNS),
    };
}

// ===== 2. Signature Detection =====

/**
 * Analyzes the lower portion of a certificate image for handwritten
 * signature-like marks by looking for dark, irregular pixel clusters.
 * Returns { detected: boolean, confidence: number, region: string }
 */
export function detectSignature(imageElement) {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = imageElement.naturalWidth || imageElement.width;
            canvas.height = imageElement.naturalHeight || imageElement.height;
            ctx.drawImage(imageElement, 0, 0);

            // Analyze the bottom 25% of the image (where signatures usually are)
            const startY = Math.floor(canvas.height * 0.75);
            const regionHeight = canvas.height - startY;
            const imageData = ctx.getImageData(0, startY, canvas.width, regionHeight);
            const pixels = imageData.data;

            let darkPixels = 0;
            let totalPixels = 0;
            let darkClusters = 0;
            let prevWasDark = false;

            for (let y = 0; y < regionHeight; y++) {
                for (let x = 0; x < canvas.width; x++) {
                    const idx = (y * canvas.width + x) * 4;
                    const r = pixels[idx];
                    const g = pixels[idx + 1];
                    const b = pixels[idx + 2];
                    const brightness = (r + g + b) / 3;
                    totalPixels++;

                    // Dark pixel threshold (ink-like marks)
                    if (brightness < 80) {
                        darkPixels++;
                        if (!prevWasDark) {
                            darkClusters++;
                            prevWasDark = true;
                        }
                    } else {
                        prevWasDark = false;
                    }
                }
            }

            const darkRatio = totalPixels > 0 ? darkPixels / totalPixels : 0;
            // Signatures typically have 2-15% dark pixels with many small clusters
            const hasSignatureDensity = darkRatio > 0.02 && darkRatio < 0.20;
            const hasEnoughClusters = darkClusters > 10;
            const detected = hasSignatureDensity && hasEnoughClusters;
            const confidence = detected
                ? Math.min(95, Math.round(50 + (darkClusters / 5) + (darkRatio * 200)))
                : Math.round(darkRatio * 100);

            resolve({
                detected,
                confidence,
                region: 'Bottom 25% of certificate',
                darkPixelRatio: (darkRatio * 100).toFixed(2) + '%',
                clusterCount: darkClusters,
            });
        } catch (error) {
            console.error('Signature detection error:', error);
            resolve({ detected: false, confidence: 0, region: 'Analysis failed', darkPixelRatio: '0%', clusterCount: 0 });
        }
    });
}

// ===== 3. Theme/Color Detection =====

/**
 * Samples pixels across the image to determine the dominant color palette,
 * classifying the certificate theme (e.g., "Blue & Gold", "Green & White").
 */
export function detectTheme(imageElement) {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            // Scale down for faster sampling
            const scale = 0.25;
            canvas.width = Math.floor((imageElement.naturalWidth || imageElement.width) * scale);
            canvas.height = Math.floor((imageElement.naturalHeight || imageElement.height) * scale);
            ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;

            // Color bucket counting
            const buckets = {};
            for (let i = 0; i < pixels.length; i += 4) {
                const r = Math.round(pixels[i] / 32) * 32;
                const g = Math.round(pixels[i + 1] / 32) * 32;
                const b = Math.round(pixels[i + 2] / 32) * 32;
                const key = `${r},${g},${b}`;
                buckets[key] = (buckets[key] || 0) + 1;
            }

            // Sort by frequency
            const sorted = Object.entries(buckets)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const dominantColors = sorted.map(([color, count]) => {
                const [r, g, b] = color.split(',').map(Number);
                return {
                    rgb: `rgb(${r}, ${g}, ${b})`,
                    hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
                    percentage: ((count / (pixels.length / 4)) * 100).toFixed(1),
                };
            });

            // Classify the theme based on dominant colors
            const primary = sorted[0] ? sorted[0][0].split(',').map(Number) : [255, 255, 255];
            const themeName = classifyTheme(primary, sorted);

            resolve({
                themeName,
                dominantColors,
                primaryColor: dominantColors[0]?.hex || '#FFFFFF',
            });
        } catch (error) {
            console.error('Theme detection error:', error);
            resolve({ themeName: 'Unknown', dominantColors: [], primaryColor: '#FFFFFF' });
        }
    });
}

function classifyTheme(primary, sortedBuckets) {
    const [r, g, b] = primary;
    const brightness = (r + g + b) / 3;

    // Check secondary colors for more refined classification
    const colorNames = sortedBuckets.slice(0, 3).map(([c]) => {
        const [cr, cg, cb] = c.split(',').map(Number);
        return getColorName(cr, cg, cb);
    });

    const unique = [...new Set(colorNames)].filter(n => n !== 'White' && n !== 'Black');

    if (unique.length >= 2) return `${unique[0]} & ${unique[1]}`;
    if (unique.length === 1) {
        if (brightness > 200) return `${unique[0]} on White`;
        return unique[0] + ' Theme';
    }
    if (brightness > 200) return 'White / Minimal';
    if (brightness < 60) return 'Dark Theme';
    return 'Neutral';
}

function getColorName(r, g, b) {
    if (r > 200 && g > 200 && b > 200) return 'White';
    if (r < 50 && g < 50 && b < 50) return 'Black';
    if (r > 180 && g > 150 && b < 80) return 'Gold';
    if (r > 150 && g < 80 && b < 80) return 'Red';
    if (r < 80 && g > 100 && b > 150) return 'Blue';
    if (r < 80 && g > 150 && b < 80) return 'Green';
    if (r > 150 && g > 100 && b > 150) return 'Purple';
    if (r > 200 && g > 150 && b > 100) return 'Cream';
    if (r > 150 && g > 120 && b < 100) return 'Brown';
    if (r > 150 && g > 150 && b > 100) return 'Beige';
    if (r < 100 && g > 100 && b > 100) return 'Teal';
    return 'Gray';
}

// ===== 4. Font Style Detection =====

/**
 * Estimates the font family used in the certificate from OCR data.
 * Uses word confidence distribution and character shape analysis.
 */
export function detectFontStyle(ocrData) {
    if (!ocrData || !ocrData.words || ocrData.words.length === 0) {
        return { fontType: 'Unknown', confidence: 0, details: 'No OCR word data available.' };
    }

    const words = ocrData.words;
    const avgConfidence = words.reduce((sum, w) => sum + w.confidence, 0) / words.length;

    // Analyze character patterns for serif indicators
    const text = ocrData.text || '';
    const hasSerifs = /[IlT]/.test(text); // Characters where serifs are visible
    const hasScriptChars = /[fgyj]/.test(text); // Characters with descenders
    const hasDecorative = /[&@§©®™]/.test(text);

    // Estimate heights from word bounding boxes
    let heightVariation = 0;
    if (words.length > 5) {
        const heights = words.map(w => w.bbox ? (w.bbox.y1 - w.bbox.y0) : 0).filter(h => h > 0);
        if (heights.length > 2) {
            const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;
            heightVariation = heights.reduce((sum, h) => sum + Math.abs(h - avgHeight), 0) / heights.length;
        }
    }

    // Rules-based classification
    let fontType = 'Sans-Serif';
    let details = '';

    if (heightVariation > 8) {
        fontType = 'Script / Decorative';
        details = 'High variation in character heights suggests handwritten or decorative font.';
    } else if (hasDecorative || (hasSerifs && avgConfidence > 70)) {
        fontType = 'Serif (Formal)';
        details = 'Clean letterforms with consistent sizing suggest a formal serif typeface (e.g., Times New Roman, Garamond).';
    } else if (avgConfidence > 80) {
        fontType = 'Sans-Serif (Modern)';
        details = 'High OCR confidence and clean edges suggest a modern sans-serif typeface (e.g., Arial, Helvetica).';
    } else if (avgConfidence > 60) {
        fontType = 'Serif (Traditional)';
        details = 'Moderate OCR confidence with varied letterforms suggest a traditional serif typeface.';
    } else {
        fontType = 'Mixed / Stylized';
        details = 'Low OCR confidence may indicate decorative, calligraphic, or mixed font styles.';
    }

    return {
        fontType,
        confidence: Math.round(avgConfidence),
        details,
        wordCount: words.length,
        heightVariation: heightVariation.toFixed(1),
    };
}

// ===== 5. Full Analysis Pipeline =====

/**
 * Main entry point: runs OCR + all visual analyses on an uploaded image or PDF.
 * @param {File} file — the uploaded certificate image or PDF
 * @param {Function} onProgress — callback for OCR progress (0–100)
 * @returns {Promise<Object>} complete analysis result
 */
export async function analyzeFullCertificate(file, onProgress) {
    let imageUrl;
    let isPdf = file.type === 'application/pdf';

    if (isPdf) {
        imageUrl = await renderPdfToImage(file);
    } else {
        imageUrl = URL.createObjectURL(file);
    }

    try {
        // Run Tesseract OCR
        const { data } = await Tesseract.recognize(imageUrl, 'eng', {
            logger: (m) => {
                if (m.status === 'recognizing text' && onProgress) {
                    onProgress(Math.round(m.progress * 100));
                }
            },
        });

        // Extract text fields
        const extractedFields = extractFieldsFromText(data.text);

        // Load image for visual analysis
        const img = await loadImage(imageUrl);

        // Run visual analyses in parallel
        const [signatureResult, themeResult] = await Promise.all([
            detectSignature(img),
            detectTheme(img),
        ]);

        // Font detection from OCR data
        const fontResult = detectFontStyle(data);

        // Calculate overall confidence score
        const fieldsFound = Object.values(extractedFields).filter(Boolean).length;
        const fieldScore = (fieldsFound / 5) * 40; // Max 40 points for fields
        const signatureScore = signatureResult.detected ? 20 : 5;
        const fontScore = fontResult.confidence > 60 ? 20 : 10;
        const themeScore = themeResult.dominantColors.length > 0 ? 20 : 5;
        const overallConfidence = Math.min(100, Math.round(fieldScore + signatureScore + fontScore + themeScore));

        return {
            rawText: data.text,
            extractedFields,
            signature: signatureResult,
            theme: themeResult,
            font: fontResult,
            overallConfidence,
            fieldsFound,
            timestamp: new Date().toISOString(),
            fileName: file.name,
            fileSize: file.size,
            isPdf,
            previewUrl: imageUrl // Keep the rendered image for preview if needed
        };
    } finally {
        // Only revoke if we created a temporary URL, but PDF renderer returns a dataURL usually or blob
        if (!isPdf && imageUrl) {
            URL.revokeObjectURL(imageUrl);
        }
    }
}

/**
 * Renders the first page of a PDF file to a high-quality data URL image.
 */
async function renderPdfToImage(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        // Fallback global check
        const pdfLibModule = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
        if (!pdfLibModule) {
            throw new Error('PDF.js library not found. Ensure it is loaded in index.html.');
        }

        const pdf = await pdfLibModule.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 }); // High scale for better OCR

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error('PDF rendering error:', error);
        throw error;
    }
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
