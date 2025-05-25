import { UserPreferences, TranscriptSegment, MessageRequest, AIplatformConfig } from '../types/index';

// Global variables
let transcriptData: string = '';
let sidebarVisible: boolean = false;
let isInitialized: boolean = false;

const AI_PLATFORMS: Record<string, AIplatformConfig> = {
  chatgpt: { name: 'ChatGPT', baseUrl: 'https://chat.openai.com', urlTemplate: () => `https://chat.openai.com` },
  gemini: { name: 'Gemini', baseUrl: 'https://gemini.google.com/app', urlTemplate: () => `https://gemini.google.com/app` },
  claude: { name: 'Claude', baseUrl: 'https://claude.ai/new', urlTemplate: () => 'https://claude.ai/new' }
};

function initialize(): void {
  console.log('YouTube Transcript Summarizer: Initialize function called.');
  if (isInitialized) {
    console.log('YouTube Transcript Summarizer: Already initialized, returning.');
    return;
  }

  if (window.location.href.includes('youtube.com/watch')) {
    console.log('YouTube Transcript Summarizer: YouTube video page detected');
    setTimeout(() => {
      console.log('YouTube Transcript Summarizer: Initializing UI and transcript extraction...');
      createSummarizeButton();
      createTranscriptSidebar();
      extractTranscript().then((success) => {
          console.log(`YouTube Transcript Summarizer: Initial transcript extraction attempt finished. Success: ${success}`);
          if (!success) {
              console.warn("YouTube Transcript Summarizer: Initial transcript extraction failed (transcript panel might not have opened or no segments found).");
          }
      }).catch(error => {
          console.error("YouTube Transcript Summarizer: Error during initial extractTranscript call:", error);
      });
      isInitialized = true;
      console.log('YouTube Transcript Summarizer: Initialization complete flag set.');
    }, 3500);
  } else {
    console.log('YouTube Transcript Summarizer: Not a YouTube watch page.');
  }
}

//createSummarizeButton
function createSummarizeButton(): void {
  console.log('YouTube Transcript Summarizer: createSummarizeButton called.');
  const existingButton = document.querySelector<HTMLButtonElement>('#yt-transcript-summarize-btn');
  if (existingButton) {
    console.log('YouTube Transcript Summarizer: Removing existing summarize button.');
    existingButton.remove();
  }

  
  const potentialContainersSelectors: string[] = [
    'ytd-video-primary-info-renderer div#actions-inner div#menu.ytd-video-primary-info-renderer',
    'ytd-video-primary-info-renderer div#actions-inner',
    'ytd-watch-metadata div#actions.ytd-watch-metadata',
    'ytd-video-secondary-info-renderer div#actions',
    '#meta-contents #subscribe-button',
    '#info-contents #menu > ytd-menu-renderer',
    '#actions #actions-inner',
    '#menu-container #menu'
  ];

  let actionsContainer: HTMLElement | null = null;
  let insertionReferenceNode: Node | null = null; // For insertBefore

  for (const selector of potentialContainersSelectors) {
    const container = document.querySelector<HTMLElement>(selector);
    if (container) {
      console.log(`YouTube Transcript Summarizer: Found potential actions container with selector: ${selector}`, container);
      
      if (selector.includes('#menu.ytd-video-primary-info-renderer') || selector.includes('#menu > ytd-menu-renderer')) {
        actionsContainer = container.parentElement instanceof HTMLElement ? container.parentElement : container;
        insertionReferenceNode = container;
      } else if (selector.includes('#subscribe-button')) {
        actionsContainer = container.parentElement instanceof HTMLElement ? container.parentElement : container;
        insertionReferenceNode = container.nextSibling;
      }
      else {
        actionsContainer = container;
      }
      break;
    }
  }

  if (actionsContainer) {
    console.log('YouTube Transcript Summarizer: Using actions container:', actionsContainer);
    const summarizeButton = document.createElement('button'); 
    summarizeButton.id = 'yt-transcript-summarize-btn';
    summarizeButton.textContent = 'Summarize';
    summarizeButton.className = 'yt-summarize-button'; 
    summarizeButton.addEventListener('click', handleSummarizeClick);

    if (insertionReferenceNode && insertionReferenceNode.parentNode === actionsContainer) {
      console.log('YouTube Transcript Summarizer: Inserting button before reference node:', insertionReferenceNode);
      actionsContainer.insertBefore(summarizeButton, insertionReferenceNode);
    } else {
      console.log('YouTube Transcript Summarizer: Appending button to actions container.');
      actionsContainer.appendChild(summarizeButton);
    }
    console.log('YouTube Transcript Summarizer: Summarize button created and injected.');
  } else {
    console.warn('YouTube Transcript Summarizer: Could not find a suitable actions container for summarize button after trying all selectors. Will retry...');
    
    const retryCount = parseInt(document.body.dataset.summarizeButtonRetry || '0');
    if (retryCount < 5) { 
        document.body.dataset.summarizeButtonRetry = (retryCount + 1).toString();
        setTimeout(createSummarizeButton, 2000); 
    } else {
        console.error('YouTube Transcript Summarizer: Max retries reached for creating summarize button.');
        delete document.body.dataset.summarizeButtonRetry;
    }
  }
}


