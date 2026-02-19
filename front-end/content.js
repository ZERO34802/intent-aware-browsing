// Content script — runs on web pages
// Backend API Configuration - use window to avoid redeclaration
if (typeof window.__INTENT_AWARE_API_BASE_URL__ === 'undefined') {
  window.__INTENT_AWARE_API_BASE_URL__ = "http://localhost:8096";
}
const API_BASE_URL = window.__INTENT_AWARE_API_BASE_URL__;

// Define showIntentModal FIRST so it's always available when listener runs
// This function will be defined immediately, before the message listener
function showIntentModal() {
  // Check if modal already exists
  if (document.getElementById("intent-modal-overlay")) {
    return;
  }
  
  // Also attach to window for persistence across re-injections
  window.__showIntentModal = showIntentModal;

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.id = "intent-modal-overlay";
  overlay.innerHTML = `
    <div class="intent-modal">
      <h2>What's your browsing intention?</h2>
      <p class="modal-subtitle">Define your goal to help you stay focused</p>
      <textarea 
        id="intent-input" 
        placeholder="e.g., Learn about React hooks, Research vacation destinations, Watch cooking tutorials..."
        rows="4"
      ></textarea>
      <div class="button-group">
        <button id="submit-intent" class="btn-submit">Start Monitoring</button>
        <button id="cancel-intent" class="btn-cancel">Cancel</button>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement("style");
  style.id = "intent-modal-styles";
  style.textContent = `
    #intent-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.75);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      animation: fadeIn 0.2s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .intent-modal {
      background: white;
      padding: 32px;
      border-radius: 16px;
      width: 500px;
      max-width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.3s ease;
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .intent-modal h2 {
      margin: 0 0 8px 0;
      font-size: 24px;
      color: #333;
      font-weight: 600;
    }
    
    .modal-subtitle {
      margin: 0 0 20px 0;
      color: #666;
      font-size: 14px;
    }
    
    .intent-modal textarea {
      width: 100%;
      padding: 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 15px;
      min-height: 100px;
      font-family: inherit;
      resize: vertical;
      transition: border-color 0.2s;
      box-sizing: border-box;
    }
    
    .intent-modal textarea:focus {
      outline: none;
      border-color: #667eea;
    }
    
    .intent-modal textarea::placeholder {
      color: #aaa;
    }
    
    .button-group {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }
    
    .intent-modal button {
      flex: 1;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    #submit-intent {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    #submit-intent:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    #submit-intent:active {
      transform: translateY(0);
    }
    
    #cancel-intent {
      background: #e9ecef;
      color: #495057;
    }
    
    #cancel-intent:hover {
      background: #dee2e6;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Focus the textarea
  setTimeout(() => {
    document.getElementById("intent-input").focus();
  }, 100);

  // Handle submit
  document
    .getElementById("submit-intent")
    .addEventListener("click", handleSubmit);

  // Handle cancel
  document
    .getElementById("cancel-intent")
    .addEventListener("click", closeModal);

  // Handle Enter key (Ctrl/Cmd + Enter to submit)
  document.getElementById("intent-input").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleSubmit();
    }
  });

  // Close on overlay click
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });
}

// Define helper functions BEFORE the listener so they're always available
/**
 * Extract video ID from YouTube URL
 */
