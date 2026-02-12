import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import type { Resource } from '../types/resources';
import axiosClient from '../api/axiosClient';
import { useEffect } from 'react';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'NoteLibrarySecur3_2026_SecretKey';
const ENCRYPTION_IV = '1234567890123456';

export default function ResourceEmbed() {
    const location = useLocation();
    const navigate = useNavigate();
    const { resource, title, type } = location.state as { resource: Resource; title: string; type?: string } || {};

    useEffect(() => {
        const trackHistory = async () => {
            if (!resource?.id) return;
            try {
                const payload = JSON.stringify({
                    resource_id: resource.id,
                    resource_type: type || resource.resource_type || 'note',
                    title: title || resource.chapterName,
                    subject: resource.subjectName || resource.subject,
                    url: location.pathname
                });

                const key = CryptoJS.enc.Utf8.parse(ENCRYPTION_KEY);
                const iv = CryptoJS.enc.Utf8.parse(ENCRYPTION_IV);
                const encrypted = CryptoJS.AES.encrypt(payload, key, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                }).toString();

                await axiosClient.post('/api/users/add_reading_history.php', {
                    d: encrypted
                });
            } catch (error) {
                console.error('Failed to track history:', error);
            }
        };

        if (resource) trackHistory();
    }, [resource, title, type]);

    // Check for 'link' field (used by competitive resources) or 'driveLink' (used by class resources)
    const resourceLink = resource?.link || resource?.driveLink;

    if (!resource || !resourceLink) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950">
                <div className="text-center animate-in fade-in zoom-in duration-500">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Resource Not Found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">The study material you're looking for isn't available.</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-lg shadow-blue-600/20"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Extract the file ID from the drive link to construct the embed URL
    // Standard Drive link: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
    // Embed URL: https://drive.google.com/file/d/FILE_ID/preview
    let embedUrl = resourceLink;
    if (resourceLink.includes('drive.google.com')) {
        const fileIdMatch = resourceLink.match(/\/d\/(.*?)\//);
        if (fileIdMatch && fileIdMatch[1]) {
            embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
        }
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-black overflow-hidden">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between shadow-md z-20 transition-colors">
                <div className="flex items-center space-x-5">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white group"
                        title="Go Back"
                    >
                        <ArrowLeft className="h-6 w-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-lg font-black text-gray-900 dark:text-white truncate max-w-md md:max-w-xl tracking-tight leading-tight">
                            {title || resource.chapterName}
                        </h1>
                        <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                            {resource.chapter}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <a
                        href={resourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:flex items-center px-4 py-2.5 text-xs font-black uppercase tracking-widest text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in Drive
                    </a>
                    <a
                        href={resourceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </a>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative bg-gray-200 dark:bg-black transition-colors">
                <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    title="Resource Preview"
                    allow="autoplay"
                />
            </div>
        </div>
    );
}