function createTranscriptSidebar(): void {
  console.log('YouTube Transcript Summarizer: createTranscriptSidebar called.');
  const existingSidebar = document.querySelector<HTMLElement>('#yt-transcript-sidebar');
  if (existingSidebar) existingSidebar.remove();

  const sidebar = document.createElement('div') as HTMLDivElement;
  sidebar.id = 'yt-transcript-sidebar';
  sidebar.className = 'yt-transcript-sidebar hidden';
  sidebar.innerHTML = `
    <div class="yt-transcript-header">
      <h3>Video Transcript</h3>
      <div class="yt-transcript-controls">
        <button id="yt-copy-transcript" title="Copy transcript">Copy</button>
        <button id="yt-toggle-sidebar" title="Toggle transcript visibility">Show</button>
      </div>
    </div>
    <div class="yt-transcript-content">
      <div id="yt-transcript-text">Loading transcript...</div>
    </div>
  `;
  const copyButton = sidebar.querySelector<HTMLButtonElement>('#yt-copy-transcript');
  const toggleButton = sidebar.querySelector<HTMLButtonElement>('#yt-toggle-sidebar');
  copyButton?.addEventListener('click', copyTranscript);
  toggleButton?.addEventListener('click', toggleSidebar);
  document.body.appendChild(sidebar);
  console.log('YouTube Transcript Summarizer: Transcript sidebar created and appended.');
}

