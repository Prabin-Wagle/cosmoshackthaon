import { BookOpen, Github, Twitter, Linkedin } from 'lucide-react';

const Footer: React.FC = () => {
    return (
        <footer className="footer mt-auto">
            <div className="container">
                <div className="grid md:grid-cols-4 gap-8">
                    <div className="footer-brand">
                        <div className="logo flex items-center gap-2 mb-4">
                            <BookOpen className="text-indigo-400" size={24} />
                            <span className="font-bold text-lg text-white">Passmate</span>
                        </div>
                        <p className="text-slate-400 text-sm">
                            Empowering engineering students with the best resources, notes, and community sharing tools.
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Quick Links</h4>
                        <ul className="footer-links">
                            <li><a href="/">Home</a></li>
                            <li><a href="/resources">Resources</a></li>
                            <li><a href="/store">Store</a></li>
                            <li><a href="/dashboard">Dashboard</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Resources</h4>
                        <ul className="footer-links">
                            <li><a href="#">NCIT Library</a></li>
                            <li><a href="#">Syllabus</a></li>
                            <li><a href="#">Question Bank</a></li>
                            <li><a href="#">Community</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-semibold mb-4">Connect</h4>
                        <div className="flex gap-4">
                            <a href="#" className="social-link"><Twitter size={20} /></a>
                            <a href="#" className="social-link"><Linkedin size={20} /></a>
                            <a href="https://github.com/Prabin-Wagle/cosmoshackthaon" className="social-link"><Github size={20} /></a>
                        </div>
                    </div>
                </div>
                <div className="footer-bottom mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Passmate. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
