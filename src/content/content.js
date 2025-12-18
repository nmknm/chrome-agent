// content.js
// Applies saved modifications (CSS/JS) for the current domain.

(async () => {
    try {
        const hostname = window.location.hostname;
        const storage = await chrome.storage.local.get(['websiteMods']);
        const mods = storage.websiteMods?.[hostname];

        if (mods) {
            if (mods.css) {
                const style = document.createElement('style');
                style.textContent = mods.css;
                style.id = 'gemini-mod-css';
                // Try to append to head, fallback to documentElement
                (document.head || document.documentElement).appendChild(style);
            }
            if (mods.js) {
                const script = document.createElement('script');
                script.textContent = mods.js;
                script.id = 'gemini-mod-js';
                (document.head || document.documentElement).appendChild(script);
                // script.remove(); // Optional: remove after execution
            }
            console.log("Gemini Mods applied.");
        }
    } catch (e) {
        console.error("Gemini Mod Error:", e);
    }
})();

// Visual Pilot Mode - Cursor
const updateCursor = (x, y) => {
    let cursor = document.getElementById('gemini-pilot-cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'gemini-pilot-cursor';
        cursor.style.position = 'fixed';
        cursor.style.width = '20px';
        cursor.style.height = '20px';
        cursor.style.borderRadius = '50%';
        cursor.style.backgroundColor = 'rgba(52, 211, 153, 0.5)'; // Emerald-400 with opacity
        cursor.style.border = '2px solid #34d399';
        cursor.style.boxShadow = '0 0 10px rgba(52, 211, 153, 0.8)';
        cursor.style.zIndex = '999999';
        cursor.style.pointerEvents = 'none';
        cursor.style.transition = 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
        cursor.style.transform = 'translate(-50%, -50%)';
        document.body.appendChild(cursor);

        // Add a trail effect or pulse
        const pulse = document.createElement('div');
        pulse.style.position = 'absolute';
        pulse.style.top = '0';
        pulse.style.left = '0';
        pulse.style.width = '100%';
        pulse.style.height = '100%';
        pulse.style.borderRadius = '50%';
        pulse.style.animation = 'gemini-pulse 2s infinite';
        cursor.appendChild(pulse);

        const style = document.createElement('style');
        style.textContent = `
            @keyframes gemini-pulse {
                0% { transform: scale(1); opacity: 0.8; box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.7); }
                70% { transform: scale(2); opacity: 0; box-shadow: 0 0 0 10px rgba(52, 211, 153, 0); }
                100% { transform: scale(1); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "show_cursor") {
        updateCursor(request.x, request.y);
    }
});
