// OpenProject Assistant - Options Script

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  
  // Cancel button
  document.getElementById('cancelBtn').addEventListener('click', () => {
    window.close();
  });
  
  // Test connection button
  document.getElementById('testConnectionBtn').addEventListener('click', testConnection);
  
  // Toggle API key visibility
  document.getElementById('toggleApiKey').addEventListener('click', toggleApiKeyVisibility);
  
  // Clear cache button
  document.getElementById('clearCacheBtn').addEventListener('click', clearCache);
  
  // Export settings button
  document.getElementById('exportSettingsBtn').addEventListener('click', exportSettings);
  
  // Import settings button
  document.getElementById('importSettingsBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });
  
  // Import file input
  document.getElementById('importFileInput').addEventListener('change', importSettings);
  
  // About link
  document.getElementById('aboutLink').addEventListener('click', (e) => {
    e.preventDefault();
    showAboutDialog();
  });
  
  // Feedback link
  document.getElementById('feedbackLink').addEventListener('click', (e) => {
    e.preventDefault();
    showFeedbackDialog();
  });
}

// Load settings from storage
async function loadSettings() {
  const settings = await chrome.storage.sync.get([
    'serverUrl',
    'apiKey',
    'enableReminders',
    'reminderTime',
    'enableCommentNotifications',
    'theme',
    'dateFormat',
    'defaultWorklogHours',
    'autoRoundHours',
    'requireComment',
    'enableTimerSound',
    'pauseTimerOnIdle',
    'calendarProvider',
    'autoCreateMeetingWorklogs'
  ]);
  
  // Connection settings
  if (settings.serverUrl) {
    document.getElementById('serverUrl').value = settings.serverUrl;
  }
  if (settings.apiKey) {
    document.getElementById('apiKey').value = settings.apiKey;
  }
  
  // Notification settings
  document.getElementById('enableReminders').checked = settings.enableReminders || false;
  document.getElementById('reminderTime').value = settings.reminderTime || '17:00';
  document.getElementById('enableCommentNotifications').checked = settings.enableCommentNotifications || false;
  
  // Appearance
  document.getElementById('theme').value = settings.theme || 'light';
  document.getElementById('dateFormat').value = settings.dateFormat || 'YYYY-MM-DD';
  
  // Worklog settings
  document.getElementById('defaultWorklogHours').value = settings.defaultWorklogHours || 8;
  document.getElementById('autoRoundHours').checked = settings.autoRoundHours || false;
  document.getElementById('requireComment').checked = settings.requireComment || false;
  
  // Timer settings
  document.getElementById('enableTimerSound').checked = settings.enableTimerSound || false;
  document.getElementById('pauseTimerOnIdle').checked = settings.pauseTimerOnIdle || false;
  
  // Calendar integration
  document.getElementById('calendarProvider').value = settings.calendarProvider || 'none';
  document.getElementById('autoCreateMeetingWorklogs').checked = settings.autoCreateMeetingWorklogs || false;
}

