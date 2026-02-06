// OpenProject Assistant - Content Script

// Check if we're on an OpenProject page
function isOpenProjectPage() {
  return document.querySelector('meta[name="application-name"]')?.content === 'OpenProject' ||
         window.location.pathname.includes('/work_packages/') ||
         document.querySelector('.work-package-details-activities-activity-contents');
}

// Initialize content script
if (isOpenProjectPage()) {
  console.log('OpenProject Assistant: Content script loaded on OpenProject page');
  initializeEnhancements();
}

function initializeEnhancements() {
  // Add quick log work button to work package pages
  addQuickLogWorkButton();
  
  // Add timer controls to the page
  addPageTimerControls();
  
  // Monitor for new comments (for notifications)
  observeComments();
}

// Add quick log work button to work package details page
function addQuickLogWorkButton() {
  // Wait for the work package toolbar to load
  const observer = new MutationObserver((mutations, obs) => {
    const toolbar = document.querySelector('.work-packages--details-toolbar');

    if (toolbar && !document.getElementById('op-assistant-quick-log')) {
      const quickLogBtn = document.createElement('button');
      quickLogBtn.id = 'op-assistant-quick-log';
      quickLogBtn.className = 'button';
      quickLogBtn.innerHTML = '⏱️ Quick Log Work';

      quickLogBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showQuickLogDialog();
      });

      toolbar.appendChild(quickLogBtn);
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Show quick log work dialog
function showQuickLogDialog() {
  // Get current work package ID from URL
  const wpMatch = window.location.pathname.match(/work_packages\/(\d+)/);
  if (!wpMatch) return;

  const workPackageId = wpMatch[1];

  // Create dialog overlay
  const overlay = document.createElement('div');
  overlay.id = 'op-assistant-overlay';

  // Create dialog
  const dialog = document.createElement('div');

  dialog.innerHTML = `
    <h2>Quick Log Work</h2>
    <p>Work Package #${workPackageId}</p>

    <div>
      <label>Hours</label>
      <input type="number" id="quick-hours" min="0" max="24" step="0.25" value="1" />
    </div>

    <div>
      <label>Date</label>
      <input type="date" id="quick-date" value="${new Date().toISOString().split('T')[0]}" />
    </div>

    <div>
      <label>Comment</label>
      <textarea id="quick-comment" rows="3" placeholder="What did you work on?"></textarea>
    </div>

    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="quick-cancel">Cancel</button>
      <button id="quick-submit">Log Work</button>
    </div>

    <div id="quick-status"></div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Event listeners
  document.getElementById('quick-cancel').addEventListener('click', () => {
    overlay.remove();
  });

  document.getElementById('quick-submit').addEventListener('click', async () => {
    const hours = parseFloat(document.getElementById('quick-hours').value);
    const date = document.getElementById('quick-date').value;
    const comment = document.getElementById('quick-comment').value;

    if (!hours || hours <= 0) {
      showQuickStatus('Please enter valid hours', 'error');
      return;
    }

    const submitBtn = document.getElementById('quick-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging...';

    try {
      const settings = await chrome.storage.sync.get(['serverUrl', 'apiKey']);

      // Convert hours to ISO 8601 duration format
      const totalMinutes = Math.round(hours * 60);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      let duration;
      if (m === 0) {
        duration = `PT${h}H`;
      } else if (h === 0) {
        duration = `PT${m}M`;
      } else {
        duration = `PT${h}H${m}M`;
      }

      const response = await fetch(`${settings.serverUrl}/api/v3/time_entries`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`apikey:${settings.apiKey}`)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spentOn: date,
          hours: duration,
          comment: {
            raw: comment || '',
            format: 'plain'
          },
          _links: {
            workPackage: {
              href: `/api/v3/work_packages/${workPackageId}`
            }
          }
        })
      });

      if (response.ok) {
        showQuickStatus('Work logged successfully!', 'success');
        setTimeout(() => overlay.remove(), 2000);
      } else {
        const errorText = await response.text();
        showQuickStatus(`Failed to log work: ${response.status}`, 'error');
      }
    } catch (error) {
      showQuickStatus(`Error: ${error.message}`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log Work';
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

function showQuickStatus(message, type) {
  const statusEl = document.getElementById('quick-status');
  statusEl.textContent = message;
  statusEl.className = type;
}

// Add timer controls to the page
function addPageTimerControls() {
  // Create floating timer widget
  const timerWidget = document.createElement('div');
  timerWidget.id = 'op-assistant-timer-widget';

  timerWidget.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <strong>Timer</strong>
      <button id="op-timer-close">×</button>
    </div>
    <div id="op-timer-display">
      00:00:00
    </div>
    <div id="op-timer-controls" style="display: flex; gap: 8px;">
      <button id="op-timer-start">Start</button>
      <button id="op-timer-stop" disabled>Stop</button>
    </div>
  `;

  document.body.appendChild(timerWidget);

  // Add button to show timer widget
  const showTimerBtn = document.createElement('button');
  showTimerBtn.id = 'op-assistant-show-timer';
  showTimerBtn.innerHTML = '⏱️';
  showTimerBtn.title = 'Show Timer';

  showTimerBtn.addEventListener('click', () => {
    timerWidget.style.display = 'block';
    showTimerBtn.style.display = 'none';
  });

  document.body.appendChild(showTimerBtn);

  document.getElementById('op-timer-close').addEventListener('click', () => {
    timerWidget.style.display = 'none';
    showTimerBtn.style.display = 'block';
  });
}

// Observe comments for notifications
function observeComments() {
  chrome.storage.sync.get(['enableCommentNotifications'], (settings) => {
    if (!settings.enableCommentNotifications) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.classList?.contains('user-comment')) {
            // New comment detected
            const commentText = node.textContent?.trim();
            if (commentText) {
              chrome.runtime.sendMessage({
                action: 'newComment',
                comment: commentText
              });
            }
          }
        });
      });
    });
    
    const commentsContainer = document.querySelector('.work-package-details-activities-messages');
    if (commentsContainer) {
      observer.observe(commentsContainer, {
        childList: true,
        subtree: true
      });
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getWorkPackageId') {
    const wpMatch = window.location.pathname.match(/work_packages\/(\d+)/);
    sendResponse({ workPackageId: wpMatch ? wpMatch[1] : null });
  }
});
