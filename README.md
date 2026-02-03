# OpenProject Assistant - Chrome Extension

A powerful Chrome extension for OpenProject that helps you track work, manage worklogs, and generate comprehensive reports. Similar to Jira Assistant but built specifically for OpenProject.

## 🚀 Features

### ⏱️ Time Tracking
- **Integrated Timer**: Track time spent on work packages in real-time
- **Quick Log Work**: Easily log work from any OpenProject page
- **Auto-fill**: Timer automatically fills worklog form when stopped
- **Persistent State**: Timer state is saved even if you close the browser

### 📊 Worklog Management
- **Easy Logging**: Log work with just a few clicks
- **Recent Worklogs**: View your recent work entries at a glance
- **Drag & Drop**: (Coming soon) Copy and adjust worklogs easily
- **Bulk Import**: (Coming soon) Import worklogs from CSV files

### 📈 Comprehensive Reporting
- **Worklog Reports**: Detailed breakdown of all logged work
- **User Summary**: Overview of your work statistics
- **Project Summary**: Time spent per project
- **Weekly Reports**: Week-by-week analysis
- **Export to CSV**: Download reports for further analysis

### 🔔 Smart Notifications
- **Daily Reminders**: Get reminded to log your work
- **Missing Worklogs**: Notifications for days without logged work
- **Comment Notifications**: Stay updated on work package comments

### 🎨 Customization
- **Multiple Themes**: Light, dark, and auto (system) themes
- **Date Formats**: Choose your preferred date format
- **Flexible Settings**: Configure default hours, auto-rounding, and more

### 🔌 Integration
- **Calendar Sync**: (Coming soon) Sync with Google/Outlook calendars
- **Auto-create Meetings**: (Coming soon) Automatically create worklogs from meetings

## 📦 Installation

### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store
2. Search for "OpenProject Assistant"
3. Click "Add to Chrome"

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked"
5. Select the `openproject-assistant` folder
6. The extension is now installed!

## ⚙️ Configuration

### Initial Setup
1. Click the extension icon in Chrome toolbar
2. Click the Settings (⚙️) button
3. Enter your OpenProject details:
   - **Server URL**: Your OpenProject instance URL (e.g., `https://openproject.yourcompany.com`)
   - **API Key**: Your personal API key from OpenProject

### Getting Your API Key
1. Log in to your OpenProject instance
2. Go to "My Account" (top right menu)
3. Click on "Access tokens" in the left sidebar
4. Click "Generate" or "Reset" in the API row
5. Copy the generated API key
6. Paste it into the extension settings

### Test Connection
After entering your credentials, click "Test Connection" to verify the setup.

## 🎯 Usage

### Logging Work

#### Method 1: From Extension Popup
1. Click the extension icon
2. Go to the "Worklog" tab
3. Select a work package
4. Enter hours and comment
5. Click "Log Work"

#### Method 2: Quick Log from OpenProject Page
1. Navigate to any work package in OpenProject
2. Click the "⏱️ Quick Log Work" button (injected by the extension)
3. Enter hours and comment
4. Click "Log Work"

#### Method 3: Using Timer
1. Click the extension icon
2. Go to the "Timer" tab
3. Select a work package
4. Click "Start"
5. Work on your task
6. Click "Stop & Log" when done
7. The worklog form will be auto-filled

### Generating Reports

1. Click the extension icon
2. Go to the "Reports" tab
3. Select report type
4. Choose date range
5. Click "Generate Report"
6. Optionally export to CSV

### Managing Tasks

1. Click the extension icon
2. Go to the "Tasks" tab
3. View all assigned work packages
4. Filter by status or project
5. Click any task to open it in OpenProject

## 🔧 Settings Overview

### Connection Settings
- **Server URL**: Your OpenProject instance
- **API Key**: Authentication token

### Notification Settings
- **Daily Reminders**: Remind you to log work
- **Reminder Time**: When to send the reminder
- **Comment Notifications**: Notify on new comments

### Appearance
- **Theme**: Light, Dark, or Auto
- **Date Format**: Choose preferred format

### Worklog Settings
- **Default Hours**: Default hours per day
- **Auto-round Hours**: Round to nearest 0.25h
- **Require Comment**: Make comments mandatory

### Timer Settings
- **Timer Sound**: Sound alerts at milestones
- **Pause on Idle**: Auto-pause when inactive

### Calendar Integration
- **Calendar Provider**: Google or Outlook
- **Auto-create Worklogs**: Create from meetings

## 🔒 Privacy & Security

- **Local Storage**: All data is stored locally in Chrome
- **No Tracking**: The extension doesn't track your activity
- **Secure API**: Uses Basic Auth over HTTPS
- **API Key Protection**: Keys are stored securely in Chrome sync storage

## 🛠️ Development

### Project Structure
```
openproject-assistant/
├── manifest.json           # Extension manifest
├── background.js          # Background service worker
├── content.js            # Content script for page injection
├── popup/
│   ├── popup.html       # Main popup interface
│   ├── popup.css        # Popup styles
│   └── popup.js         # Popup logic
├── options/
│   ├── options.html     # Settings page
│   ├── options.css      # Settings styles
│   └── options.js       # Settings logic
└── icons/               # Extension icons
```

### Technologies Used
- **Manifest V3**: Latest Chrome extension standard
- **Vanilla JavaScript**: No frameworks for better performance
- **Chrome Storage API**: For settings and state persistence
- **Chrome Alarms API**: For scheduling reminders
- **OpenProject API v3**: RESTful API integration

### OpenProject API Endpoints Used
- `/api/v3/work_packages` - Fetch work packages
- `/api/v3/time_entries` - Log and fetch time entries
- `/api/v3/projects` - Get project information
- `/api/v3/users/me` - Get current user info

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Roadmap

### Version 1.1
- [ ] Calendar integration (Google/Outlook)
- [ ] Bulk worklog import from CSV
- [ ] Drag & drop worklog management
- [ ] More report types (Say-Do ratio, etc.)

### Version 1.2
- [ ] Team collaboration features
- [ ] Planning poker integration
- [ ] Sprint reports
- [ ] Gantt chart integration

### Version 2.0
- [ ] AI-powered work suggestions
- [ ] Automated time tracking
- [ ] Mobile app companion
- [ ] Advanced analytics dashboard

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by [Jira Assistant](https://jiraassistant.com)
- Built for the amazing [OpenProject](https://www.openproject.org) community
- Icons from various open-source icon sets

## 💬 Support

Having issues or questions?

- 📧 Email: support@openproject-assistant.com
- 🐛 Bug Reports: [GitHub Issues](https://github.com/yourusername/openproject-assistant/issues)
- 💡 Feature Requests: [GitHub Discussions](https://github.com/yourusername/openproject-assistant/discussions)

## 📊 Version History

### v1.0.0 (Initial Release)
- ✅ Time tracking with integrated timer
- ✅ Worklog management
- ✅ Multiple report types
- ✅ Daily reminders
- ✅ Task management
- ✅ Settings and customization
- ✅ Quick log from OpenProject pages

---

**Made with ❤️ for the OpenProject community**
