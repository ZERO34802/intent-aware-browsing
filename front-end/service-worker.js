// Background service worker — handles scheduling and backend communication
console.log('Intent-Aware Browsing service worker loaded');

// Backend API Configuration
const API_BASE_URL = 'http://localhost:8096';

// Session tracking
let sessionTimer = null;
let sessionStartTime = null;

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Intent-Aware Browsing extension installed');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  if (message.type === 'INTENT_SET') {
    console.log('Intent set:', message.intent);
    handleIntentSet(message);
    sendResponse({ success: true });
  } else if (message.type === 'INTENT_CLEARED') {
    console.log('Intent cleared');
    handleIntentCleared();
    sendResponse({ success: true });
  } else if (message.type === 'CHECK_ALIGNMENT') {
    handleAlignmentCheck(message, sender.tab.id)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  return true;
});

/**
 * Handle intent set - start session timers
 */
function handleIntentSet(message) {
  sessionStartTime = Date.now();
  
  // Schedule duration prompts
  scheduleDurationPrompt(30 * 60 * 1000); // 30 minutes
  scheduleDurationPrompt(60 * 60 * 1000); // 1 hour
}

/**
 * Handle intent cleared - stop timers
 */
function handleIntentCleared() {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }
  sessionStartTime = null;
}

/**
 * Schedule a duration prompt
 */
function scheduleDurationPrompt(delay) {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
  }
  
  sessionTimer = setTimeout(async () => {
    const stored = await chrome.storage.local.get(['currentIntent', 'sessionId']);
    if (!stored.sessionId) return; // Session ended
    
    const minutes = Math.floor(delay / 60000);
    showDurationPrompt(stored.currentIntent, minutes);
  }, delay);
}

/**
 * Show duration prompt to user
 */
async function showDurationPrompt(intent, minutes) {
  // Find active YouTube tab
  const tabs = await chrome.tabs.query({ url: '*://*.youtube.com/*' });
  if (tabs.length === 0) return;
  
  const tab = tabs[0];
  
  // Inject prompt into content script
  chrome.tabs.sendMessage(tab.id, {
    type: 'SHOW_DURATION_PROMPT',
    intent: intent,
    minutes: minutes
  });
}

// Track pending alignment checks to prevent race conditions
const pendingChecks = new Map();

/**
 * Handle alignment check - capture screenshot and call backend
 */
async function handleAlignmentCheck(message, tabId) {
  try {
    const videoId = message.videoId;
    console.log('Checking alignment for video:', videoId);
    
    // Cancel any pending check for this tab
    const existingCheck = pendingChecks.get(tabId);
    if (existingCheck) {
      console.log('Cancelling previous check for tab:', tabId);
      // Note: We can't actually cancel the fetch, but we'll ignore stale results
    }
    
    // Store this check
    pendingChecks.set(tabId, { videoId, timestamp: Date.now() });
    
    // Small delay to ensure page is fully rendered
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify tab still exists and URL matches
    const tab = await chrome.tabs.get(tabId);
    const currentVideoId = tab.url ? tab.url.match(/[?&]v=([^&]+)/)?.[1] : null;
    
    if (currentVideoId !== videoId) {
      console.log('Video changed during check, aborting. Expected:', videoId, 'Current:', currentVideoId);
      pendingChecks.delete(tabId);
      return { success: false, error: 'Video changed during check' };
    }
    
    // 1. Capture screenshot
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 80
    });
    
    // Verify video hasn't changed after screenshot
    const tabAfterScreenshot = await chrome.tabs.get(tabId);
    const videoIdAfterScreenshot = tabAfterScreenshot.url ? tabAfterScreenshot.url.match(/[?&]v=([^&]+)/)?.[1] : null;
    
    if (videoIdAfterScreenshot !== videoId) {
      console.log('Video changed after screenshot, ignoring result');
      pendingChecks.delete(tabId);
      return { success: false, error: 'Video changed after screenshot' };
    }
    
    // Convert data URL to base64 (remove data:image/png;base64, prefix)
    const base64Screenshot = screenshotDataUrl.split(',')[1];
    
    // 2. Call backend API
    const response = await fetch(`${API_BASE_URL}/api/alignment/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: message.sessionId,
        videoId: videoId,
        videoUrl: message.videoUrl,
        screenshot: base64Screenshot,
        timestamp: message.timestamp
      }),
    });

    if (!response.ok) {
      pendingChecks.delete(tabId);
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('Alignment result:', result);

    // Final verification before sending result
    const finalTab = await chrome.tabs.get(tabId);
    const finalVideoId = finalTab.url ? finalTab.url.match(/[?&]v=([^&]+)/)?.[1] : null;
    
    if (finalVideoId !== videoId) {
      console.log('Video changed before sending result, ignoring');
      pendingChecks.delete(tabId);
      return { success: false, error: 'Video changed before result' };
    }

    // 3. Send result to content script with videoId for verification
    chrome.tabs.sendMessage(tabId, {
      type: 'ALIGNMENT_RESULT',
      videoId: videoId, // Include videoId so content script can verify
      aligned: result.aligned,
      confidence: result.confidence,
      reason: result.reason,
      timestamp: result.timestamp
    });

    pendingChecks.delete(tabId);
    return { success: true, result: result };
  } catch (error) {
    console.error('Error checking alignment:', error);
    pendingChecks.delete(tabId);
    return { success: false, error: error.message };
  }
}
