import React, { useEffect, useState } from 'react';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';
import PaymentModal from './PaymentModal';
import { toast } from 'react-hot-toast';

interface Collection {
    id: number;
    title: string;
    description: string;
    price: number;
    discount_price: number | null;
    image_url: string;
}

const TestSeriesCollectionList: React.FC = () => {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [accessList, setAccessList] = useState<number[]>([]);
    const [pendingList, setPendingList] = useState<number[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const navigate = useNavigate();

    // Check if token exists, handling potential nulls
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    useEffect(() => {
        fetchCollections();
        if (token) {
            checkAccess();
        }
    }, [token]);

    const fetchCollections = async () => {
        try {
            const response = await axiosClient.get(`/api/datafetch/get_test_series_collections.php`);
            if (response.data.status === 'true') {
                setCollections(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching collections:', error);
        }
    };

    const checkAccess = async () => {
        if (!token) return;
        try {
            const response = await axiosClient.get(`/api/payment/check_access.php`);
            if (response.data.status === 'true') {
                setAccessList(response.data.data);
                if (response.data.pending) {
                    setPendingList(response.data.pending);
                }
            }
        } catch (error) {
            console.error('Error checking access:', error);
        }
    };

    const handleEnrollFree = async (collectionId: number) => {
        const loadingToast = toast.loading('Enrolling...');
        try {
            const response = await axiosClient.post('/api/payment/enroll_free.php', {
                collection_id: collectionId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.status === 'true') {
                toast.success(response.data.message || 'Enrolled successfully!', { id: loadingToast });
                checkAccess();
            } else {
                toast.error(response.data.message || 'Failed to enroll', { id: loadingToast });
            }
        } catch (error) {
            console.error('Enrollment error:', error);
            toast.error('An error occurred during enrollment', { id: loadingToast });
        }
    };

    const handleBuyClick = (collection: Collection) => {
        if (!token) {
            toast.error("Please login to purchase");
            return;
        }

        const currentPrice = collection.discount_price !== null ? collection.discount_price : collection.price;
        if (currentPrice === 0) {
            handleEnrollFree(collection.id);
        } else {
            setSelectedCollection(collection);
            setIsPaymentOpen(true);
        }
    };

    if (!token) {
        return <div className="p-4 text-center">Please log in to view test series.</div>;
    }

    return (
        <div className="container mx-auto p-4 transition-colors duration-300">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Premium Test Series</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((col) => {
                    const hasAccess = accessList.includes(Number(col.id));
                    const isPending = pendingList.includes(Number(col.id));
                    const currentPrice = col.discount_price !== null ? col.discount_price : col.price;
                    return (
                        <div key={col.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col transition-colors">
                            {col.image_url ? (
                                <img src={col.image_url} alt={col.title} className="w-full h-48 object-cover" />
                            ) : (
                                <div className="w-full h-48 bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
                            )}
                            <div className="p-4 flex-grow flex flex-col">
                                <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{col.title}</h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-4 flex-grow">{col.description.substring(0, 100)}...</p>
                                <div className="flex flex-col mb-4">
                                    <div className="flex items-center gap-2">
                                        {col.discount_price !== null && col.discount_price >= 0 ? (
                                            <>
                                                <span className="text-xl font-bold text-orange-600">
                                                    {col.discount_price === 0 ? 'FREE' : `Rs. ${col.discount_price}`}
                                                </span>
                                                {col.discount_price < col.price && (
                                                    <span className="text-sm text-gray-400 line-through font-medium">Rs. {col.price}</span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-xl font-bold text-blue-600">
                                                {col.price === 0 ? 'FREE' : `Rs. ${col.price}`}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">One-time payment • Lifetime access</p>
                                </div>
                                <div className="flex justify-between items-center mt-auto mt-2">
                                    {hasAccess ? (
                                        <button
                                            onClick={() => navigate(`/test-series/${col.id}`)}
                                            className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            View Content
                                        </button>
                                    ) : isPending ? (
                                        <button
                                            disabled
                                            className="w-full bg-gray-500 text-white px-4 py-2.5 rounded-lg cursor-not-allowed font-medium"
                                        >
                                            Request Pending
                                        </button>
                                    ) : (
                                        <div className="flex gap-2 w-full">
                                            <button
                                                onClick={() => navigate(`/test-series/${col.id}`)}
                                                className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                            >
                                                Explore
                                            </button>
                                            <button
                                                onClick={() => handleBuyClick(col)}
                                                className={`flex-1 ${currentPrice === 0 ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-500 hover:bg-orange-600'} text-white px-4 py-2.5 rounded-lg font-medium transition-colors`}
                                            >
                                                {currentPrice === 0 ? 'Enroll' : 'Buy Now'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {selectedCollection && (
                <PaymentModal
                    isOpen={isPaymentOpen}
                    onClose={() => setIsPaymentOpen(false)}
                    collectionId={selectedCollection.id}
                    collectionTitle={selectedCollection.title}
                    price={selectedCollection.discount_price !== null ? selectedCollection.discount_price : selectedCollection.price}
                    onSuccess={checkAccess}
                />
            )}
        </div>
    );
};

export default TestSeriesCollectionList;