async function extractTranscript(): Promise<boolean> {
  console.log('YouTube Transcript Summarizer: extractTranscript CALLED.');
  transcriptData = "";
  let videoId: string | null = null;

  try {
    console.log('YouTube Transcript Summarizer: extractTranscript - Inside try block.');
    try {
      videoId = getVideoIdFromUrl();
      console.log(`YouTube Transcript Summarizer: extractTranscript - getVideoIdFromUrl result: ${videoId}`);
    } catch (e) {
      console.error('YouTube Transcript Summarizer: extractTranscript - Error in getVideoIdFromUrl:', e);
      displayTranscript('Error getting video ID.');
      return false;
    }

    if (!videoId) {
      console.error('YouTube Transcript Summarizer: extractTranscript - Could not extract video ID.');
      displayTranscript('Could not determine video ID to fetch transcript.');
      return false;
    }
    console.log('YouTube Transcript Summarizer: extractTranscript - Video ID found:', videoId);

    const directTranscriptButtonSelector = 'ytd-video-description-transcript-section-renderer button[aria-label="Show transcript"]';
    let transcriptOpenerButton: HTMLElement | null = document.querySelector<HTMLElement>(directTranscriptButtonSelector);

    console.log('YouTube Transcript Summarizer: extractTranscript - Querying for direct transcript button with selector:', directTranscriptButtonSelector);

    if (transcriptOpenerButton) {
        console.log('YouTube Transcript Summarizer: extractTranscript - Found DIRECT "Show transcript" button.', transcriptOpenerButton);
    } else {
        console.warn('YouTube Transcript Summarizer: extractTranscript - Direct "Show transcript" button not found. Trying menu-based fallback...');
        const menuButtonSelector = 
            '#description-inline-expander ~ #actions ytd-menu-renderer button[aria-label="Action menu"],' +
            '#meta #menu.ytd-video-primary-info-renderer button[aria-label="More actions"],' + 
            '#actions-inner ytd-menu-renderer button[aria-label="Action menu"],' +
            'ytd-menu-renderer[class*="video-actions"] button[aria-label*="menu" i]';

        const menuButton = document.querySelector<HTMLElement>(menuButtonSelector);

        if (menuButton) {
            console.log('YouTube Transcript Summarizer: extractTranscript - Found action menu button for fallback. Clicking it.', menuButton);
            menuButton.click();
            await new Promise(resolve => setTimeout(resolve, 700)); 
            console.log('YouTube Transcript Summarizer: extractTranscript - Waited for menu. Querying for "Show transcript" item.');
            
            const menuItems = document.querySelectorAll<HTMLElement>('ytd-menu-service-item-renderer, tp-yt-paper-item');
            for (const item of Array.from(menuItems)) {
                const itemText = item.textContent?.trim().toLowerCase();
                if (item.offsetParent !== null && itemText && (itemText.includes('show transcript') || itemText.includes('open transcript'))) {
                    transcriptOpenerButton = item;
                    console.log('YouTube Transcript Summarizer: extractTranscript - Found VISIBLE "Show transcript" in menu item text. Item:', transcriptOpenerButton);
                    break;
                }
            }

            if (!transcriptOpenerButton) {
                 console.warn('YouTube Transcript Summarizer: extractTranscript - "Show transcript" menu item NOT found after clicking menu (or not visible). Trying specific renderer path for menu item.');
                 transcriptOpenerButton = document.querySelector<HTMLElement>('ytd-menu-popup-renderer ytd-menu-service-item-renderer yt-formatted-string[aria-label*="Show transcript"], ytd-menu-popup-renderer tp-yt-paper-item yt-formatted-string[aria-label*="Show transcript"]');
                 if(transcriptOpenerButton) {
                    console.log('YouTube Transcript Summarizer: extractTranscript - Found "Show transcript" via specific renderer path in popup.', transcriptOpenerButton);
                    transcriptOpenerButton = transcriptOpenerButton.closest('ytd-menu-service-item-renderer, tp-yt-paper-item');
                 } else {
                    console.warn('YouTube Transcript Summarizer: extractTranscript - "Show transcript" still NOT found via specific renderer path in popup.');
                 }
            }
        } else {
            console.warn('YouTube Transcript Summarizer: extractTranscript - Action menu button for fallback also NOT found.');
        }
    }

    if (transcriptOpenerButton) {
      console.log('YouTube Transcript Summarizer: extractTranscript - Effective transcript opener button found/selected. About to click.', transcriptOpenerButton);
      transcriptOpenerButton.click();
      console.log('YouTube Transcript Summarizer: extractTranscript - Transcript opener button clicked. About to wait 2500ms for panel.');
      await new Promise(resolve => setTimeout(resolve, 2500)); 
      console.log('YouTube Transcript Summarizer: extractTranscript - Waited after transcript opener button click.');
    } else {
      console.warn('YouTube Transcript Summarizer: extractTranscript - No button found to open transcript panel after all attempts.');
    }

    console.log('YouTube Transcript Summarizer: extractTranscript - About to call fetchTranscriptData.');
    const transcript = await fetchTranscriptData(videoId);
    console.log('YouTube Transcript Summarizer: extractTranscript - fetchTranscriptData returned. Transcript value:', transcript ? `"${transcript.substring(0,50)}..."` : transcript);

    if (transcript && transcript.trim() !== '') {
      transcriptData = transcript;
      console.log('YouTube Transcript Summarizer: extractTranscript - Transcript extracted successfully. RAW transcriptData SET TO: ---', transcriptData.substring(0, 100) + (transcriptData.length > 100 ? "..." : ""), '--- Length:', transcriptData.length);
      displayTranscript(transcript);
      return true;
    } else {
      console.warn('YouTube Transcript Summarizer: extractTranscript - No transcript content found after fetchTranscriptData.');
      displayTranscript('No transcript available for this video, or it could not be extracted.');
      return false;
    }
  } catch (error) {
    transcriptData = "";
    console.error('YouTube Transcript Summarizer: extractTranscript - CATCH BLOCK ERROR:', error);
    displayTranscript('Error loading transcript.');
    return false;
  }
}

