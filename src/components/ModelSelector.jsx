import React, { useState } from 'react';
import { ChevronDown, Check, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const models = [
    { id: "gemini-flash-latest", name: "Gemini Flash (Latest)" },
    { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Preview)" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
    { id: "gemma-3-27b-it", name: "Gemma 3 27B IT" },
    { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash Image" },
    { id: "gemini-2.5-computer-use-preview-10-2025", name: "Gemini Computer Use" },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite" }
];

const ModelSelector = ({ currentModel, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-all text-sm text-slate-200"
            >
                <Cpu size={14} className="text-blue-400" />
                <span className="font-medium max-w-[100px] truncate">
                    {models.find(m => m.id === currentModel)?.name || currentModel}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40 bg-transparent"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            className="absolute top-full mt-2 left-0 w-64 max-h-80 overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1 scrollbar-thin scrollbar-thumb-slate-700"
                        >
                            {models.map((model) => (
                                <button
                                    key={model.id}
                                    onClick={() => {
                                        onSelect(model.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-800 transition-colors flex items-center justify-between ${currentModel === model.id ? 'text-blue-400 bg-slate-800/50' : 'text-slate-300'}`}
                                >
                                    <span>{model.name}</span>
                                    {currentModel === model.id && <Check size={14} />}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ModelSelector;
