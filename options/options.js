// OpenProject Assistant - Options Script

// ============================================================================
// CONFIG
// ============================================================================
const CONFIG = {
  STORAGE: {
    SERVER_URL: 'serverUrl',
    API_KEY: 'apiKey',
    ENABLE_REMINDERS: 'enableReminders',
    REMINDER_TIME: 'reminderTime',
    ENABLE_COMMENT_NOTIFICATIONS: 'enableCommentNotifications',
    THEME: 'theme',
    DATE_FORMAT: 'dateFormat',
    DEFAULT_WORKLOG_HOURS: 'defaultWorklogHours',
    AUTO_ROUND_HOURS: 'autoRoundHours',
    REQUIRE_COMMENT: 'requireComment',
    ENABLE_TIMER_SOUND: 'enableTimerSound',
    PAUSE_TIMER_ON_IDLE: 'pauseTimerOnIdle',
    CALENDAR_PROVIDER: 'calendarProvider',
    AUTO_CREATE_MEETING_WORKLOGS: 'autoCreateMeetingWorklogs',
    AUTO_CHANGE_STATUS: 'autoChangeStatus',
    AUTO_STATUS_FROM: 'autoStatusFrom',
    AUTO_STATUS_TO: 'autoStatusTo',
  },
  API: {
    ROOT: '/api/v3',
    STATUSES: '/api/v3/statuses',
  },
  DEFAULTS: {
    REMINDER_TIME: '17:00',
    THEME: 'light',
    DATE_FORMAT: 'YYYY-MM-DD',
    WORKLOG_HOURS: 8,
    CALENDAR_PROVIDER: 'none',
  },
  UI: {
    STATUS_HIDE_DELAY: 2000,
    DEBOUNCE_DELAY: 1000,
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

// Debounce: limit how often a function can be called
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ============================================================================
// OPTIONS PAGE
// ============================================================================

// Helper to get normalized server URL
const getServerUrl = () =>
  document
    .getElementById(CONFIG.STORAGE.SERVER_URL)
    .value.trim()
    .replace(/\/$/, '');

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadSettings();

  // Auto-focus server URL if not configured
  if (!document.getElementById(CONFIG.STORAGE.SERVER_URL).value) {
    document.getElementById(CONFIG.STORAGE.SERVER_URL).focus();
  }
});