function getVideoIdFromUrl(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

async function fetchTranscriptData(videoId: string): Promise<string | null> {
  console.log('YouTube Transcript Summarizer: fetchTranscriptData CALLED with videoId:', videoId);
  try {
    console.log('YouTube Transcript Summarizer: fetchTranscriptData - Inside try. About to wait 1000ms.');
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    console.log('YouTube Transcript Summarizer: fetchTranscriptData - Waited 1000ms. Starting DOM query for transcript segments...');

    const primarySelector = 'ytd-transcript-segment-renderer'; 
    console.log('YouTube Transcript Summarizer: fetchTranscriptData - Querying with primary selector:', primarySelector);
    const transcriptItems = document.querySelectorAll<HTMLElement>(primarySelector);
    console.log(`YouTube Transcript Summarizer: fetchTranscriptData - Found ${transcriptItems.length} primary transcript items.`);

    if (transcriptItems.length > 0) {
      let transcriptText = '';
      transcriptItems.forEach((item: HTMLElement) => { 
        const textElement = item.querySelector<HTMLElement>('.segment-text'); 
        if (textElement && textElement.textContent) {
          transcriptText += textElement.textContent.trim() + ' ';
        }
      });
      const extracted = transcriptText.trim();
      console.log('YouTube Transcript Summarizer: fetchTranscriptData - Extracted from primary: ---', extracted.substring(0,100) + (extracted.length > 100 ? "..." : ""), '--- Length:', extracted.length);
      return extracted || null; 
    } else {
      console.warn('YouTube Transcript Summarizer: fetchTranscriptData - Primary selector found no items. This usually means the transcript panel is not open or visible.');
    }
    console.warn('YouTube Transcript Summarizer: fetchTranscriptData - No transcript segments found using primary selector.');
    return null;
  } catch (error) {
    console.error('YouTube Transcript Summarizer: fetchTranscriptData - CATCH BLOCK ERROR:', error);
    return null;
  }
}

function displayTranscript(transcript: string): void {
  const transcriptElement = document.querySelector<HTMLElement>('#yt-transcript-text');
  if (transcriptElement) {
    transcriptElement.textContent = transcript;
  } else {
    console.warn("YouTube Transcript Summarizer: displayTranscript - #yt-transcript-text element not found.");
  }
}

async function handleSummarizeClick(): Promise<void> {
  console.log('YouTube Transcript Summarizer: handleSummarizeClick CALLED.');
  let success = false;

  console.log('YouTube Transcript Summarizer: handleSummarizeClick - Current transcriptData at start: ---', transcriptData.substring(0,100) + (transcriptData.length > 100 ? "..." : ""), '--- Length:', transcriptData?.length);
  if (!transcriptData || transcriptData.trim() === '') {
    console.log('YouTube Transcript Summarizer: handleSummarizeClick - transcriptData is empty, attempting re-extraction...');
    success = await extractTranscript();
  } else {
    console.log('YouTube Transcript Summarizer: handleSummarizeClick - transcriptData already exists.');
    success = true;
  }

  console.log('YouTube Transcript Summarizer: handleSummarizeClick - Transcript extraction final success status:', success);
  console.log('YouTube Transcript Summarizer: handleSummarizeClick - Current transcriptData after all attempts: ---', transcriptData.substring(0,100) + (transcriptData.length > 100 ? "..." : ""), '--- Length:', transcriptData?.length);

  if (!success || !transcriptData || transcriptData.trim() === '') {
    alert('No transcript available or could not be extracted. Please ensure the video has a transcript and try again.');
    return;
  }

  const preferences = await getStoredPreferences();
  if (!preferences.aiPlatform || !preferences.customPrompt) {
    console.log('YouTube Transcript Summarizer: handleSummarizeClick - No preferences found, showing setup modal.');
    showSetupModal();
  } else {
    console.log('YouTube Transcript Summarizer: handleSummarizeClick - Preferences found, proceeding to open AI platform.');
    await openAIPlatform(preferences.aiPlatform, preferences.customPrompt, transcriptData);
  }
}

async function getStoredPreferences(): Promise<UserPreferences> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['aiPlatform', 'customPrompt'], (result) => {
      resolve({
        aiPlatform: (result.aiPlatform as UserPreferences['aiPlatform']) || null,
        customPrompt: result.customPrompt || 'Summarize this YouTube video: [transcript]'
      });
    });
  });
}

