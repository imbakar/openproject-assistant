// OpenProject Assistant - Popup Script
// Main popup interface for:
// - Work package search and selection
// - Time tracking with integrated timer
// - Worklog creation and editing
// - Report generation
// - Task management

// ============================================================================
// GLOBAL STATE
// ============================================================================
// Timer state
let timerInterval = null; // setInterval ID for timer updates
let timerSeconds = 0; // Current timer value in seconds
let isPaused = false; // Timer paused state

// Tab loading state - track which tabs have been loaded to avoid redundant API calls
window.tabsLoaded = {
  worklog: false,
  timer: false,
  tasks: false,
  reports: false,
};

// Data cache - store API responses to reduce redundant calls
window.allWorkPackages = []; // Cached work packages
window.allProjects = []; // Cached projects
window.projectsLoaded = false; // Projects loaded flag

// Editing state - track which worklog is being modified
window.editingWorklogId = null; // ID of worklog being edited
window.editingWorklogWPId = null; // Work package ID of edited worklog

// ============================================================================
// CONSTANTS (Named values for easy maintenance)
// ============================================================================
const SEARCH_DEBOUNCE_MS = 300; // Delay before search executes (ms)
const CACHE_MAX_SIZE = 100; // Max cached search results
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // Cache expires after 5 minutes
const SETTINGS_CACHE_TTL_MS = 60 * 1000; // Settings cache expires after 1 minute
const SELECT_ITEM_HEIGHT_PX = 40; // Height of one select option
const SELECT_MIN_HEIGHT_PX = 100; // Minimum dropdown height
const SELECT_MAX_HEIGHT_PX = 180; // Maximum dropdown height
const STATUS_HIDE_DELAY_MS = 5000; // Status message auto-hide delay
const TIMER_UPDATE_INTERVAL_MS = 1000; // Timer updates every second

// ============================================================================
// CACHING
// ============================================================================

// Search cache with TTL - stores search results and auto-expires after 5 minutes
const searchCache = {
  workPackages: new Map(),
  maxSize: CACHE_MAX_SIZE,
  maxAge: CACHE_MAX_AGE_MS,

  // Store search result with current timestamp
  set(key, value) {
    if (this.workPackages.size >= this.maxSize) {
      const firstKey = this.workPackages.keys().next().value;
      this.workPackages.delete(firstKey);
    }
    this.workPackages.set(key, { value, timestamp: Date.now() });
  },

  // Get cached result if exists and not expired
  get(key) {
    const entry = this.workPackages.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.workPackages.delete(key);
      return null;
    }
    return entry.value;
  },

  // Check if cached result exists and is fresh
  has(key) {
    return this.get(key) !== null;
  },
};

// Settings cache - reduces chrome.storage.sync calls (which are slow)
let cachedSettings = {
  serverUrl: null,
  apiKey: null,
  lastFetch: 0,
  cacheExpiry: SETTINGS_CACHE_TTL_MS,
};

// ============================================================================
// SETTINGS CACHE (Simple performance optimization)
// ============================================================================

// Get cached settings with automatic refresh
async function getCachedSettings() {
  const now = Date.now();
  if (
    !cachedSettings.serverUrl ||
    now - cachedSettings.lastFetch > cachedSettings.cacheExpiry
  ) {
    const settings = await chrome.storage.sync.get(['serverUrl', 'apiKey']);
    cachedSettings.serverUrl = settings.serverUrl;
    cachedSettings.apiKey = settings.apiKey;
    cachedSettings.lastFetch = now;
  }
  return cachedSettings;
}

// Invalidate settings cache (call after settings update)
function invalidateSettingsCache() {
  cachedSettings.lastFetch = 0;
}

// Safe async wrapper - prevents extension from crashing on errors
async function safeAsync(fn, errorMsg = 'Operation failed') {
  try {
    return await fn();
  } catch (error) {
    console.error(errorMsg, error);
    return null;
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  // Phase 1: Critical setup - load settings and set up UI
  await loadSettings();
  await checkConnection();
  setupEventListeners();
  setDefaultDates();

  // Phase 2: Load first tab data in parallel (much faster than sequential!)
  const [wpResult, projResult, wlResult] = await Promise.allSettled([
    loadWorkPackages(),
    loadProjects(),
    loadRecentWorklogs(),
  ]);

  // Log any errors but don't crash
  if (wpResult.status === 'rejected')
    console.error('Work packages failed:', wpResult.reason);
  if (projResult.status === 'rejected')
    console.error('Projects failed:', projResult.reason);
  if (wlResult.status === 'rejected')
    console.error('Worklogs failed:', wlResult.reason);

  window.tabsLoaded.worklog = true;

  // Phase 3: Preload timer state in background (don't block popup opening)
  setTimeout(() => loadTimerState(), 100);
});

// Setup all event listeners for popup interactions
function setupEventListeners() {
  // Tab switching between Worklog, Timer, Reports, Tasks
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Settings button - opens options page
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Refresh button - reloads all data in parallel for speed
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    const btn = document.getElementById('refreshBtn');
    Utils.setLoading(btn, true, '🔄');

    // Load all data in parallel instead of one by one
    await Promise.allSettled([
      loadWorkPackages(),
      loadProjects(),
      loadRecentWorklogs(),
      loadTasks(),
    ]);

    Utils.setLoading(btn, false);
    showStatus('Data refreshed', 'success');
  });

  // Setup searchable select dropdowns with debounced search
  setupSearchableSelect(
    'workPackageSearchInput',
    'workPackageSelect',
    Utils.debounce(
      (query) => filterWorkPackageOptions(query, updateWorkPackageSelects),
      SEARCH_DEBOUNCE_MS
    )
  );

  setupSearchableSelect(
    'timerWorkPackageSearch',
    'timerWorkPackage',
    Utils.debounce(
      (query) => filterWorkPackageOptions(query, updateTimerWorkPackageSelect),
      SEARCH_DEBOUNCE_MS
    )
  );

  setupSearchableSelect(
    'projectSearchInput',
    'projectSelect',
    Utils.debounce((query) => filterProjectOptions(query), SEARCH_DEBOUNCE_MS)
  );

  // Time range inputs - auto-calculate hours
  const startTimeInput = document.getElementById('workStartTime');
  const endTimeInput = document.getElementById('workEndTime');
  if (startTimeInput && endTimeInput) {
    const calculateHours = () => {
      const start = startTimeInput.value;
      const end = endTimeInput.value;
      const date = document.getElementById('workDate').value;

      if (start && end && date) {
        const startDate = new Date(`${date}T${start}`);
        const endDate = new Date(`${date}T${end}`);
        const diffMs = endDate - startDate;

        if (diffMs > 0) {
          const hours = diffMs / (1000 * 60 * 60);
          document.getElementById('workHours').value = hours.toFixed(2);
        }
      }
    };

    startTimeInput.addEventListener('change', calculateHours);
    endTimeInput.addEventListener('change', calculateHours);
  }

  // Mode toggle buttons
  document.getElementById('existingModeBtn').addEventListener('click', () => {
    switchWorkPackageMode('existing');
  });
  document.getElementById('newModBtn').addEventListener('click', () => {
    switchWorkPackageMode('new');
  });

  // Log work button
  document.getElementById('logWorkBtn').addEventListener('click', logWork);

  // Reset worklog button
  document.getElementById('resetWorklogBtn').addEventListener('click', () => {
    resetWorklogForm();
    showStatus('Form reset', 'info');
  });

  // Timer controls
  document
    .getElementById('startTimerBtn')
    .addEventListener('click', startTimer);
  document
    .getElementById('pauseTimerBtn')
    .addEventListener('click', pauseTimer);
  document.getElementById('stopTimerBtn').addEventListener('click', stopTimer);
  document
    .getElementById('resetTimerBtn')
    .addEventListener('click', resetTimer);

  // Report generation
  document
    .getElementById('generateReportBtn')
    .addEventListener('click', generateReport);
  document
    .getElementById('exportReportBtn')
    .addEventListener('click', exportReport);

  // Task filters
  document
    .getElementById('taskStatusFilter')
    .addEventListener('change', loadTasks);
  document
    .getElementById('taskProjectFilter')
    .addEventListener('change', loadTasks);

  // Sync inputs with background
  document
    .getElementById('timerWorkPackage')
    .addEventListener('change', saveTimerState);
  document
    .getElementById('timerComment')
    .addEventListener('input', saveTimerState);

  // OPTIMIZATION: Add keyboard shortcuts for power users
  setupKeyboardShortcuts();
}

