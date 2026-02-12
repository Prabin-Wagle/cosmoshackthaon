import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { ArrowLeft, FileText, Loader2 } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import { useTheme } from '../contexts/ThemeContext';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'NoteLibrarySecur3_2026_SecretKey';
const ENCRYPTION_IV = '1234567890123456';


// Import CSS
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

// Worker URL
const workerUrl = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

export default function PdfReader() {
    const location = useLocation();
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [isFetching, setIsFetching] = useState(false);

    const { fileUrl, title, backUrl, resourceId, resourceType, subject } = location.state as {
        fileUrl: string;
        title: string;
        backUrl?: string;
        resourceId?: number;
        resourceType?: string;
        subject?: string;
    } || {};

    useEffect(() => {
        const trackHistory = async () => {
            if (!resourceId || !resourceType) return;
            try {
                const payload = JSON.stringify({
                    resource_id: resourceId,
                    resource_type: resourceType,
                    title: title,
                    subject: subject,
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

        if (fileUrl) trackHistory();

        const fetchPdfAsBlob = async () => {
            if (!fileUrl || !fileUrl.includes('serve_file.php')) return;

            setIsFetching(true);
            try {
                // Extract 'd' from fileUrl for the POST body
                const urlObj = new URL(fileUrl);
                const d = urlObj.searchParams.get('d');

                if (!d) {
                    setBlobUrl(fileUrl); // Fallback to direct URL if no 'd'
                    return;
                }

                const response = await axiosClient.post('/api/users/serve_file.php', { d }, {
                    responseType: 'blob'
                });

                const url = URL.createObjectURL(response.data);
                setBlobUrl(url);
            } catch (error) {
                console.error('Failed to fetch PDF blob:', error);
                setFetchError('Failed to load secure document.');
                // Fallback to direct URL as last resort
                setBlobUrl(fileUrl);
            } finally {
                setIsFetching(false);
            }
        };

        if (fileUrl) fetchPdfAsBlob();

        return () => {
            if (blobUrl && blobUrl.startsWith('blob:')) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [fileUrl, resourceId, resourceType, title, subject]);

    // Custom toolbar to hide download, print and open file
    const renderToolbar = (Toolbar: (props: any) => React.ReactElement) => (
        <Toolbar>
            {(slots: any) => {
                const {
                    CurrentPageInput,
                    GoToNextPage,
                    GoToPreviousPage,
                    NumberOfPages,
                    ShowSearchPopover,
                    Zoom,
                    ZoomIn,
                    ZoomOut,
                    EnterFullScreen,
                } = slots;
                return (
                    <div className="flex items-center w-full justify-between px-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 h-10">
                        <div className="flex items-center space-x-1">
                            <ShowSearchPopover />
                            <div className="flex items-center space-x-0.5">
                                <GoToPreviousPage />
                                <div className="px-1 text-[10px] font-black dark:text-gray-300 flex items-center">
                                    <CurrentPageInput /> / <NumberOfPages />
                                </div>
                                <GoToNextPage />
                            </div>
                        </div>
                        <div className="flex items-center space-x-1">
                            <ZoomOut />
                            <Zoom />
                            <ZoomIn />
                        </div>
                        <div className="flex items-center space-x-1">
                            <EnterFullScreen />
                        </div>
                    </div>
                );
            }}
        </Toolbar>
    );

    const defaultLayoutPluginInstance = defaultLayoutPlugin({
        renderToolbar,
        sidebarTabs: () => [], // Hide sidebar tabs for cleaner look
    });

    if (isFetching) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-widest text-xs">Securing Document...</h2>
            </div>
        );
    }

    if (!blobUrl && !isFetching) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <div className="text-6xl">📄</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">No PDF metadata found</h2>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
            {/* Floating Protection Overlay */}
            <div className="absolute inset-0 z-[101] pointer-events-none" onContextMenu={(e) => e.preventDefault()}></div>

            {/* Toolbar Header */}
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between z-[102] shadow-sm">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate(backUrl || -1 as any)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
                        title="Back"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-sm font-black text-gray-900 dark:text-white line-clamp-1 uppercase tracking-tight">{title}</h2>
                        <div className="flex items-center text-[9px] text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] font-black">
                            <FileText size={10} className="mr-1" />
                            Secure Document View
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-amber-200/50 dark:border-amber-800/50">
                        Protected Content
                    </span>
                </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-gray-950 z-[99]">
                <Worker workerUrl={workerUrl}>
                    <Viewer
                        key={`${blobUrl}-${theme}`}
                        fileUrl={blobUrl || fileUrl}
                        plugins={[defaultLayoutPluginInstance]}
                        defaultScale={1.5}
                        theme={theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme}
                    />
                </Worker>
            </div>
        </div>
    );
}
