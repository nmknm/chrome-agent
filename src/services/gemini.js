import { GoogleGenerativeAI } from "@google/generative-ai";


// Helper wrapper to map tool names to functions (we need to export these from chromeUtils as internal or similar, or just re-import)
// Actually, I can allow passing the "tools implementation" map to initialize or just import them.
// Let's assume chromeUtils exports them.
// Note: chromeUtils exports: listTabs, closeTab, createTab, switchToTab.

let genAI = null;
let model = null;
let chatSession = null;
let gemmaSystemPrompt = null;

const toolsDef = [
    {
        functionDeclarations: [
            { name: "list_tabs", description: "List all open tabs." },
            {
                name: "close_tab",
                description: "Close a tab by ID.",
                parameters: { type: "OBJECT", properties: { tabId: { type: "NUMBER" } }, required: ["tabId"] }
            },
            {
                name: "switch_tab",
                description: "Switch to a tab by ID.",
                parameters: { type: "OBJECT", properties: { tabId: { type: "NUMBER" } }, required: ["tabId"] }
            },
            {
                name: "create_tab",
                description: "Create a new tab with URL.",
                parameters: { type: "OBJECT", properties: { url: { type: "STRING" } }, required: ["url"] }
            },
            // Pilot Mode Tools
            {
                name: "get_interactive_elements",
                description: "Get a list of interactive elements (buttons, links, inputs) on the current page with their IDs. Call this before clicking or typing to get the IDs.",
            },
            {
                name: "click_element",
                description: "Click an element by its ID (obtained from get_interactive_elements).",
                parameters: { type: "OBJECT", properties: { elementId: { type: "NUMBER" } }, required: ["elementId"] }
            },
            {
                name: "type_into_element",
                description: "Type text into an input element by its ID.",
                parameters: { type: "OBJECT", properties: { elementId: { type: "NUMBER" }, text: { type: "STRING" } }, required: ["elementId", "text"] }
            },
            // Image Generation
            {
                name: "generate_image",
                description: "Generate an image based on a prompt. Returns an image URL.",
                parameters: { type: "OBJECT", properties: { prompt: { type: "STRING" } }, required: ["prompt"] }
            },
            // Website Modification
            {
                name: "modify_website",
                description: "Modify the current website with custom CSS and JS. Persists for future visits.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        css: { type: "STRING", description: "CSS code to inject." },
                        js: { type: "STRING", description: "Javascript code to inject. Do NOT use markdown code blocks." }
                    },
                }
            },
            // Context Aware Memory
            {
                name: "save_memory",
                description: "Save a preference or fact about the user for the current website/domain.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        memory: { type: "STRING", description: "The fact or preference to remember." }
                    },
                    required: ["memory"]
                }
            },
            // Search & Read
            {
                name: "google_search",
                description: "Perform a Google Search to get real-time information.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        query: { type: "STRING", description: "The search query." }
                    },
                    required: ["query"]
                }
            },
            {
                name: "read_page",
                description: "Read the content of the current (or specified) page.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        tabId: { type: "NUMBER", description: "Optional tab ID. Defaults to current active tab." }
                    }
                }
            }
        ],
    },
];

