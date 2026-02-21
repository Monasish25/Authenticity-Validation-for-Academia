import { useState, useEffect, useRef } from 'react';
import { getDashboardStats, getRecentActivities, getMonthlyTrends } from '../services/certificateService';

export default function Dashboard() {
    const statsRef = useRef([]);
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
    const [stats, setStats] = useState([
        { number: '...', label: 'Total Certificates' },
        { number: '...', label: 'Verifications Today' },
        { number: '...', label: 'Fraud Attempts' },
        { number: '...', label: 'Accuracy Rate' },
    ]);
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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

        loadDashboardData();

        return () => {
            observer.disconnect();
            if (chartInstance.current) chartInstance.current.destroy();
        };
    }, []);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            const [statsData, recentActivities, trendsData] = await Promise.all([
                getDashboardStats(),
                getRecentActivities(),
                getMonthlyTrends()
            ]);

            setStats([
                { number: statsData.totalCertificates, label: 'Total Certificates' },
                { number: statsData.verificationsToday, label: 'Verifications Today' },
                { number: statsData.fraudAttempts, label: 'Fraud Attempts' },
                { number: statsData.accuracyRate, label: 'Accuracy Rate' },
            ]);

            setActivities(recentActivities);
            initChart(trendsData);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const initChart = (trends) => {
        if (!chartRef.current) return;
        if (chartInstance.current) chartInstance.current.destroy();

        const ctx = chartRef.current.getContext('2d');
        if (window.Chart) {
            chartInstance.current = new window.Chart(ctx, {
                type: 'bar',
                data: {
                    labels: trends.labels,
                    datasets: [{
                        label: 'Verifications',
                        data: trends.data,
                        backgroundColor: 'rgba(26, 86, 219, 0.2)',
                        borderColor: 'rgb(26, 86, 219)',
                        borderWidth: 2,
                        borderRadius: 5,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0, 0, 0, 0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    };

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

                <div className="admin-grid" style={{ gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: '30px', marginTop: '40px' }}>
                    <div className="chart-container" style={{ margin: 0 }}>
                        <h3 style={{ marginBottom: '20px', color: 'var(--primary-blue)' }}>Monthly Verification Trends</h3>
                        <div style={{ height: '350px', backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <canvas ref={chartRef}></canvas>
                        </div>
                    </div>

                    <div className="chart-container" style={{ margin: 0 }}>
                        <h3 style={{ marginBottom: '20px', color: 'var(--primary-blue)' }}>Recent Verification Activities</h3>
                        <div style={{ padding: '0', backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                            {activities.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                                    <i className="fas fa-history" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.3 }}></i>
                                    {isLoading ? 'Loading activities...' : 'No recent activities found'}
                                </div>
                            ) : (
                                <div className="table-scroll-container" style={{ maxHeight: '350px' }}>
                                    <table className="certificates-table" style={{ margin: 0 }}>
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#f8fafc' }}>
                                            <tr>
                                                <th>File / ID</th>
                                                <th>Status</th>
                                                <th>Confidence</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activities.map((act) => {
                                                const isSuccess = act.crossReference?.matched;
                                                return (
                                                    <tr key={act.id}>
                                                        <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {act.fileName || act.extractedFields?.certNumber || 'Unknown'}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${isSuccess ? 'badge-success' : 'badge-warning'}`} style={{
                                                                padding: '4px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '0.75rem',
                                                                backgroundColor: isSuccess ? '#def7ec' : '#fef3c7',
                                                                color: isSuccess ? '#03543f' : '#92400e'
                                                            }}>
                                                                {isSuccess ? 'Verified' : 'Review Needed'}
                                                            </span>
                                                        </td>
                                                        <td>{Math.round((act.overallConfidence || 0) * 100)}%</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
