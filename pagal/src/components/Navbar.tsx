import { Link } from 'react-router-dom';
import { ShieldCheck, Github } from 'lucide-react';
import logo from '../assets/a37f717c-0d8d-4b8f-80ba-b41819b480d7.jpg';

const Navbar: React.FC = () => {
    return (
        <nav className="navbar">
            <div className="container flex justify-between items-center">
                <Link to="/" className="logo flex items-center gap-3">
                    <img src={logo} alt="Passmate Logo" className="h-10 w-auto rounded-lg shadow-sm" />
                    <span className="font-bold text-xl tracking-tighter text-slate-900">Passmate</span>
                </Link>
                <div className="nav-links flex gap-6 items-center">
                    <Link to="/resources" className="nav-link">Resources</Link>
                    <Link to="/store" className="nav-link">Store</Link>
                    <Link to="/dashboard" className="nav-link btn-secondary">Dashboard</Link>
                    <Link to="/admin" className="nav-link flex items-center gap-1">
                        <ShieldCheck size={18} /> Admin
                    </Link>
                    <a href="https://github.com/Prabin-Wagle/cosmoshackthaon" target="_blank" rel="noopener noreferrer" className="nav-link">
                        <Github size={20} />
                    </a>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
