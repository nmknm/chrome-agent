export const getCurrentTab = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
};

export const getPageContent = async (tabId) => {
    try {
        const result = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => document.body.innerText,
        });
        return result[0].result;
    } catch (error) {
        console.error("Failed to get page content:", error);
        return null;
    }
};

export const createTab = (url) => {
    chrome.tabs.create({ url });
};

export const closeTab = (tabId) => {
    chrome.tabs.remove(tabId);
};

export const listTabs = async () => {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.map(t => ({ id: t.id, title: t.title, url: t.url, active: t.active }));
};

export const switchToTab = (tabId) => {
    chrome.tabs.update(tabId, { active: true });
};

// Pilot Mode Tools

export const getInteractiveMap = async (tabId) => {
    try {
        const result = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => {
                // Heuristic to find interactive elements
                const elements = document.querySelectorAll('a, button, input, textarea, [role="button"]');
                const map = Array.from(elements).map((el, index) => {
                    // Assign a temporary attribute to reference it later
                    el.dataset.geminiId = index;
                    return {
                        id: index,
                        tag: el.tagName.toLowerCase(),
                        text: el.innerText?.substring(0, 50) || el.placeholder || el.value || "",
                        href: el.href || null,
                        type: el.type || null
                    };
                });
                return map;
            }
        });
        return result[0].result;
    } catch (error) {
        console.error("Failed to map elements:", error);
        return [];
    }
}

const moveCursorToElement = async (tabId, elementId) => {
    await chrome.scripting.executeScript({
        target: { tabId },
        args: [elementId],
        func: (id) => {
            const el = document.querySelector(`[data-gemini-id="${id}"]`);
            if (el) {
                const rect = el.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;

                // Send message to content script to update visual cursor
                // Note: content script listens to runtime messages
                // But here we are IN the page context via executeScript, we can call the function directly if it was exposed
                // OR we can just implement the cursor logic here directly for simplicity in the isolated world

                // Better: send message from Background to Content? No, we are in background/popup calling executeScript.
                // Content script is already loaded. We can send a message to the tab.
            }
        }
    });

    // We need to get coordinates back or just instruct content script to find the element and show cursor
    await chrome.scripting.executeScript({
        target: { tabId },
        args: [elementId],
        func: (id) => {
            const el = document.querySelector(`[data-gemini-id="${id}"]`);
            if (el) {
                const rect = el.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;

                // We need to trigger the cursor function defined in content.js
                // Since content.js is in the same world (isolated), we might NOT be able to access the variables if we just declared them in scope.
                // However, we added a message listener in content.js.
                chrome.runtime.sendMessage({ action: "show_cursor", x, y });
            }
        }
    });

    // Wait for animation
    await new Promise(r => setTimeout(r, 800));
}

export const clickElement = async (tabId, elementId) => {
    await moveCursorToElement(tabId, elementId);
    await chrome.scripting.executeScript({
        target: { tabId },
        args: [elementId],
        func: (id) => {
            const el = document.querySelector(`[data-gemini-id="${id}"]`);
            if (el) {
                el.click();
                el.focus();
            }
        }
    });
}

export const typeElement = async (tabId, elementId, text) => {
    await moveCursorToElement(tabId, elementId);
    await chrome.scripting.executeScript({
        target: { tabId },
        args: [elementId, text],
        func: (id, text) => {
            const el = document.querySelector(`[data-gemini-id="${id}"]`);
            if (el) {
                el.value = text;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });
}

export const performSearch = async (query) => {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    const tab = await chrome.tabs.create({ url: searchUrl, active: false });

    // Wait for load
    await new Promise(resolve => {
        const listener = (tabId, info) => {
            if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });

    // Scrape results
    const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
            const items = document.querySelectorAll('.g');
            return Array.from(items).slice(0, 5).map(item => {
                const title = item.querySelector('h3')?.innerText || "";
                const link = item.querySelector('a')?.href || "";
                const snippet = item.querySelector('.VwiC3b')?.innerText || "";
                return { title, link, snippet };
            });
        }
    });

    // Cleanup
    chrome.tabs.remove(tab.id);
    return results[0].result;
}

export const saveWebsiteMod = async (tabId, css, js) => {
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url) return;
    const url = new URL(tab.url);
    const hostname = url.hostname;

    const storage = await chrome.storage.local.get(['websiteMods']);
    const mods = storage.websiteMods || {};
    mods[hostname] = { css, js };
    await chrome.storage.local.set({ websiteMods: mods });

    // Apply immediately
    await chrome.scripting.executeScript({
        target: { tabId },
        args: [css, js],
        func: (css, js) => {
            if (css) {
                const style = document.createElement('style');
                style.textContent = css;
                style.id = 'gemini-mod-css-live';
                document.head.appendChild(style);
            }
            if (js) {
                const script = document.createElement('script');
                script.textContent = js;
                script.id = 'gemini-mod-live';
                (document.head || document.documentElement).appendChild(script);
            }
        }
    });
}
