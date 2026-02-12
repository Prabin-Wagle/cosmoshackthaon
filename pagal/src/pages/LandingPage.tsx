import { ArrowRight, BookMarked, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SmoothScroll from '../components/SmoothScroll';
import logo from '../assets/a37f717c-0d8d-4b8f-80ba-b41819b480d7.jpg';

const LandingPage: React.FC = () => {
    return (
        <SmoothScroll>
            <div className="landing-page">
                <Navbar />

                {/* Hero Section */}
                <header className="hero section-padding">
                    <div className="container">
                        <div className="text-center max-w-4xl mx-auto mb-16">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                <span className="label mb-6">NCIT Engineering Portal</span>
                                <h1 className="text-6xl font-black mb-8">
                                    Your Engineering <br />
                                    <span className="text-indigo-600">Perfected.</span>
                                </h1>
                                <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto font-medium">
                                    Curated notes, subject syllabus, and community sharing in one minimal, high-performance workspace.
                                </p>
                                <div className="flex gap-4 justify-center items-center">
                                    <Link to="/dashboard" className="btn btn-dark">
                                        Go to Dashboard <ArrowRight size={18} />
                                    </Link>
                                    <Link to="/resources" className="btn btn-ghost">
                                        Browse Resources
                                    </Link>
                                </div>
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1 }}
                            className="hero-media relative"
                        >
                            <div className="glow-effect"></div>
                            <img
                                src={logo}
                                alt="Passmate Preview"
                                className="hero-img max-w-4xl mx-auto"
                            />
                        </motion.div>
                    </div>
                </header>

                {/* Features Section */}
                <section className="features section-padding">
                    <div className="container">
                        <div className="grid md:grid-cols-3 gap-12">
                            <FeatureCard
                                icon={<BookMarked size={28} />}
                                title="Smart Resources"
                                description="Access everything from previous year papers to high-quality curated notes."
                            />
                            <FeatureCard
                                icon={<Users size={28} />}
                                title="Community Hub"
                                description="Connect with your peers and share insights across different engineering departments."
                            />
                            <FeatureCard
                                icon={<Zap size={28} />}
                                title="Modern Focus"
                                description="A distraction-free environment designed specifically for engineering study flow."
                            />
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="cta section-padding">
                    <div className="container">
                        <div className="cta-box text-center text-white">
                            <div className="cta-glow"></div>
                            <div className="relative z-10">
                                <h2 className="text-4xl font-bold mb-6">Ready to excel?</h2>
                                <p className="text-slate-400 mb-10 text-lg max-w-xl mx-auto">
                                    Join hundreds of students already simplifying their academic journey with Passmate.
                                </p>
                                <Link to="/dashboard" className="btn btn-white">
                                    Get Started Now
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </SmoothScroll>
    );
};

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
    <motion.div
        whileHover={{ y: -8 }}
        className="feature-item"
    >
        <div className="icon-box">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-slate-500 leading-relaxed">{description}</p>
    </motion.div>
);

export default LandingPage;