function showSetupModal(): void {
  console.log('YouTube Transcript Summarizer: showSetupModal called.');
  const existingModal = document.querySelector<HTMLElement>('#yt-setup-modal');
  if (existingModal) existingModal.remove();
  const modal = document.createElement('div') as HTMLDivElement;
  modal.id = 'yt-setup-modal';
  modal.className = 'yt-setup-modal';
  modal.innerHTML = `
    <div class="yt-setup-content">
      <h2>Setup AI Platform</h2>
      <p>Choose your preferred AI platform for summarizing:</p>
      <div class="yt-platform-selection">
        <label><input type="radio" name="aiPlatform" value="chatgpt" checked> ChatGPT (chat.openai.com)</label>
        <label><input type="radio" name="aiPlatform" value="gemini"> Gemini (gemini.google.com)</label>
        <label><input type="radio" name="aiPlatform" value="claude"> Claude (claude.ai)</label>
      </div>
      <div class="yt-prompt-section">
        <label for="customPromptModal">Custom Prompt (use [transcript] for placeholder):</label>
        <textarea id="customPromptModal" rows="3" placeholder="Summarize this YouTube video: [transcript]">${'Summarize this YouTube video: [transcript]'}</textarea>
        <small>Use [transcript] where you want the video transcript to be inserted.</small>
      </div>
      <div class="yt-setup-buttons">
        <button id="yt-setup-cancel">Cancel</button>
        <button id="yt-setup-save">Save & Summarize</button>
      </div>
    </div>
  `;

  getStoredPreferences().then(prefs => {
    const customPromptElement = modal.querySelector<HTMLTextAreaElement>('#customPromptModal');
    if (customPromptElement && prefs.customPrompt) {
        customPromptElement.value = prefs.customPrompt;
    }
    if (prefs.aiPlatform) {
        const platformRadio = modal.querySelector<HTMLInputElement>(`input[name="aiPlatform"][value="${prefs.aiPlatform}"]`);
        if (platformRadio) {
            platformRadio.checked = true;
        }
    }
  });

  const cancelButton = modal.querySelector<HTMLButtonElement>('#yt-setup-cancel');
  const saveButton = modal.querySelector<HTMLButtonElement>('#yt-setup-save');
  cancelButton?.addEventListener('click', () => modal.remove());
  saveButton?.addEventListener('click', async () => {
    console.log('YouTube Transcript Summarizer: Setup modal - Save button clicked.');
    const selectedPlatformElement = modal.querySelector<HTMLInputElement>('input[name="aiPlatform"]:checked');
    const customPromptElement = modal.querySelector<HTMLTextAreaElement>('#customPromptModal');
    const selectedPlatform = selectedPlatformElement?.value as UserPreferences['aiPlatform'];
    const customPrompt = customPromptElement?.value || 'Summarize this YouTube video: [transcript]';

    if (!selectedPlatform) {
      alert("Please select an AI platform.");
      return;
    }
    if (!transcriptData || transcriptData.trim() === '') {
        console.warn("YouTube Transcript Summarizer: Setup modal - Cannot save, transcriptData is empty.");
        alert("Cannot save settings because no transcript is currently available. Please try again on a video with a transcript.");
        return;
    }

    chrome.storage.local.set({ aiPlatform: selectedPlatform, customPrompt: customPrompt }, () => {
      console.log('YouTube Transcript Summarizer: Setup modal - Preferences saved.');
      modal.remove();
      if (selectedPlatform) openAIPlatform(selectedPlatform, customPrompt, transcriptData);
    });
  });
  document.body.appendChild(modal);
  console.log('YouTube Transcript Summarizer: Setup modal appended to body.');
}

