# Gemini Chrome Extension

A powerful, aesthetic Chrome Extension that brings AI models directly into your browser's side panel. Interactively chat with web pages, customize AI personalities, and switch between various AI models seamlessly.

## ✨ Features

- **🚀 Side Panel Integration**: Always accessible chat interface right alongside your browsing.
- **🧠 Multi-Model Support**: Switch between various צםגקךדץ
- **👀 Context Awareness**: 
  - **"Context On" Mode**: The AI can read the content of your current active tab to answer questions specifically about the page you are viewing.
- **🗣️ Voice Interaction**: Built-in speech recognition for hands-free prompting.
- **🎭 Custom Personalities**: Define custom system prompts (e.g., "Coding Assistant", "Pirate", "Summarizer") that persist across sessions.
- **💾 Chat History**: Automatically saves your sessions so you can revisit past conversations.
- **🎨 Modern UI**: built with **Tailwind CSS** and **Framer Motion** for a smooth, dark-themed, glassmorphic experience.
- **🔒 Secure**: API keys are stored locally in your browser's secure storage.

## Tech Stack

- **Frontend**: React 18, Vite
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **AI Integration**: Google Generative AI SDK (`@google/generative-ai`)
- **Browser API**: Chrome Extensions Manifest V3 (Side Panel, Storage, Scripting)

## Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/gemini-extension.git
    cd gemini-extension
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Build the Extension**
    ```bash
    npm run build
    ```

4.  **Load into Chrome**
    - Open Chrome and navigate to `chrome://extensions/`
    - Enable **Developer mode** (top right toggle).
    - Click **Load unpacked**.
    - Select the `dist` folder generated in your project directory.

## Configuration

To use the extension, you need a Google Gemini API Key.

1.  Get your API key from [Google AI Studio](https://aistudio.google.com/).
2.  Open the extension side panel.
3.  Go to **Settings**.
4.  Paste your API key and click **Save**.

## Development

Run the development server with hot-reload (limited for extensions, usually requires rebuilds for content scripts):

```bash
npm run dev
```

**This repository was partially vibe coded.**