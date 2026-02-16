// DOM elements
const intentInput = document.getElementById('intent-input');
const setIntentBtn = document.getElementById('set-intent-btn');
const clearIntentBtn = document.getElementById('clear-intent-btn');
const currentIntentSection = document.getElementById('current-intent-section');
const currentIntentText = document.getElementById('current-intent-text');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const statsSection = document.getElementById('stats-section');
const alignedCount = document.getElementById('aligned-count');
const warningCount = document.getElementById('warning-count');
const settingsBtn = document.getElementById('settings-btn');

// Load stored data when popup opens
document.addEventListener('DOMContentLoaded', loadPopupData);

// Event listeners
setIntentBtn.addEventListener('click', handleSetIntent);
clearIntentBtn.addEventListener('click', handleClearIntent);
settingsBtn.addEventListener('click', openSettings);

/**
 * Load current intent and status from storage
 */
async function loadPopupData() {
  try {
    const result = await chrome.storage.local.get([
      'currentIntent',
      'alignmentStatus',
      'stats'
    ]);

    // Load current intent
    if (result.currentIntent) {
      displayCurrentIntent(result.currentIntent);
    }

    // Load alignment status
    if (result.alignmentStatus) {
      updateStatusDisplay(result.alignmentStatus);
    }

    // Load stats
    if (result.stats) {
      displayStats(result.stats);
    }
  } catch (error) {
    console.error('Error loading popup data:', error);
  }
}

/**
 * Handle setting a new intent
 */
async function handleSetIntent() {
  const intent = intentInput.value.trim();

  if (!intent) {
    alert('Please enter your browsing intention');
    return;
  }

  try {
    // Save intent to storage
    await chrome.storage.local.set({
      currentIntent: intent,
      intentSetAt: Date.now(),
      alignmentStatus: 'neutral'
    });

    // Update UI
    displayCurrentIntent(intent);
    intentInput.value = '';
    updateStatusDisplay('neutral');

    // Notify background script that intent was set
    chrome.runtime.sendMessage({
      type: 'INTENT_SET',
      intent: intent
    });

  } catch (error) {
    console.error('Error setting intent:', error);
    alert('Failed to set intent. Please try again.');
  }
}

/**
 * Handle clearing the current intent
 */
async function handleClearIntent() {
  try {
    await chrome.storage.local.remove([
      'currentIntent',
      'intentSetAt',
      'alignmentStatus'
    ]);

    // Reset UI
    currentIntentSection.classList.add('hidden');
    updateStatusDisplay(null);

    // Notify background script
    chrome.runtime.sendMessage({
      type: 'INTENT_CLEARED'
    });

  } catch (error) {
    console.error('Error clearing intent:', error);
  }
}

/**
 * Display the current intent in the UI
 */
function displayCurrentIntent(intent) {
  currentIntentText.textContent = intent;
  currentIntentSection.classList.remove('hidden');
}

/**
 * Update the status indicator
 */
function updateStatusDisplay(status) {
  // Reset classes
  statusIndicator.classList.remove('neutral', 'aligned', 'distracted');

  if (!status || status === 'neutral') {
    statusIndicator.classList.add('neutral');
    statusText.textContent = 'Intent set - monitoring...';
  } else if (status === 'aligned') {
    statusIndicator.classList.add('aligned');
    statusText.textContent = '✓ Staying on track!';
  } else if (status === 'distracted') {
    statusIndicator.classList.add('distracted');
    statusText.textContent = '⚠ Getting distracted';
  }
}

/**
 * Display stats in the UI
 */
function displayStats(stats) {
  if (stats.alignedCount !== undefined) {
    alignedCount.textContent = stats.alignedCount;
  }
  if (stats.warningCount !== undefined) {
    warningCount.textContent = stats.warningCount;
  }
  statsSection.classList.remove('hidden');
}

/**
 * Open settings (placeholder for future implementation)
 */
function openSettings() {
  // TODO: Implement settings page
  alert('Settings coming soon!');
}

// Listen for status updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'STATUS_UPDATE') {
    updateStatusDisplay(message.status);
  } else if (message.type === 'STATS_UPDATE') {
    displayStats(message.stats);
  }
});