export const initializeGemini = (apiKey, modelName = "gemini-flash-latest") => {
    genAI = new GoogleGenerativeAI(apiKey);
    const isGemma = modelName.includes("gemma");
    gemmaSystemPrompt = null;

    let config = {
        model: modelName,
    };

    if (isGemma) {
        // Gemma 3 is text-only for tools and doesn't support systemInstruction
        const funcs = toolsDef[0].functionDeclarations;
        let toolsDesc = funcs.map(f =>
            `Function: ${f.name}\nDescription: ${f.description}\nParameters: ${JSON.stringify(f.parameters)}`
        ).join('\n\n');

        const systemPrompt = `You are a browser automation assistant using the Gemma model.
You can control the browser, read pages, and interact with elements.
You have access to the following tools:

${toolsDesc}

IMPORTANT: To use a tool, you MUST respond with a valid JSON object ONLY, in this format:
{ "tool": "function_name", "args": { "argument_name": "value" } }

Example of Tool Usage:
User: "Search for weather"
Model: { "tool": "google_search", "args": { "query": "weather" } }

If you don't need to use a tool, respond with normal text.
If asked to summarize or read, use 'read_page'.
If asked to click/type, use 'get_interactive_elements' first to find IDs, then 'click_element' or 'type_into_element'.
For current page context, assume you need to use tools to get it unless provided.
Please confirm you understand by replying "Understood.".
`;
        gemmaSystemPrompt = systemPrompt;
    } else {
        // Standard Gemini models
        config.tools = toolsDef;
        config.systemInstruction = {
            parts: [{ text: "You are a browser automation assistant. You can control the browser, read pages, and interact with elements. Use your tools freely to help the user. If asked to summarize or read, use 'read_page'. If asked to click/type, use 'get_interactive_elements' first to find IDs, then 'click_element' or 'type_into_element'. For current page context, assume you need to use tools to get it unless provided." }]
        };
    }

    model = genAI.getGenerativeModel(config);
    chatSession = null;
};

const functionsMap = {
    google_search: async ({ query }) => {
        const { performSearch } = await import('./chromeUtils');
        const results = await performSearch(query);
        return { results };
    },
    read_page: async ({ tabId }) => {
        const { getPageContent, getCurrentTab } = await import('./chromeUtils');
        let targetId = tabId;
        if (!targetId) {
            const tab = await getCurrentTab();
            if (!tab) return { error: "No active tab" };
            targetId = tab.id;
        }
        const content = await getPageContent(targetId);
        return { content: content ? content.substring(0, 20000) : "No content found." };
    },
    save_memory: async ({ memory }) => {
        const { saveDomainMemory, getCurrentTab } = await import('./chromeUtils');
        const tab = await getCurrentTab();
        if (!tab) return { error: "No active tab" };
        await saveDomainMemory(tab.id, memory);
        return { status: "success", message: "Memory saved for this domain." };
    },
    modify_website: async ({ css, js }) => {
        const { saveWebsiteMod, getCurrentTab } = await import('./chromeUtils');
        const tab = await getCurrentTab();
        if (!tab) return { error: "No active tab" };
        await saveWebsiteMod(tab.id, css, js);
        return { status: "success", message: "Modifications applied and saved." };
    },
    generate_image: async ({ prompt }) => {
        // Mock image generation for demo
        const encodedPrompt = encodeURIComponent(prompt);
        return {
            status: "success",
            imageUrl: `https://placehold.co/600x400/1e293b/FFFFFF/png?text=${encodedPrompt}`,
            altText: prompt
        };
    },
    list_tabs: async () => {
        const { listTabs } = await import('./chromeUtils');
        return await listTabs();
    },
    close_tab: async ({ tabId }) => {
        const { closeTab } = await import('./chromeUtils');
        closeTab(tabId);
        return { status: "success", closed: tabId };
    },
    switch_tab: async ({ tabId }) => {
        const { switchToTab } = await import('./chromeUtils');
        switchToTab(tabId);
        return { status: "success", switched_to: tabId };
    },
    create_tab: async ({ url }) => {
        const { createTab } = await import('./chromeUtils');
        createTab(url);
        return { status: "success", created: url };
    },
    get_interactive_elements: async () => {
        const { getInteractiveMap, getCurrentTab } = await import('./chromeUtils');
        const tab = await getCurrentTab();
        if (!tab) return { error: "No active tab" };
        const map = await getInteractiveMap(tab.id);
        return { elements: map };
    },
    click_element: async ({ elementId }) => {
        const { clickElement, getCurrentTab } = await import('./chromeUtils');
        const tab = await getCurrentTab();
        if (!tab) return { error: "No active tab" };
        await clickElement(tab.id, elementId);
        return { status: "success", clicked: elementId };
    },
    type_into_element: async ({ elementId, text }) => {
        const { typeElement, getCurrentTab } = await import('./chromeUtils');
        const tab = await getCurrentTab();
        if (!tab) return { error: "No active tab" };
        await typeElement(tab.id, elementId, text);
        return { status: "success", typed: text };
    }
};

