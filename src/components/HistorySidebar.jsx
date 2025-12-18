import React, { useState, useEffect } from 'react';
import { MessageSquare, Trash2, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HistorySidebar = ({ isOpen, onClose, onLoadChat }) => {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (isOpen) {
            chrome.storage.local.get(['chatHistory'], (result) => {
                if (result.chatHistory) {
                    setHistory(result.chatHistory.sort((a, b) => b.timestamp - a.timestamp));
                }
            });
        }
    }, [isOpen]);

    const handleDelete = (id, e) => {
        e.stopPropagation();
        const newHistory = history.filter(item => item.id !== id);
        setHistory(newHistory);
        chrome.storage.local.set({ chatHistory: newHistory });
    };

    const formatDate = (ts) => {
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        className="fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-700 z-50 flex flex-col shadow-2xl"
                    >
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                            <h2 className="font-bold text-white flex items-center gap-2">
                                <Clock size={16} className="text-blue-400" /> History
                            </h2>
                            <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
                            {history.length === 0 ? (
                                <div className="text-center text-slate-500 mt-10 text-sm">No history found.</div>
                            ) : (
                                history.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => { onLoadChat(item.messages); onClose(); }}
                                        className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 cursor-pointer group transition-all border border-transparent hover:border-slate-700"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs text-slate-500">{formatDate(item.timestamp)}</span>
                                            <button
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-opacity"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
                                            {item.preview || "Empty conversation"}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default HistorySidebar;
