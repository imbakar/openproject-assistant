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
      `${settings.serverUrl}/api/v3/time_entries?filters=[{"spentOn":{"operator":"<>d","values":["${today}","${today}"]}}]&sortBy=[["spentOn","desc"]]`,
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

// Timer state
let timerStartTime = null;
let timerAccumulatedMS = 0;
let timerIsRunning = false;
let timerWorkPackageId = '';
let timerComment = '';

// Promise to ensure state is loaded before handling messages
const stateLoaded = new Promise((resolve) => {
  chrome.storage.local.get(
    [
      'timerStartTime',
      'timerAccumulatedMS',
      'timerAccumulatedSeconds', // Legacy support
      'timerIsRunning',
      'timerWorkPackageId',
      'timerComment',
    ],
    (data) => {
      if (data.timerStartTime !== undefined)
        timerStartTime = data.timerStartTime;

      // Handle migration from seconds to milliseconds
      if (data.timerAccumulatedMS !== undefined) {
        timerAccumulatedMS = data.timerAccumulatedMS;
      } else if (data.timerAccumulatedSeconds !== undefined) {
        timerAccumulatedMS = data.timerAccumulatedSeconds * 1000;
      }

      if (data.timerIsRunning !== undefined)
        timerIsRunning = data.timerIsRunning;
      if (data.timerWorkPackageId !== undefined)
        timerWorkPackageId = data.timerWorkPackageId;
      if (data.timerComment !== undefined) timerComment = data.timerComment;

      console.log('Timer state loaded:', {
        timerIsRunning,
        timerAccumulatedMS,
      });
      resolve();
    }
  );
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'makeApiCall') {
    makeApiCall(request.endpoint, request.method, request.data)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true; // Keep the message channel open for async response
  }

  // Wrap timer actions in stateLoaded promise
  stateLoaded.then(() => {
    if (request.action === 'startTimer') {
      if (!timerIsRunning) {
        timerStartTime = Date.now();
        timerIsRunning = true;
        timerWorkPackageId = request.workPackageId;
        timerComment = request.comment;
        saveTimerStateToStorage();
      }
      sendResponse({ success: true, isRunning: timerIsRunning });
    } else if (request.action === 'pauseTimer') {
      if (timerIsRunning) {
        timerAccumulatedMS += Date.now() - timerStartTime;
        timerIsRunning = false;
        timerStartTime = null;
        saveTimerStateToStorage();
      }
      sendResponse({ success: true });
    } else if (request.action === 'resetTimer') {
      timerStartTime = null;
      timerAccumulatedMS = 0;
      timerIsRunning = false;
      timerWorkPackageId = '';
      timerComment = '';
      saveTimerStateToStorage();
      sendResponse({ success: true });
    } else if (request.action === 'getTimerState') {
      let currentMS = timerAccumulatedMS;
      if (timerIsRunning && timerStartTime) {
        currentMS += Date.now() - timerStartTime;
      }
      sendResponse({
        seconds: Math.floor(currentMS / 1000),
        isRunning: timerIsRunning,
        workPackageId: timerWorkPackageId,
        comment: timerComment,
      });
    } else if (request.action === 'updateTimerData') {
      timerWorkPackageId = request.workPackageId;
      timerComment = request.comment;
      saveTimerStateToStorage();
      sendResponse({ success: true });
    }
  });

  return true; // Keep message channel open for async handlers
});

function saveTimerStateToStorage() {
  chrome.storage.local.set({
    timerStartTime,
    timerAccumulatedMS,
    timerIsRunning,
    timerWorkPackageId,
    timerComment,
  });
}

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

  // Handle empty responses (e.g., DELETE requests return 204 No Content)
  if (response.status === 204) {
    return {};
  }

  // Try to parse JSON, but handle empty responses gracefully
  const text = await response.text();
  if (!text || text.trim() === '') {
    return {};
  }

  return JSON.parse(text);
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { makeApiCall, checkMissingWorklogs };
}