function getYouTubeVideoId(url) {
  try {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
}

/**
 * Check if current page is YouTube video page
 */
function isYouTubeVideoPage(url) {
  try {
    return url.includes('youtube.com/watch');
  } catch (e) {
    return false;
  }
}

// Declare variables used by functions (will be initialized later)
let lastUrl = '';
let lastVideoId = null;
let isMonitoring = false;
let pendingCheckVideoId = null;
let urlChangeTimeout = null;
let urlCheckInterval = null;
let urlObserver = null;

// Initialize URL tracking safely
try {
  lastUrl = window.location.href;
  lastVideoId = getYouTubeVideoId(lastUrl);
} catch (e) {
  console.log('Could not initialize URL tracking:', e.message || e);
}

// Listen for messages from popup and service worker (ALWAYS set up, even on re-injection)
// Single unified listener to handle all message types
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message);

  // Handle SHOW_INTENT_MODAL from popup
  if (message.type === "SHOW_INTENT_MODAL") {
    try {
      // showIntentModal is now defined above, so it's always available
      showIntentModal();
      console.log("Modal shown successfully");
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error showing modal:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  // Handle ALIGNMENT_RESULT from service worker
  if (message.type === 'ALIGNMENT_RESULT') {
    try {
      // Verify this result is for the current video (ignore stale results)
      let currentVideoId = null;
      try {
        currentVideoId = getYouTubeVideoId(window.location.href);
      } catch (e) {
        console.log('Could not get current video ID:', e.message || e);
        sendResponse({ success: false, error: 'Extension context invalidated' });
        return true;
      }
      
      if (message.videoId && message.videoId !== currentVideoId) {
        console.log('Ignoring stale alignment result for video:', message.videoId, 'Current:', currentVideoId);
        sendResponse({ success: true, ignored: true });
        return true;
      }

      // Clear pending check
      if (pendingCheckVideoId === message.videoId) {
        pendingCheckVideoId = null;
      }

      chrome.storage.local.get(['currentIntent']).then(stored => {
        try {
          showAlignmentFeedback(
            message.aligned,
            message.reason,
            stored.currentIntent || 'your intent'
          );
        } catch (e) {
          console.error('Error showing alignment feedback:', e);
        }
      }).catch(e => {
        console.error('Error getting intent from storage:', e);
      });
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error handling alignment result:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  // Handle SHOW_DURATION_PROMPT from service worker
  if (message.type === 'SHOW_DURATION_PROMPT') {
    try {
      showDurationPrompt(message.intent, message.minutes);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error showing duration prompt:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  return true;
});

// showIntentModal is now defined above, before the message listener

// Prevent re-execution on SPA navigation or extension reload
(function() {
  'use strict';
  
  // Skip if already initialized
  if (window.__INTENT_AWARE_INITIALIZED__) {
    console.log('Content script already initialized, skipping re-initialization');
    return;
  }
  window.__INTENT_AWARE_INITIALIZED__ = true;

  console.log(
    "Intent-Aware Browsing content script loaded on:",
    window.location.href,
  );
})(); // End IIFE - prevents redeclaration errors

/**
 * Detect which platform the user is on
 * Defined outside IIFE so it's always available
 */
function detectPlatform(url) {
  if (url.includes("youtube.com")) {
    return "youtube";
  } else if (url.includes("reddit.com")) {
    return "reddit";
  } else if (url.includes("twitter.com") || url.includes("x.com")) {
    return "twitter";
  } else if (url.includes("facebook.com")) {
    return "facebook";
  } else if (url.includes("instagram.com")) {
    return "instagram";
  } else {
    return "web"; // generic
  }
}

/**
 * Handle intent submission
 * Defined outside IIFE so it's always available
 */
async function handleSubmit() {
  const intent = document.getElementById("intent-input").value.trim();

  if (!intent) {
    alert("Please enter your browsing intention");
    return;
  }

  try {
    // 1. Detect platform
    const platform = detectPlatform(window.location.href);
    const timestamp = Date.now();

    console.log("Starting session:", { intent, platform, timestamp });

    // 2. Call backend API to create session
    const response = await fetch(`${API_BASE_URL}/api/sessions/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: intent,
        platform: platform,
        timestamp: timestamp,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Backend error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    console.log("Session created:", data);
    // Expected: { sessionId: "uuid-...", status: "active", createdAt: ... }

    // 3. Save intent + sessionId to Chrome storage
    await chrome.storage.local.set({
      currentIntent: intent,
      sessionId: data.sessionId,
      intentSetAt: timestamp,
      platform: platform,
      alignmentStatus: "monitoring",
    });

    // 4. Notify background script to start monitoring
    chrome.runtime.sendMessage({
      type: "INTENT_SET",
      intent: intent,
      sessionId: data.sessionId,
      platform: platform,
    });

    // 5. Show success feedback
    showSuccessMessage(intent);

    // Remove modal
    closeModal();
  } catch (error) {
    console.error("Error creating session:", error);

    // User-friendly error message
    let errorMsg = "Failed to start session. ";
    if (error.message.includes("fetch")) {
      errorMsg +=
        "Cannot connect to backend server. Make sure it's running at " +
        API_BASE_URL;
    } else {
      errorMsg += error.message;
    }

    alert(errorMsg);
  }
}

/**
 * Close the modal
 * Defined outside IIFE so it's always available
 */
function closeModal() {
  const overlay = document.getElementById("intent-modal-overlay");
  const style = document.getElementById("intent-modal-styles");

  if (overlay) {
    overlay.style.animation = "fadeOut 0.2s ease";
    setTimeout(() => overlay.remove(), 200);
  }
  if (style) {
    style.remove();
  }
}

/**
 * Show success message briefly
 * Defined outside IIFE so it's always available
 */
function showSuccessMessage(intent) {
  const message = document.createElement("div");
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
  `;
  message.innerHTML = `
    <strong>✓ Intent Set!</strong><br>
    <span style="opacity: 0.9; font-size: 13px;">${intent}</span>
  `;

  document.body.appendChild(message);

  setTimeout(() => {
    message.style.animation = "fadeOut 0.3s ease";
    setTimeout(() => message.remove(), 300);
  }, 3000);
}

// Helper function to safely add animations (wrap in try-catch to handle extension context invalidation)
function ensureAnimations() {
  try {
    if (document.head && !document.getElementById('intent-aware-animations')) {
      const animations = document.createElement("style");
      animations.id = 'intent-aware-animations';
      animations.textContent = `
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(animations);
    }
  } catch (e) {
    // Extension context invalidated - ignore silently
    console.log('Could not add animations:', e.message || e);
  }
}

// Initialize animations immediately if DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureAnimations);
} else {
  ensureAnimations();
}

// ============================================
// URL Change Detection & Alignment Checking
// ============================================
// Variables and functions are defined above, before the listener

/**
 * Start monitoring URL changes for alignment checks
 */
async function startUrlMonitoring() {
  let stored;
  try {
    stored = await chrome.storage.local.get(['sessionId', 'currentIntent']);
  } catch (e) {
    // Extension context invalidated
    console.log('Extension context invalidated, cannot start monitoring');
    return;
  }
  
  if (!stored.sessionId || !stored.currentIntent) {
    console.log('No active session, skipping URL monitoring');
    return;
  }

  // Clear any existing monitoring
  stopUrlMonitoring();

  isMonitoring = true;
  try {
    lastUrl = window.location.href;
    lastVideoId = getYouTubeVideoId(lastUrl);
  } catch (e) {
    console.error('Error accessing window.location:', e);
    return;
  }

  // Monitor URL changes (YouTube uses history API for navigation)
  let currentUrl = window.location.href;
  urlCheckInterval = setInterval(() => {
    try {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        handleUrlChange(currentUrl);
      }
    } catch (e) {
      // Extension context invalidated - stop monitoring
      console.log('Extension context invalidated, stopping URL monitoring');
      stopUrlMonitoring();
    }
  }, 500); // Check every 500ms

  // Also listen to popstate (back/forward navigation)
  const popstateHandler = () => {
    try {
      handleUrlChange(window.location.href);
    } catch (e) {
      console.log('Error in popstate handler:', e);
      stopUrlMonitoring();
    }
  };
  window.addEventListener('popstate', popstateHandler);
  window.__INTENT_AWARE_POPSTATE_HANDLER__ = popstateHandler; // Store for cleanup

  // Listen to YouTube's navigation events (SPA navigation)
  urlObserver = new MutationObserver(() => {
    try {
      const newUrl = window.location.href;
      if (newUrl !== lastUrl) {
        handleUrlChange(newUrl);
      }
    } catch (e) {
      console.log('Error in MutationObserver:', e);
      stopUrlMonitoring();
    }
  });

  try {
    urlObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  } catch (e) {
    console.error('Error setting up MutationObserver:', e);
  }

  console.log('URL monitoring started');
}

/**
 * Stop URL monitoring and cleanup
 */
function stopUrlMonitoring() {
  isMonitoring = false;
  
  if (urlCheckInterval) {
    clearInterval(urlCheckInterval);
    urlCheckInterval = null;
  }
  
  if (urlObserver) {
    urlObserver.disconnect();
    urlObserver = null;
  }
  
  if (urlChangeTimeout) {
    clearTimeout(urlChangeTimeout);
    urlChangeTimeout = null;
  }
  
  if (window.__INTENT_AWARE_POPSTATE_HANDLER__) {
    window.removeEventListener('popstate', window.__INTENT_AWARE_POPSTATE_HANDLER__);
    window.__INTENT_AWARE_POPSTATE_HANDLER__ = null;
  }
}

/**
 * Handle URL change - check alignment if it's a YouTube video
 */
async function handleUrlChange(newUrl) {
  if (!isMonitoring) return;

  let stored;
  try {
    stored = await chrome.storage.local.get(['sessionId', 'currentIntent']);
    if (!stored.sessionId) {
      stopUrlMonitoring();
      return;
    }
  } catch (e) {
    // Extension context invalidated
    console.log('Extension context invalidated in handleUrlChange');
    stopUrlMonitoring();
    return;
  }

  // Only check YouTube video pages
  if (!isYouTubeVideoPage(newUrl)) {
    lastUrl = newUrl;
    return;
  }

  const newVideoId = getYouTubeVideoId(newUrl);
  
  // Skip if same video (user might refresh or scroll)
  if (newVideoId === lastVideoId) {
    return;
  }

  // Cancel any pending check
  if (urlChangeTimeout) {
    clearTimeout(urlChangeTimeout);
    urlChangeTimeout = null;
  }

  // Update state immediately
  lastVideoId = newVideoId;
  lastUrl = newUrl;
  pendingCheckVideoId = newVideoId; // Track what we're about to check

  console.log('YouTube video changed:', newVideoId);

  // Store sessionId for use in setTimeout callback
  const sessionId = stored.sessionId;

  // Debounce: Wait 1.5 seconds for page to fully load before checking
  // This ensures the screenshot captures the correct video
  urlChangeTimeout = setTimeout(() => {
    try {
      // Double-check video hasn't changed again during the delay
      const currentVideoId = getYouTubeVideoId(window.location.href);
      if (currentVideoId !== newVideoId) {
        console.log('Video changed again during delay, skipping check');
        pendingCheckVideoId = null;
        return;
      }

      // Request screenshot capture and alignment check
      chrome.runtime.sendMessage({
        type: 'CHECK_ALIGNMENT',
        sessionId: sessionId,
        videoId: newVideoId,
        videoUrl: newUrl,
        timestamp: Date.now()
      }, (response) => {
        // Handle response or errors
        if (chrome.runtime.lastError) {
          console.log('Error sending alignment check message:', chrome.runtime.lastError.message);
          pendingCheckVideoId = null;
        }
      });
    } catch (e) {
      // Extension context invalidated or other error
      console.log('Error in alignment check timeout:', e.message || e);
      pendingCheckVideoId = null;
      stopUrlMonitoring();
    }
  }, 1500); // 1.5 second delay
}

/**
 * Show alignment feedback notification
 */
function showAlignmentFeedback(aligned, reason, intent) {
  try {
    // Remove existing feedback if any
    const existing = document.getElementById('alignment-feedback');
    const existingModal = document.getElementById('misalignment-modal-overlay');
    if (existing) {
      existing.remove();
    }
    if (existingModal) {
      existingModal.remove();
    }
  } catch (e) {
    console.log('Could not remove existing feedback:', e.message || e);
  }
  
  try {
    if (aligned) {
      // Small popup on the right for aligned
      const feedback = document.createElement('div');
      feedback.id = 'alignment-feedback';
      feedback.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-width: 350px;
        animation: slideInRight 0.3s ease;
      `;
      feedback.innerHTML = `
        <strong>✓ Aligned!</strong><br>
        <span style="opacity: 0.9; font-size: 13px;">${reason || 'You\'re on track'}</span>
      `;
      document.body.appendChild(feedback);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        try {
          feedback.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => {
            try {
              feedback.remove();
            } catch (e) {
              // Ignore - element may already be removed
            }
          }, 300);
        } catch (e) {
          // Ignore - element may have been removed
        }
      }, 5000);
    } else {
      // Large blocking modal in the center for misaligned
      showMisalignmentModal(reason, intent);
    }
  } catch (e) {
    console.error('Error showing alignment feedback:', e);
  }
}

/**
 * Show blocking misalignment modal
 */
function showMisalignmentModal(reason, intent) {
  try {
    const overlay = document.createElement('div');
    overlay.id = 'misalignment-modal-overlay';
  overlay.innerHTML = `
    <div class="misalignment-modal">
      <div class="modal-icon">⚠️</div>
      <h2>You're Drifting!</h2>
      <p class="modal-message">${reason || 'This content doesn\'t align with your browsing intent.'}</p>
      <div class="intent-reminder">
        <strong>Your intent:</strong> ${intent}
      </div>
      <div class="button-group">
        <button id="go-back-btn" class="btn-primary">Go Back to Aligned Content</button>
        <button id="continue-anyway-btn" class="btn-secondary">Continue Anyway</button>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.id = 'misalignment-modal-styles';
  style.textContent = `
    #misalignment-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      animation: fadeIn 0.3s ease;
      backdrop-filter: blur(4px);
    }
    
    .misalignment-modal {
      background: white;
      padding: 40px;
      border-radius: 20px;
      width: 500px;
      max-width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      animation: slideUp 0.4s ease;
      text-align: center;
    }
    
    .modal-icon {
      font-size: 64px;
      margin-bottom: 16px;
      animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    
    .misalignment-modal h2 {
      margin: 0 0 16px 0;
      font-size: 28px;
      color: #dc2626;
      font-weight: 700;
    }
    
    .modal-message {
      margin: 0 0 24px 0;
      color: #666;
      font-size: 16px;
      line-height: 1.6;
    }
    
    .intent-reminder {
      background: #fef3c7;
      border: 2px solid #fbbf24;
      border-radius: 12px;
      padding: 16px;
      margin: 0 0 32px 0;
      color: #92400e;
      font-size: 15px;
      line-height: 1.5;
    }
    
    .intent-reminder strong {
      display: block;
      margin-bottom: 4px;
      font-weight: 600;
    }
    
    .misalignment-modal .button-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .misalignment-modal button {
      padding: 16px 24px;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(220, 38, 38, 0.5);
    }
    
    .btn-primary:active {
      transform: translateY(0);
    }
    
    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }
    
    .btn-secondary:hover {
      background: #d1d5db;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Handle Go Back button - navigate to YouTube home/search
  document.getElementById('go-back-btn').addEventListener('click', () => {
    // Navigate to YouTube home page
    window.location.href = 'https://www.youtube.com';
    closeMisalignmentModal();
  });

  // Handle Continue Anyway button
  document.getElementById('continue-anyway-btn').addEventListener('click', () => {
    closeMisalignmentModal();
  });

  // Prevent closing on overlay click (user must make a choice)
  } catch (e) {
    console.error('Error showing misalignment modal:', e);
  }
}

/**
 * Close misalignment modal
 */
function closeMisalignmentModal() {
  const overlay = document.getElementById('misalignment-modal-overlay');
  const style = document.getElementById('misalignment-modal-styles');
  
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => overlay.remove(), 300);
  }
  if (style) {
    style.remove();
  }
}

// Message listener is defined above - this duplicate has been removed

/**
 * Show duration prompt (30 min / 1 hour check-in)
 */
function showDurationPrompt(intent, minutes) {
  try {
    // Check if prompt already exists
    if (document.getElementById('duration-prompt-overlay')) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.id = 'duration-prompt-overlay';
  overlay.innerHTML = `
    <div class="duration-prompt-modal">
      <h2>⏰ Check-in</h2>
      <p class="prompt-question">Still working on: <strong>${intent}</strong>?</p>
      <div class="button-group">
        <button id="prompt-yes" class="btn-yes">Yes, continue</button>
        <button id="prompt-no" class="btn-no">No, end session</button>
      </div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.id = 'duration-prompt-styles';
  style.textContent = `
    #duration-prompt-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      animation: fadeIn 0.2s ease;
    }
    
    .duration-prompt-modal {
      background: white;
      padding: 32px;
      border-radius: 16px;
      width: 400px;
      max-width: 90%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      animation: slideUp 0.3s ease;
      text-align: center;
    }
    
    .duration-prompt-modal h2 {
      margin: 0 0 16px 0;
      font-size: 24px;
      color: #333;
      font-weight: 600;
    }
    
    .prompt-question {
      margin: 0 0 24px 0;
      color: #666;
      font-size: 16px;
      line-height: 1.5;
    }
    
    .prompt-question strong {
      color: #333;
      font-weight: 600;
    }
    
    .duration-prompt-modal .button-group {
      display: flex;
      gap: 12px;
    }
    
    .duration-prompt-modal button {
      flex: 1;
      padding: 14px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-yes {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .btn-yes:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .btn-no {
      background: #e9ecef;
      color: #495057;
    }
    
    .btn-no:hover {
      background: #dee2e6;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  // Handle Yes button
  document.getElementById('prompt-yes').addEventListener('click', () => {
    closeDurationPrompt();
  });

  // Handle No button - end session
  document.getElementById('prompt-no').addEventListener('click', async () => {
    // Clear session data
    await chrome.storage.local.remove(['sessionId', 'currentIntent', 'intentSetAt', 'platform', 'alignmentStatus']);
    
    // Notify service worker
    chrome.runtime.sendMessage({ type: 'INTENT_CLEARED' });
    
    // Show end session message
    showSuccessMessage('Session ended');
    
    closeDurationPrompt();
    isMonitoring = false;
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeDurationPrompt();
    }
  });
  } catch (e) {
    console.error('Error showing duration prompt:', e);
  }
}

/**
 * Close duration prompt
 */
function closeDurationPrompt() {
  const overlay = document.getElementById('duration-prompt-overlay');
  const style = document.getElementById('duration-prompt-styles');
  
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => overlay.remove(), 200);
  }
  if (style) {
    style.remove();
  }
}

// Start monitoring when session is active
chrome.storage.local.get(['sessionId']).then(stored => {
  if (stored.sessionId) {
    startUrlMonitoring().catch(e => {
      console.error('Error starting URL monitoring:', e);
    });
  }
}).catch(e => {
  console.error('Error checking session:', e);
});

// Also start monitoring after intent is set
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.sessionId && changes.sessionId.newValue) {
    startUrlMonitoring().catch(e => {
      console.error('Error starting URL monitoring:', e);
    });
  }
});
