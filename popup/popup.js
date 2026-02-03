// OpenProject Assistant - Popup Script

let timerInterval = null;
let timerSeconds = 0;
let isPaused = false;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await checkConnection();
  setupEventListeners();
  setDefaultDates();
  loadWorkPackages();
  loadRecentWorklogs();
  loadTasks();
  loadTimerState();
});

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Refresh button
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await loadWorkPackages();
    await loadRecentWorklogs();
    await loadTasks();
    showStatus('Data refreshed', 'success');
  });

  // Searchable select for work packages
  const searchInput = document.getElementById('workPackageSearchInput');
  const selectElement = document.getElementById('workPackageSelect');

  if (searchInput && selectElement) {
    // Show dropdown on focus
    searchInput.addEventListener('focus', () => {
      selectElement.classList.add('show');
      adjustSelectHeight(selectElement);
    });

    // Filter on input
    searchInput.addEventListener('input', (e) => {
      filterWorkPackageOptions(e.target.value);
      selectElement.classList.add('show');
      adjustSelectHeight(selectElement);
    });

    // Select option
    selectElement.addEventListener('change', () => {
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      if (selectedOption && selectedOption.value) {
        searchInput.value = selectedOption.textContent;
        selectElement.classList.remove('show');
      }
    });

    // Click option to select
    selectElement.addEventListener('click', (e) => {
      if (e.target.tagName === 'OPTION' && e.target.value) {
        searchInput.value = e.target.textContent;
        selectElement.value = e.target.value;
        selectElement.classList.remove('show');
      }
    });

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (
        !searchInput.contains(e.target) &&
        !selectElement.contains(e.target)
      ) {
        selectElement.classList.remove('show');
      }
    });
  }

  // Timer work package search (same functionality)
  const timerSearchInput = document.getElementById('timerWorkPackageSearch');
  const timerSelectElement = document.getElementById('timerWorkPackage');

  if (timerSearchInput && timerSelectElement) {
    timerSearchInput.addEventListener('focus', () => {
      timerSelectElement.classList.add('show');
      adjustSelectHeight(timerSelectElement);
    });

    timerSearchInput.addEventListener('input', (e) => {
      filterTimerWorkPackageOptions(e.target.value);
      timerSelectElement.classList.add('show');
      adjustSelectHeight(timerSelectElement);
    });

    timerSelectElement.addEventListener('change', () => {
      const selectedOption =
        timerSelectElement.options[timerSelectElement.selectedIndex];
      if (selectedOption && selectedOption.value) {
        timerSearchInput.value = selectedOption.textContent;
        timerSelectElement.classList.remove('show');
      }
    });

    timerSelectElement.addEventListener('click', (e) => {
      if (e.target.tagName === 'OPTION' && e.target.value) {
        timerSearchInput.value = e.target.textContent;
        timerSelectElement.value = e.target.value;
        timerSelectElement.classList.remove('show');
      }
    });

    document.addEventListener('click', (e) => {
      if (
        !timerSearchInput.contains(e.target) &&
        !timerSelectElement.contains(e.target)
      ) {
        timerSelectElement.classList.remove('show');
      }
    });
  }

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

  // Log work button
  document.getElementById('logWorkBtn').addEventListener('click', logWork);

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
}

// Switch tabs
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.tab-content').forEach((content) => {
    content.classList.toggle('active', content.id === tabName);
  });
}

// Set default dates
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

// Load settings
async function loadSettings() {
  const settings = await chrome.storage.sync.get(['serverUrl', 'apiKey']);
  return settings;
}

