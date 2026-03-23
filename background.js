const MUNIS_URL = 'https://munisapp.rockymountnc.gov/prod/munis/gas/app/ua/r/mugwc/arbilinq';

chrome.runtime.onMessageExternal.addListener(
    function(message, sender, sendResponse) {
        if (message.action !== 'openMunis') return;

        const billNo   = String(message.billNo);
        const billYear = String(message.billYear);

        // Store in chrome.storage so content.js can pick it up
        // even if it loads before this message arrives
        chrome.storage.local.set({ 
            pendingBillNo:   billNo, 
            pendingBillYear: billYear,
            pendingTimestamp: Date.now()
        });

        // Check if Munis is already open
        chrome.tabs.query({ url: 'https://munisapp.rockymountnc.gov/*' }, function(tabs) {
            if (tabs.length > 0) {
                // Reuse existing tab — focus it and send fill message
                const tab = tabs[0];
                chrome.tabs.update(tab.id, { active: true });
                chrome.windows.update(tab.windowId, { focused: true });

                // Send message directly — content.js is already running
                chrome.tabs.sendMessage(tab.id, {
                    action:    'fillAndSearch',
                    billNo,
                    billYear
                }, response => {
                    // Ignore errors — content.js will also check storage on load
                    if (chrome.runtime.lastError) {}
                });

            } else {
                // Open a new Munis tab
                chrome.tabs.create({ url: MUNIS_URL }, function(tab) {
                    // Listen for the tab to fully complete loading
                    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                        if (tabId !== tab.id) return;
                        if (info.status !== 'complete') return;

                        chrome.tabs.onUpdated.removeListener(listener);

                        // Wait for Munis SPA to render after page complete
                        // Uses progressive retry — content.js handles the actual waiting
                        setTimeout(() => {
                            chrome.tabs.sendMessage(tabId, {
                                action: 'fillAndSearch',
                                billNo,
                                billYear
                            }, response => {
                                if (chrome.runtime.lastError) {
                                    // content.js not ready yet — it will read from storage instead
                                }
                            });
                        }, 2000);
                    });
                });
            }
        });

        sendResponse({ success: true });
        return true;
    }
);