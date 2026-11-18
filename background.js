// Privacy Shield v1.3 background service worker
//
// Model:
//   - Each filter list category (core, ads, privacy, badware) is one or more DNR static rulesets.
//   - Categories are toggled independently and the master switch overrides them all.
//   - Rule IDs are unique only within a ruleset, so matches are keyed by rulesetId + ruleId.
//   - Static ruleset contents are parsed lazily, only for rulesets that actually matched,
//     to keep service worker wake-up cheap.
//   - Polling uses chrome.alarms (MV3 workers are killed when idle).

const POLL_ALARM = "pollMatches";
const POLL_MINUTES = 0.5; // 30 second floor for packed extensions
const DYNAMIC = "_dynamic";
const CATEGORY_RULESETS = {}; // filled from manifest at startup, see categoryForRuleset()

const rulesetCache = new Map(); // rulesetId -> Map(ruleId -> display domain)
let polling = false;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function cleanFilter(urlFilter) {
  return (urlFilter || "")
    .replace(/^\|\|/, "")
    .replace(/^\|/, "")
    .replace(/\^$/, "")
    .replace(/\|$/, "")
    .replace(/^www\./, "");
}

function freshStats() {
  return { totalBlocked: 0, todayBlocked: 0, lastResetDate: todayString(), uniqueTrackers: {} };
}

// Which category a manifest ruleset id belongs to: "ads_1" -> "ads", "core" -> "core"
function categoryFor(rulesetId) {
  return rulesetId.replace(/_\d+$/, "");
}

function allRulesetIds() {
  const manifest = chrome.runtime.getManifest();
  return (manifest.declarative_net_request?.rule_resources || []).map(r => r.id);
}

async function getCategories() {
  const { categories } = await chrome.storage.local.get(["categories"]);
  const defaults = { core: true, ads: true, privacy: true, badware: true };
  return { ...defaults, ...(categories || {}) };
}

async function applyState() {
  const { enabled } = await chrome.storage.local.get(["enabled"]);
  const masterOn = enabled !== false;
  const cats = await getCategories();
  const ids = allRulesetIds();
  const toEnable = [];
  const toDisable = [];
  for (const id of ids) {
    const on = masterOn && cats[categoryFor(id)] !== false;
    (on ? toEnable : toDisable).push(id);
  }
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: toEnable,
    disableRulesetIds: toDisable
  });
  if (masterOn) {
    chrome.action.setBadgeText({ text: "" });
  } else {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
  }
}

// Load a ruleset file once, keep ruleId -> domain for later attribution.
async function loadRuleset(rulesetId) {
  if (rulesetCache.has(rulesetId)) return rulesetCache.get(rulesetId);
  const map = new Map();
  try {
    const res = await fetch(chrome.runtime.getURL(findPath(rulesetId)));
    const rules = await res.json();
    for (const r of rules) map.set(r.id, cleanFilter(r.condition.urlFilter));
  } catch (e) {
    console.error("Privacy Shield: could not load ruleset", rulesetId, e);
  }
  rulesetCache.set(rulesetId, map);
  return map;
}

function findPath(rulesetId) {
  const r = chrome.runtime.getManifest().declarative_net_request.rule_resources.find(x => x.id === rulesetId);
  return r ? r.path : "";
}

// Record blocked requests since the last poll.
async function recordMatches() {
  if (polling) return;
  polling = true;
  try {
    const { enabled, stats: storedStats, trackerLog, lastPoll } =
      await chrome.storage.local.get(["enabled", "stats", "trackerLog", "lastPoll"]);
    if (enabled === false) return;

    const since = lastPoll ?? Date.now();
    const now = Date.now();

    const dynamic = await chrome.declarativeNetRequest.getDynamicRules();
    const dynMap = new Map(dynamic.map(r => [r.id, {
      domain: cleanFilter(r.condition.urlFilter || (r.condition.requestDomains || [])[0]),
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
      const rulesetId = hit.rule.rulesetId;
      const ruleId = hit.rule.ruleId;
      let domain = null;

      if (rulesetId === DYNAMIC) {
        const info = dynMap.get(ruleId);
        if (!info || info.type !== "block") continue; // allow matches are not blocks
        domain = info.domain;
      } else {
        const map = await loadRuleset(rulesetId);
        domain = map.get(ruleId);
      }
      if (!domain) continue;

      added++;
      stats.uniqueTrackers[domain] = (stats.uniqueTrackers[domain] || 0) + 1;
      log.unshift({ domain, time: hit.timeStamp || now, tabId: hit.tabId, list: categoryFor(rulesetId) });
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
  const stored = await chrome.storage.local.get(["enabled", "stats", "trackerLog", "whitelist", "blacklist", "categories"]);
  const defaults = {};
  if (stored.enabled === undefined) defaults.enabled = true;
  if (!stored.stats) defaults.stats = freshStats();
  if (!stored.trackerLog) defaults.trackerLog = [];
  if (!stored.whitelist) defaults.whitelist = [];
  if (!stored.blacklist) defaults.blacklist = [];
  if (!stored.categories) defaults.categories = { core: true, ads: true, privacy: true, badware: true };
  defaults.lastPoll = Date.now();
  await chrome.storage.local.set(defaults);
  await applyState();
  await ensureAlarm();
});

// The manifest enables every ruleset on each start, so re-apply the user's choices.
chrome.runtime.onStartup.addListener(async () => {
  await applyState();
  await ensureAlarm();
  await chrome.storage.local.set({ lastPoll: Date.now() });
});

// Service worker woke up for another reason: make sure the alarm exists and state is correct.
ensureAlarm();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === "TOGGLE_EXTENSION") {
      await chrome.storage.local.set({ enabled: msg.enabled });
      await applyState();
      sendResponse({ ok: true });
    } else if (msg.type === "SET_CATEGORY") {
      const cats = await getCategories();
      cats[msg.category] = msg.enabled;
      await chrome.storage.local.set({ categories: cats });
      await applyState();
      sendResponse({ ok: true });
    } else if (msg.type === "CLEAR_DATA") {
      const dyn = await chrome.declarativeNetRequest.getDynamicRules();
      if (dyn.length) {
        await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: dyn.map(r => r.id) });
      }
      await chrome.storage.local.set({
        whitelist: [],
        blacklist: [],
        stats: freshStats(),
        trackerLog: [],
        lastPoll: Date.now()
      });
      chrome.action.setBadgeText({ text: "" });
      chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
      sendResponse({ ok: true });
    } else if (msg.type === "GET_STATS_META") {
      const cats = await getCategories();
      const ids = allRulesetIds();
      const counts = {};
      for (const id of ids) {
        const c = categoryFor(id);
        counts[c] = (counts[c] || 0) + 1;
      }
      sendResponse({ categories: cats, rulesetCounts: counts });
    }
  })();
  return true;
});
