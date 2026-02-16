// DOM elements
const startBtn = document.getElementById('start-btn');
const settingsBtn = document.getElementById('settings-btn');

// Event listeners
startBtn.addEventListener('click', handleStart);
settingsBtn.addEventListener('click', openSettings);

/**
 * Handle Start button click
 */
async function handleStart() {
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    console.log('Attempting to send message to tab:', tab.id, tab.url);
    
    // Check if tab URL is restricted
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || 
        tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://')) {
      alert('⚠️ Cannot start on this page.\n\nPlease open a regular website like:\n• youtube.com\n• google.com\n• reddit.com');
      return;
    }
    
    // First, try to inject the content script programmatically (fallback)
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      console.log('Content script injected successfully');
    } catch (injectError) {
      console.log('Content script may already be loaded:', injectError.message);
    }
    
    // Small delay to ensure content script is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Send message to content script to show intent modal
    chrome.tabs.sendMessage(tab.id, { type: 'SHOW_INTENT_MODAL' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error details:', chrome.runtime.lastError);
        alert(`⚠️ Content script not responding.\n\nTroubleshooting:\n1. Refresh this page (F5)\n2. Try a different website\n3. Check console (F12) for errors\n\nError: ${chrome.runtime.lastError.message}`);
        return;
      }
      console.log('Message sent successfully:', response);
    });
    
    // Close the popup after a short delay
    setTimeout(() => window.close(), 200);
    
  } catch (error) {
    console.error('Error starting session:', error);
    alert('Failed to start session: ' + error.message);
  }
}

/**
 * Open settings (placeholder for future implementation)
 */
function openSettings() {
  // TODO: Implement settings page
  alert('Settings coming soon!');
}
