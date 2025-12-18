import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Key } from 'lucide-react';
import { motion } from 'framer-motion';

const Settings = ({ apiKey, setApiKey, onBack }) => {
    const [keyInput, setKeyInput] = useState(apiKey);
    const [personality, setPersonality] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        chrome.storage.local.get(['customPersonality'], (result) => {
            if (result.customPersonality) {
                setPersonality(result.customPersonality);
            }
        });
    }, []);

    const handleSave = () => {
        setApiKey(keyInput);
        chrome.storage.local.set({
            geminiApiKey: keyInput,
            customPersonality: personality
        }, () => {
            setStatus('Settings Saved!');
            setTimeout(() => setStatus(''), 2000);
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col h-full bg-slate-950 text-slate-200 p-6 space-y-6"
        >
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Settings</h2>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                    <Key size={16} /> API Key
                </label>
                <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter Gemini API Key"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Custom Personality / System Prompt</label>
                <textarea
                    value={personality}
                    onChange={(e) => setPersonality(e.target.value)}
                    className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="e.g. You are a helpful pirate assistant. Always say 'Arrr' before answering."
                />
                <p className="text-xs text-slate-500">This prompt will remain active across sessions.</p>
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={handleSave}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Save size={18} /> Save
                </button>
                <button
                    onClick={onBack}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg font-medium transition-colors"
                >
                    Back
                </button>
            </div>
            {status && <p className="text-emerald-400 text-center text-sm">{status}</p>}
        </motion.div>
    );
};

export default Settings;
