// ==========================================
// 🔋 LITHIUM ENGINE: Background Tab Freezer
// ==========================================

// How many minutes a tab must be ignored before it is frozen
const SUSPEND_MINUTES = 10; 

// 1. Listen for when you switch to a different tab
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    
    // You just clicked this tab, so cancel any pending freeze orders for it
    chrome.alarms.clear(`suspend_${activeInfo.tabId}`);
    
    // Find all other tabs in this window that are currently running in the background
    let tabs = await chrome.tabs.query({ active: false, currentWindow: true, discarded: false });
    
    for (let tab of tabs) {
        // If the background tab doesn't already have a countdown, start one
        let alarm = await chrome.alarms.get(`suspend_${tab.id}`);
        if (!alarm) {
            chrome.alarms.create(`suspend_${tab.id}`, { delayInMinutes: SUSPEND_MINUTES });
        }
    }
});

// 2. The Executioner: What happens when the countdown hits zero
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name.startsWith("suspend_")) {
        let tabId = parseInt(alarm.name.split("_")[1]);
        
        try {
            let tab = await chrome.tabs.get(tabId);
            
            // Safety Check: Don't freeze the tab if you are currently looking at it, 
            // if it's already frozen, or if it is actively playing music/video (!tab.audible).
            if (!tab.active && !tab.discarded && !tab.audible) {
                chrome.tabs.discard(tabId);
                console.log(`🔋 Lithium froze tab: ${tab.title}`);
            }
        } catch (e) {
            // The tab was likely closed by the user before the timer ran out
        }
    }
});

// 3. Housekeeping: If you close a tab manually, delete its countdown timer
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.alarms.clear(`suspend_${tabId}`);
});