async function openAIPlatform(platform: NonNullable<UserPreferences['aiPlatform']>, promptTemplate: string, transcript: string): Promise<void> {
  console.log('YouTube Transcript Summarizer: openAIPlatform CALLED. Platform:', platform, 'Transcript length:', transcript?.length);

  if (!transcript || transcript.trim() === '') {
    console.error('YouTube Transcript Summarizer: openAIPlatform - Called with empty transcript. Aborting.');
    alert('Cannot summarize an empty transcript. Aborting.');
    return;
  }

  const textToCopy = promptTemplate.replace(/\[transcript\]/gi, transcript);
  console.log('YouTube Transcript Summarizer: openAIPlatform - Text to copy. Length:', textToCopy.length, 'Content:', textToCopy.substring(0,100) + "...");

  try {
    await navigator.clipboard.writeText(textToCopy);
    console.log('YouTube Transcript Summarizer: openAIPlatform - Prompt + Transcript copied to clipboard (SUCCESS)');
    alert('Prompt and transcript copied to clipboard! Please paste it into the AI platform.');
  } catch (error) {
    console.error('YouTube Transcript Summarizer: openAIPlatform - Failed to copy to clipboard:', error);
    alert('Could not copy prompt and transcript to clipboard. Please try copying manually from the sidebar or transcript text area.');
  }

  const platformConfig = AI_PLATFORMS[platform];
  if (!platformConfig) {
    console.error('YouTube Transcript Summarizer: openAIPlatform - Unknown AI platform:', platform);
    return;
  }

  const urlToOpen = platformConfig.baseUrl;
  console.log(`YouTube Transcript Summarizer: openAIPlatform - Opening URL for ${platformConfig.name}: ${urlToOpen}`);

  const message: MessageRequest = { action: 'openTab', url: urlToOpen };
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) console.error('YouTube Transcript Summarizer: openAIPlatform - Error sending message to background:', chrome.runtime.lastError.message);
    else if (response && !response.success) console.error('YouTube Transcript Summarizer: openAIPlatform - Background script failed to open tab:', response.error);
    else if (response && response.success) console.log(`YouTube Transcript Summarizer: openAIPlatform - Tab opened successfully for ${platformConfig.name} at ${urlToOpen}`);
    else console.log('YouTube Transcript Summarizer: openAIPlatform - Response from background for openTab:', response);
  });
}

async function copyTranscript(): Promise<void> {
  console.log('YouTube Transcript Summarizer: copyTranscript called.');
  if (transcriptData && transcriptData.trim() !== '') {
    try {
      await navigator.clipboard.writeText(transcriptData);
      alert('Transcript (only) copied to clipboard!');
    } catch (error) {
      console.error('YouTube Transcript Summarizer: Failed to copy transcript:', error);
      alert('Failed to copy transcript to clipboard.');
    }
  } else {
    alert('No transcript data available to copy.');
  }
}

function toggleSidebar(): void {
  console.log('YouTube Transcript Summarizer: toggleSidebar called.');
  const sidebar = document.querySelector<HTMLElement>('#yt-transcript-sidebar');
  const toggleButton = document.querySelector<HTMLButtonElement>('#yt-toggle-sidebar');
  if (!sidebar || !toggleButton) return;
  if (sidebar.classList.contains('hidden')) {
    sidebar.classList.remove('hidden');
    toggleButton.textContent = 'Hide';
    sidebarVisible = true;
  } else {
    sidebar.classList.add('hidden');
    toggleButton.textContent = 'Show';
    sidebarVisible = false;
  }
}

let currentUrl: string = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== currentUrl) {
    console.log('YouTube Transcript Summarizer: URL changed, re-initializing. Old URL:', currentUrl, 'New URL:', window.location.href);
    currentUrl = window.location.href;
    isInitialized = false;
    transcriptData = "";
    const oldButton = document.querySelector('#yt-transcript-summarize-btn');
    if (oldButton) {
        console.log('YouTube Transcript Summarizer: Removing old summarize button.');
        oldButton.remove();
    }
    const oldSidebar = document.querySelector('#yt-transcript-sidebar');
    if (oldSidebar) {
        console.log('YouTube Transcript Summarizer: Removing old sidebar.');
        oldSidebar.remove();
    }
    const oldModal = document.querySelector('#yt-setup-modal');
    if (oldModal) {
        console.log('YouTube Transcript Summarizer: Removing old setup modal.');
        oldModal.remove();
    }
    setTimeout(initialize, 1000);
  }
});
observer.observe(document.body, { childList: true, subtree: true });

console.log('YouTube Transcript Summarizer: Script loaded. Document readyState:', document.readyState);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('YouTube Transcript Summarizer: DOMContentLoaded event fired.');
    initialize();
  });
} else {
  console.log('YouTube Transcript Summarizer: DOM already loaded, calling initialize directly.');
  initialize();
}