// Setup keyboard shortcuts for power users (Ctrl+K, Ctrl+Enter, Ctrl+1-4)
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus work package search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('workPackageSearchInput');
      if (searchInput) {
        switchTab('worklog');
        searchInput.focus();
      }
    }

    // Ctrl/Cmd + Enter: Submit current form
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      const activeTab = document.querySelector('.tab-content.active');
      if (activeTab) {
        if (activeTab.id === 'worklog') {
          document.getElementById('logWorkBtn')?.click();
        } else if (activeTab.id === 'reports') {
          document.getElementById('generateReportBtn')?.click();
        }
      }
    }

    // Ctrl/Cmd + 1-4: Switch tabs
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
      e.preventDefault();
      const tabs = ['worklog', 'timer', 'reports', 'tasks'];
      switchTab(tabs[parseInt(e.key) - 1]);
    }
  });
}

// Switch to the specified tab and lazy-load data if needed
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === tabName);
  });

  // OPTIMIZATION: Lazy load tabs on first access
  if (!window.tabsLoaded[tabName]) {
    window.tabsLoaded[tabName] = true;

    switch (tabName) {
      case 'timer':
        loadTimerState();
        break;
      case 'tasks':
        loadTasks();
        break;
      case 'reports':
        // Reports load on-demand when generate button clicked
        break;
    }
  }
}

// Set default date values for forms (today for worklog, last 7 days for reports)
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('workDate').value = today;
  document.getElementById('reportEndDate').value = today;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  document.getElementById('reportStartDate').value = weekAgo
    .toISOString()
    .split('T')[0];
}

// Load settings from chrome storage (uses cached settings for performance)
async function loadSettings() {
  const settings = await getCachedSettings();
  return settings;
}

// Check connection to OpenProject
async function checkConnection() {
  const settings = await getCachedSettings();

  // Check if settings are configured
  if (!settings.serverUrl || !settings.apiKey) {
    console.log('Extension not configured yet');
    return false;
  }

  const { lastConnectionCheck } = await chrome.storage.local.get([
    'lastConnectionCheck',
  ]);

  const oneHour = 60 * 60 * 1000;
  const now = Date.now();

  // If we have a successful connection check from the last hour, use it
  if (lastConnectionCheck && now - lastConnectionCheck < oneHour) {
    return true;
  }

  try {
    const response = await makeApiCall('/api/v3');
    if (response) {
      await chrome.storage.local.set({
        lastConnectionCheck: now,
      });
      return true;
    }
  } catch (error) {
    console.error('Connection check failed:', error);
    return false;
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;

  const statusEl = activeTab.querySelector('.status-indicator');
  if (!statusEl) return;

  // Handle error objects simply
  let displayMessage = message;
  if (message instanceof Error) {
    displayMessage = message.message;
    type = type === 'info' ? 'error' : type;
  } else if (typeof message === 'object' && message?.error) {
    displayMessage = message.error.message || message.error;
    type = type === 'info' ? 'error' : type;
  }

  statusEl.textContent = displayMessage;
  statusEl.className = `status-indicator ${type}`;
  statusEl.style.display = 'block';

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, STATUS_HIDE_DELAY_MS);
}

// Make API call through background script
async function makeApiCall(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: 'makeApiCall', endpoint, method, data },
      (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      }
    );
  });
}

// Toggle between "Select Existing" and "Create New" work package modes in the form
function switchWorkPackageMode(mode) {
  const existingBtn = document.getElementById('existingModeBtn');
  const newBtn = document.getElementById('newModBtn');
  const existingSection = document.getElementById('existingWorkPackageSection');
  const newSection = document.getElementById('newWorkPackageSection');

  if (mode === 'existing') {
    existingBtn.classList.add('active');
    newBtn.classList.remove('active');
    existingSection.style.display = 'block';
    newSection.style.display = 'none';
  } else {
    // Switching to "Create New" mode
    existingBtn.classList.remove('active');
    newBtn.classList.add('active');
    existingSection.style.display = 'none';
    newSection.style.display = 'block';
  }

  // Reset form when switching modes
  resetWorklogForm();
}

// Load all projects from OpenProject API for the project selector dropdown
async function loadProjects() {
  try {
    const response = await makeApiCall('/api/v3/projects?pageSize=100');
    const projects = response._embedded?.elements || [];

    // Store globally for filtering
    window.allProjects = projects;

    updateProjectSelect(projects);

    // Also load work package types
    await loadWorkPackageTypes();
  } catch (error) {
    console.error('Error loading projects:', error);
    showStatus('Failed to load projects', 'error');
  }
}

// Render projects in the dropdown select and restore previous selection
function updateProjectSelect(projects) {
  const projectSelect = document.getElementById('projectSelect');
  const currentValue = projectSelect.value;
  projectSelect.innerHTML = '';

  projects.forEach((project) => {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    projectSelect.appendChild(option);
  });

  // Restore previous selection if still available
  if (currentValue) {
    projectSelect.value = currentValue;
  }

  adjustSelectHeight(projectSelect, 100, 100);
}

