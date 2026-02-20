// Background service worker — handles scheduling and backend communication
console.log('Intent-Aware Browsing service worker loaded');

// Backend API Configuration
const API_BASE_URL = 'http://localhost:8096';

// Session tracking (separate timers for 30 min and 1 hr)
let sessionTimer30 = null;
let sessionTimer60 = null;
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
    console.log('[IntentAware] SW: CHECK_ALIGNMENT received', { videoId: message.videoId, tabId: sender.tab?.id });
    if (!sender.tab || !sender.tab.id) {
      console.log('[IntentAware] SW: No tab context, aborting');
      sendResponse({ success: false, error: 'No tab context' });
      return true;
    }
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
  if (sessionTimer30) {
    clearTimeout(sessionTimer30);
    sessionTimer30 = null;
  }
  if (sessionTimer60) {
    clearTimeout(sessionTimer60);
    sessionTimer60 = null;
  }
  sessionStartTime = null;
}

/**
 * Schedule a duration prompt
 */
function scheduleDurationPrompt(delayMs) {
  const is30 = delayMs <= 31 * 60 * 1000;
  const existing = is30 ? sessionTimer30 : sessionTimer60;
  if (existing) clearTimeout(existing);

  const id = setTimeout(async () => {
    if (is30) sessionTimer30 = null;
    else sessionTimer60 = null;
    const stored = await chrome.storage.local.get(['currentIntent', 'sessionId']);
    if (!stored.sessionId) return;
    const minutes = Math.floor(delayMs / 60000);
    showDurationPrompt(stored.currentIntent, minutes);
  }, delayMs);
  if (is30) sessionTimer30 = id;
  else sessionTimer60 = id;
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
  const videoId = message.videoId;
  try {
    console.log('[IntentAware] SW: handleAlignmentCheck START videoId=', videoId);
    
    const existingCheck = pendingChecks.get(tabId);
    if (existingCheck) {
      console.log('[IntentAware] SW: Previous check pending for tab', tabId, ', continuing anyway');
    }
    
    pendingChecks.set(tabId, { videoId, timestamp: Date.now() });
    
    console.log('[IntentAware] SW: Waiting 500ms for page render...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const tab = await chrome.tabs.get(tabId);
    const currentVideoId = tab.url ? tab.url.match(/[?&]v=([^&]+)/)?.[1] : null;
    console.log('[IntentAware] SW: Tab URL check - expected videoId:', videoId, 'current:', currentVideoId);
    
    if (currentVideoId !== videoId) {
      console.log('[IntentAware] SW: ABORT - video changed during check');
      pendingChecks.delete(tabId);
      return { success: false, error: 'Video changed during check' };
    }
    
    console.log('[IntentAware] SW: Capturing screenshot...');
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 80
    });
    console.log('[IntentAware] SW: Screenshot captured');
    
    const tabAfterScreenshot = await chrome.tabs.get(tabId);
    const videoIdAfterScreenshot = tabAfterScreenshot.url ? tabAfterScreenshot.url.match(/[?&]v=([^&]+)/)?.[1] : null;
    
    if (videoIdAfterScreenshot !== videoId) {
      console.log('[IntentAware] SW: ABORT - video changed after screenshot');
      pendingChecks.delete(tabId);
      return { success: false, error: 'Video changed after screenshot' };
    }
    
    const base64Screenshot = screenshotDataUrl.split(',')[1];
    
    console.log('[IntentAware] SW: Calling backend', API_BASE_URL + '/api/alignment/check');
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
      let errBody = '';
      try {
        errBody = await response.text();
      } catch (_) {}
      const errMsg = errBody ? `Backend error: ${response.status} - ${errBody}` : `Backend error: ${response.status} ${response.statusText}`;
      console.log('[IntentAware] SW: Backend error', response.status, errBody || response.statusText);
      pendingChecks.delete(tabId);
      throw new Error(errMsg);
    }

    const result = await response.json();
    console.log('[IntentAware] SW: Backend result aligned=', result.aligned, 'reason=', result.reason);

    const finalTab = await chrome.tabs.get(tabId);
    const finalVideoId = finalTab.url ? finalTab.url.match(/[?&]v=([^&]+)/)?.[1] : null;
    
    if (finalVideoId !== videoId) {
      console.log('[IntentAware] SW: ABORT - video changed before sending result');
      pendingChecks.delete(tabId);
      return { success: false, error: 'Video changed before result' };
    }

    console.log('[IntentAware] SW: Sending ALIGNMENT_RESULT to tab', tabId, 'aligned=', result.aligned);
    chrome.tabs.sendMessage(tabId, {
      type: 'ALIGNMENT_RESULT',
      videoId: videoId,
      aligned: result.aligned,
      confidence: result.confidence,
      reason: result.reason,
      timestamp: result.timestamp
    });
    console.log('[IntentAware] SW: ALIGNMENT_RESULT sent');

    pendingChecks.delete(tabId);
    return { success: true, result: result };
  } catch (error) {
    console.error('[IntentAware] SW: handleAlignmentCheck FAILED:', error.message || error);
    pendingChecks.delete(tabId);
    return { success: false, error: error.message };
  }
}
