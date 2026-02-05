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
  loadProjects();
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
    await loadProjects();
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
    const debouncedFilter = debounce((query) => {
      filterWorkPackageOptions(query);
    }, 300);

    searchInput.addEventListener('input', (e) => {
      debouncedFilter(e.target.value);
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

    const debouncedTimerFilter = debounce((query) => {
      filterTimerWorkPackageOptions(query);
    }, 300);

    timerSearchInput.addEventListener('input', (e) => {
      debouncedTimerFilter(e.target.value);
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

  // Project search (same functionality)
  const projectSearchInput = document.getElementById('projectSearchInput');
  const projectSelectElement = document.getElementById('projectSelect');

  if (projectSearchInput && projectSelectElement) {
    projectSearchInput.addEventListener('focus', () => {
      projectSelectElement.classList.add('show');
      adjustSelectHeight(projectSelectElement);
    });

    projectSearchInput.addEventListener('input', (e) => {
      filterProjectOptions(e.target.value);
      projectSelectElement.classList.add('show');
      adjustSelectHeight(projectSelectElement);
    });

    projectSelectElement.addEventListener('change', () => {
      const selectedOption =
        projectSelectElement.options[projectSelectElement.selectedIndex];
      if (selectedOption && selectedOption.value) {
        projectSearchInput.value = selectedOption.textContent;
        projectSelectElement.classList.remove('show');
      }
    });

    projectSelectElement.addEventListener('click', (e) => {
      if (e.target.tagName === 'OPTION' && e.target.value) {
        projectSearchInput.value = e.target.textContent;
        projectSelectElement.value = e.target.value;
        projectSelectElement.classList.remove('show');
      }
    });

    document.addEventListener('click', (e) => {
      if (
        !projectSearchInput.contains(e.target) &&
        !projectSelectElement.contains(e.target)
      ) {
        projectSelectElement.classList.remove('show');
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
  const { lastConnectionCheck } = await chrome.storage.local.get([
    'lastConnectionCheck',
  ]);

  const oneHour = 60 * 60 * 1000;
  const now = Date.now();

  // If we have a successful connection check from the last hour, use it
  if (lastConnectionCheck && now - lastConnectionCheck < oneHour) {
    // showStatus('Connected to OpenProject', 'success');
    const statusEl = document.getElementById('connectionStatusWorklog');
    statusEl.style.display = 'none';
    return true;
  }

  try {
    const response = await makeApiCall('/api/v3');
    if (response) {
      await chrome.storage.local.set({
        lastConnectionCheck: now,
      });
      showStatus('Connected to OpenProject', 'success');
      return true;
    }
  } catch (error) {
    // If connection fails, we don't store anything so it will retry next time
    showStatus('Not connected. Please configure settings.', 'error');
    return false;
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const activeTab = document.querySelector('.tab-content.active');
  if (!activeTab) return;

  const statusEl = activeTab.querySelector('.status-indicator');
  if (!statusEl) return;

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

// Switch between selecting existing work packages and creating new ones
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

// Load projects for project selector
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

// Update project select dropdown
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

// Filter project options based on search
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

// Load work package types
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
  try {
    const response = await makeApiCall(
      '/api/v3/work_packages?filters=[{"status_id":{"operator":"o"}}]&pageSize=50&sortBy=[["updated_at","desc"]]'
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
async function filterWorkPackageOptions(query) {
  if (!query) {
    updateWorkPackageSelects(window.allWorkPackages || []);
    return;
  }
  const results = await searchWorkPackagesApi(query);
  updateWorkPackageSelects(results);
}

// Filter timer work package options
async function filterTimerWorkPackageOptions(query) {
  if (!query) {
    updateTimerWorkPackageSelect(window.allWorkPackages || []);
    return;
  }
  const results = await searchWorkPackagesApi(query);
  updateTimerWorkPackageSelect(results);
}

// Core API search function for work packages
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

// Update timer work package select
// Update timer work package select
function updateTimerWorkPackageSelect(workPackages) {
  const select = document.getElementById('timerWorkPackage');
  if (select) {
    renderWorkPackageOptions(select, workPackages);
  }
}

// Common rendering logic for work package select elements
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

// Adjust select height dynamically based on number of options
function adjustSelectHeight(selectElement, minHeight = 100, maxHeight = 180) {
  const optionCount = selectElement.options.length;
  const itemHeight = 40; // Approximate height per option

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

  try {
    const settings = await chrome.storage.sync.get(['serverUrl']);
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
        const hours = convertISO8601ToHours(wl.hours);
        const hoursFormatted = formatHoursAsHHMM(hours);
        const wpId = wl._links.workPackage?.href?.split('/').pop() || '';
        const wpTitle = wl._links.workPackage?.title || 'Unknown';
        const wpUrl = wpId
          ? `${settings.serverUrl}/work_packages/${wpId}`
          : '#';
        const commentRaw = wl.comment?.raw || '';
        let commentEscaped = escapeHtml(commentRaw);

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
        <div class="worklog-item" data-id="${wl.id}" data-wp-id="${wpId}" data-wp-title="${escapeHtml(wpTitle)}" data-date="${wl.spentOn}" data-hours="${hours}" data-comment="${commentEscaped}" data-start-time="${startTime}" data-end-time="${endTime}">
          <div class="worklog-header">
            <a href="${wpUrl}" target="_blank" class="worklog-title" title="Open in OpenProject">
              #${wpId} - ${escapeHtml(wpTitle)}
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
    const duration = convertHoursToISO8601(hours);

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

// Timer functions
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
      if (response && response.success) {
        if (!timerInterval) {
          timerInterval = setInterval(refreshTimerFromBackground, 1000);
        }
        isPaused = false;
        // Refresh immediately to get the current state and update buttons
        refreshTimerFromBackground();
      }
    }
  );
}

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

function resetTimer() {
  chrome.runtime.sendMessage({ action: 'resetTimer' }, () => {
    resetTimerUI();
  });
}

function resetTimerUI() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  timerSeconds = 0;
  isPaused = false;
  updateTimerDisplay();
  updateTimerButtons(false, 0, false);
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
  const wpId = document.getElementById('timerWorkPackage').value;
  const comment = document.getElementById('timerComment').value;

  chrome.runtime.sendMessage({
    action: 'updateTimerData',
    workPackageId: wpId,
    comment: comment,
  });
}

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
      timerInterval = setInterval(refreshTimerFromBackground, 1000);
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

// Update visibility and state of timer control buttons
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

// Load tasks
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

    const settings = await chrome.storage.sync.get(['serverUrl']);

    const tasksHtml = tasks
      .map((task) => {
        const status = task._links.status?.title || 'Unknown';
        const statusClass = status.toLowerCase().replace(/\s+/g, '-');
        const wpUrl = `${settings.serverUrl}/work_packages/${task.id}`;

        return `
        <div class="task-item" data-id="${task.id}" data-title="${escapeHtml(task.subject)}">
          <div class="task-header">
            <a href="${wpUrl}" target="_blank" class="task-id">#${task.id}</a>
            <div class="task-status ${statusClass}">${escapeHtml(status)}</div>
          </div>
          <div class="task-title">${escapeHtml(task.subject)}</div>
          <div class="task-project">${escapeHtml(task._links.project?.title || 'Unknown Project')}</div>
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

// Utility to debounce function calls
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