// Filter projects list by search query (matches ID or name)
function filterProjectOptions(query) {
  if (!window.allProjects) return;

  const filtered = window.allProjects.filter((project) => {
    if (!query) return true;

    const lowerQuery = query.toLowerCase();
    const id = project.id.toString();
    const name = project.name.toLowerCase();

    return id.includes(lowerQuery) || name.includes(lowerQuery);
  });

  updateProjectSelect(filtered);
}

// Load all work package types (Task, Bug, Feature, etc.) from OpenProject
async function loadWorkPackageTypes() {
  try {
    const response = await makeApiCall('/api/v3/types?pageSize=100');
    const types = response._embedded?.elements || [];

    const typeSelect = document.getElementById('taskType');
    typeSelect.innerHTML = '';

    types.forEach((type) => {
      const option = document.createElement('option');
      option.value = type.id;
      option.textContent = type.name;
      typeSelect.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading work package types:', error);
  }
}

// Load work packages
async function loadWorkPackages() {
  const select = document.getElementById('workPackageSelect');

  // Check if configured first
  const settings = await getCachedSettings();
  if (!settings.serverUrl || !settings.apiKey) {
    if (select) {
      select.innerHTML = '<option value="">Configure settings first</option>';
    }
    return;
  }

  // Show loading state
  Utils.setLoading(select, true, 'Loading...');

  try {
    // Try cache first (offline support)
    if (typeof CacheDB !== 'undefined') {
      const isCacheFresh = await CacheDB.isCacheFresh(
        'workPackages',
        CACHE_MAX_AGE_MS
      );
      if (isCacheFresh) {
        const cachedData = await CacheDB.get('workPackages');
        if (cachedData && cachedData.length > 0) {
          window.allWorkPackages = cachedData;
          updateWorkPackageSelects(cachedData);
          Utils.setLoading(select, false);

          // Load fresh data in background
          loadWorkPackagesFresh().catch(console.error);
          return;
        }
      }
    }

    // Load fresh data
    await loadWorkPackagesFresh();
  } catch (error) {
    console.error('Error loading work packages:', error);

    // Fallback to cached data on error
    if (typeof CacheDB !== 'undefined') {
      const cachedData = await CacheDB.get('workPackages');
      if (cachedData && cachedData.length > 0) {
        window.allWorkPackages = cachedData;
        updateWorkPackageSelects(cachedData);
        showStatus('Using cached data (offline)', 'warning');
        Utils.setLoading(select, false);
        return;
      }
    }

    showStatus('Failed to load work packages: ' + error.message, 'error');
    if (select) {
      select.innerHTML =
        '<option value="">Failed to load - Check settings</option>';
    }
  } finally {
    Utils.setLoading(select, false);
  }
}

// Fetch fresh work package data from API (bypasses cache)
async function loadWorkPackagesFresh() {
  const response = await makeApiCall(
    '/api/v3/work_packages?filters=[{"status_id":{"operator":"o"}}]&pageSize=50&sortBy=[["updated_at","desc"]]'
  );

  let workPackages = response._embedded?.elements || [];

  // Store globally for filtering
  window.allWorkPackages = workPackages;

  // OPTIMIZATION: Cache for offline use
  if (typeof CacheDB !== 'undefined' && workPackages.length > 0) {
    await CacheDB.cache('workPackages', workPackages);
  }

  updateWorkPackageSelects(workPackages);
}

// Filter work package options based on search
async function filterWorkPackageOptions(query, updateFn) {
  if (!query) {
    updateFn(window.allWorkPackages || []);
    return;
  }

  // OPTIMIZATION: Check cache first (with TTL)
  const cacheKey = `wp_${query.toLowerCase()}`;
  const cached = searchCache.get(cacheKey);
  if (cached) {
    updateFn(cached);
    return;
  }

  const results = await searchWorkPackagesApi(query);

  // OPTIMIZATION: Cache results with timestamp (auto-evicted by TTL)
  searchCache.set(cacheKey, results);

  updateFn(results);
}

// Search OpenProject API for work packages matching the query
async function searchWorkPackagesApi(query, pageSize = 50) {
  try {
    const filter = `[{"subjectOrId":{"operator":"**","values":["${query}"]}},{"status_id":{"operator":"o"}}]`;
    const response = await makeApiCall(
      `/api/v3/work_packages?filters=${encodeURIComponent(filter)}&pageSize=${pageSize}&sortBy=[["updated_at","desc"]]`
    );
    return response._embedded?.elements || [];
  } catch (error) {
    console.error('Error searching work packages:', error);
    return [];
  }
}

// Update timer work package select dropdown with work packages
function updateTimerWorkPackageSelect(workPackages) {
  const select = document.getElementById('timerWorkPackage');
  if (select) {
    renderWorkPackageOptions(select, workPackages);
  }
}

// Render work packages as options in a select element (handles empty state)
function renderWorkPackageOptions(select, workPackages) {
  const currentValue = select.value;
  select.innerHTML = '';

  if (workPackages.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No work packages found';
    option.disabled = true;
    select.appendChild(option);
  } else {
    workPackages.forEach((wp) => {
      const option = document.createElement('option');
      option.value = wp.id;
      const projectName = wp._links?.project?.title || '';
      option.textContent = `#${wp.id} - ${wp.subject}${projectName ? ' (' + projectName + ')' : ''}`;
      select.appendChild(option);
    });
  }

  // Restore previous selection if still available
  if (currentValue) {
    select.value = currentValue;
  }

  adjustSelectHeight(select);
}

// Calculate and set select dropdown height based on number of options (min/max bounds)
function adjustSelectHeight(selectElement, minHeight, maxHeight) {
  const optionCount = selectElement.options.length;
  const itemHeight = SELECT_ITEM_HEIGHT_PX;
  const minH = minHeight ?? SELECT_MIN_HEIGHT_PX;
  const maxH = maxHeight ?? SELECT_MAX_HEIGHT_PX;

  let calculatedHeight = optionCount * itemHeight;
  calculatedHeight = Math.max(minH, Math.min(maxH, calculatedHeight));

  selectElement.style.height = `${calculatedHeight}px`;
}

// Update all work package select elements with the provided list
function updateWorkPackageSelects(workPackages) {
  const selectElements = [
    document.getElementById('workPackageSelect'),
    document.getElementById('timerWorkPackage'),
  ];

  selectElements.forEach((select) => {
    if (!select) return;

    renderWorkPackageOptions(select, workPackages);

    // If this is the timer select, ensure the selection is synced from background state
    if (select.id === 'timerWorkPackage') {
      chrome.runtime.sendMessage({ action: 'getTimerState' }, (state) => {
        if (state.workPackageId) {
          syncTimerWPSelection(state.workPackageId);
        }
      });
    }
  });
}

// Load recent worklogs
async function loadRecentWorklogs() {
  const container = document.getElementById('recentWorklogsContainer');

  // Check if configured first
  const settings = await getCachedSettings();
  if (!settings.serverUrl || !settings.apiKey) {
    container.innerHTML =
      '<p class="empty-state">Please configure your OpenProject connection in settings first.</p>';
    showStatus('Please configure settings', 'warning');
    return;
  }

  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Filter by current user (me)
    const response = await makeApiCall(
      `/api/v3/time_entries?filters=[{"spentOn":{"operator":"<>d","values":["${startDateStr}","${endDate}"]}},{"user_id":{"operator":"=","values":["me"]}}]&sortBy=[["spentOn","desc"]]&pageSize=20`
    );

    const worklogs = response._embedded?.elements || [];

    if (worklogs.length === 0) {
      container.innerHTML =
        '<p class="empty-state">No recent worklogs found</p>';
      return;
    }

    container.innerHTML = worklogs
      .map((wl) => {
        const hours = Utils.convertFromISO8601(wl.hours);
        const hoursFormatted = Utils.formatHours(hours);
        const wpId = wl._links.workPackage?.href?.split('/').pop() || '';
        const wpTitle = wl._links.workPackage?.title || 'Unknown';
        const wpUrl = wpId
          ? `${settings.serverUrl}/work_packages/${wpId}`
          : '#';
        const commentRaw = wl.comment?.raw || '';
        let commentEscaped = Utils.escapeHtml(commentRaw);

        let startTime = wl.startTime
          ? new Date(wl.startTime).toTimeString().slice(0, 5)
          : '';
        let endTime = wl.endTime
          ? new Date(wl.endTime).toTimeString().slice(0, 5)
          : '';

        // Smart Comment: Try to extract times from comment if they are missing from official fields
        if (!startTime || !endTime) {
          const timeMatch = commentRaw.match(
            /^\((\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})\)\s*(.*)/
          );
          if (timeMatch) {
            startTime = timeMatch[1];
            endTime = timeMatch[2];
          }
        }

        return `
        <div class="worklog-item" data-id="${wl.id}" data-wp-id="${wpId}" data-wp-title="${Utils.escapeHtml(wpTitle)}" data-date="${wl.spentOn}" data-hours="${hours}" data-comment="${commentEscaped}" data-start-time="${startTime}" data-end-time="${endTime}">
          <div class="worklog-header">
            <a href="${wpUrl}" target="_blank" class="worklog-title" title="Open in OpenProject">
              #${wpId} - ${Utils.escapeHtml(wpTitle)}
            </a>
            <div class="worklog-hours">${hoursFormatted}</div>
          </div>
          <div class="worklog-date">${new Date(wl.spentOn).toLocaleDateString()}</div>
          ${wl.comment?.raw ? `<div class="worklog-comment">${commentEscaped}</div>` : ''}
          <div class="worklog-actions">
            <button class="worklog-action-btn log-again" data-action="log-again">
              Log
            </button>
            <button class="worklog-action-btn timer" data-action="timer">
              Tracker
            </button>
            <button class="worklog-action-btn edit" data-action="edit">
              Edit
            </button>
            <button class="worklog-action-btn delete" data-action="delete">
              Delete
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    // Add event listeners for edit and delete buttons
    container.querySelectorAll('.worklog-action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const worklogItem = e.target.closest('.worklog-item');
        const action = e.target.dataset.action;

        if (action === 'edit') {
          editWorklog(worklogItem);
        } else if (action === 'delete') {
          deleteWorklog(worklogItem.dataset.id);
        } else if (action === 'log-again') {
          prefillWorklog(worklogItem.dataset.wpId, worklogItem.dataset.wpTitle);
        } else if (action === 'timer') {
          startTimerForWP(
            worklogItem.dataset.wpId,
            worklogItem.dataset.wpTitle
          );
        }
      });
    });
  } catch (error) {
    console.error('Error loading worklogs:', error);
    const errorMsg = error.message || 'Unknown error';
    container.innerHTML = `<p class="empty-state">Failed to load worklogs: ${errorMsg}<br><small>Check console for details</small></p>`;
  }
}

// Load an existing worklog into the form for editing (switches to edit mode)
function editWorklog(worklogItem) {
  // Switch to existing mode (cannot create new when editing)
  switchWorkPackageMode('existing');

  const id = worklogItem.dataset.id;
  const wpId = worklogItem.dataset.wpId;
  const wpTitle = worklogItem.dataset.wpTitle;
  const date = worklogItem.dataset.date;
  const hours = parseFloat(worklogItem.dataset.hours);
  let comment = worklogItem.dataset.comment;
  const startTime = worklogItem.dataset.startTime || '';
  const endTime = worklogItem.dataset.endTime || '';

  // Smart Comment: Strip the time prefix from the comment displayed in the form
  if (comment) {
    comment = comment.replace(/^\(\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\)\s*/, '');
  }

  // Store the IDs for updating
  window.editingWorklogId = id;
  window.editingWorklogWPId = wpId;

  // Ensure the work package exists in our global list so it doesn't disappear on filter
  if (window.allWorkPackages) {
    const exists = window.allWorkPackages.find(
      (wp) => wp.id.toString() === wpId
    );
    if (!exists) {
      window.allWorkPackages.push({
        id: parseInt(wpId),
        subject: wpTitle,
        _links: { project: { title: '' } },
      });
    }
  }

  // Update the select options
  updateWorkPackageSelects(window.allWorkPackages || []);

  // Pre-fill form with existing data
  const select = document.getElementById('workPackageSelect');
  select.value = wpId;

  // Update search input to show selected work package
  const selectedOption = select.querySelector(`option[value="${wpId}"]`);
  if (selectedOption) {
    document.getElementById('workPackageSearchInput').value =
      selectedOption.textContent;
  } else {
    // Fallback if select.value didn't work
    document.getElementById('workPackageSearchInput').value =
      `#${wpId} - ${wpTitle}`;
  }

  document.getElementById('workDate').value = date;
  document.getElementById('workHours').value = hours.toFixed(2);
  document.getElementById('workComment').value = comment;
  document.getElementById('workStartTime').value = startTime;
  document.getElementById('workEndTime').value = endTime;

  // Change button text
  const logBtn = document.getElementById('logWorkBtn');
  logBtn.textContent = 'Update Work';
  logBtn.classList.add('btn-warning');
  logBtn.classList.remove('btn-primary');

  // Scroll to form
  document.querySelector('.tab-content.active').scrollTop = 0;

  showStatus('Editing worklog - modify and click "Update Work"', 'info');
}

// Delete a worklog entry from OpenProject after user confirmation
async function deleteWorklog(id) {
  if (!confirm('Are you sure you want to delete this worklog entry?')) {
    return;
  }

  try {
    await makeApiCall(`/api/v3/time_entries/${id}`, 'DELETE');
    showStatus('Worklog deleted successfully', 'success');
    await loadRecentWorklogs();
  } catch (error) {
    console.error('Error deleting worklog:', error);
    showStatus('Failed to delete worklog: ' + error.message, 'error');
  }
}

// Log work
async function logWork() {
  // Check which mode is active
  const isNewMode = document
    .getElementById('newModBtn')
    .classList.contains('active');

  let workPackageId;

  // Cannot create new work package when editing existing worklog
  if (isNewMode && window.editingWorklogId) {
    showStatus(
      'Cannot create new work package while editing. Please use existing work package or cancel edit.',
      'warning'
    );
    return;
  }

  if (isNewMode) {
    // Create new work package mode
    const projectId = document.getElementById('projectSelect').value;
    const taskTitle = document.getElementById('taskTitle').value;
    const taskType = document.getElementById('taskType').value;

    if (!projectId || !taskTitle) {
      showStatus('Please select a project and enter a task title', 'warning');
      return;
    }

    try {
      // Create new work package
      showStatus('Creating new work package...', 'info');
      const wpData = {
        subject: taskTitle,
        _links: {
          type: {
            href: `/api/v3/types/${taskType}`,
          },
          project: {
            href: `/api/v3/projects/${projectId}`,
          },
        },
      };

      const newWP = await makeApiCall('/api/v3/work_packages', 'POST', wpData);
      workPackageId = newWP.id;
      showStatus('Work package created successfully!', 'success');
    } catch (error) {
      console.error('Error creating work package:', error);
      showStatus('Failed to create work package: ' + error.message, 'error');
      return;
    }
  } else {
    // Existing work package mode
    workPackageId = document.getElementById('workPackageSelect').value;

    // Use fallback if editing and select is empty
    if (
      !workPackageId &&
      window.editingWorklogId &&
      window.editingWorklogWPId
    ) {
      workPackageId = window.editingWorklogWPId;
    }

    if (!workPackageId) {
      showStatus('Please select a work package', 'warning');
      return;
    }
  }

  const date = document.getElementById('workDate').value;
  const startTime = document.getElementById('workStartTime')?.value;
  const endTime = document.getElementById('workEndTime')?.value;
  let hours = parseFloat(document.getElementById('workHours').value);
  const comment = document.getElementById('workComment').value;

  // Calculate hours from start/end time if provided
  if (startTime && endTime) {
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    const diffMs = end - start;

    if (diffMs <= 0) {
      showStatus('End time must be after start time', 'warning');
      return;
    }

    hours = diffMs / (1000 * 60 * 60); // Convert ms to hours
    document.getElementById('workHours').value = hours.toFixed(2);
  }

  if (!hours || hours <= 0) {
    showStatus('Please enter hours or time range', 'warning');
    return;
  }

  try {
    // Convert hours to ISO 8601 duration format (PT#H#M)
    const duration = Utils.convertToISO8601(hours);

    // Smart Comment: Prepend times to the comment so they are stored even if API doesn't support the fields
    let finalComment = comment || '';
    if (startTime && endTime) {
      // Stripping existing prefix if any (though usually it's a new entry or edited)
      const cleanComment = finalComment.replace(
        /^\(\d{2}:\d{2}\s*-\s*\d{2}:\d{2}\)\s*/,
        ''
      );
      finalComment = `(${startTime} - ${endTime}) ${cleanComment}`;
    }

    const data = {
      ongoing: false,
      spentOn: date,
      hours: duration,
      comment: {
        raw: finalComment,
        format: 'plain',
      },
      _links: {
        workPackage: {
          href: `/api/v3/work_packages/${workPackageId}`,
        },
      },
    };

    // Check if we're editing or creating
    if (window.editingWorklogId) {
      await makeApiCall(
        `/api/v3/time_entries/${window.editingWorklogId}`,
        'PATCH',
        data
      );
      showStatus('Work updated successfully!', 'success');

      // Reset editing state
      delete window.editingWorklogId;
      delete window.editingWorklogWPId;
      const logBtn = document.getElementById('logWorkBtn');
      logBtn.textContent = 'Log Work';
      logBtn.classList.remove('btn-warning');
      logBtn.classList.add('btn-primary');
    } else {
      await makeApiCall('/api/v3/time_entries', 'POST', data);
      showStatus('Work logged successfully!', 'success');
    }

    // Clear form
    document.getElementById('workHours').value = '';
    if (document.getElementById('workStartTime')) {
      document.getElementById('workStartTime').value = '';
      document.getElementById('workEndTime').value = '';
    }
    document.getElementById('workComment').value = '';
    document.getElementById('workPackageSearchInput').value = '';
    document.getElementById('taskTitle').value = '';
    document.getElementById('projectSearchInput').value = '';

    // Reset to existing mode
    switchWorkPackageMode('existing');

    // Reload data
    await loadRecentWorklogs();
    await loadWorkPackages(); // Reload to include the new work package
  } catch (error) {
    console.error('Error logging work:', error);
    showStatus('Failed to log work: ' + error.message, 'error');
  }
}

// Reset the worklog form
function resetWorklogForm() {
  document.getElementById('workHours').value = '';
  if (document.getElementById('workStartTime')) {
    document.getElementById('workStartTime').value = '';
    document.getElementById('workEndTime').value = '';
  }
  document.getElementById('workComment').value = '';
  document.getElementById('workPackageSearchInput').value = '';
  document.getElementById('workPackageSelect').value = '';
  document.getElementById('taskTitle').value = '';
  document.getElementById('projectSearchInput').value = '';
  document.getElementById('projectSelect').value = '';

  // Clear editing state and reset button
  delete window.editingWorklogId;
  delete window.editingWorklogWPId;

  const logBtn = document.getElementById('logWorkBtn');
  if (logBtn) {
    logBtn.textContent = 'Log Work';
    logBtn.classList.remove('btn-warning');
    logBtn.classList.add('btn-primary');
  }
}

// Helper to pre-fill worklog form for a specific work package
function prefillWorklog(wpId, wpTitle) {
  // Cancel edit mode if active
  if (window.editingWorklogId) {
    delete window.editingWorklogId;
    delete window.editingWorklogWPId;
    const logBtn = document.getElementById('logWorkBtn');
    logBtn.textContent = 'Log Work';
    logBtn.classList.remove('btn-warning');
    logBtn.classList.add('btn-primary');
  }

  // Ensure the work package exists in our global list
  if (window.allWorkPackages) {
    const exists = window.allWorkPackages.find(
      (wp) => wp.id.toString() === wpId.toString()
    );
    if (!exists) {
      window.allWorkPackages.push({
        id: parseInt(wpId),
        subject: wpTitle,
        _links: { project: { title: '' } },
      });
    }
  }

  // Update the select options
  updateWorkPackageSelects(window.allWorkPackages || []);

  switchWorkPackageMode('existing');

  // Pre-fill form
  const select = document.getElementById('workPackageSelect');
  select.value = wpId;

  // Update search input
  const selectedOption = select.querySelector(`option[value="${wpId}"]`);
  if (selectedOption) {
    document.getElementById('workPackageSearchInput').value =
      selectedOption.textContent;
  } else {
    document.getElementById('workPackageSearchInput').value =
      `#${wpId} - ${wpTitle}`;
  }

  // Set date to today
  const now = new Date();
  document.getElementById('workDate').value = now.toISOString().split('T')[0];

  // Set end time to current time and clear start time
  const currentTime = now.toTimeString().slice(0, 5);
  const startTimeInput = document.getElementById('workStartTime');
  const endTimeInput = document.getElementById('workEndTime');
  if (endTimeInput) {
    endTimeInput.value = currentTime;
  }
  if (startTimeInput) {
    startTimeInput.value = ''; // Clear start time so user can enter it
  }

  // Switch to worklog tab
  switchTab('worklog');

  // Focus and scroll to start time field
  if (startTimeInput) {
    setTimeout(() => {
      startTimeInput.focus();
      startTimeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  } else {
    // Fallback to top
    const tabContent = document.getElementById('worklog');
    if (tabContent) tabContent.scrollTop = 0;
  }

  showStatus('Work package selected - enter hours and log', 'info');
}

// Helper to start timer for a specific work package
function startTimerForWP(wpId, wpTitle) {
  chrome.runtime.sendMessage({ action: 'getTimerState' }, (state) => {
    if (
      state.isRunning &&
      !confirm('A timer is already running. Start new timer for this task?')
    ) {
      return;
    }

    const proceedWithStart = () => {
      // Ensure the work package exists in our global list
      if (window.allWorkPackages) {
        const exists = window.allWorkPackages.find(
          (wp) => wp.id.toString() === wpId.toString()
        );
        if (!exists) {
          window.allWorkPackages.push({
            id: parseInt(wpId),
            subject: wpTitle,
            _links: { project: { title: '' } },
          });
        }
      }

      // Update the select options
      updateWorkPackageSelects(window.allWorkPackages || []);

      const timerSelect = document.getElementById('timerWorkPackage');
      if (timerSelect) {
        timerSelect.value = wpId;

        // Update search input
        const selectedOption = timerSelect.querySelector(
          `option[value="${wpId}"]`
        );
        const timerSearchInput = document.getElementById(
          'timerWorkPackageSearch'
        );
        if (timerSearchInput) {
          if (selectedOption) {
            timerSearchInput.value = selectedOption.textContent;
          } else {
            timerSearchInput.value = `#${wpId} - ${wpTitle}`;
          }
        }
      }

      switchTab('timer');
      startTimer();
      showStatus('Timer started for #' + wpId, 'success');
    };

    if (state.isRunning || (state.seconds && state.seconds > 0)) {
      chrome.runtime.sendMessage({ action: 'resetTimer' }, () => {
        resetTimerUI();
        proceedWithStart();
      });
    } else {
      proceedWithStart();
    }
  });
}

// Start the timer for tracking work on a work package
function startTimer() {
  const wpId = document.getElementById('timerWorkPackage').value;
  const comment = document.getElementById('timerComment').value;
  if (!wpId || wpId === '') {
    showStatus('Please select a work package for the timer', 'warning');
    return;
  }

  chrome.runtime.sendMessage(
    { action: 'startTimer', workPackageId: wpId, comment: comment },
    (response) => {
      console.log('Start timer response:', response);
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
        return;
      }
      if (response && response.success) {
        if (!timerInterval) {
          timerInterval = setInterval(
            refreshTimerFromBackground,
            TIMER_UPDATE_INTERVAL_MS
          );
          console.log('Timer interval started');
        }
        isPaused = false;
        // Refresh immediately to get the current state and update buttons
        refreshTimerFromBackground();
        showStatus('Timer started', 'success');
      } else {
        console.error('Failed to start timer, response:', response);
        showStatus('Failed to start timer', 'error');
      }
    }
  );
}

// Pause or resume the timer based on current state
function pauseTimer() {
  const action = isPaused ? 'startTimer' : 'pauseTimer';
  const wpId = document.getElementById('timerWorkPackage').value;
  const comment = document.getElementById('timerComment').value;

  chrome.runtime.sendMessage(
    { action: action, workPackageId: wpId, comment: comment },
    (response) => {
      if (response && response.success) {
        isPaused = !isPaused;
        // Refresh immediately to sync state
        refreshTimerFromBackground();
      }
    }
  );
}

// Request current timer state from background script and update UI
function refreshTimerFromBackground() {
  chrome.runtime.sendMessage({ action: 'getTimerState' }, (state) => {
    if (!state) return;

    timerSeconds = state.seconds;
    updateTimerDisplay();

    // Sync button states
    isPaused = !state.isRunning && timerSeconds > 0;
    updateTimerButtons(state.isRunning, timerSeconds, isPaused);
  });
}

// Stop the timer and pre-fill the worklog form with the tracked time
function stopTimer() {
  chrome.runtime.sendMessage({ action: 'getTimerState' }, (state) => {
    const seconds = state.seconds;
    const workPackageId = state.workPackageId;
    const comment = state.comment;

    chrome.runtime.sendMessage({ action: 'resetTimer' }, () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }

      const now = new Date();
      const endTimeStr = now.toTimeString().slice(0, 5);
      const startTimeObj = new Date(now.getTime() - seconds * 1000);
      const startTimeStr = startTimeObj.toTimeString().slice(0, 5);

      // Auto-fill worklog form
      const hours = (seconds / 3600).toFixed(2);

      document.getElementById('workPackageSelect').value = workPackageId;

      // Update search input to show selected work package
      const selectedOption = document.querySelector(
        `#workPackageSelect option[value="${workPackageId}"]`
      );
      if (selectedOption) {
        document.getElementById('workPackageSearchInput').value =
          selectedOption.textContent;
      }

      // Set times and date
      const workStartTimeInput = document.getElementById('workStartTime');
      const workEndTimeInput = document.getElementById('workEndTime');
      const workDateInput = document.getElementById('workDate');
      const workHoursInput = document.getElementById('workHours');
      const workCommentInput = document.getElementById('workComment');

      if (workStartTimeInput) workStartTimeInput.value = startTimeStr;
      if (workEndTimeInput) workEndTimeInput.value = endTimeStr;
      if (workDateInput)
        workDateInput.value = startTimeObj.toISOString().split('T')[0];
      if (workHoursInput) workHoursInput.value = hours;
      if (workCommentInput) workCommentInput.value = comment;

      // Switch to worklog tab
      switchTab('worklog');

      resetTimerUI();
      showStatus(`Timer stopped. ${hours} hours ready to log.`, 'success');

      // Focus start time for review
      if (workStartTimeInput) {
        setTimeout(() => {
          workStartTimeInput.focus();
          workStartTimeInput.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }, 100);
      }
    });
  });
}

// Reset timer to zero and clear timer form fields
function resetTimer() {
  chrome.runtime.sendMessage({ action: 'resetTimer' }, () => {
    resetTimerUI();
  });
}

// Clear timer display and reset all timer-related UI elements
function resetTimerUI() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  timerSeconds = 0;
  isPaused = false;

  // Reset timer form fields
  document.getElementById('timerWorkPackage').value = '';
  document.getElementById('timerWorkPackageSearch').value = '';
  document.getElementById('timerComment').value = '';

  updateTimerDisplay();
  updateTimerButtons(false, 0, false);
}

