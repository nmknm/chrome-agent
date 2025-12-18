import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Sparkles, Bot, User, Trash2, Settings as SettingsIcon, History as HistoryIcon, Plus } from 'lucide-react';
import { chatWithGemini, initializeGemini } from '../services/gemini';
import { motion, AnimatePresence } from 'framer-motion';
import ModelSelector from './ModelSelector';
import HistorySidebar from './HistorySidebar';

const ChatBubble = ({ message }) => {
    const isUser = message.role === 'user';
    const imageMatch = message.content.match(/!\[(.*?)\]\((.*?)\)/);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            <div className={`flex items-start max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full shadow-sm ${isUser ? 'ml-2 bg-blue-600/20 text-blue-400' : 'mr-2 bg-emerald-600/20 text-emerald-400'}`}>
                    {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div
                    className={`px-4 py-3 rounded-2xl shadow-sm text-sm ${isUser
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-bl-none backdrop-blur-sm'
                        }`}
                >
                    <div className="whitespace-pre-wrap leading-relaxed">
                        {message.content}
                        {imageMatch && (
                            <img src={imageMatch[2]} alt={imageMatch[1]} className="mt-3 rounded-lg border border-slate-600/50 w-full shadow-lg" />
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

const ChatInterface = ({ apiKey, onSettingsClick }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useContext, setUseContext] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [model, setModel] = useState("gemini-flash-latest");
    const [showHistory, setShowHistory] = useState(false);
    const [personality, setPersonality] = useState('');

    const messagesEndRef = useRef(null);

    // Fetch personality
    useEffect(() => {
        chrome.storage.local.get(['customPersonality'], (result) => {
            if (result.customPersonality) {
                setPersonality(result.customPersonality);
            }
        });
    }, []);

    // Initialize Gemini when model or personality changes
    useEffect(() => {
        initializeGemini(apiKey, model, personality);
    }, [apiKey, model, personality]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition not supported in this browser.");
            return;
        }
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => prev + (prev ? ' ' : '') + transcript);
        };
        recognition.start();
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        let finalPrompt = input;

        // Context handling
        if (useContext) {
            try {
                const currentTab = await import('../services/chromeUtils').then(m => m.getCurrentTab());
                if (currentTab?.id) {
                    const content = await import('../services/chromeUtils').then(m => m.getPageContent(currentTab.id));
                    const memories = await import('../services/chromeUtils').then(m => m.getDomainMemory(currentTab.id));

                    let memoryText = "";
                    if (memories && memories.length > 0) {
                        memoryText = `\nKnown preferences/memories for this domain:\n- ${memories.join('\n- ')}\n`;
                    }

                    if (content) {
                        finalPrompt = `Context from current page (${currentTab.title}):\n${memoryText}---\n${content.substring(0, 20000)}\n---\n\nUser Question: ${input}`;
                    }
                }
            } catch (err) {
                console.error("Context fetch failed", err);
            }
        }

        const userMsg = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const responseText = await chatWithGemini(finalPrompt, newMessages);
            const botMsg = { role: 'model', content: responseText };
            const updatedMessages = [...newMessages, botMsg];
            setMessages(updatedMessages);
            saveHistory(updatedMessages);
        } catch (error) {
            console.error("Chat error:", error);
            const errorMsg = { role: 'model', content: "Error: " + error.message };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const saveHistory = (msgs) => {
        if (msgs.length === 0) return;
        const preview = msgs[0].content.substring(0, 60) + "...";
        const id = Date.now();
        const newItem = { id, timestamp: Date.now(), preview, messages: msgs };

        chrome.storage.local.get(['chatHistory'], (result) => {
            const currentHistory = result.chatHistory || [];
            // Simplified: always push new entry for "current session" if not tracking ID. 
            // Better: Check if we are editing an existing session? For now, simple "save latest" logic:
            // Actually, usually you update the *current* conversation in history if it exists, or create new.
            // Let's just append a new history item on every turn? No, that spams.
            // Let's save only when we navigate away, or debounded?
            // User requested explicit history. Let's just save "sessions".

            // Hack for now: We won't update history *live* in storage for every message to avoid finding the right ID. 
            // Alternatively: We just push to history when "New Chat" is clicked or component unmounts?
            // Let's do: Save on "New Chat" or Manual Save?
            // "Save on Change" was the plan.

            // We can treat the *current* state as the session.
            // Let's rely on User clicking "New Chat" to "archive" the current one? 
            // Or just update the HEAD of history?

            // To be robust:
            // 1. If we loaded from history, we have an ID.
            // 2. If new, we create an ID on first message.
            // Let's implement that later if needed. For now, simple unique save on "New Chat" is safer.
        });
    };

    // Actually, let's implement true session saving
    const [sessionId, setSessionId] = useState(null);
    useEffect(() => {
        if (messages.length > 0) {
            // Save/Update
            const myId = sessionId || Date.now();
            if (!sessionId) setSessionId(myId);

            chrome.storage.local.get(['chatHistory'], (result) => {
                let list = result.chatHistory || [];
                const preview = messages[0].content.substring(0, 50);
                const idx = list.findIndex(x => x.id === myId);

                const entry = { id: myId, timestamp: Date.now(), preview, messages };

                if (idx > -1) {
                    list[idx] = entry;
                } else {
                    list.push(entry);
                }
                chrome.storage.local.set({ chatHistory: list });
            });
        }
    }, [messages]);

    const handleNewChat = () => {
        setMessages([]);
        setSessionId(null);
    };

    const handleLoadChat = (msgs) => {
        setMessages(msgs);
        // We probably need to find the ID if we want to continue updating it, 
        // but for now let's treat loaded chats as new sessions or just read-only? 
        // Ideally we find the ID. But `msgs` doesn't have ID. 
        // `HistorySidebar` passes `item.messages`. Let's assume new branched session for simplicity or just reset ID.
        setSessionId(null);
    };

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200">
            {/* Header */}
            <header className="flex items-center justify-between px-3 py-2 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-10 h-14">
                <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-gradient-to-tr from-blue-500 to-emerald-500 rounded-lg shadow-lg shadow-blue-500/20">
                        <Sparkles size={16} className="text-white" />
                    </div>
                    <ModelSelector currentModel={model} onSelect={setModel} />
                </div>

                <div className="flex items-center space-x-1">
                    <button
                        onClick={() => setUseContext(!useContext)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border transition-all ${useContext ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/50' : 'border-slate-700 text-slate-500 hover:text-slate-300'}`}
                    >
                        {useContext ? 'Context On' : 'Context Off'}
                    </button>

                    <div className="w-px h-6 bg-slate-800 mx-1" />

                    <button onClick={handleNewChat} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="New Chat">
                        <Plus size={18} />
                    </button>
                    <button onClick={() => setShowHistory(true)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="History">
                        <HistoryIcon size={18} />
                    </button>
                    <button onClick={onSettingsClick} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Settings">
                        <SettingsIcon size={18} />
                    </button>
                </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar relative">
                {messages.length === 0 && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none select-none">
                        <Bot size={64} className="mb-6 animate-pulse" />
                        <p className="font-light tracking-wide text-lg">GEMINI ASSISTANT</p>
                    </div>
                )}
                <AnimatePresence>
                    {messages.map((msg, idx) => (
                        <ChatBubble key={idx} message={msg} />
                    ))}
                </AnimatePresence>
                {isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center space-x-1 ml-10 mt-2 mb-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </motion.div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-slate-900/80 backdrop-blur-md border-t border-slate-800/50">
                <div className="relative flex items-center bg-slate-800/50 rounded-xl border border-slate-700/50 focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500/50 transition-all shadow-lg">
                    <input
                        type="text"
                        className="flex-1 px-4 py-3 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={isLoading}
                    />
                    <div className="flex items-center pr-2 space-x-1">
                        <button
                            onClick={startListening}
                            className={`p-2 transition-colors rounded-lg hover:bg-slate-700/50 ${isListening ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-blue-400'}`}
                        >
                            <Mic size={18} />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 scale-95 hover:scale-100 active:scale-95"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <HistorySidebar
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                onLoadChat={handleLoadChat}
            />
        </div>
    );
};

export default ChatInterface;