// Save settings to storage
async function saveSettings() {
  const settings = {
    serverUrl: document.getElementById('serverUrl').value.trim().replace(/\/$/, ''),
    apiKey: document.getElementById('apiKey').value.trim(),
    enableReminders: document.getElementById('enableReminders').checked,
    reminderTime: document.getElementById('reminderTime').value,
    enableCommentNotifications: document.getElementById('enableCommentNotifications').checked,
    theme: document.getElementById('theme').value,
    dateFormat: document.getElementById('dateFormat').value,
    defaultWorklogHours: parseFloat(document.getElementById('defaultWorklogHours').value),
    autoRoundHours: document.getElementById('autoRoundHours').checked,
    requireComment: document.getElementById('requireComment').checked,
    enableTimerSound: document.getElementById('enableTimerSound').checked,
    pauseTimerOnIdle: document.getElementById('pauseTimerOnIdle').checked,
    calendarProvider: document.getElementById('calendarProvider').value,
    autoCreateMeetingWorklogs: document.getElementById('autoCreateMeetingWorklogs').checked
  };
  
  // Validate required fields
  if (!settings.serverUrl) {
    showStatus('Server URL is required', 'error');
    return;
  }
  
  if (!settings.apiKey) {
    showStatus('API Key is required', 'error');
    return;
  }
  
  try {
    await chrome.storage.sync.set(settings);
    showStatus('Settings saved successfully!', 'success');
    
    // Update alarms if reminders setting changed
    if (settings.enableReminders) {
      chrome.alarms.create('dailyReminder', {
        delayInMinutes: 1,
        periodInMinutes: 1440
      });
    } else {
      chrome.alarms.clear('dailyReminder');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Failed to save settings', 'error');
  }
}

// Test connection to OpenProject
async function testConnection() {
  const serverUrl = document.getElementById('serverUrl').value.trim().replace(/\/$/, '');
  const apiKey = document.getElementById('apiKey').value.trim();
  
  if (!serverUrl || !apiKey) {
    showConnectionResult('Please enter both Server URL and API Key', 'error');
    return;
  }
  
  const testBtn = document.getElementById('testConnectionBtn');
  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';
  
  try {
    const response = await fetch(`${serverUrl}/api/v3`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`apikey:${apiKey}`)}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      showConnectionResult(
        `✓ Connection successful! Connected to OpenProject ${data.coreVersion || 'instance'}`,
        'success'
      );
    } else {
      const errorText = await response.text();
      showConnectionResult(
        `✗ Connection failed: ${response.status} - ${response.statusText}`,
        'error'
      );
    }
  } catch (error) {
    showConnectionResult(
      `✗ Connection failed: ${error.message}`,
      'error'
    );
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  }
}

// Show connection test result
function showConnectionResult(message, type) {
  const resultEl = document.getElementById('connectionResult');
  resultEl.textContent = message;
  resultEl.className = type;
  resultEl.style.display = 'block';
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById('apiKey');
  const toggleBtn = document.getElementById('toggleApiKey');
  
  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleBtn.textContent = 'Hide';
  } else {
    apiKeyInput.type = 'password';
    toggleBtn.textContent = 'Show';
  }
}

// Clear cache
async function clearCache() {
  if (!confirm('Are you sure you want to clear all cached data? This will not affect your settings.')) {
    return;
  }
  
  try {
    await chrome.storage.local.clear();
    showStatus('Cache cleared successfully!', 'success');
  } catch (error) {
    console.error('Error clearing cache:', error);
    showStatus('Failed to clear cache', 'error');
  }
}

// Export settings
async function exportSettings() {
  try {
    const settings = await chrome.storage.sync.get(null);
    
    // Remove sensitive data from export
    const exportData = { ...settings };
    delete exportData.apiKey;
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `openproject-assistant-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showStatus('Settings exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting settings:', error);
    showStatus('Failed to export settings', 'error');
  }
}

// Import settings
async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const settings = JSON.parse(text);
    
    // Merge with current settings (don't overwrite API key)
    const currentSettings = await chrome.storage.sync.get(['apiKey']);
    const mergedSettings = { ...settings, ...currentSettings };
    
    await chrome.storage.sync.set(mergedSettings);
    await loadSettings();
    
    showStatus('Settings imported successfully!', 'success');
  } catch (error) {
    console.error('Error importing settings:', error);
    showStatus('Failed to import settings. Please check the file format.', 'error');
  }
  
  // Reset file input
  event.target.value = '';
}

// Show about dialog
function showAboutDialog() {
  alert(
    'OpenProject Assistant v1.0.0\n\n' +
    'A Chrome extension for tracking work, managing worklogs, and generating reports for OpenProject.\n\n' +
    'Features:\n' +
    '• Time tracking with integrated timer\n' +
    '• Worklog management\n' +
    '• Comprehensive reporting\n' +
    '• Calendar integration\n' +
    '• Daily reminders\n\n' +
    'For more information, visit:\n' +
    'https://www.openproject.org'
  );
}

// Show feedback dialog
function showFeedbackDialog() {
  const feedback = prompt(
    'We\'d love to hear your feedback!\n\n' +
    'Please share your thoughts, suggestions, or report issues:'
  );
  
  if (feedback && feedback.trim()) {
    showStatus('Thank you for your feedback!', 'success');
    console.log('User feedback:', feedback);
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  statusEl.style.display = 'block';
  
  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
}