// Setup event listeners
function setupEventListeners() {
  // Save button
  document.getElementById('saveBtn').addEventListener('click', saveSettings);

  // Cancel button
  document.getElementById('cancelBtn').addEventListener('click', () => {
    window.close();
  });

  // Test connection button (debounced)
  document
    .getElementById('testConnectionBtn')
    .addEventListener(
      'click',
      debounce(testConnection, CONFIG.UI.DEBOUNCE_DELAY)
    );

  // Toggle API key visibility
  document
    .getElementById('toggleApiKey')
    .addEventListener('click', toggleApiKeyVisibility);

  // Clear cache button
  document
    .getElementById('clearCacheBtn')
    .addEventListener('click', clearCache);

  // Export settings button
  document
    .getElementById('exportSettingsBtn')
    .addEventListener('click', exportSettings);

  // Import settings button
  document.getElementById('importSettingsBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });

  // Import file input
  document
    .getElementById('importFileInput')
    .addEventListener('change', importSettings);

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

  // Auto-change status checkbox toggle
  document
    .getElementById(CONFIG.STORAGE.AUTO_CHANGE_STATUS)
    .addEventListener('change', (e) => {
      document.getElementById('statusAutomationOptions').style.display = e
        .target.checked
        ? 'grid'
        : 'none';
    });
}

// Load settings from chrome.storage.sync and populate form fields
async function loadSettings() {
  const settings = await chrome.storage.sync.get(Object.values(CONFIG.STORAGE));

  // Connection settings
  if (settings[CONFIG.STORAGE.SERVER_URL]) {
    document.getElementById(CONFIG.STORAGE.SERVER_URL).value =
      settings[CONFIG.STORAGE.SERVER_URL];
  }
  if (settings[CONFIG.STORAGE.API_KEY]) {
    document.getElementById(CONFIG.STORAGE.API_KEY).value =
      settings[CONFIG.STORAGE.API_KEY];
  }

  // Notification settings
  document.getElementById(CONFIG.STORAGE.ENABLE_REMINDERS).checked =
    settings[CONFIG.STORAGE.ENABLE_REMINDERS] || false;
  document.getElementById(CONFIG.STORAGE.REMINDER_TIME).value =
    settings[CONFIG.STORAGE.REMINDER_TIME] || CONFIG.DEFAULTS.REMINDER_TIME;
  document.getElementById(CONFIG.STORAGE.ENABLE_COMMENT_NOTIFICATIONS).checked =
    settings[CONFIG.STORAGE.ENABLE_COMMENT_NOTIFICATIONS] || false;

  // Appearance
  document.getElementById(CONFIG.STORAGE.THEME).value =
    settings[CONFIG.STORAGE.THEME] || CONFIG.DEFAULTS.THEME;
  document.getElementById(CONFIG.STORAGE.DATE_FORMAT).value =
    settings[CONFIG.STORAGE.DATE_FORMAT] || CONFIG.DEFAULTS.DATE_FORMAT;

  // Worklog settings
  document.getElementById(CONFIG.STORAGE.DEFAULT_WORKLOG_HOURS).value =
    settings[CONFIG.STORAGE.DEFAULT_WORKLOG_HOURS] ||
    CONFIG.DEFAULTS.WORKLOG_HOURS;
  document.getElementById(CONFIG.STORAGE.AUTO_ROUND_HOURS).checked =
    settings[CONFIG.STORAGE.AUTO_ROUND_HOURS] || false;
  document.getElementById(CONFIG.STORAGE.REQUIRE_COMMENT).checked =
    settings[CONFIG.STORAGE.REQUIRE_COMMENT] || false;

  // Timer settings
  document.getElementById(CONFIG.STORAGE.ENABLE_TIMER_SOUND).checked =
    settings[CONFIG.STORAGE.ENABLE_TIMER_SOUND] || false;
  document.getElementById(CONFIG.STORAGE.PAUSE_TIMER_ON_IDLE).checked =
    settings[CONFIG.STORAGE.PAUSE_TIMER_ON_IDLE] || false;

  // Calendar integration
  document.getElementById(CONFIG.STORAGE.CALENDAR_PROVIDER).value =
    settings[CONFIG.STORAGE.CALENDAR_PROVIDER] ||
    CONFIG.DEFAULTS.CALENDAR_PROVIDER;
  document.getElementById(CONFIG.STORAGE.AUTO_CREATE_MEETING_WORKLOGS).checked =
    settings[CONFIG.STORAGE.AUTO_CREATE_MEETING_WORKLOGS] || false;

  // Work Package Automation
  document.getElementById(CONFIG.STORAGE.AUTO_CHANGE_STATUS).checked =
    settings[CONFIG.STORAGE.AUTO_CHANGE_STATUS] || false;

  const fromSelect = document.getElementById('autoStatusFrom');
  const toSelect = document.getElementById('autoStatusTo');

  // Store pending status values to restore after loading statuses
  const pendingStatusValues = {
    from: settings[CONFIG.STORAGE.AUTO_STATUS_FROM] || '',
    to: settings[CONFIG.STORAGE.AUTO_STATUS_TO] || '',
  };

  // Try to set value directly in case already loaded
  fromSelect.value = pendingStatusValues.from;
  toSelect.value = pendingStatusValues.to;

  // Toggle options visibility
  document.getElementById('statusAutomationOptions').style.display = settings[
    CONFIG.STORAGE.AUTO_CHANGE_STATUS
  ]
    ? 'grid'
    : 'none';

  // Load statuses after settings are loaded
  await loadStatuses(pendingStatusValues);
}

// Save all form settings to chrome.storage.sync
async function saveSettings() {
  const saveBtn = document.getElementById('saveBtn');
  const originalText = saveBtn.textContent;
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const settings = {
      [CONFIG.STORAGE.SERVER_URL]: getServerUrl(),
      [CONFIG.STORAGE.API_KEY]: document
        .getElementById(CONFIG.STORAGE.API_KEY)
        .value.trim(),
      [CONFIG.STORAGE.ENABLE_REMINDERS]: document.getElementById(
        CONFIG.STORAGE.ENABLE_REMINDERS
      ).checked,
      [CONFIG.STORAGE.REMINDER_TIME]: document.getElementById(
        CONFIG.STORAGE.REMINDER_TIME
      ).value,
      [CONFIG.STORAGE.ENABLE_COMMENT_NOTIFICATIONS]: document.getElementById(
        CONFIG.STORAGE.ENABLE_COMMENT_NOTIFICATIONS
      ).checked,
      [CONFIG.STORAGE.THEME]: document.getElementById(CONFIG.STORAGE.THEME)
        .value,
      [CONFIG.STORAGE.DATE_FORMAT]: document.getElementById(
        CONFIG.STORAGE.DATE_FORMAT
      ).value,
      [CONFIG.STORAGE.DEFAULT_WORKLOG_HOURS]: parseFloat(
        document.getElementById(CONFIG.STORAGE.DEFAULT_WORKLOG_HOURS).value
      ),
      [CONFIG.STORAGE.AUTO_ROUND_HOURS]: document.getElementById(
        CONFIG.STORAGE.AUTO_ROUND_HOURS
      ).checked,
      [CONFIG.STORAGE.REQUIRE_COMMENT]: document.getElementById(
        CONFIG.STORAGE.REQUIRE_COMMENT
      ).checked,
      [CONFIG.STORAGE.ENABLE_TIMER_SOUND]: document.getElementById(
        CONFIG.STORAGE.ENABLE_TIMER_SOUND
      ).checked,
      [CONFIG.STORAGE.PAUSE_TIMER_ON_IDLE]: document.getElementById(
        CONFIG.STORAGE.PAUSE_TIMER_ON_IDLE
      ).checked,
      [CONFIG.STORAGE.CALENDAR_PROVIDER]: document.getElementById(
        CONFIG.STORAGE.CALENDAR_PROVIDER
      ).value,
      [CONFIG.STORAGE.AUTO_CREATE_MEETING_WORKLOGS]: document.getElementById(
        CONFIG.STORAGE.AUTO_CREATE_MEETING_WORKLOGS
      ).checked,
      [CONFIG.STORAGE.AUTO_CHANGE_STATUS]: document.getElementById(
        CONFIG.STORAGE.AUTO_CHANGE_STATUS
      ).checked,
      [CONFIG.STORAGE.AUTO_STATUS_FROM]:
        document.getElementById('autoStatusFrom').value,
      [CONFIG.STORAGE.AUTO_STATUS_TO]:
        document.getElementById('autoStatusTo').value,
    };

    // Validate required fields
    if (!settings[CONFIG.STORAGE.SERVER_URL]) {
      showConnectionResult('Server URL is required', 'error');
      return;
    }

    if (!settings[CONFIG.STORAGE.API_KEY]) {
      showConnectionResult('API Key is required', 'error');
      return;
    }

    // Validate status automation settings
    if (settings[CONFIG.STORAGE.AUTO_CHANGE_STATUS]) {
      if (
        !settings[CONFIG.STORAGE.AUTO_STATUS_FROM] ||
        !settings[CONFIG.STORAGE.AUTO_STATUS_TO]
      ) {
        showConnectionResult(
          'Please select both "From" and "To" statuses for automation',
          'error'
        );
        return;
      }
      if (
        settings[CONFIG.STORAGE.AUTO_STATUS_FROM] ===
        settings[CONFIG.STORAGE.AUTO_STATUS_TO]
      ) {
        showConnectionResult(
          '"From" and "To" statuses cannot be the same',
          'error'
        );
        return;
      }
    }

    await chrome.storage.sync.set(settings);
    showConnectionResult('Settings saved successfully!', 'success');

    // Update alarms if reminders setting changed
    if (settings[CONFIG.STORAGE.ENABLE_REMINDERS]) {
      chrome.alarms.create('dailyReminder', {
        delayInMinutes: 1,
        periodInMinutes: 1440,
      });
    } else {
      chrome.alarms.clear('dailyReminder');
    }
  } catch (error) {
    console.error('Error saving settings:', error);
    showConnectionResult('Failed to save settings', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalText;
  }
}

// Test connection to OpenProject API
async function testConnection() {
  const serverUrl = getServerUrl();
  const apiKey = document.getElementById(CONFIG.STORAGE.API_KEY).value.trim();

  if (!serverUrl || !apiKey) {
    showConnectionResult('Please enter both Server URL and API Key', 'error');
    return;
  }

  const testBtn = document.getElementById('testConnectionBtn');
  testBtn.disabled = true;
  testBtn.textContent = 'Testing...';

  try {
    const response = await fetch(`${serverUrl}${CONFIG.API.ROOT}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${btoa(`apikey:${apiKey}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      showConnectionResult(
        `✓ Connection successful! Connected to OpenProject ${data.coreVersion || 'instance'}`,
        'success'
      );
      // Refresh statuses after successful connection, preserving current selection
      const fromSelect = document.getElementById('autoStatusFrom');
      const toSelect = document.getElementById('autoStatusTo');
      const pendingValues = {
        from: fromSelect.value,
        to: toSelect.value,
      };
      await loadStatuses(pendingValues);
    } else {
      showConnectionResult(
        `✗ Connection failed: ${response.status} - ${response.statusText}`,
        'error'
      );
    }
  } catch (error) {
    showConnectionResult(`✗ Connection failed: ${error.message}`, 'error');
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = 'Test Connection';
  }
}

// Show connection test result message (auto-hides after delay)
function showConnectionResult(message, type) {
  const resultEl = document.getElementById('connectionResult');
  resultEl.textContent = message;
  resultEl.className = type;
  resultEl.style.display = 'block';

  setTimeout(() => {
    resultEl.style.display = 'none';
  }, CONFIG.UI.STATUS_HIDE_DELAY);
}

// Toggle API key input visibility between password and text
function toggleApiKeyVisibility() {
  const apiKeyInput = document.getElementById(CONFIG.STORAGE.API_KEY);
  const toggleBtn = document.getElementById('toggleApiKey');

  if (apiKeyInput.type === 'password') {
    apiKeyInput.type = 'text';
    toggleBtn.textContent = 'Hide';
  } else {
    apiKeyInput.type = 'password';
    toggleBtn.textContent = 'Show';
  }
}

// Clear all cached data from chrome.storage.local
async function clearCache() {
  if (
    !confirm(
      'Are you sure you want to clear all cached data? This will not affect your settings.'
    )
  ) {
    return;
  }

  try {
    await chrome.storage.local.clear();
    showConnectionResult('Cache cleared successfully!', 'success');
  } catch (error) {
    console.error('Error clearing cache:', error);
    showConnectionResult('Failed to clear cache', 'error');
  }
}

// Export settings to JSON file (excluding sensitive data)
async function exportSettings() {
  try {
    const settings = await chrome.storage.sync.get(null);

    // Remove sensitive data from export
    const exportData = { ...settings };
    delete exportData[CONFIG.STORAGE.API_KEY];

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `openproject-assistant-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
    showConnectionResult('Settings exported successfully!', 'success');
  } catch (error) {
    console.error('Error exporting settings:', error);
    showConnectionResult('Failed to export settings', 'error');
  }
}

// Import settings from JSON file
async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const settings = JSON.parse(text);

    // Merge with current settings (don't overwrite API key)
    const currentSettings = await chrome.storage.sync.get([
      CONFIG.STORAGE.API_KEY,
    ]);
    const mergedSettings = { ...settings, ...currentSettings };

    await chrome.storage.sync.set(mergedSettings);
    await loadSettings();

    showConnectionResult('Settings imported successfully!', 'success');
  } catch (error) {
    console.error('Error importing settings:', error);
    showConnectionResult(
      'Failed to import settings. Please check the file format.',
      'error'
    );
  }

  // Reset file input
  event.target.value = '';
}

// Show about dialog with extension information
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

// Show feedback dialog to collect user input
function showFeedbackDialog() {
  const feedback = prompt(
    "We'd love to hear your feedback!\n\n" +
      'Please share your thoughts, suggestions, or report issues:'
  );

  if (feedback && feedback.trim()) {
    showConnectionResult('Thank you for your feedback!', 'success');
    console.log('User feedback:', feedback);
  }
}

// Create an option element for status select dropdown
function createStatusOption(status) {
  const option = document.createElement('option');
  option.value = status.id;
  option.textContent = status.name;
  return option;
}

// Load statuses from OpenProject API
async function loadStatuses(pendingValues = { from: '', to: '' }) {
  const serverUrl = getServerUrl();
  const apiKey = document.getElementById(CONFIG.STORAGE.API_KEY).value.trim();

  const fromSelect = document.getElementById('autoStatusFrom');
  const toSelect = document.getElementById('autoStatusTo');

  if (!serverUrl || !apiKey) return;

  // Show loading state
  fromSelect.disabled = true;
  toSelect.disabled = true;
  fromSelect.innerHTML = '<option value="">Loading...</option>';
  toSelect.innerHTML = '<option value="">Loading...</option>';

  try {
    const response = await fetch(`${serverUrl}${CONFIG.API.STATUSES}`, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${btoa(`apikey:${apiKey}`)}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const statuses = data._embedded.elements;

      // Clear and populate both selects
      fromSelect.innerHTML = '';
      toSelect.innerHTML = '';

      statuses.forEach((status) => {
        fromSelect.appendChild(createStatusOption(status));
        toSelect.appendChild(createStatusOption(status));
      });

      // Restore values from pending values
      if (
        pendingValues.from &&
        Array.from(fromSelect.options).some(
          (o) => o.value === pendingValues.from
        )
      ) {
        fromSelect.value = pendingValues.from;
      }
      if (
        pendingValues.to &&
        Array.from(toSelect.options).some((o) => o.value === pendingValues.to)
      ) {
        toSelect.value = pendingValues.to;
      }
    } else {
      fromSelect.innerHTML = '<option value="">Failed to load</option>';
      toSelect.innerHTML = '<option value="">Failed to load</option>';
    }
  } catch (error) {
    console.error('Error loading statuses:', error);
    fromSelect.innerHTML = '<option value="">Error loading statuses</option>';
    toSelect.innerHTML = '<option value="">Error loading statuses</option>';
  } finally {
    fromSelect.disabled = false;
    toSelect.disabled = false;
  }
}
