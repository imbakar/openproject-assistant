# OpenProject Assistant - Project Overview

## 🎯 Project Summary

**OpenProject Assistant** is a comprehensive Chrome extension built for OpenProject users who want to streamline their time tracking, worklog management, and reporting workflows. Inspired by the popular Jira Assistant extension, this tool brings similar powerful features to the OpenProject ecosystem.

## 📦 What's Included

This complete Chrome extension package contains:

### Core Files
- `manifest.json` - Extension configuration (Manifest V3)
- `background.js` - Service worker for API calls and background tasks
- `content.js` - Content script for OpenProject page enhancements

### Popup Interface (`popup/`)
- `popup.html` - Main extension popup UI
- `popup.css` - Professional styling with gradient theme
- `popup.js` - Full functionality for worklog, timer, reports, and tasks

### Settings Page (`options/`)
- `options.html` - Comprehensive settings interface
- `options.css` - Clean, modern styling
- `options.js` - Settings management and validation

### Assets (`icons/`)
- `icon.svg` - Source SVG icon
- `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` - Generated icons

### Documentation
- `README.md` - Complete project documentation
- `INSTALLATION.md` - Detailed setup and usage guide

## ✨ Key Features

### 1. Time Tracking & Timer
- Integrated timer that runs in background
- Persistent state (survives browser close)
- Auto-fill worklog form from timer
- Pause/resume functionality
- Visual timer display

### 2. Worklog Management
- Quick log work from any page
- Recent worklogs view
- Date picker for retroactive logging
- Required/optional comments
- Hourly increments with auto-rounding option

### 3. Comprehensive Reports
Four report types included:
- **Worklog Report**: Detailed entry listing
- **User Summary**: Personal statistics
- **Project Summary**: Time per project
- **Weekly Report**: Week-by-week analysis
- CSV export for all reports

### 4. Task Management
- View all assigned work packages
- Filter by status and project
- Quick navigation to OpenProject
- Real-time updates

### 5. Smart Notifications
- Daily worklog reminders
- Missing worklog alerts
- Comment notifications (optional)
- Configurable timing

### 6. Page Enhancements
When visiting OpenProject pages:
- Quick Log Work button injection
- Floating timer widget
- Comment monitoring
- Auto-detection of work packages

## 🔧 Technical Implementation

### Architecture
- **Manifest V3**: Latest Chrome extension standard
- **Service Worker**: Background processing without persistent page
- **Chrome Storage API**: Settings sync across devices
- **Chrome Alarms API**: Scheduled reminders
- **Vanilla JavaScript**: No dependencies, fast and lightweight

### OpenProject API Integration
Uses OpenProject API v3 endpoints:
- `/api/v3` - Version check
- `/api/v3/work_packages` - Fetch work packages
- `/api/v3/time_entries` - Log and retrieve time entries
- `/api/v3/projects` - Project information
- `/api/v3/users/me` - User profile

### Security
- Basic Auth over HTTPS
- API keys stored in Chrome's encrypted sync storage
- No external tracking or analytics
- All data stays between Chrome and OpenProject

## 🚀 Quick Start

### Installation
1. Download the `openproject-assistant` folder
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the folder
6. Done!

### Configuration
1. Get your API key from OpenProject (My Account → Access tokens)
2. Click extension icon → Settings
3. Enter Server URL and API Key
4. Test connection
5. Save and start using!

## 📊 File Structure

```
openproject-assistant/
├── manifest.json               # Extension manifest (Manifest V3)
├── background.js              # Service worker for API & alarms
├── content.js                 # Page script for OpenProject integration
│
├── popup/
│   ├── popup.html            # Main popup interface (4 tabs)
│   ├── popup.css             # Professional gradient theme
│   └── popup.js              # Worklog, timer, reports, tasks logic
│
├── options/
│   ├── options.html          # Settings page with 8 sections
│   ├── options.css           # Modern settings UI
│   └── options.js            # Settings management
│
├── icons/
│   ├── icon.svg              # Source vector icon
│   ├── icon16.png            # Toolbar icon
│   ├── icon32.png            # Toolbar icon @2x
│   ├── icon48.png            # Extension management
│   └── icon128.png           # Chrome Web Store
│
├── README.md                  # Project documentation
└── INSTALLATION.md           # Setup and usage guide
```

## 🎨 Design Philosophy

### User Experience
- **Minimal Clicks**: Get common tasks done in 2-3 clicks
- **Smart Defaults**: Pre-fill forms with sensible values
- **Visual Feedback**: Clear status messages and animations
- **Keyboard Friendly**: Support for keyboard navigation