// Format and display current timer value as HH:MM:SS
function updateTimerDisplay() {
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  const display = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const timerDisplay = document.getElementById('timerTime');
  if (timerDisplay) {
    timerDisplay.textContent = display;
  } else {
    console.error('Timer display element not found!');
  }
}

// Pad single-digit numbers with leading zero for time display
function pad(num) {
  return num.toString().padStart(2, '0');
}

// Save current timer work package and comment to background storage
function saveTimerState() {
  const wpId = document.getElementById('timerWorkPackage').value;
  const comment = document.getElementById('timerComment').value;

  chrome.runtime.sendMessage({
    action: 'updateTimerData',
    workPackageId: wpId,
    comment: comment,
  });
}

// Load timer state from background script and sync UI
function loadTimerState() {
  chrome.runtime.sendMessage({ action: 'getTimerState' }, (state) => {
    timerSeconds = state.seconds || 0;
    isPaused = !state.isRunning && timerSeconds > 0;

    updateTimerDisplay();
    updateTimerButtons(state.isRunning, timerSeconds, isPaused);

    // If timer is running or active, switch to timer tab
    if (state.isRunning || timerSeconds > 0) {
      switchTab('timer');
    }

    if (state.isRunning && !timerInterval) {
      timerInterval = setInterval(
        refreshTimerFromBackground,
        TIMER_UPDATE_INTERVAL_MS
      );
    }

    if (state.workPackageId) {
      document.getElementById('timerWorkPackage').value = state.workPackageId;

      // Update search input
      // This is a bit tricky because allWorkPackages might not be loaded yet
      // We'll try now and also ensure it happens after work packages load
      syncTimerWPSelection(state.workPackageId);
    }

    if (state.comment) {
      document.getElementById('timerComment').value = state.comment;
    }
  });
}

