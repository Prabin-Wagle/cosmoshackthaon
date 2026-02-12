import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Send, ArrowLeft, User as UserIcon, Shield, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Reply {
    id: number;
    user_id: number;
    message: string;
    created_at: string;
    is_admin: boolean;
}

interface TicketDetail {
    id: number;
    subject: string;
    message: string;
    status: 'pending' | 'answered' | 'closed';
    created_at: string;
    updated_at: string;
}

export default function SupportTicketDetailsPage() {
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();
    const [ticket, setTicket] = useState<TicketDetail | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [newReply, setNewReply] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTicketDetails = async () => {
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`https://notelibraryapp.com/api/support/get_ticket_details.php?ticket_id=${ticketId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.status === 'success') {
                setTicket(data.ticket);
                setReplies(data.replies);
            } else {
                toast.error(data.message || 'Failed to load ticket details');
                navigate('/support-tickets');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Error fetching ticket details');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTicketDetails();
    }, [ticketId]);

    useEffect(() => {
        scrollToBottom();
    }, [replies]);

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReply.trim()) return;

        setIsSending(true);
        const token = localStorage.getItem('token');
        try {
            const formData = new FormData();
            formData.append('ticket_id', ticketId || '');
            formData.append('message', newReply);

            const response = await fetch('https://notelibraryapp.com/api/support/reply_ticket.php', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();

            if (data.status === 'success') {
                setNewReply('');
                fetchTicketDetails(); // Refresh to show new message
                toast.success('Reply sent');
            } else {
                toast.error(data.message || 'Failed to send reply');
            }
        } catch (error) {
            console.error('Reply error:', error);
            toast.error('Error sending reply');
        } finally {
            setIsSending(false);
        }
    };

    const closeTicket = async () => {
        if (!confirm('Are you sure you want to close this ticket?')) return;

        const token = localStorage.getItem('token');
        try {
            const formData = new FormData();
            formData.append('ticket_id', ticketId || '');

            const response = await fetch('https://notelibraryapp.com/api/support/close_ticket.php', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();

            if (data.status === 'success') {
                toast.success('Ticket closed');
                fetchTicketDetails();
            } else {
                toast.error(data.message || 'Failed to close ticket');
            }
        } catch (error) {
            console.error('Close error:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="h-10 w-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-500 font-medium">Loading conversation...</p>
            </div>
        );
    }

    if (!ticket) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <button
                        onClick={() => navigate('/support-tickets')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                            ${ticket.status === 'closed' ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}
                         `}>
                            {ticket.status}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2">{ticket.subject}</h1>
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                            <Clock size={14} />
                            <span>Created on {new Date(ticket.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>Ticket #{ticket.id}</span>
                        </div>
                    </div>

                    {ticket.status !== 'closed' && (
                        <button
                            onClick={closeTicket}
                            className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-red-100 transition-colors"
                        >
                            Close Ticket
                        </button>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 dark:bg-black/20 rounded-3xl border border-gray-100 dark:border-gray-800/50 custom-scrollbar">
                {/* Initial Message (The Ticket Itself) */}
                <div className="flex gap-4 max-w-[85%]">
                    <div className="h-8 w-8 shrink-0 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                        <UserIcon size={14} />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">You</span>
                            <span className="text-[10px] text-gray-400">{new Date(ticket.created_at).toLocaleString()}</span>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                            {ticket.message}
                        </div>
                    </div>
                </div>

                {/* Divider */}
                {replies.length > 0 && (
                    <div className="flex items-center justify-center">
                        <div className="h-px bg-gray-200 dark:bg-gray-800 w-full max-w-xs"></div>
                    </div>
                )}

                {/* Replies */}
                {replies.map((reply) => (
                    <div key={reply.id} className={`flex gap-4 max-w-[85%] ${!reply.is_admin ? '' : 'ml-auto flex-row-reverse'}`}>
                        <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center
                            ${!reply.is_admin
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
                                : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}
                        `}>
                            {!reply.is_admin ? <UserIcon size={14} /> : <Shield size={14} />}
                        </div>

                        <div className={`space-y-1 ${!reply.is_admin ? '' : 'text-right'}`}>
                            <div className={`flex items-center gap-2 ${!reply.is_admin ? '' : 'justify-end'}`}>
                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                    {!reply.is_admin ? 'You' : 'Support Team'}
                                </span>
                                <span className="text-[10px] text-gray-400">{new Date(reply.created_at).toLocaleString()}</span>
                            </div>
                            <div className={`p-4 rounded-2xl shadow-sm border text-sm leading-relaxed text-left
                                 ${!reply.is_admin
                                    ? 'bg-white dark:bg-gray-900 rounded-tl-none border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                                    : 'bg-indigo-600 text-white rounded-tr-none border-indigo-500/50'}
                             `}>
                                {reply.message}
                            </div>
                        </div>
                    </div>
                ))}

                <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0">
                {ticket.status === 'closed' ? (
                    <div className="flex items-center justify-center gap-2 text-gray-500 py-4 opacity-75">
                        <Lock size={16} />
                        <span className="text-sm font-medium">This ticket is closed. You can no longer reply.</span>
                    </div>
                ) : (
                    <form onSubmit={handleSendReply} className="flex items-end gap-2">
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-2xl p-2 focus-within:ring-2 ring-indigo-500/20 transition-all">
                            <textarea
                                value={newReply}
                                onChange={(e) => setNewReply(e.target.value)}
                                placeholder="Type your reply here..."
                                className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 text-sm p-2 text-gray-900 dark:text-white placeholder:text-gray-400"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendReply(e);
                                    }
                                }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSending || !newReply.trim()}
                            className="p-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white rounded-2xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center justify-center"
                        >
                            {isSending ? (
                                <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
