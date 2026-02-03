# OpenProject Assistant - Installation & Setup Guide

## Quick Start (5 minutes)

### Step 1: Install the Extension

#### Option A: Load Unpacked (Developer Mode)
1. Download this folder to your computer
2. Open Google Chrome
3. Navigate to `chrome://extensions/`
4. Toggle "Developer mode" ON (top right corner)
5. Click "Load unpacked"
6. Select the `openproject-assistant` folder
7. The extension icon should appear in your toolbar!

#### Option B: From Chrome Web Store (Coming Soon)
1. Visit Chrome Web Store
2. Search "OpenProject Assistant"
3. Click "Add to Chrome"

### Step 2: Get Your OpenProject API Key

1. **Log in to OpenProject**
   - Go to your OpenProject instance (e.g., `https://openproject.yourcompany.com`)
   - Sign in with your credentials

2. **Navigate to Access Tokens**
   - Click your profile icon (top right)
   - Select "My account"
   - Click "Access tokens" in the left sidebar

3. **Generate API Key**
   - Look for the "API" row
   - Click "Generate" (or "Reset" if you already have one)
   - **IMPORTANT**: Copy the generated key immediately!
   - You won't be able to see it again

### Step 3: Configure the Extension

1. **Open Settings**
   - Click the extension icon in Chrome toolbar
   - Click the Settings (⚙️) button

2. **Enter Your Details**
   - **Server URL**: Enter your OpenProject URL
     - Example: `https://openproject.yourcompany.com`
     - Don't include trailing slash
     - Must start with `https://` or `http://`
   
   - **API Key**: Paste the key you copied earlier
     - Click "Show" to verify you pasted it correctly

3. **Test Connection**
   - Click "Test Connection" button
   - You should see a green success message
   - If it fails, double-check your URL and API key

4. **Save Settings**
   - Click "Save Settings" at the bottom
   - You're all set!

## Feature Setup

### Enable Daily Reminders

1. Go to Settings → Notification Settings
2. Check "Enable daily worklog reminders"
3. Set your preferred reminder time (e.g., 5:00 PM)
4. Save settings

### Customize Appearance

1. Go to Settings → Appearance
2. Choose your theme:
   - **Light**: Classic bright theme
   - **Dark**: Easy on the eyes
   - **Auto**: Matches your system
3. Select date format preference
4. Save settings

### Configure Worklog Defaults

1. Go to Settings → Worklog Settings
2. Set default hours per day (e.g., 8)
3. Enable auto-rounding if desired
4. Choose whether to require comments
5. Save settings

## Using the Extension

### 📝 Logging Work

**Method 1: Quick Log (Fastest)**
1. Navigate to any work package in OpenProject
2. Click the "⏱️ Quick Log Work" button
3. Enter hours and optional comment
4. Click "Log Work"

**Method 2: From Extension**
1. Click extension icon
2. Go to "Worklog" tab
3. Select work package from dropdown
4. Enter hours and comment
5. Click "Log Work"

**Method 3: Using Timer**
1. Click extension icon
2. Go to "Timer" tab
3. Select work package
4. Click "Start"
5. Do your work
6. Click "Stop & Log"
7. Timer auto-fills the worklog form

### ⏱️ Time Tracking

**Starting the Timer**
- Select a work package first
- Click "Start" button
- Timer runs in background even if you close popup

**Pausing the Timer**
- Click "Pause" to temporarily stop
- Click "Resume" to continue

**Stopping the Timer**
- Click "Stop & Log"
- Extension switches to Worklog tab
- Hours are automatically calculated
- Just add a comment and submit!

**Resetting the Timer**
- Use "Reset" to clear current time
- Useful if you want to start over

### 📊 Generating Reports

1. Click extension icon
2. Go to "Reports" tab
3. Select report type:
   - **Worklog Report**: All your logged work
   - **User Summary**: Your statistics
   - **Project Summary**: Time per project
   - **Weekly Report**: Week-by-week breakdown
4. Choose date range
5. Click "Generate Report"
6. Optionally export to CSV

### 📋 Managing Tasks

1. Click extension icon
2. Go to "Tasks" tab
3. View all your assigned work packages
4. Filter by:
   - Status (New, In Progress, Resolved)
   - Project
5. Click any task to open in OpenProject

## Tips & Tricks

### Keyboard Shortcuts
- Press `Alt+Shift+O` to open the extension popup (configurable)

### Quick Access
- Pin the extension to always show in toolbar
- Right-click extension icon → "Pin"

