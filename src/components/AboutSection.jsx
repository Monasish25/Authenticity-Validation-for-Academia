import { useEffect, useRef } from 'react';

export default function AboutSection() {
    const membersRef = useRef([]);

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

        membersRef.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const teamMembers = [
        { img: 'https://www.siasat.com/wp-content/uploads/2020/07/hemant-soren.jpg', name: 'Hemant Soren', role: 'Honourable CM Jharkhand' },
        { img: 'https://c.ndtvimg.com/2023-04/vt86oo2g_jagarnath-mahto_625x300_06_April_23.jpg', name: 'Jagarnath Mahto', role: 'Honourable Education Minister Jharkhand' },
        { img: 'https://tse4.mm.bing.net/th/id/OIP.r_5x68KUuV7ohyoytRQPKQAAAA?rs=1&pid=ImgDetMain&o=7&rm=3', name: 'Shri Uma Shankar Singh', role: 'Education Secretary IAS' },
        { img: 'https://www.jharkhand.gov.in/Documents/D025/WhosWho/D025WhosWho19082025034648281.jpeg', name: 'Smt. Sita Puspa', role: 'Additional Secretary' },
    ];

    return (
        <section className="about-section" id="about">
            <div className="container">
                <h2 className="section-title">About VerifyEd</h2>
                <div className="about-content">
                    <div className="about-image">
                        <img
                            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS7XuQfqBDZ6avHbf46LKDCBCTVniZTlWmEuAsqFnfE7uxMkBl4Qo1Oaws&s=10"
                            alt="VerifyEd Team"
                        />
                    </div>
                    <div className="about-text">
                        <h2>Our Mission</h2>
                        <p>
                            VerifyEd was created to combat the growing problem of fake academic certificates and degrees. With increasing digitization, fraudulent documents have become more sophisticated, making it difficult for employers, institutions, and government bodies to verify authenticity.
                        </p>
                        <p>
                            Our platform leverages cutting-edge technology including AI, OCR, and blockchain to provide a robust verification system that can detect even the most sophisticated forgeries.
                        </p>
                        <p>
                            We work with educational institutions across Jharkhand to create a secure, tamper-proof database of academic credentials that can be verified instantly by authorized parties.
                        </p>
                    </div>
                </div>

                <div className="team-grid">
                    {teamMembers.map((member, i) => (
                        <div
                            key={i}
                            className="team-member fade-in"
                            ref={(el) => (membersRef.current[i] = el)}
                        >
                            <img src={member.img} alt="Team Member" />
                            <h3>{member.name}</h3>
                            <p>{member.role}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
