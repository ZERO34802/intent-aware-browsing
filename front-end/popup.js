// DOM elements - resolve when DOM is ready
let startBtn, settingsBtn, endBtn, addNotesBtn, noSessionView, activeSessionView, currentIntentEl;

function initPopup() {
  startBtn = document.getElementById('start-btn');
  settingsBtn = document.getElementById('settings-btn');
  endBtn = document.getElementById('end-btn');
  addNotesBtn = document.getElementById('add-notes-btn');
  noSessionView = document.getElementById('no-session-view');
  activeSessionView = document.getElementById('active-session-view');
  currentIntentEl = document.getElementById('current-intent');

  if (startBtn) startBtn.addEventListener('click', handleStart);
  if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
  if (endBtn) endBtn.addEventListener('click', handleEndSession);
  if (addNotesBtn) addNotesBtn.addEventListener('click', handleAddNotes);

  checkSessionStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPopup);
} else {
  initPopup();
}

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
  try {
    const stored = await chrome.storage.local.get(['sessionId', 'currentIntent']);
    if (!noSessionView || !activeSessionView) return;

    if (stored.sessionId && stored.currentIntent) {
      noSessionView.style.display = 'none';
      activeSessionView.style.display = 'block';
      if (currentIntentEl) currentIntentEl.textContent = stored.currentIntent;
    } else {
      noSessionView.style.display = 'block';
      activeSessionView.style.display = 'none';
    }
  } catch (e) {
    console.error('Error checking session status:', e);
  }
}

/**
 * Handle Add notes for this video - show notes modal on current tab if it's a YouTube video
 */
async function handleAddNotes() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url || !tab.url.includes('youtube.com/watch')) {
      alert('Open a YouTube video page first, then click "Add notes for this video".');
      return;
    }
    const match = tab.url.match(/[?&]v=([^&]+)/);
    const videoId = match ? match[1] : null;
    if (!videoId) {
      alert('Could not detect video. Make sure you are on a YouTube watch page.');
      return;
    }
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (e) { /* already loaded */ }
    await new Promise(r => setTimeout(r, 100));
    chrome.tabs.sendMessage(tab.id, { type: 'SHOW_VIDEO_NOTES_MODAL', videoId: videoId }, (response) => {
      if (chrome.runtime.lastError) {
        alert('Could not open notes. Refresh the YouTube page (F5) and try again.');
        return;
      }
    });
    setTimeout(() => window.close(), 200);
  } catch (error) {
    console.error('Error opening notes:', error);
    alert('Failed to open notes: ' + error.message);
  }
}

/**
 * Handle End Session button click: confirm, then offer "Get session summary?"
 */
async function handleEndSession() {
  if (!confirm('Are you sure you want to end this session?')) {
    return;
  }

  try {
    const stored = await chrome.storage.local.get(['sessionId']);
    const sessionId = stored.sessionId;

    const wantSummary = confirm('Would you like a session summary before you go?');
    if (wantSummary && sessionId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://') && !tab.url.startsWith('about:')) {
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
          await new Promise(r => setTimeout(r, 100));
          chrome.tabs.sendMessage(tab.id, { type: 'SHOW_SESSION_SUMMARY', sessionId }, () => {
            if (chrome.runtime.lastError) {
              console.warn('Could not show summary on tab:', chrome.runtime.lastError.message);
            }
          });
        } catch (e) {
          console.warn('Could not inject or send summary request:', e.message);
        }
      }
      // Don't clear storage yet; content script will clear when summary modal is closed
    } else {
      await clearSessionAndNotify();
    }

    checkSessionStatus();
    setTimeout(() => window.close(), 200);
  } catch (error) {
    console.error('Error ending session:', error);
    alert('Failed to end session: ' + error.message);
  }
}

async function clearSessionAndNotify() {
  await chrome.storage.local.remove(['sessionId', 'currentIntent', 'intentSetAt', 'platform', 'alignmentStatus']);
  chrome.runtime.sendMessage({ type: 'INTENT_CLEARED' });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url?.includes('youtube.com')) {
    chrome.tabs.sendMessage(tab.id, { type: 'INTENT_CLEARED' }).catch(() => {});
  }
}

/**
 * Open settings (placeholder for future implementation)
 */
function openSettings() {
  // TODO: Implement settings page
  alert('Settings coming soon!');
}