// Sync timer work package selection with search input display
function syncTimerWPSelection(wpId) {
  const select = document.getElementById('timerWorkPackage');
  if (!select) return;

  select.value = wpId;
  const selectedOption = select.querySelector(`option[value="${wpId}"]`);
  if (selectedOption) {
    const searchInput = document.getElementById('timerWorkPackageSearch');
    if (searchInput) {
      searchInput.value = selectedOption.textContent;
    }
  }
}

// Show/hide timer control buttons based on timer state (running, paused, or idle)
function updateTimerButtons(isRunning, seconds, isPausedState) {
  const startBtn = document.getElementById('startTimerBtn');
  const pauseBtn = document.getElementById('pauseTimerBtn');
  const stopBtn = document.getElementById('stopTimerBtn');
  const resetBtn = document.getElementById('resetTimerBtn');

  if (!startBtn || !pauseBtn || !stopBtn || !resetBtn) return;

  if (isRunning) {
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    stopBtn.classList.remove('hidden');
    stopBtn.disabled = false;
    resetBtn.classList.remove('hidden');
  } else if (seconds > 0) {
    // Paused
    startBtn.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Resume';
    stopBtn.classList.remove('hidden');
    stopBtn.disabled = false;
    resetBtn.classList.remove('hidden');
  } else {
    // Idle (0 seconds)
    startBtn.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    stopBtn.classList.add('hidden');
    resetBtn.classList.add('hidden');
  }
}

