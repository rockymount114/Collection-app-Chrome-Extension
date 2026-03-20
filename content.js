// Runs inside the Munis tab
// Receives fill instructions from background.js

const FIELD_BILL_YEAR   = '#input-w_453';
const FIELD_BILL_NUMBER = '#input-w_455';

async function fillField(selector, value) {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Field not found: ${selector}`);
    el.click();
    el.focus();
    // Select all existing text and replace
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 3 }));
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, String(value));
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
}

async function waitForSelector(selector, timeout = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const el = document.querySelector(selector);
        if (el) return el;
        await new Promise(r => setTimeout(r, 300));
    }
    throw new Error(`Timeout waiting for ${selector}`);
}

async function fillAndSearch(billNo, billYear) {
    try {
        // Click Advanced Search if visible
        const advBtns = Array.from(document.querySelectorAll('span.tyl-button__label'));
        const advBtn  = advBtns.find(el => el.textContent.trim() === 'Advanced Search');
        if (advBtn) advBtn.click();

        // Wait for fields to appear
        await waitForSelector(FIELD_BILL_YEAR);

        await fillField(FIELD_BILL_YEAR,   billYear);
        await fillField(FIELD_BILL_NUMBER, billNo);

        // Submit
        document.querySelector(FIELD_BILL_NUMBER).dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        );

        console.log(`Munis search submitted: Bill ${billNo} Year ${billYear}`);
    } catch (err) {
        console.error('Munis fill error:', err);
    }
}

// Listen for instructions from background.js
chrome.runtime.onMessage.addListener(function(message) {
    if (message.action === 'fillAndSearch') {
        fillAndSearch(message.billNo, message.billYear);
    }
});

// Also handle the case where the page just loaded with pending search data
chrome.storage.local.get(['pendingBillNo', 'pendingBillYear'], function(data) {
    if (data.pendingBillNo && data.pendingBillYear) {
        chrome.storage.local.remove(['pendingBillNo', 'pendingBillYear']);
        fillAndSearch(data.pendingBillNo, data.pendingBillYear);
    }
});
