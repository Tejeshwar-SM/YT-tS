import { UserPreferences } from '../types/index';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup loaded');
  
  const platformSelect = document.getElementById('aiPlatform') as HTMLSelectElement;
  const promptTextarea = document.getElementById('customPrompt') as HTMLTextAreaElement;
  const saveButton = document.getElementById('saveSettings') as HTMLButtonElement;
  const resetButton = document.getElementById('resetSettings') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  
  // Load current preferences
  loadPreferences();
  
  // Event listeners
  saveButton?.addEventListener('click', savePreferences);
  resetButton?.addEventListener('click', resetPreferences);
  
  async function loadPreferences(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['aiPlatform', 'customPrompt']);
      
      if (platformSelect) {
        platformSelect.value = result.aiPlatform || '';
      }
      
      if (promptTextarea) {
        promptTextarea.value = result.customPrompt || 'Summarize this YouTube video: [transcript]';
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      showStatus('Error loading preferences', 'error');
    }
  }
  
  async function savePreferences(): Promise<void> {
    try {
      const preferences: Partial<UserPreferences> = {
        aiPlatform: (platformSelect?.value as UserPreferences['aiPlatform']) || null,
        customPrompt: promptTextarea?.value || 'Summarize this YouTube video: [transcript]'
      };
      
      await chrome.storage.local.set(preferences);
      showStatus('Settings saved!', 'success');
    } catch (error) {
      console.error('Error saving preferences:', error);
      showStatus('Error saving settings', 'error');
    }
  }
  
  async function resetPreferences(): Promise<void> {
    try {
      const defaultPreferences: Partial<UserPreferences> = {
        aiPlatform: null,
        customPrompt: 'Summarize this YouTube video: [transcript]'
      };
      
      await chrome.storage.local.set(defaultPreferences);
      
      if (platformSelect) platformSelect.value = '';
      if (promptTextarea) promptTextarea.value = defaultPreferences.customPrompt!;
      
      showStatus('Settings reset to default', 'success');
    } catch (error) {
      console.error('Error resetting preferences:', error);
      showStatus('Error resetting settings', 'error');
    }
  }
  
  function showStatus(message: string, type: 'success' | 'error'): void {
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = `status ${type} visible`;
      
      
      setTimeout(() => {
        statusDiv.classList.remove('visible'); 
      }, 3000);
    }
  }
});