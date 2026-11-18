# Privacy-Shield-Extension
A powerful, privacy-focused browser extension that blocks known tracking scripts and domains in real-time. Tracker Blocker helps protect your online privacy by preventing advertisers, analytics services, and other trackers from monitoring your browsing activity.

Features:

Core Blocking Features:

Real-time Tracker Detection: Blocks 100+ curated tracking domains (see rules.json) including:

Google Analytics (`google-analytics.com`, `googletagmanager.com`)
DoubleClick (`doubleclick.net`, `pagead2.googlesyndication.com`)
Facebook Trackers (`facebook.net`, `connect.facebook.net`)
Yahoo Ads (`ads.yahoo.com`)
And many more

Multiple Request Types: Blocks tracking through:

Script files,
XHR/Fetch requests,
Image beacons/pixels,
Any tracking attempt.

Statistics & Monitoring:

📊 Real-time Statistics: See live count of blocked trackers

📈 Daily Statistics: Track blocked requests by day

🎯 Top Trackers List: View the most blocked tracking domains

📉 Historical Data: Analyze tracking patterns over time

Customization:

✅ Whitelist Domains: Disable tracking protection on specific sites (e.g., your own website)

❌ Blacklist Domains: Add custom tracking domains to block

💾 Import/Export: Backup and restore your settings as JSON files

🔄 Data Management: Clear statistics or restore from backup

UI & UX:

🎨 Modern Dark Theme: Eye-friendly cybersecurity aesthetic

⚡ Real-time Badge: Extension icon shows current blocked tracker count

📱 Responsive Design: Works seamlessly on all screen sizes

🔔 Notifications: Alerts when many trackers are blocked on a page

📋 Requirements:

Browsers Supported: Chrome, Edge, Brave, and other Chromium-based browsers

Manifest Version: V3 (latest security standard)

Permissions: Storage, Declarative Net Request, Tabs

Installation:

Quick Start
Download or Clone the Repository

```bash
   git clone https://github.com/yourusername/tracker-blocker.git
   cd tracker-blocker
   ```

Manual Installation in Chrome:

1. Open Extension Management Page
Navigate to: `chrome://extensions/`
Or go to: Menu → More Tools → Extensions
2. Enable Developer Mode
Toggle "Developer mode" in the top-right corner
3. Load Unpacked Extension
Click "Load unpacked"
Select the `tracker-blocker` directory
The extension will appear in your extensions list
4. Verify Installation
The extension icon should appear in your toolbar (red shield 🛡️)
Click it to open the popup and verify it's working

Installation in Other Browsers
Edge:
Navigate to: `edge://extensions/`
Follow the same steps as Chrome

Brave:
Navigate to: `brave://extensions/`
Follow the same steps as Chrome

📁 Project Structure
```
tracker-blocker/
├── manifest.json              # Extension configuration (Manifest V3)
├── background.js              # Service worker (blocking logic)
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic
├── options.html               # Settings page styling
├── options.js                 # Settings logic
├── rules.json                 # DNR rules configuration
├── icons/                     # Icon directory
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── images
└── README.md                  # This file
└── TrackerBlocker_Report.pdf   # Report of this project
```

How It Works:

Request Blocking

Browser makes a request to any website,
Tracker Blocker's service worker checks the URL against the tracking domains list,
If it matches a known tracker, the request is blocked immediately,
User browsing experience continues uninterrupted.

Statistics Tracking

Each blocked request is recorded in the background service worker,
Data includes: tracker domain, timestamp, and page URL,
Statistics are stored locally in browser storage (never sent to servers),
Real-time badge updates show total blocked today.

Whitelist/Blacklist System

Whitelist: Domains on this list are excluded from tracking protection (useful for your own sites),
Blacklist: Additional domains to block beyond the default list,
Both are applied immediately without requiring extension reload.

Privacy & Security:
Your Privacy is Protected.

Local Storage Only: All data stored locally on your device,
No Server Communication: Tracker Blocker never sends your data to external servers,
No Logging: Your browsing history is not recorded or analyzed,
Open Source Ready: Code is transparent and auditable.

# Security Practices:
✓ Manifest V3 compliance (latest security standard)
✓ Content Security Policy (CSP) compliance
✓ No unsafe eval() or dynamic code execution
✓ Input validation for all user entries
✓ XSS protection measures
✓ CSRF token handling where applicable

Usage Guide
Main Dashboard (Popup):

Statistics Cards:
Total Blocked: Lifetime count of blocked tracker requests,
Today Blocked: Tracker requests blocked since midnight,
Displays if site is whitelisted/blacklisted,
Quick whitelist/remove buttons,
Click Settings for detailed analytics

Action Buttons:
Settings: Open detailed settings and analytics page,
Reset Statistics: Clear all statistics (confirmation required),
Settings Page

Whitelist Tab:
Add domains where tracking protection should be disabled,
Useful for your own websites or trusted services,
Shows date added for each domain

Blacklist Tab:
Add custom tracking domains to block,
Rules apply immediately,
Supports any domain format

Analytics Tab:
View comprehensive statistics,
Top 20 most blocked trackers with counts,
Total and unique tracker information,
Refresh automatically every 5 seconds

Import/Export Tab:
Export statistics as JSON,
Export/Import whitelist and blacklist,
Clear all data option (warning: irreversible)

About Tab:
Extension version information,
Feature overview,
List of blocked tracker domains,
Privacy policy and permissions info

