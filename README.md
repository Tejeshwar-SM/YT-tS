# YT-tS
Youtube Transcript Summarizer Extension for Chrome

A simple typescript extension that summarizes YouTube video transcripts.
Copies the transcript to clipboard, and opens up gpt/claude/gemini in a new tab to summarize the transcript.

## Installation
1. Download the repository as a zip file or clone it using git.
2. Extract the zip file if you downloaded it.
3. Run `npm install` in the root directory to install dependencies.
4. Run `npm run build` to compile the TypeScript code to JavaScript.
5. Open Chrome and go to `chrome://extensions/`.
6. Enable "Developer mode" in the top right corner.
7. Click on "Load unpacked" and select the dist folder which was created after running `npm run build`.
8. The extension should now be installed and ready to use.

## Usage
1. Open a YouTube video page.
2. Click on the extension icon in the Chrome toolbar.
3. For the first time, select the AI model you want to use for summarization (GPT, Claude, or Gemini) and save.
4. Reload the page (only required for the first time).
5. Click the summarize button near the video title.
6. The transcript will be copied to the clipboard, and a new tab will open with the AI model's summarization of the transcript.