### Visual Design
- **Gradient Theme**: Modern purple gradient (matches OpenProject)
- **Clean Typography**: System fonts for native feel
- **Consistent Spacing**: 8px grid system
- **Responsive**: Works on all screen sizes

### Code Quality
- **Well Commented**: Clear explanations throughout
- **Modular**: Separate concerns (API, UI, storage)
- **Error Handling**: Graceful failures with user feedback
- **Performance**: Efficient DOM manipulation and API calls

## 🔄 Comparison with Jira Assistant

| Feature | Jira Assistant | OpenProject Assistant |
|---------|---------------|----------------------|
| Time Tracking | ✅ | ✅ |
| Worklog Management | ✅ | ✅ |
| Reports | ✅ | ✅ |
| Calendar Integration | ✅ | 🔜 (v1.1) |
| Team Features | ✅ | 🔜 (v1.2) |
| Planning Poker | ✅ | 🔜 (v1.2) |
| Export to CSV | ✅ | ✅ |
| Dark Theme | ✅ | ✅ |
| Mobile App | ✅ | 🔜 (v2.0) |

## 📈 Future Roadmap

### Version 1.1 (Next)
- Google Calendar integration
- Outlook Calendar integration
- Bulk CSV import
- Drag & drop worklog management
- More report types

### Version 1.2
- Team collaboration features
- Planning poker
- Sprint reports
- Gantt integration
- Meeting notes

### Version 2.0
- AI-powered suggestions
- Automated tracking
- Mobile companion app
- Advanced analytics
- Team dashboards

## 🛠️ Customization Guide

### Changing Colors
Edit `popup/popup.css`:
```css
/* Change gradient colors */
header {
  background: linear-gradient(135deg, #YOUR_COLOR1, #YOUR_COLOR2);
}
```

### Adding New Report Types
1. Add option to `popup.html`:
```html
<option value="custom">Custom Report</option>
```

2. Add logic in `popup.js`:
```javascript
case 'custom':
  // Your report logic here
  break;
```

### Adding New Settings
1. Add UI in `options/options.html`
2. Add save/load logic in `options/options.js`
3. Use setting in `popup/popup.js`

## 🤝 Contributing

Want to improve the extension? Here's how:

### Setup Development Environment
1. Clone the repository
2. Make changes to files
3. Reload extension in `chrome://extensions/`
4. Test your changes
5. Submit pull request

### Coding Standards
- Use meaningful variable names
- Comment complex logic
- Follow existing code style
- Test on multiple OpenProject versions

### Testing Checklist
- [ ] Install from fresh
- [ ] Test all settings
- [ ] Log work successfully
- [ ] Generate all report types
- [ ] Timer works correctly
- [ ] Notifications appear
- [ ] Page injection works

## 📝 License & Credits

### License
MIT License - Free to use, modify, and distribute

### Inspired By
- [Jira Assistant](https://jiraassistant.com) - UI/UX inspiration
- [OpenProject](https://www.openproject.org) - Amazing project management tool

### Technologies
- Chrome Extensions API
- OpenProject REST API
- Vanilla JavaScript
- CSS3 Gradients & Animations
- Python PIL (for icon generation)

## 🐛 Known Issues & Limitations

### Current Limitations
1. No offline mode (requires OpenProject connection)
2. Cannot edit existing worklogs (API limitation)
3. Calendar integration not yet implemented
4. Single user per browser profile

### Browser Support
- ✅ Google Chrome (v88+)
- ✅ Microsoft Edge (Chromium)
- ✅ Brave Browser
- ✅ Opera
- ❌ Firefox (different extension API)
- ❌ Safari (different extension API)

## 📞 Support & Contact

### Getting Help
- 📖 Read INSTALLATION.md for detailed setup
- 🐛 Report bugs on GitHub Issues
- 💡 Suggest features on GitHub Discussions
- 📧 Email: support@openproject-assistant.com

### Community
- Join OpenProject community forums
- Share your experience
- Help other users
- Contribute to development

## 🎉 Acknowledgments

Special thanks to:
- OpenProject team for excellent API documentation
- Jira Assistant for design inspiration
- Chrome Extensions team for great developer tools
- All contributors and users

---

**Ready to boost your OpenProject productivity? Install now and start tracking!**

For detailed installation instructions, see `INSTALLATION.md`
For full feature documentation, see `README.md`
