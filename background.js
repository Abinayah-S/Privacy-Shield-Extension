// Privacy Shield v1.2 background service worker
// Changes from 1.1: alarms instead of setInterval (MV3 workers are killed when idle),
// getMatchedRules with minTimeStamp instead of a running-count delta,
// domain attribution through rule IDs (works in packed builds), no double counting,
// enabled state restored on browser startup, real CLEAR_DATA behaviour.

const STATIC_RULESET = "static_blocklist";
const POLL_ALARM = "pollMatches";
const POLL_MINUTES = 0.5; // Chrome enforces a 30 second minimum for packed extensions

let staticDomainMap = null; // ruleId -> domain, loaded from rules.json
let polling = false;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function cleanDomain(urlFilter) {
  return (urlFilter || "")
    .replace(/^\|\|/, "")
    .replace(/\^$/, "")
    .replace(/^www\./, "");
}

function freshStats() {
  return { totalBlocked: 0, todayBlocked: 0, lastResetDate: todayString(), uniqueTrackers: {} };
}

async function loadStaticMap() {
  if (staticDomainMap) return staticDomainMap;
  staticDomainMap = {};
  try {
    const res = await fetch(chrome.runtime.getURL("rules.json"));
    const rules = await res.json();
    for (const r of rules) staticDomainMap[r.id] = cleanDomain(r.condition.urlFilter);
  } catch (e) {
    console.error("Privacy Shield: could not load rules.json", e);
  }
  return staticDomainMap;
}

async function applyEnabled(enabled) {
  if (enabled) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRulesetIds: [STATIC_RULESET] });
    chrome.action.setBadgeText({ text: "" });
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: [STATIC_RULESET] });
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
  }
}

// Records blocked requests that happened since the last poll.
async function recordMatches() {
  if (polling) return;
  polling = true;
  try {
    const { enabled, stats: storedStats, trackerLog, lastPoll } =
      await chrome.storage.local.get(["enabled", "stats", "trackerLog", "lastPoll"]);
    if (enabled === false) return;

    const since = lastPoll ?? Date.now();
    const now = Date.now();

    const statics = await loadStaticMap();
    const dynamic = await chrome.declarativeNetRequest.getDynamicRules();
    const dynMap = new Map(dynamic.map(r => [r.id, {
      domain: cleanDomain(r.condition.urlFilter || (r.condition.requestDomains || [])[0]),
      type: r.action.type
    }]));

    const { rulesMatchedInfo = [] } = await chrome.declarativeNetRequest.getMatchedRules({ minTimeStamp: since });

    const stats = storedStats || freshStats();
    const log = trackerLog || [];
    if (stats.lastResetDate !== todayString()) {
      stats.todayBlocked = 0;
      stats.lastResetDate = todayString();
    }
    stats.uniqueTrackers = stats.uniqueTrackers || {};

    let added = 0;
    for (const hit of rulesMatchedInfo) {
      const id = hit.rule.ruleId;
      let domain = null;
      if (dynMap.has(id)) {
        const info = dynMap.get(id);
        if (info.type !== "block") continue; // allow rules are not blocks
        domain = info.domain;
      } else if (statics[id]) {
        domain = statics[id];
      }
      if (!domain) continue;

      added++;
      stats.uniqueTrackers[domain] = (stats.uniqueTrackers[domain] || 0) + 1;
      log.unshift({ domain, time: hit.timeStamp || now, tabId: hit.tabId });
    }

    if (log.length > 200) log.length = 200;
    stats.totalBlocked = (stats.totalBlocked || 0) + added;
    stats.todayBlocked = (stats.todayBlocked || 0) + added;

    await chrome.storage.local.set({ stats, trackerLog: log, lastPoll: now });

    if (added > 0) {
      chrome.action.setBadgeText({ text: String(stats.todayBlocked) });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
    }
  } catch (e) {
    console.error("Privacy Shield: poll failed", e);
  } finally {
    polling = false;
  }
}

async function ensureAlarm() {
  const existing = await chrome.alarms.get(POLL_ALARM);
  if (!existing) chrome.alarms.create(POLL_ALARM, { periodInMinutes: POLL_MINUTES });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POLL_ALARM) recordMatches();
});

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["enabled", "stats", "trackerLog", "whitelist", "blacklist"]);
  const defaults = {};
  if (stored.enabled === undefined) defaults.enabled = true;
  if (!stored.stats) defaults.stats = freshStats();
  if (!stored.trackerLog) defaults.trackerLog = [];
  if (!stored.whitelist) defaults.whitelist = [];
  if (!stored.blacklist) defaults.blacklist = [];
  defaults.lastPoll = Date.now();
  await chrome.storage.local.set(defaults);

  await loadStaticMap();
  await applyEnabled(defaults.enabled ?? stored.enabled);
  await ensureAlarm();
});

// The manifest enables the static ruleset on every start, so re-apply the user's choice.
chrome.runtime.onStartup.addListener(async () => {
  const { enabled } = await chrome.storage.local.get(["enabled"]);
  await loadStaticMap();
  await applyEnabled(enabled !== false);
  await ensureAlarm();
  await chrome.storage.local.set({ lastPoll: Date.now() });
});

// Service worker wake-up outside install/startup: make sure the alarm exists.
ensureAlarm();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "TOGGLE_EXTENSION") {
      await chrome.storage.local.set({ enabled: msg.enabled });
      await applyEnabled(msg.enabled);
      sendResponse({ ok: true });
    } else if (msg.type === "CLEAR_DATA") {
      const dyn = await chrome.declarativeNetRequest.getDynamicRules();
      if (dyn.length) {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: dyn.map(r => r.id) });
      }
      const { enabled } = await chrome.storage.local.get(["enabled"]);
      await chrome.storage.local.set({
        enabled: enabled !== false,
        whitelist: [],
        blacklist: [],
        stats: freshStats(),
        trackerLog: [],
        lastPoll: Date.now()
      });
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      sendResponse({ ok: true });
    } else if (msg.type === "GET_STATIC_DOMAINS") {
      const map = await loadStaticMap();
      sendResponse({ domains: [...new Set(Object.values(map))] });
    }
  })();
  return true;
});