// Load assigned tasks from OpenProject with optional status and project filters
async function loadTasks() {
  const container = document.getElementById('tasksList');
  const statusFilter = document.getElementById('taskStatusFilter').value;
  const projectFilter = document.getElementById('taskProjectFilter').value;

  container.innerHTML = '<p class="loading">Loading tasks...</p>';

  try {
    // Build filters - always filter by assignee = me
    let filterArray = [{ assignee: { operator: '=', values: ['me'] } }];

    if (statusFilter) {
      // Map status filter values to OpenProject status IDs
      // Note: You may need to adjust these based on your OpenProject instance
      const statusMap = {
        new: '1',
        'in-progress': '2,7', // Multiple statuses can be in progress
        resolved: '12,13',
      };

      if (statusMap[statusFilter]) {
        filterArray.push({
          status_id: {
            operator: '=',
            values: statusMap[statusFilter].split(','),
          },
        });
      }
    } else {
      // Default: only open work packages
      filterArray.push({
        status_id: { operator: 'o' },
      });
    }

    if (projectFilter) {
      filterArray.push({
        project_id: { operator: '=', values: [projectFilter] },
      });
    }

    const filtersJson = JSON.stringify(filterArray);
    const response = await makeApiCall(
      `/api/v3/work_packages?filters=${encodeURIComponent(filtersJson)}&pageSize=50&sortBy=[["updated_at","desc"]]`
    );

    const tasks = response._embedded?.elements || [];

    // Load projects for filter dropdown if not already loaded
    if (!projectFilter && !window.projectsLoaded) {
      loadProjectsForFilter(tasks);
    }

    if (tasks.length === 0) {
      container.innerHTML = '<p class="empty-state">No tasks found</p>';
      return;
    }

    const settings = await getCachedSettings();

    const tasksHtml = tasks
      .map((task) => {
        const status = task._links.status?.title || 'Unknown';
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        const wpUrl = `${settings.serverUrl}/work_packages/${task.id}`;

        return `
        <div class="task-item" data-id="${task.id}" data-title="${Utils.escapeHtml(task.subject)}">
          <div class="task-header">
            <a href="${wpUrl}" target="_blank" class="task-id">#${task.id}</a>
            <div class="task-status ${statusClass}">${Utils.escapeHtml(status)}</div>
          </div>
          <div class="task-title">${Utils.escapeHtml(task.subject)}</div>
          <div class="task-project">${Utils.escapeHtml(task._links.project?.title || 'Unknown Project')}</div>
          <div class="task-actions">
            <button class="task-action-btn log-again" data-action="log-again">
              Log Work
            </button>
            <button class="task-action-btn timer" data-action="timer">
              Start Tracker
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    container.innerHTML = tasksHtml;

    // Add event listeners for task action buttons
    container.querySelectorAll('.task-action-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const taskItem = e.target.closest('.task-item');
        const action = e.target.dataset.action;
        const wpId = taskItem.dataset.id;
        const wpTitle = taskItem.dataset.title;

        if (action === 'log-again') {
          prefillWorklog(wpId, wpTitle);
        } else if (action === 'timer') {
          startTimerForWP(wpId, wpTitle);
        }
      });
    });
  } catch (error) {
    console.error('Error loading tasks:', error);
    container.innerHTML = `<p class="empty-state">Failed to load tasks: ${error.message}</p>`;
  }
}

// Extract unique projects from tasks and populate the project filter dropdown
async function loadProjectsForFilter(tasks) {
  try {
    const projectFilter = document.getElementById('taskProjectFilter');
    const uniqueProjects = new Map();

    tasks.forEach((task) => {
      const projectId = task._links.project?.href?.split('/').pop();
      const projectTitle = task._links.project?.title;
      if (projectId && projectTitle) {
        uniqueProjects.set(projectId, projectTitle);
      }
    });

    projectFilter.innerHTML = '<option value="">All Projects</option>';
    uniqueProjects.forEach((title, id) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = title;
      projectFilter.appendChild(option);
    });

    window.projectsLoaded = true;
  } catch (error) {
    console.error('Error loading projects for filter:', error);
  }
}

// Generate report based on selected type and date range
async function generateReport() {
  const reportType = document.getElementById('reportType').value;
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;

  try {
    const response = await makeApiCall(
      `/api/v3/time_entries?filters=[{"spentOn":{"operator":"<>d","values":["${startDate}","${endDate}"]}}]&pageSize=1000`
    );

    const entries = response._embedded?.elements || [];

    if (entries.length === 0) {
      showStatus('No data found for the selected period', 'warning');
      return;
    }

    displayReport(entries, reportType);
    document.getElementById('exportReportBtn').disabled = false;
  } catch (error) {
    console.error('Error generating report:', error);
    showStatus('Failed to generate report', 'error');
  }
}

// Render report entries as HTML table based on report type
function displayReport(entries, reportType) {
  const reportResults = document.getElementById('reportResults');
  const reportContent = document.getElementById('reportContent');

  let html = '<table class="report-table"><thead><tr>';

  switch (reportType) {
    case 'worklog':
      html +=
        '<th>Date</th><th>Work Package</th><th>Hours</th><th>Comment</th></tr></thead><tbody>';
      entries.forEach((entry) => {
        const hours = Utils.convertFromISO8601(entry.hours);
        html += `
          <tr>
            <td>${new Date(entry.spentOn).toLocaleDateString()}</td>
            <td>#${entry._links.workPackage?.href?.split('/').pop() || 'N/A'}</td>
            <td>${hours.toFixed(2)}</td>
            <td>${Utils.escapeHtml(entry.comment?.raw || '')}</td>
          </tr>
        `;
      });
      break;

    case 'user':
      const totalHours = entries.reduce(
        (sum, e) => sum + Utils.convertFromISO8601(e.hours),
        0
      );
      const avgHours = (totalHours / entries.length).toFixed(2);
      html += '<th>Metric</th><th>Value</th></tr></thead><tbody>';
      html += `
        <tr><td>Total Entries</td><td>${entries.length}</td></tr>
        <tr><td>Total Hours</td><td>${totalHours.toFixed(2)}</td></tr>
        <tr><td>Average Hours/Entry</td><td>${avgHours}</td></tr>
      `;
      break;

    case 'project':
      const projectMap = {};
      entries.forEach((entry) => {
        const projectId =
          entry._links.project?.href?.split('/').pop() || 'Unknown';
        const projectTitle = entry._links.project?.title || 'Unknown Project';
        if (!projectMap[projectId]) {
          projectMap[projectId] = { title: projectTitle, hours: 0, count: 0 };
        }
        projectMap[projectId].hours += Utils.convertFromISO8601(entry.hours);
        projectMap[projectId].count++;
      });

      html +=
        '<th>Project</th><th>Entries</th><th>Hours</th></tr></thead><tbody>';
      Object.values(projectMap).forEach((project) => {
        html += `
          <tr>
            <td>${Utils.escapeHtml(project.title)}</td>
            <td>${project.count}</td>
            <td>${project.hours.toFixed(2)}</td>
          </tr>
        `;
      });
      break;

    case 'weekly':
      const weekMap = {};
      entries.forEach((entry) => {
        const week = Utils.getWeekNumber(new Date(entry.spentOn));
        if (!weekMap[week]) {
          weekMap[week] = { hours: 0, count: 0 };
        }
        weekMap[week].hours += Utils.convertFromISO8601(entry.hours);
        weekMap[week].count++;
      });

      html += '<th>Week</th><th>Entries</th><th>Hours</th></tr></thead><tbody>';
      Object.entries(weekMap).forEach(([week, data]) => {
        html += `
          <tr>
            <td>Week ${week}</td>
            <td>${data.count}</td>
            <td>${data.hours.toFixed(2)}</td>
          </tr>
        `;
      });
      break;
  }

  html += '</tbody></table>';
  reportContent.innerHTML = html;
  reportResults.style.display = 'block';
}

// Export current report table to CSV file for download
function exportReport() {
  const table = document.querySelector('.report-table');
  if (!table) return;

  let csv = [];
  const rows = table.querySelectorAll('tr');

  rows.forEach((row) => {
    const cols = row.querySelectorAll('td, th');
    const csvRow = Array.from(cols)
      .map((col) => `"${col.textContent}"`)
      .join(',');
    csv.push(csvRow);
  });

  const csvContent = csv.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `openproject-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();

  URL.revokeObjectURL(url);
  showStatus('Report exported successfully', 'success');
}

// Setup a searchable select dropdown with input field (combobox behavior)
function setupSearchableSelect(inputId, selectId, filterFn) {
  const input = document.getElementById(inputId);
  const select = document.getElementById(selectId);

  if (!input || !select) return;

  const debouncedFilter = Utils.debounce((query) => {
    filterFn(query);
  }, 300);

  input.addEventListener('focus', () => {
    select.classList.add('show');
    adjustSelectHeight(select);
  });

  input.addEventListener('input', (e) => {
    debouncedFilter(e.target.value);
    select.classList.add('show');
    adjustSelectHeight(select);
  });

  select.addEventListener('change', () => {
    const option = select.options[select.selectedIndex];
    if (option && option.value) {
      input.value = option.textContent;
      select.classList.remove('show');
    }
  });

  select.addEventListener('click', (e) => {
    if (e.target.tagName === 'OPTION' && e.target.value) {
      input.value = e.target.textContent;
      select.value = e.target.value;
      select.classList.remove('show');
    }
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !select.contains(e.target)) {
      select.classList.remove('show');
    }
  });
}
