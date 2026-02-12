import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Plus,
    Edit2,
    Trash2,
    ExternalLink,
    MapPin,
    Star,
    Check,
    X,
    Loader2,
    Eye,
    Globe,
    Phone,
    Mail,
    GraduationCap,
    Users as UsersIcon,
    Clock,
    ListChecks
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';

const API_URL = 'https://notelibraryapp.com/api/admin/partners.php';

interface Partner {
    id: number;
    name: string;
    short_name: string;
    logo_url: string;
    featured_image_url: string;
    description: string;
    location: string;
    phone: string;
    email: string;
    website: string;
    programs: string;
    students: string;
    established: string;
    is_featured: string;
    status: string;
}

const PartnersManager: React.FC = () => {
    const { token } = useAuth();
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [showPreview, setShowPreview] = useState(true);

    const [formData, setFormData] = useState({
        name: '',
        short_name: '',
        logo_url: '/aaa.jpeg', // Default matching landing page
        featured_image_url: '/aaa.jpeg',
        description: '',
        location: '',
        phone: '',
        email: '',
        website: '',
        programs: '',
        students: '',
        established: '',
        is_featured: 0,
        status: 'active'
    });

    useEffect(() => {
        if (token) {
            fetchPartners();
        }
    }, [token]);

    const fetchPartners = async () => {
        try {
            setLoading(true);
            const response = await axios.get(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.data.success) {
                setPartners(response.data.data);
            }
        } catch (error) {
            toast.error('Failed to fetch partners');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? ((e.target as HTMLInputElement).checked ? 1 : 0) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const config = {
                headers: { 'Authorization': `Bearer ${token}` }
            };

            const payload = {
                ...formData,
                is_featured: formData.is_featured ? 1 : 0
            };

            if (editingPartner) {
                await axios.put(API_URL, { ...payload, id: editingPartner.id }, config);
                toast.success('Partner updated successfully');
            } else {
                await axios.post(API_URL, payload, config);
                toast.success('Partner created successfully');
            }
            setIsModalOpen(false);
            fetchPartners();
            resetForm();
        } catch (error) {
            toast.error('Failed to save partner');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this partner?')) return;
        try {
            await axios.delete(`${API_URL}?id=${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            toast.success('Partner deleted successfully');
            fetchPartners();
        } catch (error) {
            toast.error('Failed to delete partner');
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            short_name: '',
            logo_url: '/aaa.jpeg',
            featured_image_url: '/aaa.jpeg',
            description: '',
            location: '',
            phone: '',
            email: '',
            website: '',
            programs: '',
            students: '',
            established: '',
            is_featured: 0,
            status: 'active'
        });
        setEditingPartner(null);
    };

    const openEditModal = (partner: Partner) => {
        setEditingPartner(partner);
        setFormData({
            name: partner.name,
            short_name: partner.short_name,
            logo_url: partner.logo_url,
            featured_image_url: partner.featured_image_url,
            description: partner.description,
            location: partner.location,
            phone: partner.phone,
            email: partner.email,
            website: partner.website,
            programs: partner.programs,
            students: partner.students,
            established: partner.established,
            is_featured: parseInt(partner.is_featured),
            status: partner.status
        });
        setIsModalOpen(true);
    };

    const featuredPartner = partners.find(p => parseInt(p.is_featured) === 1);
    const otherPartners = partners.filter(p => parseInt(p.is_featured) !== 1);

    return (
        <DashboardLayout>
            <div className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Educational Partners</h1>
                        <p className="text-slate-500 font-medium">Manage institutional collaborations and featured landing page content</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all border ${showPreview ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-200'
                                }`}
                        >
                            <Eye className="w-4 h-4" /> {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                        <button
                            onClick={() => { resetForm(); setIsModalOpen(true); }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 font-bold"
                        >
                            <Plus className="w-4 h-4" /> Add Partner
                        </button>
                    </div>
                </div>

                {showPreview && (
                    <div className="mb-12 bg-slate-50 rounded-[2.5rem] p-6 md:p-12 border border-slate-200/60 shadow-inner relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full tracking-widest uppercase shadow-sm">Real-time Preview</span>
                        </div>

                        <div className="max-w-6xl mx-auto">
                            <div className="text-center mb-16">
                                <span className="inline-block px-4 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold mb-4">
                                    Our Partners
                                </span>
                                <h2 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
                                    Educational <span className="text-amber-500">Partners</span>
                                </h2>
                                <p className="text-slate-500 max-w-2xl mx-auto font-medium">
                                    Explore our trusted educational partners and institutions. Preview of the live landing page section.
                                </p>
                            </div>

                            {/* Featured Partner Preview */}
                            {featuredPartner ? (
                                <div className="mb-12 group">
                                    <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-3xl p-1 shadow-2xl transition-transform duration-500 group-hover:scale-[1.01]">
                                        <div className="bg-white rounded-[1.4rem] p-6 md:p-8 relative">
                                            <div className="absolute -top-3 left-6 px-4 py-1 bg-amber-500 text-white text-xs font-black rounded-full z-10 shadow-lg">
                                                ⭐ Featured Partner
                                            </div>
                                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                                <div className="w-full md:w-2/5 aspect-video bg-slate-100 rounded-2xl overflow-hidden shadow-inner border border-slate-100">
                                                    <img
                                                        src={featuredPartner.featured_image_url || '/aaa.jpeg'}
                                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                        alt="Featured"
                                                    />
                                                </div>
                                                <div className="flex-1 text-center md:text-left">
                                                    <h3 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">
                                                        {featuredPartner.name}
                                                    </h3>
                                                    <p className="text-slate-600 mb-6 leading-relaxed font-medium">
                                                        {featuredPartner.description}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mb-6 justify-center md:justify-start">
                                                        {featuredPartner.programs.split(',').slice(0, 4).map((prog, i) => (
                                                            <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100">
                                                                {prog.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-6 justify-center md:justify-start text-xs font-bold text-slate-500">
                                                        <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-500" /> {featuredPartner.location}</span>
                                                        <span className="flex items-center gap-2"><UsersIcon className="w-4 h-4 text-blue-500" /> {featuredPartner.students} Students</span>
                                                    </div>
                                                    <button className="mt-8 bg-blue-600 text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto md:mx-0">
                                                        Learn More <ExternalLink className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-12 border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center text-slate-400 font-bold bg-white/50">
                                    No featured partner set
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {otherPartners.map(partner => (
                                    <div key={partner.id} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 group">
                                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/20 group-hover:scale-110 transition-transform">
                                            <span className="text-white text-2xl font-black">{partner.short_name?.charAt(0) || partner.name.charAt(0)}</span>
                                        </div>
                                        <h4 className="font-extrabold text-slate-900 mb-2 truncate text-lg tracking-tight">{partner.name}</h4>
                                        <p className="text-slate-500 text-sm line-clamp-2 mb-6 leading-relaxed font-medium">{partner.description}</p>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                            <MapPin className="w-4 h-4 text-blue-400" /> {partner.location}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <ListChecks className="w-5 h-5 text-blue-600" /> All Partners
                        </h2>
                        <div className="space-y-4">
                            {loading && <div className="p-8 text-center text-slate-500">Loading partners...</div>}
                            {!loading && partners.length === 0 && <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">No partners found</div>}
                            {partners.map(partner => (
                                <div key={partner.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 flex items-center justify-center font-bold text-slate-400">
                                            {partner.logo_url ? <img src={partner.logo_url} className="w-full h-full object-contain" /> : partner.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                                {partner.name}
                                                {parseInt(partner.is_featured) === 1 && <Star className="w-3 h-3 fill-amber-500 text-amber-500" />}
                                            </h3>
                                            <p className="text-xs text-slate-500 font-medium">{partner.location} • {partner.status}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditModal(partner)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(partner.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <h2 className="text-xl font-black text-slate-900">{editingPartner ? 'Edit Partner' : 'Create New Partner'}</h2>
                            {editingPartner && (
                                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
                            )}
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Partner Name</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900" required />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Short Name</label>
                                    <input type="text" name="short_name" value={formData.short_name} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Description</label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 h-24 font-bold text-slate-900" required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Location</label>
                                    <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Website</label>
                                    <input type="url" name="website" value={formData.website} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Featured Image URL</label>
                                <input type="text" name="featured_image_url" value={formData.featured_image_url} onChange={handleInputChange} className="w-full px-4 py-3 bg-slate-50 border-0 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold text-slate-900" placeholder="/aaa.jpeg" />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.is_featured ? 'bg-amber-100' : 'bg-slate-200'}`}>
                                        <Star className={`w-5 h-5 ${formData.is_featured ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900">Featured Partner</p>
                                        <p className="text-[10px] font-bold text-slate-500 tracking-tight">Showcase in the highlighted top spot</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" name="is_featured" checked={formData.is_featured === 1} onChange={(e) => setFormData(p => ({ ...p, is_featured: e.target.checked ? 1 : 0 }))} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/30 text-lg uppercase tracking-widest active:scale-[0.98]">
                                {editingPartner ? 'Update Partner' : 'Create Partner'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default PartnersManager;
