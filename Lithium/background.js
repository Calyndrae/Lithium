// ==========================================
// 🔋 SMART LITHIUM: Safe 4-Tier Throttling
// ==========================================

// 1. WAKE UP LOGIC (The Scalpel)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    let activeTabId = activeInfo.tabId;

    // A. Cancel all execution timers for the tab you just opened
    chrome.alarms.clear(`t1_${activeTabId}`);
    chrome.alarms.clear(`t2_${activeTabId}`);
    chrome.alarms.clear(`t3_${activeTabId}`);
    chrome.alarms.clear(`t4_${activeTabId}`);

    // B. Safely wake the tab up! (Only unhide what WE hid)
    try {
        let tab = await chrome.tabs.get(activeTabId);
        if (!tab.url.startsWith("chrome://")) {
            chrome.scripting.executeScript({
                target: { tabId: activeTabId },
                func: () => {
                    // Wake up iframes
                    document.querySelectorAll('iframe[data-lithium-sleep="true"]').forEach(i => {
                        i.style.visibility = '';
                        i.removeAttribute('data-lithium-sleep');
                    });
                    // Wake up body
                    if (document.body && document.body.hasAttribute('data-lithium-coma')) {
                        document.body.style.visibility = '';
                        document.body.removeAttribute('data-lithium-coma');
                    }
                }
            }).catch(() => {}); 
        }
    } catch (e) {}

    // C. Set new countdown timers for all OTHER tabs you just left behind
    let tabs = await chrome.tabs.query({ active: false, currentWindow: true, discarded: false });
    for (let tab of tabs) {
        if (!tab.url.startsWith("chrome://") && !tab.audible) {
            let checkAlarm = await chrome.alarms.get(`t4_${tab.id}`);
            if (!checkAlarm) {
                chrome.alarms.create(`t1_${tab.id}`, { delayInMinutes: 1 });  // Pause Media
                chrome.alarms.create(`t2_${tab.id}`, { delayInMinutes: 2 });  // Hide Iframes
                chrome.alarms.create(`t3_${tab.id}`, { delayInMinutes: 3 });  // Render Coma
                chrome.alarms.create(`t4_${tab.id}`, { delayInMinutes: 5 });  // THE GUILLOTINE (Frees RAM)
            }
        }
    }
});

// 2. THE PUNISHER: Safe Sleep Execution
chrome.alarms.onAlarm.addListener(async (alarm) => {
    let parts = alarm.name.split("_");
    let tier = parts[0];
    let tabId = parseInt(parts[1]);

    try {
        let tab = await chrome.tabs.get(tabId);
        if (tab.active || tab.discarded || tab.audible || tab.url.startsWith("chrome://")) return;

        // TIER 1: Pause Media
        if (tier === "t1") {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => document.querySelectorAll('video, audio').forEach(v => v.pause())
            }).catch(()=>{});
        }
        
        // TIER 2: Safely Hide Iframes
        else if (tier === "t2") {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    document.querySelectorAll('iframe').forEach(i => {
                        // Only hide if the website isn't already hiding it naturally
                        if (window.getComputedStyle(i).visibility !== 'hidden' && window.getComputedStyle(i).display !== 'none') {
                            i.setAttribute('data-lithium-sleep', 'true');
                            i.style.visibility = 'hidden';
                        }
                    });
                }
            }).catch(()=>{});
        }
        
        // TIER 3: Safe Render Coma
        else if (tier === "t3") {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => { 
                    if(document.body && window.getComputedStyle(document.body).visibility !== 'hidden') {
                        document.body.setAttribute('data-lithium-coma', 'true');
                        document.body.style.visibility = 'hidden';
                    }
                }
            }).catch(()=>{});
        }
        
        // TIER 4: The Guillotine
        else if (tier === "t4") {
            chrome.tabs.discard(tabId);
        }

    } catch (e) {}
});

// 3. HOUSEKEEPING
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.alarms.clear(`t1_${tabId}`);
    chrome.alarms.clear(`t2_${tabId}`);
    chrome.alarms.clear(`t3_${tabId}`);
    chrome.alarms.clear(`t4_${tabId}`);
});