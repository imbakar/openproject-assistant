// Background service worker for OpenProject Assistant

// Handle installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('OpenProject Assistant installed');

  // Set up daily reminder alarm
  chrome.alarms.create('dailyReminder', {
    delayInMinutes: 1,
    periodInMinutes: 1440, // Daily
  });
});

// Handle alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyReminder') {
    checkMissingWorklogs();
  }
});

// Check for missing worklogs
async function checkMissingWorklogs() {
  const settings = await chrome.storage.sync.get([
    'serverUrl',
    'apiKey',
    'enableReminders',
  ]);

  if (!settings.enableReminders) return;
  if (!settings.serverUrl || !settings.apiKey) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if user has logged any work today
    const response = await fetch(
      `${settings.serverUrl}/api/v3/time_entries?filters=[{"spent_on":{"operator":"=","values":["${today}"]}}]`,
      {
        headers: {
          Authorization: `Basic ${btoa(`apikey:${settings.apiKey}`)}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();

      if (
        !data._embedded ||
        !data._embedded.elements ||
        data._embedded.elements.length === 0
      ) {
        // No worklogs for today
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon128.png',
          title: 'OpenProject Worklog Reminder',
          message:
            "You haven't logged any work today. Don't forget to update your worklogs!",
          priority: 2,
        });
      }
    }
  } catch (error) {
    console.error('Error checking worklogs:', error);
  }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'makeApiCall') {
    makeApiCall(request.endpoint, request.method, request.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

// Make API calls to OpenProject
async function makeApiCall(endpoint, method = 'GET', data = null) {
  const settings = await chrome.storage.sync.get(['serverUrl', 'apiKey']);

  if (!settings.serverUrl || !settings.apiKey) {
    throw new Error('Server URL and API Key must be configured');
  }

  const url = `${settings.serverUrl}${endpoint}`;
  const options = {
    method: method,
    headers: {
      Authorization: `Basic ${btoa(`apikey:${settings.apiKey}`)}`,
      'Content-Type': 'application/json',
    },
  };

  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeApiCall, checkMissingWorklogs };
}
