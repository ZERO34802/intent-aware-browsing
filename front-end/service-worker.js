// Background service worker — handles scheduling and backend communication
console.log('Intent-Aware Browsing service worker loaded');

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Intent-Aware Browsing extension installed');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);

  if (message.type === 'INTENT_SET') {
    console.log('Intent set:', message.intent);
    // TODO: Start screenshot monitoring
  } else if (message.type === 'INTENT_CLEARED') {
    console.log('Intent cleared');
    // TODO: Stop screenshot monitoring
  }

  sendResponse({ success: true });
  return true;
});

// TODO: Implement screenshot scheduling
// TODO: Send screenshots + intent to backend API
// TODO: Handle alignment results from backend
// TODO: Send status updates to popup
