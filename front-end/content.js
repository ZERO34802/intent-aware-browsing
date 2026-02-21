// Content script — runs on web pages
// Prevent re-execution when popup re-injects script (avoids "Identifier already declared" errors)
(function () {
  if (window.__INTENT_AWARE_CONTENT_LOADED__) {
    return;
  }
  window.__INTENT_AWARE_CONTENT_LOADED__ = true;

// Backend API Configuration - use window to avoid redeclaration
if (typeof window.__INTENT_AWARE_API_BASE_URL__ === "undefined") {
  window.__INTENT_AWARE_API_BASE_URL__ = "http://localhost:8096";
}
const API_BASE_URL = window.__INTENT_AWARE_API_BASE_URL__;

// Extension context invalidated = extension was reloaded; any chrome.* call will throw.
// Once set, we stop monitoring and tell user to refresh the page.
function isContextInvalidated(err) {
  const msg = (err && (err.message || String(err))) || "";
  return msg.includes("Extension context invalidated");
}
function markContextInvalidated() {
  window.__INTENT_AWARE_CONTEXT_INVALIDATED__ = true;
  stopUrlMonitoring();
  console.warn(
    "[Intent-Aware Browsing] Extension was reloaded. Refresh this page (F5) to use the extension again."
  );
}

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
    return url.includes("youtube.com/watch");
  } catch (e) {
    return false;
  }
}

/**
 * Check if current page is YouTube (any page)
 */
function isYouTube() {
  try {
    return window.location.href.includes("youtube.com");
  } catch (e) {
    return false;
  }
}

const FOCUS_MODE_STYLE_ID = "intent-aware-focus-mode-styles";

/**
 * Remove focus mode styles (blur) when session is not active
 */
function removeFocusMode() {
  const style = document.getElementById(FOCUS_MODE_STYLE_ID);
  if (style) style.remove();
}

/**
 * Apply focus mode on YouTube when session is active: blur homepage grid and sidebar to reduce distraction
 */
function applyFocusMode() {
  if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
  if (!isYouTube()) return;

  removeFocusMode();

  const style = document.createElement("style");
  style.id = FOCUS_MODE_STYLE_ID;
  style.textContent = `
    /* Sidebar recommendations on watch page */
    ytd-watch-flexy #secondary {
      filter: blur(12px);
      pointer-events: none;
      user-select: none;
    }
    /* Homepage video grid */
    ytd-rich-grid-renderer {
      filter: blur(12px);
      pointer-events: none;
      user-select: none;
    }
  `;
  try {
    document.head.appendChild(style);
  } catch (e) {
    console.log("[IntentAware] Could not apply focus mode:", e.message || e);
  }
}

/**
 * Sync focus mode with session state: apply if session active on YouTube, else remove
 */
function syncFocusMode() {
  if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
  chrome.storage.local.get(["sessionId"]).then((stored) => {
    if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
    if (stored.sessionId && isYouTube()) {
      applyFocusMode();
    } else {
      removeFocusMode();
    }
  }).catch((e) => {
    if (isContextInvalidated(e)) markContextInvalidated();
    else removeFocusMode();
  });
}

