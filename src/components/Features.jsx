import { useEffect, useRef } from 'react';

export default function Features() {
    const cardsRef = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    } else {
                        entry.target.classList.remove('is-visible');
                    }
                });
            },
            { threshold: 0.1 }
        );

        cardsRef.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const features = [
        { icon: 'fas fa-upload', title: 'Upload Certificate', desc: 'Upload a digital copy of the academic certificate in PDF or image format for analysis.' },
        { icon: 'fas fa-search', title: 'AI-Powered Analysis', desc: 'Our system uses OCR and AI algorithms to extract and verify document details.' },
        { icon: 'fas fa-shield-alt', title: 'Blockchain Verification', desc: 'Check digital signatures and blockchain records for certificate authenticity.' },
        { icon: 'fas fa-check-circle', title: 'Instant Results', desc: 'Receive immediate verification results with detailed authenticity report.' },
    ];

    return (
        <section className="features" id="features">
            <div className="container">
                <h2 className="section-title">How VerifyEd Works</h2>
                <div className="features-grid">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="feature-card fade-in"
                            ref={(el) => (cardsRef.current[i] = el)}
                        >
                            <div className="feature-icon">
                                <i className={f.icon}></i>
                            </div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
