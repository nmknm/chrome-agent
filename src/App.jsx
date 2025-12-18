import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Settings from './components/Settings';

function App() {
  const [apiKey, setApiKey] = useState('');
  const [view, setView] = useState('chat'); // 'chat', 'settings'
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  useEffect(() => {
    chrome.storage.local.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) {
        setApiKey(result.geminiApiKey);
      }
      setIsLoadingKey(false);
    });
  }, []);

  if (isLoadingKey) return <div className="h-screen bg-slate-950 flex items-center justify-center text-slate-500">Loading...</div>;

  if (!apiKey && view !== 'settings') {
    return <Settings apiKey={apiKey} setApiKey={setApiKey} onBack={() => { }} />; // Force settings if no key
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-950 text-slate-100 font-sans antialiased">
      {view === 'chat' && (
        <ChatInterface
          apiKey={apiKey}
          onSettingsClick={() => setView('settings')}
        />
      )}
      {view === 'settings' && (
        <Settings
          apiKey={apiKey}
          setApiKey={setApiKey}
          onBack={() => setView('chat')}
        />
      )}
    </div>
  );
}

export default App;
