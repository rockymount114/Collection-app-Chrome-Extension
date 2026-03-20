// Listens for messages from your Flask app page (index.js)
// Opens Munis tab and tells content.js to fill the form

chrome.runtime.onMessageExternal.addListener(
    function(message, sender, sendResponse) {
        if (message.action !== 'openMunis') return;

        const billNo   = message.billNo;
        const billYear = message.billYear;
        const MUNIS_URL = 'https://munisapp.rockymountnc.gov/prod/munis/gas/app/ua/r/mugwc/arbilinq';

        // Check if Munis is already open in a tab
        chrome.tabs.query({ url: 'https://munisapp.rockymountnc.gov/*' }, function(tabs) {
            if (tabs.length > 0) {
                // Reuse existing Munis tab
                const tab = tabs[0];
                chrome.tabs.update(tab.id, { active: true });
                chrome.tabs.sendMessage(tab.id, {
                    action: 'fillAndSearch',
                    billNo,
                    billYear
                });
            } else {
                // Open a new Munis tab
                chrome.tabs.create({ url: MUNIS_URL }, function(tab) {
                    // Wait for tab to finish loading then fill the form
                    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                        if (tabId === tab.id && info.status === 'complete') {
                            chrome.tabs.onUpdated.removeListener(listener);
                            // Give Munis SPA a moment to fully render
                            setTimeout(() => {
                                chrome.tabs.sendMessage(tab.id, {
                                    action: 'fillAndSearch',
                                    billNo,
                                    billYear
                                });
                            }, 3000);
                        }
                    });
                });
            }
        });

        sendResponse({ success: true });
        return true;
    }
);
