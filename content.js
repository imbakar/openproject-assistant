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
      quickLogBtn.style.cssText = `
        background: #667eea;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        margin-left: 8px;
        font-size: 14px;
        font-weight: 500;
      `;
      
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
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;
  
  // Create dialog
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
  `;
  
  dialog.innerHTML = `
    <h2 style="margin-top: 0; color: #2c3e50;">Quick Log Work</h2>
    <p style="color: #6c757d; font-size: 14px;">Work Package #${workPackageId}</p>
    
    <div style="margin: 20px 0;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">Hours</label>
      <input type="number" id="quick-hours" min="0" max="24" step="0.25" value="1" 
             style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
    </div>
    
    <div style="margin: 20px 0;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">Date</label>
      <input type="date" id="quick-date" value="${new Date().toISOString().split('T')[0]}"
             style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px;">
    </div>
    
    <div style="margin: 20px 0;">
      <label style="display: block; margin-bottom: 8px; font-weight: 500;">Comment</label>
      <textarea id="quick-comment" rows="3" placeholder="What did you work on?"
                style="width: 100%; padding: 8px; border: 1px solid #ced4da; border-radius: 4px; resize: vertical;"></textarea>
    </div>
    
    <div style="display: flex; gap: 8px; justify-content: flex-end;">
      <button id="quick-cancel" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Cancel
      </button>
      <button id="quick-submit" style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">
        Log Work
      </button>
    </div>
    
    <div id="quick-status" style="margin-top: 12px; display: none;"></div>
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
  statusEl.style.cssText = `
    padding: 12px;
    border-radius: 4px;
    margin-top: 12px;
    display: block;
    ${type === 'success' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : ''}
    ${type === 'error' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : ''}
  `;
}

// Add timer controls to the page
function addPageTimerControls() {
  // Create floating timer widget
  const timerWidget = document.createElement('div');
  timerWidget.id = 'op-assistant-timer-widget';
  timerWidget.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    z-index: 9999;
    min-width: 200px;
    display: none;
  `;
  
  timerWidget.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <strong style="color: #2c3e50;">Timer</strong>
      <button id="op-timer-close" style="background: none; border: none; cursor: pointer; font-size: 18px;">×</button>
    </div>
    <div id="op-timer-display" style="font-size: 24px; font-weight: 700; text-align: center; margin: 12px 0; font-variant-numeric: tabular-nums;">
      00:00:00
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="op-timer-start" style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Start
      </button>
      <button id="op-timer-stop" style="flex: 1; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;" disabled>
        Stop
      </button>
    </div>
  `;
  
  document.body.appendChild(timerWidget);
  
  // Timer widget event listeners
  document.getElementById('op-timer-close').addEventListener('click', () => {
    timerWidget.style.display = 'none';
  });
  
  // Add button to show timer widget
  const showTimerBtn = document.createElement('button');
  showTimerBtn.id = 'op-assistant-show-timer';
  showTimerBtn.innerHTML = '⏱️';
  showTimerBtn.title = 'Show Timer';
  showTimerBtn.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9998;
  `;
  
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