UI/UX Features:

Popup Interface:

Mini Dashboard: Shows key statistics at a glance,
Real-time Updates: Statistics refresh every 2 seconds,
Smooth Animations: Professional transitions and effects,
Dark Mode: Easy on the eyes, cybersecurity aesthetic

Settings Interface:

Tab Navigation: Organized sections for different settings,
Sidebar Menu: Quick access to different sections,
Responsive Layout: Works on all screen sizes,
Form Validation: Errors clearly communicated,
Notification System: Toast notifications for all actions

Performance:
Memory Optimization,
Efficient storage structure,
Automatic cleanup of old data,
Limits on history per tracker (last 100 instances),
Minimal background process overhead,
Blocks tracking requests before they reach servers,
<1ms per request processing,
No noticeable impact on browsing speed,
Optimized for thousands of tracker entries

Update/Maintenance:
Updating Tracker List.
The extension automatically loads trackers from `trackers.json` on startup. To update:
Modify `trackers.json` with new domains
Reload extension in `chrome://extensions`
New rules take effect immediately
Backing Up Data
```bash
# Use the Settings page to export:
# 1. Statistics export
# 2. Whitelist export
# 3. Blacklist export
```

🐛 Troubleshooting:

Icons Not Appearing
Problem: Extension icon missing or grayed out
Solution:
```bash
python3 generate_icons.py
# Then reload extension
```

Blocking Not Working
Problem: Trackers still loading despite extension
Possible Causes:
Extension not properly loaded (check `chrome://extensions`)
Domain not in tracker list (can add to blacklist)
Site is whitelisted (check Settings → Whitelist)
Solution:
Verify extension is enabled
Check domain isn't whitelisted
Add to blacklist manually if needed

High Memory Usage
Problem: Extension using too much memory
Solution:
Go to Settings → Import/Export
Click "Clear All Data"
Reload extension
Statistics Not Updating
Problem: Dashboard shows old data
Solution:
Close popup and reopen
Check Settings → Analytics
May need to refresh the website

# Browser Compatibility
- Chrome, Edge, Brave, Opera, Vivaldi (Chromium, Manifest V3): supported.
- Firefox: not supported as-is. Firefox still uses background scripts rather than a service worker and lacks getMatchedRules, so statistics will not work. Blocking is partially supported only.
- Safari: requires conversion with Xcode (xcrun safari-web-extension-converter) and has limited declarativeNetRequest support. Not tested.

# Firefox Support
The extension is designed to be easily portable to Firefox:

Modify `manifest.json` for Firefox format
Update `background.js` for WebExtensions API
Test privacy features for Firefox
Submit to Firefox Add-ons store

Example Use Cases:

Use Case 1: Privacy-Conscious User
Maria wants to protect her privacy while browsing. She installs Tracker Blocker and can see 50+ trackers blocked per website. Her personal data stays private.

Use Case 2: Website Developer
John runs a website and wants to see how much tracking occurs. He adds his domain to whitelist so tracking on his site isn't blocked, allowing him to develop responsibly.

Use Case 3: Corporate Deployment
A company installs Tracker Blocker on all employee computers to prevent corporate espionage through browser tracking.

---

# Version 1.3: Filter lists

Privacy Shield now ships about **213,000 network rules** generated from public filter lists, in four categories you can toggle in the popup:

| Category | Rulesets | Rules | Source |
|---|---|---|---|
| Core | `rules.json` | 107 | Hand-curated tracker domains |
| Advertising | `ads_1`, `ads_2` | 48,517 | EasyList |
| Trackers | `privacy_1`, `privacy_2` | 54,090 | EasyPrivacy, uBO privacy |
| Malware and badware | `badware_1` to `badware_4` | 110,398 | uBO badware, URLhaus |

## Rebuilding the rulesets

```bash
python3 tools/build_rules.py <easylist.txt> --out-prefix rulesets/ads --start-id 1
python3 tools/build_rules.py <easyprivacy.txt> <uBO privacy.txt> --out-prefix rulesets/privacy --start-id 100001
python3 tools/build_rules.py <badware.txt> <urlhaus.txt> --out-prefix rulesets/badware --start-id 200001 --no-main-frame
```

The converter prints an accepted count and a skip count by reason. Skipped filters are cosmetic rules, regular expressions, `$popup`, `$redirect`, `$removeparam`, and other options that Declarative Net Request cannot express.

## What the conversion does and does not cover

- Supported: domain anchors, separators, wildcards, `@@` exceptions, resource-type options, `third-party`, `domain=` (as initiator conditions), and `$important`.
- Not supported: cosmetic hiding (needs content scripts), scriptlets, response modification, `$popup`, and regular expressions. These account for most of what makes uBlock Origin stronger than this extension.
- `--no-main-frame` on the malware set means whole pages are not blocked, so sites do not break. Malicious subresources are still blocked.

## Known limits

- Rulesets are loaded by Chrome on every browser start. Combined size is about 60 MB uncompressed. Use `chrome.declarativeNetRequest.getAvailableStaticRuleCount()` to check headroom on your browser before relying on all categories.
- Statistics are attributed to the list domain or path that matched. Matches in the same polling window that fall outside the 200 entry log are still counted.
- Statistics update at most every 30 seconds in packed builds.
- This is still a DNR-based blocker. It does not replace uBlock Origin for cosmetic filtering.