### Daily Workflow
1. Start your day by checking Tasks tab
2. Start timer for current work
3. Switch timer between tasks throughout the day
4. Review worklogs at end of day
5. Generate weekly report on Fridays

### Best Practices

**For Accurate Time Tracking:**
- Start timer when you begin work
- Pause during breaks
- Use comments to describe what you did
- Log work daily, not weekly

**For Better Reports:**
- Be consistent with your logging
- Use meaningful comments
- Log work to the correct work package
- Review your weekly reports

**For Team Collaboration:**
- Share your weekly reports with team
- Keep work packages updated
- Use consistent naming in comments

## Troubleshooting

### Connection Failed
**Problem**: Can't connect to OpenProject

**Solutions**:
1. Verify Server URL is correct
2. Check API key is valid (regenerate if needed)
3. Ensure OpenProject instance is accessible
4. Check if CORS is enabled on OpenProject server
5. Try accessing your OpenProject in browser first

### No Work Packages Showing
**Problem**: Dropdown is empty

**Solutions**:
1. Verify you have access to at least one project
2. Check if you're assigned to any work packages
3. Refresh using the 🔄 button
4. Check API permissions in OpenProject

### Timer Not Working
**Problem**: Timer doesn't start or reset

**Solutions**:
1. Select a work package first
2. Refresh the extension
3. Clear cache in Settings → Data Management
4. Reinstall extension if issue persists

### Worklogs Not Saving
**Problem**: "Failed to log work" error

**Solutions**:
1. Check you have permission to log time
2. Verify work package exists and is accessible
3. Ensure hours are positive number
4. Check date is valid
5. Review OpenProject project settings

### Notifications Not Appearing
**Problem**: No daily reminders

**Solutions**:
1. Enable notifications in Settings
2. Allow Chrome notifications in system settings
3. Check reminder time is set correctly
4. Ensure extension is not disabled

## Advanced Configuration

### CORS Configuration (for self-hosted OpenProject)

If you're running OpenProject on-premises, you may need to enable CORS:

1. Edit OpenProject configuration file
2. Add allowed origins for Chrome extension
3. Restart OpenProject server
4. See [OpenProject CORS documentation](https://www.openproject.org/docs/system-admin-guide/api-and-webhooks/)

### Calendar Integration (Coming Soon)

Google Calendar setup:
1. Go to Settings → Calendar Integration
2. Select "Google Calendar"
3. Click "Connect"
4. Authorize access
5. Enable auto-create for meetings

## Data & Privacy

### What Data is Stored?
- Extension settings (server URL, API key)
- Timer state (current time, work package)
- Cached work packages (for faster loading)
- Report preferences

### Where is Data Stored?
- **Chrome Sync Storage**: Settings (synced across devices)
- **Chrome Local Storage**: Cache and temporary data
- **OpenProject Server**: All worklogs via API

### How to Export Your Data?
1. Go to Settings → Data Management
2. Click "Export Settings"
3. Save JSON file to backup your configuration

### How to Clear Data?
1. Go to Settings → Data Management
2. Click "Clear Cache" to remove temporary data
3. Or uninstall extension to remove everything

## Getting Help

### Resources
- [OpenProject API Docs](https://www.openproject.org/docs/api/)
- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [GitHub Issues](https://github.com/yourusername/openproject-assistant/issues)

### Support Channels
- 📧 Email: support@openproject-assistant.com
- 💬 GitHub Discussions
- 🐛 Bug Reports on GitHub

### Common Questions

**Q: Is this official OpenProject extension?**
A: No, this is a community-built tool inspired by Jira Assistant.

**Q: Does it work with OpenProject Cloud?**
A: Yes! Works with both cloud and self-hosted instances.

**Q: Can I use it offline?**
A: No, it requires connection to OpenProject server.

**Q: Is my API key safe?**
A: Yes, it's stored securely in Chrome's encrypted storage.

**Q: Can multiple people use it?**
A: Yes, each user needs their own API key.

**Q: Does it cost anything?**
A: No, it's completely free and open source!

## Updates & Changelog

### Version 1.0.0 (Current)
- ✅ Initial release
- ✅ Time tracking & timer
- ✅ Worklog management
- ✅ Multiple report types
- ✅ Daily reminders
- ✅ Task management
- ✅ Quick log from pages

### Coming in Version 1.1
- 🔜 Calendar integration
- 🔜 Bulk import from CSV
- 🔜 More report types
- 🔜 Team features

---

**Happy time tracking! 🎉**

For questions or feedback, please reach out through GitHub or email.
