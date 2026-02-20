import { useEffect, useRef } from 'react';

export default function Dashboard() {
    const statsRef = useRef([]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) entry.target.classList.add('is-visible');
                    else entry.target.classList.remove('is-visible');
                });
            },
            { threshold: 0.1 }
        );
        statsRef.current.forEach((el) => { if (el) observer.observe(el); });
        return () => observer.disconnect();
    }, []);

    const stats = [
        { number: '12,458', label: 'Total Certificates' },
        { number: '327', label: 'Verifications Today' },
        { number: '18', label: 'Fraud Attempts' },
        { number: '99.7%', label: 'Accuracy Rate' },
    ];

    return (
        <section className="dashboard-section" id="dashboard" style={{ display: 'block' }}>
            <div className="container">
                <h2 className="section-title">Institution Dashboard</h2>
                <div className="stats-grid">
                    {stats.map((s, i) => (
                        <div key={i} className="stat-card fade-in" ref={(el) => (statsRef.current[i] = el)}>
                            <div className="stat-number">{s.number}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
                <div className="chart-container">
                    <h3 style={{ marginBottom: '20px', color: 'var(--primary-blue)' }}>Monthly Verification Trends</h3>
                    <div style={{ height: '300px', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
                        <p style={{ color: '#6b7280' }}>Verification chart visualization would appear here</p>
                    </div>
                </div>
                <div className="chart-container">
                    <h3 style={{ marginBottom: '20px', color: 'var(--primary-blue)' }}>Recent Verification Activities</h3>
                    <div style={{ height: '200px', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px' }}>
                        <p style={{ color: '#6b7280' }}>Recent activities table would appear here</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
