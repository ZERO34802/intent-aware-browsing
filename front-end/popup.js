// DOM elements
const startBtn = document.getElementById('start-btn');
const settingsBtn = document.getElementById('settings-btn');
const endBtn = document.getElementById('end-btn');
const noSessionView = document.getElementById('no-session-view');
const activeSessionView = document.getElementById('active-session-view');
const currentIntentEl = document.getElementById('current-intent');

// Event listeners
startBtn.addEventListener('click', handleStart);
settingsBtn.addEventListener('click', openSettings);
endBtn.addEventListener('click', handleEndSession);

// Check session status on load
checkSessionStatus();

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
 * Check if there's an active session and update UI
 */
async function checkSessionStatus() {
  const stored = await chrome.storage.local.get(['sessionId', 'currentIntent']);
  
  if (stored.sessionId && stored.currentIntent) {
    // Show active session view
    noSessionView.style.display = 'none';
    activeSessionView.style.display = 'block';
    currentIntentEl.textContent = stored.currentIntent;
  } else {
    // Show no session view
    noSessionView.style.display = 'block';
    activeSessionView.style.display = 'none';
  }
}

/**
 * Handle End Session button click
 */
async function handleEndSession() {
  if (!confirm('Are you sure you want to end this session?')) {
    return;
  }

  try {
    // Clear session data
    await chrome.storage.local.remove(['sessionId', 'currentIntent', 'intentSetAt', 'platform', 'alignmentStatus']);
    
    // Notify service worker
    chrome.runtime.sendMessage({ type: 'INTENT_CLEARED' });
    
    // Notify content script (if on YouTube)
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.url && tab.url.includes('youtube.com')) {
      chrome.tabs.sendMessage(tab.id, { type: 'INTENT_CLEARED' });
    }
    
    // Update UI
    checkSessionStatus();
    
    // Close popup
    setTimeout(() => window.close(), 300);
  } catch (error) {
    console.error('Error ending session:', error);
    alert('Failed to end session: ' + error.message);
  }
}

/**
 * Open settings (placeholder for future implementation)
 */
function openSettings() {
  // TODO: Implement settings page
  alert('Settings coming soon!');
}
