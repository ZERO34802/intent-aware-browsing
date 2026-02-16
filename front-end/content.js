// Content script — runs on web pages
console.log('Intent-Aware Browsing content script loaded on:', window.location.href);

// Backend API Configuration
const API_BASE_URL = 'http://localhost:8080'; // Change for production

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (message.type === 'SHOW_INTENT_MODAL') {
    try {
      showIntentModal();
      console.log('Modal shown successfully');
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error showing modal:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

/**
 * Show the intent input modal in the center of the screen
 */
function showIntentModal() {
  // Check if modal already exists
  if (document.getElementById('intent-modal-overlay')) {
    return;
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.id = 'intent-modal-overlay';
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
  const style = document.createElement('style');
  style.id = 'intent-modal-styles';
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
    document.getElementById('intent-input').focus();
  }, 100);
  
  // Handle submit
  document.getElementById('submit-intent').addEventListener('click', handleSubmit);
  
  // Handle cancel
  document.getElementById('cancel-intent').addEventListener('click', closeModal);
  
  // Handle Enter key (Ctrl/Cmd + Enter to submit)
  document.getElementById('intent-input').addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit();
    }
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });
}

/**
 * Detect which platform the user is on
 */
function detectPlatform(url) {
  if (url.includes('youtube.com')) {
    return 'youtube';
  } else if (url.includes('reddit.com')) {
    return 'reddit';
  } else if (url.includes('twitter.com') || url.includes('x.com')) {
    return 'twitter';
  } else if (url.includes('facebook.com')) {
    return 'facebook';
  } else if (url.includes('instagram.com')) {
    return 'instagram';
  } else {
    return 'web'; // generic
  }
}

/**
 * Handle intent submission
 */
async function handleSubmit() {
  const intent = document.getElementById('intent-input').value.trim();
  
  if (!intent) {
    alert('Please enter your browsing intention');
    return;
  }
  
  try {
    // 1. Detect platform
    const platform = detectPlatform(window.location.href);
    const timestamp = Date.now();
    
    console.log('Starting session:', { intent, platform, timestamp });
    
    // 2. Call backend API to create session
    const response = await fetch(`${API_BASE_URL}/api/sessions/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: intent,
        platform: platform,
        timestamp: timestamp
      })
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Session created:', data);
    // Expected: { sessionId: "uuid-...", status: "active", createdAt: ... }
    
    // 3. Save intent + sessionId to Chrome storage
    await chrome.storage.local.set({ 
      currentIntent: intent,
      sessionId: data.sessionId,
      intentSetAt: timestamp,
      platform: platform,
      alignmentStatus: 'monitoring'
    });
    
    // 4. Notify background script to start monitoring
    chrome.runtime.sendMessage({ 
      type: 'INTENT_SET', 
      intent: intent,
      sessionId: data.sessionId,
      platform: platform
    });
    
    // 5. Show success feedback
    showSuccessMessage(intent);
    
    // Remove modal
    closeModal();
    
  } catch (error) {
    console.error('Error creating session:', error);
    
    // User-friendly error message
    let errorMsg = 'Failed to start session. ';
    if (error.message.includes('fetch')) {
      errorMsg += 'Cannot connect to backend server. Make sure it\'s running at ' + API_BASE_URL;
    } else {
      errorMsg += error.message;
    }
    
    alert(errorMsg);
  }
}

/**
 * Close the modal
 */
function closeModal() {
  const overlay = document.getElementById('intent-modal-overlay');
  const style = document.getElementById('intent-modal-styles');
  
  if (overlay) {
    overlay.style.animation = 'fadeOut 0.2s ease';
    setTimeout(() => overlay.remove(), 200);
  }
  if (style) {
    style.remove();
  }
}

/**
 * Show success message briefly
 */
function showSuccessMessage(intent) {
  const message = document.createElement('div');
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
    message.style.animation = 'fadeOut 0.3s ease';
    setTimeout(() => message.remove(), 300);
  }, 3000);
}

// Add fadeOut animation
const animations = document.createElement('style');
animations.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  @keyframes slideIn {
    from { transform: translateX(100px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(animations);
