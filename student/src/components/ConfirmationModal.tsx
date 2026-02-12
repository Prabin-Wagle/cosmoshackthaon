import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger'
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 fade-in duration-300">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === 'danger' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' :
                                type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' :
                                    'bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                            }`}>
                            <AlertTriangle size={24} />
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="space-y-2 mb-8">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                            {message}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-3 px-4 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg ${type === 'danger' ? 'bg-red-600 shadow-red-200 dark:shadow-none hover:bg-red-700' :
                                    type === 'warning' ? 'bg-amber-600 shadow-amber-200 dark:shadow-none hover:bg-amber-700' :
                                        'bg-blue-600 shadow-blue-200 dark:shadow-none hover:bg-blue-700'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
