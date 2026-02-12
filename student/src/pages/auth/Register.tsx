import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, User, Phone, Camera, Eye, EyeOff } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import type { RegisterFormData } from '../../types/auth';
import { provinces, districts } from '../../data/districts';
import ImageCropper from '../../components/ImageCropper';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form options
  const [classes, setClasses] = useState<string[]>([]);
  const [faculties, setFaculties] = useState<string[]>([]);
  const [competitions, setCompetitions] = useState<Array<{ id: number; exam_name: string }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Profile picture
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);

  // Form data
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    username: '',
    email: '',
    phNo: '',
    province: '',
    district: '',
    city: '',
    password: '',
    class: '',
    faculty: '',
    competition: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        const subjectsResponse = await axiosClient.get(`/api/users/subjects.php?action=init`);
        if (subjectsResponse.data.success) {
          setClasses(subjectsResponse.data.classes);
          setFaculties(subjectsResponse.data.faculties);
        }
        const examsResponse = await axiosClient.get(`/api/users/subjects.php?action=exams`);
        if (examsResponse.data.success) {
          setCompetitions(examsResponse.data.exams);
        }
      } catch (err) {
        console.error('Failed to fetch options:', err);
        setError('Failed to load form options. Please refresh the page.');
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    if (location.state?.isGoogle) {
      const { email, name } = location.state;
      setFormData(prev => ({
        ...prev,
        email: email || '',
        name: name || ''
      }));
    }
  }, [location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'province') {
      setFormData({ ...formData, province: value, district: '' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleProfilePicture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image file (JPG, PNG, GIF, or WebP)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Original image must be less than 5MB');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setShowCropper(true);
    setError('');
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });
    setProfilePicture(croppedFile);
    setProfilePreview(URL.createObjectURL(croppedBlob));
    setShowCropper(false);
  };

  const validateForm = () => {
    if (formData.username.length < 4) {
      setError('Username must be at least 4 characters long.');
      return false;
    }
    if (/^\d+$/.test(formData.username)) {
      setError('Username cannot contain only numbers.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      if (profilePicture) {
        data.append('profile_picture', profilePicture);
      }

      const response = await axiosClient.post(`/api/users/register.php`, data);

      if (response.data.status === 'success') {
        setSuccess(response.data.message);
        if (location.state?.isGoogle) {
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setTimeout(() => navigate('/verify-otp', { state: { email: formData.email } }), 2000);
        }
      } else {
        setError(response.data.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingOptions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center font-outfit">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form options...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showCropper && selectedImage && (
        <ImageCropper
          image={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => setShowCropper(false)}
        />
      )}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-8 font-outfit">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-2 rounded-3xl bg-white shadow-inner border border-gray-100">
                <img
                  src="https://notelibraryapp.com/p.jpg"
                  alt="NoteLibrary"
                  className="h-16 w-16 rounded-2xl object-cover"
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-gray-600 mt-2">Join Note Library today</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-50 border-2 border-gray-100 flex items-center justify-center">
                    {profilePreview ? (
                      <img src={profilePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-shadow shadow-lg">
                    <Camera className="h-4 w-4 text-white" />
                    <input type="file" accept="image/*" onChange={handleProfilePicture} className="hidden" />
                  </label>
                </div>
              </div>

              {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm text-center">{error}</div>}
              {success && <div className="p-4 bg-green-50 border border-green-100 text-green-600 rounded-xl text-sm text-center">{success}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all" placeholder="John Doe" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all" placeholder="johndoe123" required />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all" placeholder="john@example.com" disabled={location.state?.isGoogle} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="tel" name="phNo" value={formData.phNo} onChange={handleChange} className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all" placeholder="98XXXXXXXX" />
                  </div>
                </div>
              </div>

              {!location.state?.isGoogle && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full pl-11 pr-11 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Province</label>
                  <select name="province" value={formData.province} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all appearance-none" required>
                    <option value="">Select</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">District</label>
                  <select name="district" value={formData.district} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all appearance-none disabled:opacity-50" disabled={!formData.province} required>
                    <option value="">Select</option>
                    {formData.province && districts[formData.province]?.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all" placeholder="City" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Class</label>
                  <select name="class" value={formData.class} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all appearance-none">
                    <option value="">Select</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Faculty</label>
                  <select name="faculty" value={formData.faculty} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all appearance-none">
                    <option value="">Select</option>
                    {faculties.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 ml-1">Goal</label>
                  <select name="competition" value={formData.competition} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 rounded-xl transition-all appearance-none">
                    <option value="">Select</option>
                    {competitions.map(e => <option key={e.id} value={e.exam_name}>{e.exam_name}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-200 transform active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none">
                {loading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div> : 'Create Account'}
              </button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-gray-600 hover:text-blue-600 font-medium transition-colors">Already have an account? Sign In</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