export const chatWithGemini = async (prompt, history = []) => {
    if (!model) throw new Error("Gemini not initialized");

    // Reconstruct history if needed, but for complex function calling context is key
    // Ideally, we keep a persistent `chatSession`.
    if (!chatSession) {
        let initialHistory = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        if (gemmaSystemPrompt) {
            // Inject system prompt as the first message exchange to "prime" the model
            initialHistory = [
                { role: 'user', parts: [{ text: gemmaSystemPrompt }] },
                { role: 'model', parts: [{ text: "Understood." }] },
                ...initialHistory
            ];
        }

        chatSession = model.startChat({
            history: initialHistory,
        });
    }

    // Send message
    let result = await chatSession.sendMessage(prompt);
    let response = result.response;
    let text = response.text();

    const MAX_TURNS = 5;
    let turns = 0;

    // Helper to extract JSON tool call provided in text
    const extractTextTool = (txt) => {
        try {
            const start = txt.indexOf('{');
            const end = txt.lastIndexOf('}');
            if (start !== -1 && end !== -1 && end > start) {
                const jsonStr = txt.substring(start, end + 1);
                const data = JSON.parse(jsonStr);
                if (data.tool && functionsMap[data.tool]) {
                    return data;
                }
            }
        } catch (e) { /* ignore */ }
        return null;
    };

    // Helper to get function calls safely
    const getFunctionCalls = (resp) => {
        if (resp && typeof resp.functionCalls === 'function') {
            return resp.functionCalls() || [];
        }
        return [];
    };

    let textTool = extractTextTool(text);
    let calls = getFunctionCalls(response);

    while (
        (calls.length > 0 || textTool)
        && turns < MAX_TURNS
    ) {
        // 1. Native Function Calls
        if (calls.length > 0) {
            const parts = [];

            for (const call of calls) {
                const fn = functionsMap[call.name];
                if (fn) {
                    console.log("Calling toolUtils:", call.name, call.args);
                    const apiResult = await fn(call.args);
                    parts.push({
                        functionResponse: {
                            name: call.name,
                            response: { result: apiResult }
                        }
                    });
                }
            }
            // Send the function response back
            result = await chatSession.sendMessage(parts);
        }
        // 2. Text-Based Tool Calls (Gemma)
        else if (textTool) {
            console.log("Calling toolUtils (Text):", textTool.tool, textTool.args);
            const fn = functionsMap[textTool.tool];
            let apiResult = {};
            try {
                apiResult = await fn(textTool.args);
            } catch (e) {
                apiResult = { error: e.message };
            }

            // Allow model to see the result and continue
            // We feed it back as a user message
            const resultMsg = `Tool '${textTool.tool}' output: ${JSON.stringify(apiResult)}`;
            result = await chatSession.sendMessage(resultMsg);
        }

        response = result.response;
        try {
            const currentCalls = getFunctionCalls(response);
            text = currentCalls.length > 0 ? "" : response.text();
        } catch (e) {
            console.error("Error getting text:", e);
            // If we can't get text, try to see if there's at least something
            text = "";
        }
        textTool = extractTextTool(text);
        calls = getFunctionCalls(response);
        turns++;
    }

    return text;
};

export const getAvailableModels = async (apiKey) => {
    // There isn't a direct client SDK method for listing models in the browser JS SDK easily without using the REST API directly
    // But for now we can rely on defaults or hardcode common ones, or implement fetch
    // Implementing fetch for generic list
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) {
            throw new Error("Failed to fetch models");
        }
        const data = await response.json();
        return data.models;
    } catch (e) {
        return [];
    }
};
