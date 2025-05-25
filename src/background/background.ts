import { MessageRequest, MessageResponse } from '../types/index';

// Handle messages from content script
chrome.runtime.onMessage.addListener(
  (request: MessageRequest, sender: chrome.runtime.MessageSender, sendResponse: (response: MessageResponse) => void) => {
    console.log('Background received message:', request);
    
    switch (request.action) {
      case 'openTab':
        if (request.url) {
          chrome.tabs.create({ url: request.url })
            .then(() => {
              sendResponse({ success: true });
            })
            .catch((error) => {
              console.error('Error opening tab:', error);
              sendResponse({ success: false, error: error.message });
            });
        } else {
          sendResponse({ success: false, error: 'No URL provided' });
        }
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
    
    return true;
     // to keep message channel open for async response
  }
);

// Handle extension installation
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  if (details.reason === 'install') {
    console.log('YouTube Transcript Summarizer installed');
    
    //default preferences
    chrome.storage.local.set({
      customPrompt: 'Summarize this YouTube video: [transcript]'
    });
  }
});

// Handle tab updates to reinitialize content script if needed
chrome.tabs.onUpdated.addListener((tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com/watch')) {
    console.log('YouTube video page loaded');
  }
});