// Declare variables used by functions (will be initialized later)
let lastUrl = "";
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
  console.log("Could not initialize URL tracking:", e.message || e);
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

  // Handle SHOW_VIDEO_NOTES_MODAL from popup (Add notes for this video)
  if (message.type === "SHOW_VIDEO_NOTES_MODAL" && message.videoId) {
    try {
      showVideoNotesModal(message.videoId);
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error showing video notes modal:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  // Handle SHOW_SESSION_SUMMARY from popup (after "End session" → "Get summary?")
  if (message.type === "SHOW_SESSION_SUMMARY" && message.sessionId) {
    try {
      showSessionSummaryModal(message.sessionId);
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error showing session summary modal:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  // Handle ALIGNMENT_RESULT from service worker
  if (message.type === "ALIGNMENT_RESULT") {
    console.log("[IntentAware] Received ALIGNMENT_RESULT:", { videoId: message.videoId, aligned: message.aligned, reason: message.reason });
    try {
      let currentVideoId = null;
      try {
        currentVideoId = getYouTubeVideoId(window.location.href);
      } catch (e) {
        console.log("[IntentAware] Could not get current video ID:", e.message || e);
        sendResponse({ success: false, error: "Extension context invalidated" });
        return true;
      }
      console.log("[IntentAware] Current page videoId:", currentVideoId, "Result videoId:", message.videoId);

      if (message.videoId && message.videoId !== currentVideoId) {
        console.log("[IntentAware] IGNORING result (stale): result for", message.videoId, "current page", currentVideoId);
        sendResponse({ success: true, ignored: true });
        return true;
      }

      if (pendingCheckVideoId === message.videoId) {
        pendingCheckVideoId = null;
      }

      console.log("[IntentAware] Result accepted, fetching intent from storage then showing feedback (aligned=" + message.aligned + ")");
      chrome.storage.local
        .get(["currentIntent"])
        .then((stored) => {
          if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) {
            console.log("[IntentAware] Context invalidated, skipping showAlignmentFeedback");
            return;
          }
          try {
            console.log("[IntentAware] Calling showAlignmentFeedback(aligned=" + message.aligned + ", reason=..., intent=" + (stored.currentIntent || "your intent") + ")");
            showAlignmentFeedback(
              message.aligned,
              message.reason,
              stored.currentIntent || "your intent",
            );
            console.log("[IntentAware] showAlignmentFeedback returned");
          } catch (e) {
            console.error("[IntentAware] Error in showAlignmentFeedback:", e);
          }
        })
        .catch((e) => {
          console.error("[IntentAware] chrome.storage.local.get failed:", e.message || e);
          if (isContextInvalidated(e)) markContextInvalidated();
        });
      sendResponse({ success: true });
    } catch (error) {
      console.error("[IntentAware] Error handling ALIGNMENT_RESULT:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  // Handle SHOW_DURATION_PROMPT from service worker
  if (message.type === "SHOW_DURATION_PROMPT") {
    try {
      showDurationPrompt(message.intent, message.minutes);
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error showing duration prompt:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  return true;
});

// showIntentModal is now defined above, before the message listener

// Prevent re-execution on SPA navigation or extension reload
(function () {
  "use strict";

  // Skip if already initialized
  if (window.__INTENT_AWARE_INITIALIZED__) {
    console.log(
      "Content script already initialized, skipping re-initialization",
    );
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
    if (document.head && !document.getElementById("intent-aware-animations")) {
      const animations = document.createElement("style");
      animations.id = "intent-aware-animations";
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
    console.log("Could not add animations:", e.message || e);
  }
}

// Initialize animations immediately if DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureAnimations);
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
  if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
  let stored;
  try {
    stored = await chrome.storage.local.get(["sessionId", "currentIntent"]);
  } catch (e) {
    if (isContextInvalidated(e)) markContextInvalidated();
    else console.log("Cannot start monitoring:", e.message || e);
    return;
  }

  if (!stored.sessionId || !stored.currentIntent) {
    console.log("No active session, skipping URL monitoring");
    return;
  }

  // Clear any existing monitoring
  stopUrlMonitoring();

  isMonitoring = true;
  try {
    lastUrl = window.location.href;
    lastVideoId = getYouTubeVideoId(lastUrl);
  } catch (e) {
    console.error("Error accessing window.location:", e);
    return;
  }

  // Monitor URL changes (YouTube uses history API for navigation)
  let currentUrl = window.location.href;
  urlCheckInterval = setInterval(() => {
    if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
    try {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        handleUrlChange(currentUrl);
      }
    } catch (e) {
      if (isContextInvalidated(e)) {
        markContextInvalidated();
      } else {
        console.log("Error in URL check interval:", e.message || e);
        stopUrlMonitoring();
      }
    }
  }, 500);

  // Also listen to popstate (back/forward navigation)
  const popstateHandler = () => {
    try {
      handleUrlChange(window.location.href);
    } catch (e) {
      console.log("Error in popstate handler:", e);
      stopUrlMonitoring();
    }
  };
  window.addEventListener("popstate", popstateHandler);
  window.__INTENT_AWARE_POPSTATE_HANDLER__ = popstateHandler; // Store for cleanup

  // Listen to YouTube's navigation events (SPA navigation)
  urlObserver = new MutationObserver(() => {
    try {
      const newUrl = window.location.href;
      if (newUrl !== lastUrl) {
        handleUrlChange(newUrl);
      }
    } catch (e) {
      console.log("Error in MutationObserver:", e);
      stopUrlMonitoring();
    }
  });

  try {
    urlObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  } catch (e) {
    console.error("Error setting up MutationObserver:", e);
  }

  console.log("URL monitoring started");

  // Run alignment check for current page if already on a YouTube video
  // (otherwise we only check on URL *change*, so opening a video then setting intent never triggers a check)
  try {
    const currentUrl = window.location.href;
    if (isYouTubeVideoPage(currentUrl)) {
      const currentVideoId = getYouTubeVideoId(currentUrl);
      if (currentVideoId) {
        console.log("[IntentAware] Initial check: current video on load:", currentVideoId);
        lastUrl = currentUrl;
        lastVideoId = currentVideoId;
        pendingCheckVideoId = currentVideoId;
        const sessionIdForCheck = stored.sessionId;
      urlChangeTimeout = setTimeout(() => {
        if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) {
          pendingCheckVideoId = null;
          return;
        }
        try {
          const nowVideoId = getYouTubeVideoId(window.location.href);
          if (nowVideoId !== currentVideoId) {
            console.log("[IntentAware] Initial check skipped: video changed", currentVideoId, "->", nowVideoId);
            pendingCheckVideoId = null;
            return;
          }
          console.log("[IntentAware] Sending CHECK_ALIGNMENT (initial) for video:", currentVideoId);
          chrome.runtime.sendMessage(
            {
              type: "CHECK_ALIGNMENT",
              sessionId: sessionIdForCheck,
              videoId: currentVideoId,
              videoUrl: currentUrl,
              timestamp: Date.now(),
            },
            () => {
              if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
              try {
                if (chrome.runtime.lastError) {
                  if (isContextInvalidated(chrome.runtime.lastError)) {
                    markContextInvalidated();
                  } else {
                    console.log(
                      "Error sending alignment check (current page):",
                      chrome.runtime.lastError.message
                    );
                  }
                  pendingCheckVideoId = null;
                }
              } catch (e) {
                if (isContextInvalidated(e)) markContextInvalidated();
                pendingCheckVideoId = null;
              }
            }
          );
        } catch (e) {
          if (isContextInvalidated(e)) {
            markContextInvalidated();
          } else {
            console.log("Error in initial alignment check:", e.message || e);
          }
          pendingCheckVideoId = null;
        }
      }, 1500);
      }
    }
  } catch (e) {
    console.log("Error starting initial alignment check:", e.message || e);
  }
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
    window.removeEventListener(
      "popstate",
      window.__INTENT_AWARE_POPSTATE_HANDLER__,
    );
    window.__INTENT_AWARE_POPSTATE_HANDLER__ = null;
  }
}

/**
 * Handle URL change - check alignment if it's a YouTube video
 */
async function handleUrlChange(newUrl) {
  if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
  if (!isMonitoring) return;

  let stored;
  try {
    stored = await chrome.storage.local.get(["sessionId", "currentIntent"]);
    if (!stored.sessionId) {
      stopUrlMonitoring();
      return;
    }
  } catch (e) {
    if (isContextInvalidated(e)) {
      markContextInvalidated();
    } else {
      console.log("Error in handleUrlChange:", e.message || e);
      stopUrlMonitoring();
    }
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

  console.log("[IntentAware] YouTube video changed:", newVideoId);

  // Store sessionId for use in setTimeout callback
  const sessionId = stored.sessionId;

  // Debounce: Wait 1.5 seconds for page to fully load before checking
  urlChangeTimeout = setTimeout(() => {
    if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) {
      pendingCheckVideoId = null;
      return;
    }
    try {
      const currentVideoId = getYouTubeVideoId(window.location.href);
      if (currentVideoId !== newVideoId) {
        console.log("[IntentAware] Video changed again during delay, skipping check. Expected:", newVideoId, "Current:", currentVideoId);
        pendingCheckVideoId = null;
        return;
      }
      console.log("[IntentAware] Sending CHECK_ALIGNMENT for video:", newVideoId);
      chrome.runtime.sendMessage(
        {
          type: "CHECK_ALIGNMENT",
          sessionId: sessionId,
          videoId: newVideoId,
          videoUrl: newUrl,
          timestamp: Date.now(),
        },
        (response) => {
          if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
          try {
            if (chrome.runtime.lastError) {
              console.log("[IntentAware] CHECK_ALIGNMENT send failed:", chrome.runtime.lastError.message);
              if (isContextInvalidated(chrome.runtime.lastError)) {
                markContextInvalidated();
              }
              pendingCheckVideoId = null;
            } else {
              console.log("[IntentAware] CHECK_ALIGNMENT sent, response:", response);
            }
          } catch (e) {
            if (isContextInvalidated(e)) markContextInvalidated();
            pendingCheckVideoId = null;
          }
        },
      );
    } catch (e) {
      if (isContextInvalidated(e)) {
        markContextInvalidated();
      } else {
        console.log("Error in alignment check timeout:", e.message || e);
        stopUrlMonitoring();
      }
      pendingCheckVideoId = null;
    }
  }, 1500);
}

/**
 * Show alignment feedback notification
 */
function showAlignmentFeedback(aligned, reason, intent) {
  console.log("[IntentAware] showAlignmentFeedback START aligned=" + aligned + " reason=" + (reason || "(none)") + " intent=" + (intent || "(none)"));
  try {
    // Remove existing feedback if any
    const existing = document.getElementById("alignment-feedback");
    const existingModal = document.getElementById("misalignment-modal-overlay");
    if (existing) {
      existing.remove();
    }
    if (existingModal) {
      existingModal.remove();
    }
  } catch (e) {
    console.log("Could not remove existing feedback:", e.message || e);
  }

  try {
    if (aligned) {
      // Small popup on the right for aligned
      const feedback = document.createElement("div");
      feedback.id = "alignment-feedback";
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
        <span style="opacity: 0.9; font-size: 13px;">${reason || "You're on track"}</span>
      `;
      document.body.appendChild(feedback);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        try {
          feedback.style.animation = "fadeOut 0.3s ease";
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
      console.log("[IntentAware] Calling showMisalignmentModal(reason, intent)");
      showMisalignmentModal(reason, intent);
      console.log("[IntentAware] showMisalignmentModal returned");
    }
  } catch (e) {
    console.error("[IntentAware] Error in showAlignmentFeedback body:", e);
  }
  console.log("[IntentAware] showAlignmentFeedback END");
}

/**
 * Show blocking misalignment modal
 */
function showMisalignmentModal(reason, intent) {
  console.log("[IntentAware] showMisalignmentModal START reason=" + (reason || "(none)") + " intent=" + (intent || "(none)"));
  try {
    const overlay = document.createElement("div");
    overlay.id = "misalignment-modal-overlay";
    overlay.innerHTML = `
    <div class="misalignment-modal">
      <div class="modal-icon">⚠️</div>
      <h2>You're Drifting!</h2>
      <p class="modal-message">${reason || "This content doesn't align with your browsing intent."}</p>
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
    const style = document.createElement("style");
    style.id = "misalignment-modal-styles";
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

    // Handle Go Back button - fetch last aligned video or go to home + show search prompt
    document.getElementById("go-back-btn").addEventListener("click", async () => {
      closeMisalignmentModal();
      try {
        const stored = await chrome.storage.local.get(["sessionId"]);
        const sessionId = stored.sessionId;
        if (!sessionId) {
          await chrome.storage.local.set({ showSearchPromptOnLoad: true });
          window.location.href = "https://www.youtube.com";
          return;
        }
        const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/last-aligned-video`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.videoUrl) {
            window.location.href = data.videoUrl;
            return;
          }
        }
        // 404 or no videoUrl: go to home and show search prompt
        await chrome.storage.local.set({ showSearchPromptOnLoad: true });
        window.location.href = "https://www.youtube.com";
      } catch (e) {
        console.error("[IntentAware] Go back failed:", e);
        chrome.storage.local.set({ showSearchPromptOnLoad: true });
        window.location.href = "https://www.youtube.com";
      }
    });

    // Handle Continue Anyway button
    document
      .getElementById("continue-anyway-btn")
      .addEventListener("click", () => {
        closeMisalignmentModal();
      });

    // Prevent closing on overlay click (user must make a choice)
  } catch (e) {
    console.error("Error showing misalignment modal:", e);
  }
}

/**
 * Show toast prompting user to search for aligned content (e.g. after going home with no last-aligned video).
 */
function showSearchPromptToast() {
  if (document.getElementById("intent-aware-search-prompt-toast")) return;
  const toast = document.createElement("div");
  toast.id = "intent-aware-search-prompt-toast";
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease;
    max-width: 90%;
    text-align: center;
  `;
  toast.textContent = "Search for something aligned with your intent.";
  document.body.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = "fadeOut 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

/**
 * Close misalignment modal
 */
function closeMisalignmentModal() {
  const overlay = document.getElementById("misalignment-modal-overlay");
  const style = document.getElementById("misalignment-modal-styles");

  if (overlay) {
    overlay.style.animation = "fadeOut 0.3s ease";
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
    if (document.getElementById("duration-prompt-overlay")) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "duration-prompt-overlay";
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
    const style = document.createElement("style");
    style.id = "duration-prompt-styles";
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
    document.getElementById("prompt-yes").addEventListener("click", () => {
      closeDurationPrompt();
    });

    // Handle No button - end session
    document.getElementById("prompt-no").addEventListener("click", async () => {
      // Clear session data
      await chrome.storage.local.remove([
        "sessionId",
        "currentIntent",
        "intentSetAt",
        "platform",
        "alignmentStatus",
      ]);

      // Notify service worker
      chrome.runtime.sendMessage({ type: "INTENT_CLEARED" });

      // Show end session message
      showSuccessMessage("Session ended");

      closeDurationPrompt();
      isMonitoring = false;
    });

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeDurationPrompt();
      }
    });
  } catch (e) {
    console.error("Error showing duration prompt:", e);
  }
}

/**
 * Close duration prompt
 */
function closeDurationPrompt() {
  const overlay = document.getElementById("duration-prompt-overlay");
  const style = document.getElementById("duration-prompt-styles");

  if (overlay) {
    overlay.style.animation = "fadeOut 0.2s ease";
    setTimeout(() => overlay.remove(), 200);
  }
  if (style) {
    style.remove();
  }
}

/**
 * Show session summary modal: fetch GET /api/sessions/{sessionId}/summary, show summary with typing effect,
 * and if educational, "Take a quiz" with one-question-at-a-time UI. On close, clear session storage.
 */
function showSessionSummaryModal(sessionId) {
  if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
  if (document.getElementById("session-summary-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "session-summary-overlay";
  overlay.innerHTML = `
    <div class="session-summary-modal">
      <div id="session-summary-loading">Loading your session summary…</div>
      <div id="session-summary-content" style="display:none;">
        <h2>Session Summary</h2>
        <p id="session-summary-text" class="summary-text"></p>
        <div id="session-summary-quiz-cta" style="display:none;">
          <button id="session-summary-take-quiz" class="btn-quiz">Take a quiz</button>
        </div>
        <div id="session-summary-quiz" style="display:none;">
          <p id="quiz-question" class="quiz-question"></p>
          <div id="quiz-options" class="quiz-options"></div>
          <div id="quiz-feedback" class="quiz-feedback" style="display:none;"></div>
          <button id="quiz-next" class="btn-next" style="display:none;">Next</button>
        </div>
        <div id="session-summary-done" style="display:none;">
          <p id="quiz-score" class="quiz-score"></p>
          <button id="session-summary-close" class="btn-close">Done</button>
        </div>
        <button id="session-summary-close-early" class="btn-close-early" style="display:none;">Close</button>
      </div>
      <div id="session-summary-error" style="display:none;">
        <p>Could not load summary. You can try again later.</p>
        <button id="session-summary-error-close" class="btn-close">Close</button>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.id = "session-summary-modal-styles";
  style.textContent = `
    #session-summary-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex; justify-content: center; align-items: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: fadeIn 0.2s ease;
    }
    .session-summary-modal {
      background: white; padding: 28px; border-radius: 16px;
      width: 560px; max-width: 92vw; max-height: 85vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      animation: slideUp 0.3s ease;
    }
    .session-summary-modal h2 { margin: 0 0 16px 0; font-size: 22px; color: #333; }
    .session-summary-modal .summary-text {
      margin: 0 0 20px 0; color: #444; font-size: 15px; line-height: 1.6; white-space: pre-wrap;
    }
    .session-summary-modal .btn-quiz {
      padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .session-summary-modal .btn-quiz:hover { opacity: 0.95; transform: translateY(-1px); }
    .session-summary-modal .quiz-question { margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #333; }
    .session-summary-modal .quiz-options { display: flex; flex-direction: column; gap: 8px; }
    .session-summary-modal .quiz-option {
      padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer;
      text-align: left; font-size: 14px; background: #fff; transition: border-color 0.2s, background 0.2s;
    }
    .session-summary-modal .quiz-option:hover:not(.disabled) { border-color: #667eea; background: #f8f9ff; }
    .session-summary-modal .quiz-option.correct { border-color: #22c55e; background: #f0fdf4; }
    .session-summary-modal .quiz-option.incorrect { border-color: #ef4444; background: #fef2f2; }
    .session-summary-modal .quiz-option.disabled { cursor: default; opacity: 0.8; }
    .session-summary-modal .quiz-feedback { margin: 12px 0; font-size: 14px; font-weight: 600; }
    .session-summary-modal .quiz-feedback.correct { color: #22c55e; }
    .session-summary-modal .quiz-feedback.incorrect { color: #ef4444; }
    .session-summary-modal .btn-next, .session-summary-modal .btn-close {
      margin-top: 16px; padding: 10px 20px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .session-summary-modal .btn-next { background: #667eea; color: white; }
    .session-summary-modal .btn-close { background: #333; color: white; }
    .session-summary-modal .btn-close-early { margin-top: 12px; background: transparent; color: #666; border: none; cursor: pointer; font-size: 14px; }
    .session-summary-modal .quiz-score { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #333; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  function closeSummaryModal() {
    const ov = document.getElementById("session-summary-overlay");
    const st = document.getElementById("session-summary-modal-styles");
    if (ov) { ov.style.animation = "fadeOut 0.2s ease"; setTimeout(() => ov.remove(), 200); }
    if (st) st.remove();
    chrome.storage.local.remove(["sessionId", "currentIntent", "intentSetAt", "platform", "alignmentStatus"]);
    chrome.runtime.sendMessage({ type: "INTENT_CLEARED" });
  }

  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeSummaryModal(); });

  (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/summary`);
      if (!response.ok) {
        document.getElementById("session-summary-loading").style.display = "none";
        document.getElementById("session-summary-error").style.display = "block";
        document.getElementById("session-summary-error-close").onclick = closeSummaryModal;
        return;
      }
      const data = await response.json();
      document.getElementById("session-summary-loading").style.display = "none";
      document.getElementById("session-summary-content").style.display = "block";
      document.getElementById("session-summary-close-early").style.display = "block";

      const summaryEl = document.getElementById("session-summary-text");
      const fullText = data.summary || "No summary available.";
      let i = 0;
      const typingMs = 18;
      function typeNext() {
        if (i <= fullText.length) {
          summaryEl.textContent = fullText.slice(0, i);
          i++;
          setTimeout(typeNext, typingMs);
        } else {
          if (data.isEducational && data.quizQuestions && data.quizQuestions.length > 0) {
            document.getElementById("session-summary-quiz-cta").style.display = "block";
          }
        }
      }
      typeNext();

      const quizQuestions = data.quizQuestions || [];
      let quizIndex = 0;
      let correctCount = 0;

      document.getElementById("session-summary-take-quiz").addEventListener("click", () => {
        document.getElementById("session-summary-quiz-cta").style.display = "none";
        document.getElementById("session-summary-quiz").style.display = "block";
        showQuizQuestion(0);
      });

      function showQuizQuestion(index) {
        if (index >= quizQuestions.length) {
          document.getElementById("session-summary-quiz").style.display = "none";
          document.getElementById("session-summary-done").style.display = "block";
          document.getElementById("quiz-score").textContent = "You got " + correctCount + " of " + quizQuestions.length + " correct.";
          document.getElementById("session-summary-close-early").style.display = "none";
          return;
        }
        const q = quizQuestions[index];
        document.getElementById("quiz-question").textContent = (index + 1) + ". " + (q.question || "");
        const optsEl = document.getElementById("quiz-options");
        optsEl.innerHTML = "";
        (q.options || []).forEach((opt, oi) => {
          const btn = document.createElement("button");
          btn.className = "quiz-option";
          btn.textContent = opt;
          btn.dataset.index = String(oi);
          optsEl.appendChild(btn);
        });
        document.getElementById("quiz-feedback").style.display = "none";
        document.getElementById("quiz-next").style.display = "none";

        const correctIndex = q.correctIndex != null ? q.correctIndex : 0;
        optsEl.querySelectorAll(".quiz-option").forEach((btn) => {
          btn.addEventListener("click", function () {
            if (this.classList.contains("disabled")) return;
            optsEl.querySelectorAll(".quiz-option").forEach((b) => b.classList.add("disabled"));
            const chosen = parseInt(this.dataset.index, 10);
            if (chosen === correctIndex) {
              this.classList.add("correct");
              correctCount++;
              document.getElementById("quiz-feedback").textContent = "Correct!";
              document.getElementById("quiz-feedback").className = "quiz-feedback correct";
            } else {
              this.classList.add("incorrect");
              optsEl.querySelectorAll(".quiz-option")[correctIndex].classList.add("correct");
              document.getElementById("quiz-feedback").textContent = "Incorrect. The correct answer is shown.";
              document.getElementById("quiz-feedback").className = "quiz-feedback incorrect";
            }
            document.getElementById("quiz-feedback").style.display = "block";
            document.getElementById("quiz-next").style.display = "inline-block";
          });
        });

        document.getElementById("quiz-next").onclick = () => {
          quizIndex = index + 1;
          showQuizQuestion(quizIndex);
        };
      }

      document.getElementById("session-summary-close").addEventListener("click", closeSummaryModal);
      document.getElementById("session-summary-close-early").addEventListener("click", closeSummaryModal);
    } catch (err) {
      console.error("[IntentAware] Session summary fetch error:", err);
      document.getElementById("session-summary-loading").style.display = "none";
      document.getElementById("session-summary-error").style.display = "block";
      document.getElementById("session-summary-error-close").onclick = closeSummaryModal;
    }
  })();
}

/**
 * Show modal to add notes (and optional transcript) for the current session and video.
 * Opened from extension popup "Add notes for this video". Submits to POST /api/sessions/video-notes.
 */
function showVideoNotesModal(videoId) {
  if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
  if (document.getElementById("video-notes-modal-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "video-notes-modal-overlay";
  overlay.innerHTML = `
    <div class="video-notes-modal">
      <h2>Add notes for this video</h2>
      <p class="modal-subtitle">What did you learn or take away? (optional)</p>
      <textarea id="video-notes-input" placeholder="e.g., Key points, takeaways..." rows="4"></textarea>
      <p class="modal-subtitle" style="margin-top: 12px;">Transcript (optional – paste if you have it)</p>
      <textarea id="video-transcript-input" placeholder="Leave blank or paste transcript..." rows="3"></textarea>
      <div class="button-group">
        <button id="video-notes-submit" class="btn-submit">Save notes</button>
        <button id="video-notes-cancel" class="btn-cancel">Skip</button>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.id = "video-notes-modal-styles";
  style.textContent = `
    #video-notes-modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      display: flex; justify-content: center; align-items: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      animation: fadeIn 0.2s ease;
    }
    .video-notes-modal {
      background: white; padding: 28px; border-radius: 16px;
      width: 500px; max-width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      animation: slideUp 0.3s ease;
    }
    .video-notes-modal h2 { margin: 0 0 8px 0; font-size: 22px; color: #333; }
    .video-notes-modal .modal-subtitle { margin: 0 0 8px 0; font-size: 13px; color: #666; }
    .video-notes-modal textarea {
      width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #ddd;
      border-radius: 8px; font-size: 14px; resize: vertical;
    }
    .video-notes-modal .button-group { display: flex; gap: 12px; margin-top: 20px; }
    .video-notes-modal .btn-submit { padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
    .video-notes-modal .btn-cancel { padding: 12px 24px; background: #e5e7eb; color: #374151; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
  `;

  document.head.appendChild(style);
  document.body.appendChild(overlay);

  document.getElementById("video-notes-cancel").addEventListener("click", () => {
    closeVideoNotesModal();
  });

  document.getElementById("video-notes-submit").addEventListener("click", async () => {
    const notesEl = document.getElementById("video-notes-input");
    const transcriptEl = document.getElementById("video-transcript-input");
    const notes = notesEl ? notesEl.value.trim() : "";
    const transcript = transcriptEl ? transcriptEl.value.trim() : null;
    let sessionId;
    try {
      const stored = await chrome.storage.local.get(["sessionId"]);
      sessionId = stored.sessionId;
    } catch (e) {
      closeVideoNotesModal();
      return;
    }
    if (!sessionId) {
      closeVideoNotesModal();
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/sessions/video-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionId,
          videoId: videoId,
          notes: notes || null,
          transcript: transcript || null,
        }),
      });
      if (response.ok) {
        showSuccessMessage("Notes saved");
      }
    } catch (e) {
      console.error("[IntentAware] Failed to save video notes:", e);
    }
    closeVideoNotesModal();
  });
}

/**
 * Close video notes modal
 */
function closeVideoNotesModal() {
  const overlay = document.getElementById("video-notes-modal-overlay");
  const style = document.getElementById("video-notes-modal-styles");
  if (overlay) {
    overlay.style.animation = "fadeOut 0.2s ease";
    setTimeout(() => overlay.remove(), 200);
  }
  if (style) style.remove();
}

// Start monitoring and focus mode when session is active; show search prompt if we landed on home after "go back" with no last-aligned video
try {
  chrome.storage.local
    .get(["sessionId", "showSearchPromptOnLoad"])
    .then((stored) => {
      if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
      if (stored.showSearchPromptOnLoad && isYouTube() && !isYouTubeVideoPage(window.location.href)) {
        chrome.storage.local.remove(["showSearchPromptOnLoad"]);
        if (document.body) showSearchPromptToast();
        else document.addEventListener("DOMContentLoaded", () => showSearchPromptToast());
      }
      if (stored.sessionId) {
        startUrlMonitoring().catch((e) => {
          if (isContextInvalidated(e)) markContextInvalidated();
          else console.error("Error starting URL monitoring:", e);
        });
      }
      syncFocusMode();
    })
    .catch((e) => {
      if (isContextInvalidated(e)) markContextInvalidated();
      else console.error("Error checking session:", e);
    });
} catch (e) {
  if (isContextInvalidated(e)) markContextInvalidated();
}

// When session starts or ends, update monitoring and focus mode
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (window.__INTENT_AWARE_CONTEXT_INVALIDATED__) return;
  if (namespace !== "local" || !changes.sessionId) return;
  if (changes.sessionId.newValue) {
    startUrlMonitoring().catch((e) => {
      if (isContextInvalidated(e)) markContextInvalidated();
      else console.error("Error starting URL monitoring:", e);
    });
  }
  syncFocusMode();
});

})(); // End IIFE - entire content script
