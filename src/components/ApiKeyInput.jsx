import React, { useState, useEffect } from 'react';
import { Key } from 'lucide-react';

const ApiKeyInput = ({ onKeySet }) => {
    const [key, setKey] = useState('');

    const handleSave = () => {
        if (key.trim().length > 0) {
            chrome.storage.local.set({ geminiApiKey: key }, () => {
                onKeySet(key);
            });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-white bg-slate-900">
            <div className="w-full max-w-sm p-8 space-y-6 bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700 shadow-xl">
                <div className="flex flex-col items-center space-y-2">
                    <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                        <Key size={32} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Enter API Key</h2>
                    <p className="text-sm text-slate-400 text-center">
                        To use this extension, you need a Google Gemini API key.
                    </p>
                </div>
                <div className="space-y-4">
                    <input
                        type="password"
                        className="w-full px-4 py-3 text-sm bg-slate-950/50 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200 placeholder-slate-500 transition-all"
                        placeholder="AIzaSy..."
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                    />
                    <button
                        onClick={handleSave}
                        className="w-full py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-all shadow-lg shadow-blue-500/20"
                    >
                        Start Using Gemini
                    </button>
                </div>
                <p className="text-xs text-center text-slate-500">
                    Your key is stored locally in your browser.
                    <br />
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                        Get an API key here
                    </a>
                </p>
            </div>
        </div>
    );
};

export default ApiKeyInput;
