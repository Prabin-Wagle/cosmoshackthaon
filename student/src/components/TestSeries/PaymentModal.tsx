import React, { useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { toast } from 'react-hot-toast';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    collectionId: number;
    collectionTitle: string;
    price: number;
    onSuccess?: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, collectionId, collectionTitle, price, onSuccess }) => {
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setScreenshot(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!screenshot) {
            toast.error('Please select a screenshot');
            return;
        }

        const formData = new FormData();
        formData.append('collection_id', collectionId.toString());
        formData.append('screenshot', screenshot);

        setUploading(true);
        const loadingToast = toast.loading('Uploading and verifying payment...');
        try {
            const response = await axiosClient.post(`/api/payment/submit_payment.php`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.status === 'true') {
                toast.success(response.data.message || 'Payment submitted successfully!', { id: loadingToast, duration: 5000 });
                if (onSuccess) onSuccess();
                onClose();
            } else {
                toast.error(response.data.message || 'Failed to submit payment', { id: loadingToast });
            }
        } catch (error) {
            console.error(error);
            toast.error('An error occurred while uploading', { id: loadingToast });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Buy {collectionTitle}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
                </div>

                <div className="mb-6">
                    <p className="mb-2"><strong>Price:</strong> Rs. {price}</p>
                    <div className="border border-gray-200 p-4 rounded bg-gray-50 text-center">
                        <p className="text-sm text-gray-600 mb-2">Scan QR to Pay via eSewa</p>
                        <div className="mx-auto flex items-center justify-center">
                            <img src="/assets/payment_qr.jpg" alt="Payment QR Code" className="w-48 h-auto" />
                        </div>
                        <a
                            href="/assets/payment_qr.jpg"
                            download="Payment_QR_Code.jpg"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2 inline-block"
                        >
                            Download QR
                        </a>
                        <p className="mt-2 text-sm font-semibold text-gray-700">Jayant Bahadur Bist</p>
                        <p className="text-xs text-gray-500">9868711643</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Upload Payment Receipt</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        <p className="mt-1 text-[10px] text-gray-400 italic">
                            * Please upload a clear, uncropped screenshot of your payment receipt.
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={uploading}
                        className={`w-full py-2 px-4 rounded text-white font-bold ${uploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {uploading ? 'Uploading...' : 'Submit Payment'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default PaymentModal;