// Check connection to OpenProject
async function checkConnection() {
  try {
    const response = await makeApiCall('/api/v3');
    if (response) {
      showStatus('Connected to OpenProject', 'success');
      return true;
    }
  } catch (error) {
    showStatus('Not connected. Please configure settings.', 'error');
    return false;
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusEl = document.getElementById('connectionStatus');
  statusEl.textContent = message;
  statusEl.className = `status-indicator ${type}`;
  statusEl.style.display = 'block';

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 5000);
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

// Load work packages
async function loadWorkPackages() {
  try {
    const response = await makeApiCall(
      '/api/v3/work_packages?filters=[{"status_id":{"operator":"o"}}]&pageSize=200'
    );

    let workPackages = response._embedded?.elements || [];

    // Store globally for filtering
    window.allWorkPackages = workPackages;

    updateWorkPackageSelects(workPackages);
  } catch (error) {
    console.error('Error loading work packages:', error);
    showStatus('Failed to load work packages', 'error');
  }
}

// Filter work package options based on search
function filterWorkPackageOptions(query) {
  if (!window.allWorkPackages) return;

  const filtered = window.allWorkPackages.filter((wp) => {
    if (!query) return true;

    const lowerQuery = query.toLowerCase();
    const id = wp.id.toString();
    const subject = wp.subject.toLowerCase();
    const project = wp._links?.project?.title?.toLowerCase() || '';

    return (
      id.includes(lowerQuery) ||
      subject.includes(lowerQuery) ||
      project.includes(lowerQuery)
    );
  });

  updateWorkPackageSelects(filtered);
}

// Filter timer work package options
function filterTimerWorkPackageOptions(query) {
  if (!window.allWorkPackages) return;

  const filtered = window.allWorkPackages.filter((wp) => {
    if (!query) return true;

    const lowerQuery = query.toLowerCase();
    const id = wp.id.toString();
    const subject = wp.subject.toLowerCase();
    const project = wp._links?.project?.title?.toLowerCase() || '';

    return (
      id.includes(lowerQuery) ||
      subject.includes(lowerQuery) ||
      project.includes(lowerQuery)
    );
  });

  updateTimerWorkPackageSelect(filtered);
}

// Update timer work package select
function updateTimerWorkPackageSelect(workPackages) {
  const select = document.getElementById('timerWorkPackage');
  if (!select) return;

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

// Adjust select height dynamically based on number of options
function adjustSelectHeight(selectElement) {
  const optionCount = selectElement.options.length;
  const itemHeight = 40; // Approximate height per option
  const minHeight = 100;
  const maxHeight = 180;

  let calculatedHeight = optionCount * itemHeight;
  calculatedHeight = Math.max(minHeight, Math.min(maxHeight, calculatedHeight));

  selectElement.style.height = `${calculatedHeight}px`;
}

// Update work package select dropdowns
function updateWorkPackageSelects(workPackages) {
  const selectElements = [
    document.getElementById('workPackageSelect'),
    document.getElementById('timerWorkPackage'),
  ];

  selectElements.forEach((select) => {
    if (!select) return;

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

    // Adjust height
    adjustSelectHeight(select);
  });
}

// Load recent worklogs
async function loadRecentWorklogs() {
  const container = document.getElementById('recentWorklogsContainer');

  try {
    const settings = await chrome.storage.sync.get(['serverUrl']);
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Filter by current user (me)
    const response = await makeApiCall(
      `/api/v3/time_entries?filters=[{"spent_on":{"operator":"<>d","values":["${startDateStr}","${endDate}"]}},{"user_id":{"operator":"=","values":["me"]}}]&sortBy=[["spent_on","desc"]]&pageSize=20`
    );

    const worklogs = response._embedded?.elements || [];

    if (worklogs.length === 0) {
      container.innerHTML =
        '<p class="empty-state">No recent worklogs found</p>';
      return;
    }

    container.innerHTML = worklogs
      .map((wl) => {
        const hours = convertISO8601ToHours(wl.hours);
        const hoursFormatted = formatHoursAsHHMM(hours);
        const wpId = wl._links.workPackage?.href?.split('/').pop() || '';
        const wpTitle = wl._links.workPackage?.title || 'Unknown';
        const wpUrl = wpId
          ? `${settings.serverUrl}/work_packages/${wpId}`
          : '#';
        const commentEscaped = escapeHtml(wl.comment?.raw || '');

        return `
        <div class="worklog-item" data-id="${wl.id}" data-wp-id="${wpId}" data-date="${wl.spentOn}" data-hours="${hours}" data-comment="${commentEscaped}">
          <div class="worklog-header">
            <a href="${wpUrl}" target="_blank" class="worklog-title" title="Open in OpenProject">
              #${wpId} - ${escapeHtml(wpTitle)}
            </a>
            <div class="worklog-hours">${hoursFormatted}</div>
          </div>
          <div class="worklog-date">${new Date(wl.spentOn).toLocaleDateString()}</div>
          ${wl.comment?.raw ? `<div class="worklog-comment">${commentEscaped}</div>` : ''}
          <div class="worklog-actions">
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
        }
      });
    });
  } catch (error) {
    console.error('Error loading worklogs:', error);
    container.innerHTML = '<p class="empty-state">Failed to load worklogs</p>';
  }
}

// Format hours as HH:MM (or Xh Ym format)
function formatHoursAsHHMM(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0) {
    return `${m}m`;
  } else if (m === 0) {
    return `${h}h`;
  } else {
    return `${h}h ${m}m`;
  }
}

// Edit worklog
function editWorklog(worklogItem) {
  const id = worklogItem.dataset.id;
  const wpId = worklogItem.dataset.wpId;
  const date = worklogItem.dataset.date;
  const hours = parseFloat(worklogItem.dataset.hours);
  const comment = worklogItem.dataset.comment;

  // Pre-fill form with existing data
  document.getElementById('workPackageSelect').value = wpId;

  // Update search input to show selected work package
  const selectedOption = document.querySelector(
    `#workPackageSelect option[value="${wpId}"]`
  );
  if (selectedOption) {
    document.getElementById('workPackageSearchInput').value =
      selectedOption.textContent;
  }

  document.getElementById('workDate').value = date;
  document.getElementById('workHours').value = hours.toFixed(2);
  document.getElementById('workComment').value = comment;

  // Store the ID for updating
  window.editingWorklogId = id;

  // Change button text
  const logBtn = document.getElementById('logWorkBtn');
  logBtn.textContent = 'Update Work';
  logBtn.classList.add('btn-warning');
  logBtn.classList.remove('btn-primary');

  // Scroll to form
  document.querySelector('.tab-content.active').scrollTop = 0;

  showStatus('Editing worklog - modify and click "Update Work"', 'info');
}

// Delete worklog
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
  const workPackageId = document.getElementById('workPackageSelect').value;
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

  if (!workPackageId || !hours || hours <= 0) {
    showStatus(
      'Please select a work package and enter hours or time range',
      'warning'
    );
    return;
  }

  try {
    // Convert hours to ISO 8601 duration format (PT#H#M)
    const duration = convertHoursToISO8601(hours);

    const data = {
      spentOn: date,
      hours: duration,
      comment: {
        raw: comment || '',
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

    // Reload worklogs
    await loadRecentWorklogs();
  } catch (error) {
    console.error('Error logging work:', error);
    showStatus('Failed to log work: ' + error.message, 'error');
  }
}

// Convert hours (decimal) to ISO 8601 duration format
function convertHoursToISO8601(hours) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (m === 0) {
    return `PT${h}H`;
  } else if (h === 0) {
    return `PT${m}M`;
  } else {
    return `PT${h}H${m}M`;
  }
}

// Convert ISO 8601 duration to hours (decimal)
function convertISO8601ToHours(duration) {
  if (!duration || typeof duration !== 'string') return 0;

  const hoursMatch = duration.match(/(\d+)H/);
  const minutesMatch = duration.match(/(\d+)M/);

  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

  return hours + minutes / 60;
}

// Timer functions
function startTimer() {
  if (!document.getElementById('timerWorkPackage').value) {
    showStatus('Please select a work package for the timer', 'warning');
    return;
  }

  isPaused = false;

  if (!timerInterval) {
    timerInterval = setInterval(() => {
      if (!isPaused) {
        timerSeconds++;
        updateTimerDisplay();
        saveTimerState();
      }
    }, 1000);
  }

  document.getElementById('startTimerBtn').disabled = true;
  document.getElementById('pauseTimerBtn').disabled = false;
  document.getElementById('stopTimerBtn').disabled = false;
}

function pauseTimer() {
  isPaused = !isPaused;
  document.getElementById('pauseTimerBtn').textContent = isPaused
    ? 'Resume'
    : 'Pause';
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Auto-fill worklog form
  const hours = (timerSeconds / 3600).toFixed(2);
  const workPackageId = document.getElementById('timerWorkPackage').value;
  const comment = document.getElementById('timerComment').value;

  document.getElementById('workPackageSelect').value = workPackageId;

  // Update search input to show selected work package
  const selectedOption = document.querySelector(
    `#workPackageSelect option[value="${workPackageId}"]`
  );
  if (selectedOption) {
    document.getElementById('workPackageSearchInput').value =
      selectedOption.textContent;
  }

  document.getElementById('workHours').value = hours;
  document.getElementById('workComment').value = comment;

  // Switch to worklog tab
  switchTab('worklog');

  resetTimer();
  showStatus(`Timer stopped. ${hours} hours ready to log.`, 'success');
}

function resetTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  timerSeconds = 0;
  isPaused = false;
  updateTimerDisplay();
  saveTimerState();

  document.getElementById('startTimerBtn').disabled = false;
  document.getElementById('pauseTimerBtn').disabled = true;
  document.getElementById('pauseTimerBtn').textContent = 'Pause';
  document.getElementById('stopTimerBtn').disabled = true;
}

function updateTimerDisplay() {
  const hours = Math.floor(timerSeconds / 3600);
  const minutes = Math.floor((timerSeconds % 3600) / 60);
  const seconds = timerSeconds % 60;

  const display = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  document.getElementById('timerTime').textContent = display;
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

function saveTimerState() {
  chrome.storage.local.set({
    timerSeconds,
    timerWorkPackage: document.getElementById('timerWorkPackage').value,
    timerComment: document.getElementById('timerComment').value,
  });
}

function loadTimerState() {
  chrome.storage.local.get(
    ['timerSeconds', 'timerWorkPackage', 'timerComment'],
    (data) => {
      if (data.timerSeconds) {
        timerSeconds = data.timerSeconds;
        updateTimerDisplay();
      }
      if (data.timerWorkPackage) {
        document.getElementById('timerWorkPackage').value =
          data.timerWorkPackage;

        // Update search input
        const selectedOption = document.querySelector(
          `#timerWorkPackage option[value="${data.timerWorkPackage}"]`
        );
        if (selectedOption) {
          const searchInput = document.getElementById('timerWorkPackageSearch');
          if (searchInput) {
            searchInput.value = selectedOption.textContent;
          }
        }
      }
      if (data.timerComment) {
        document.getElementById('timerComment').value = data.timerComment;
      }
    }
  );
}

// Load tasks
async function loadTasks() {
  const container = document.getElementById('tasksList');
  const statusFilter = document.getElementById('taskStatusFilter').value;
  const projectFilter = document.getElementById('taskProjectFilter').value;

  container.innerHTML = '<p class="loading">Loading tasks...</p>';

  try {
    // Build filters - always filter by assignee = me
    let filterArray = [{ assignee_id: { operator: '=', values: ['me'] } }];

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
      `/api/v3/work_packages?filters=${encodeURIComponent(filtersJson)}&pageSize=100&sortBy=[["updated_at","desc"]]`
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

    const settings = await chrome.storage.sync.get(['serverUrl']);

    container.innerHTML = tasks
      .map((task) => {
        const status = task._links.status?.title || 'Unknown';
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        const wpUrl = `${settings.serverUrl}/work_packages/${task.id}`;

        return `
        <div class="task-item" data-id="${task.id}">
          <div class="task-header">
            <a href="${wpUrl}" target="_blank" class="task-id">#${task.id}</a>
            <div class="task-status ${statusClass}">${escapeHtml(status)}</div>
          </div>
          <div class="task-title">${escapeHtml(task.subject)}</div>
          <div class="task-project">${escapeHtml(task._links.project?.title || 'Unknown Project')}</div>
        </div>
      `;
      })
      .join('');
  } catch (error) {
    console.error('Error loading tasks:', error);
    container.innerHTML = `<p class="empty-state">Failed to load tasks: ${error.message}</p>`;
  }
}

// Load projects for filter dropdown
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

// Generate report
async function generateReport() {
  const reportType = document.getElementById('reportType').value;
  const startDate = document.getElementById('reportStartDate').value;
  const endDate = document.getElementById('reportEndDate').value;

  try {
    const response = await makeApiCall(
      `/api/v3/time_entries?filters=[{"spent_on":{"operator":"<>d","values":["${startDate}","${endDate}"]}}]&pageSize=1000`
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

// Display report
function displayReport(entries, reportType) {
  const reportResults = document.getElementById('reportResults');
  const reportContent = document.getElementById('reportContent');

  let html = '<table class="report-table"><thead><tr>';

  switch (reportType) {
    case 'worklog':
      html +=
        '<th>Date</th><th>Work Package</th><th>Hours</th><th>Comment</th></tr></thead><tbody>';
      entries.forEach((entry) => {
        const hours = convertISO8601ToHours(entry.hours);
        html += `
          <tr>
            <td>${new Date(entry.spentOn).toLocaleDateString()}</td>
            <td>#${entry._links.workPackage?.href?.split('/').pop() || 'N/A'}</td>
            <td>${hours.toFixed(2)}</td>
            <td>${escapeHtml(entry.comment?.raw || '')}</td>
          </tr>
        `;
      });
      break;

    case 'user':
      const totalHours = entries.reduce(
        (sum, e) => sum + convertISO8601ToHours(e.hours),
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
        projectMap[projectId].hours += convertISO8601ToHours(entry.hours);
        projectMap[projectId].count++;
      });

      html +=
        '<th>Project</th><th>Entries</th><th>Hours</th></tr></thead><tbody>';
      Object.values(projectMap).forEach((project) => {
        html += `
          <tr>
            <td>${escapeHtml(project.title)}</td>
            <td>${project.count}</td>
            <td>${project.hours.toFixed(2)}</td>
          </tr>
        `;
      });
      break;

    case 'weekly':
      const weekMap = {};
      entries.forEach((entry) => {
        const week = getWeekNumber(new Date(entry.spentOn));
        if (!weekMap[week]) {
          weekMap[week] = { hours: 0, count: 0 };
        }
        weekMap[week].hours += convertISO8601ToHours(entry.hours);
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

// Export report to CSV
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

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getWeekNumber(date) {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}
