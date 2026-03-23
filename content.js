const FIELD_BILL_YEAR   = 'tcw-text-field[data-aui-name="formonly.billyear"] input';
const FIELD_BILL_NUMBER = 'tcw-text-field[data-aui-name="formonly.billnumber"] input';

// Inject extension ID into the page so index.js can find it
const meta = document.createElement('meta');
meta.name = 'munis-extension-id';
meta.content = chrome.runtime.id;
document.head.appendChild(meta);

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function waitForSelector(selector, timeout = 60000, interval = 500) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const el = document.querySelector(selector);
        if (el) return el;
        await sleep(interval);
    }
    throw new Error(`[Munis] Timeout waiting for: ${selector}`);
}

async function clickAdvancedSearch(timeout = 60000) {
    console.log('[Munis] Waiting for Advanced Search button...');
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const allSpans = Array.from(document.querySelectorAll('span.tyl-button__label'));
        const advBtn   = allSpans.find(el => el.textContent.trim() === 'Advanced Search');
        if (advBtn) {
            advBtn.click();
            console.log('[Munis] Clicked Advanced Search');
            return true;
        }
        await sleep(500);
    }
    throw new Error('[Munis] Advanced Search button never appeared');
}

async function fillField(selector, value) {
    console.log(`[Munis] Filling ${selector} with "${value}"...`);
    const el = await waitForSelector(selector, 15000);

    // Attempt 1 — execCommand
    el.click();
    el.focus();
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 3 }));
    document.execCommand('selectAll', false, null);
    document.execCommand('insertText', false, String(value));
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(300);

    // Attempt 2 — direct value set if execCommand didn't stick
    if (el.value !== String(value)) {
        console.log(`[Munis] Trying direct value set for ${selector}...`);
        el.value = String(value);
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(300);
    }

    console.log(`[Munis] ${selector} final value: "${el.value}"`);
}

async function fillAndSearch(billNo, billYear) {
    console.log(`[Munis] fillAndSearch — BillNo: ${billNo}, BillYear: ${billYear}`);

    try {
        // Wait for SPA to boot
        console.log('[Munis] Waiting for SPA...');
        await waitForSelector('span.tyl-button__label', 60000);
        await sleep(1500);

        // Click Advanced Search
        await clickAdvancedSearch();
        await sleep(1500); // wait for form fields to render

        // Fill fields
        await fillField(FIELD_BILL_YEAR, billYear);
        await sleep(400);
        await fillField(FIELD_BILL_NUMBER, billNo);
        await sleep(400);

        // Press Enter
        const billNoEl = document.querySelector(FIELD_BILL_NUMBER);
        if (billNoEl) {
            billNoEl.focus();
            billNoEl.dispatchEvent(new KeyboardEvent('keydown',  { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
            billNoEl.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
            billNoEl.dispatchEvent(new KeyboardEvent('keyup',    { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
            console.log('[Munis] Enter key sent');
        }

        chrome.storage.local.remove(['pendingBillNo', 'pendingBillYear', 'pendingTimestamp']);
        console.log('[Munis] Done — storage cleared');

    } catch (err) {
        console.error('[Munis] fillAndSearch failed:', err.message);
    }
}

// ── Entry point 1: message from background.js (existing tab) ─────────────────
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'fillAndSearch') {
        console.log('[Munis] Message received from background');
        fillAndSearch(message.billNo, message.billYear);
        sendResponse({ success: true });
    }
    return true;
});

// ── Entry point 2: storage fallback (new tab / post-Okta redirect) ────────────
chrome.storage.local.get(
    ['pendingBillNo', 'pendingBillYear', 'pendingTimestamp'],
    function(data) {
        if (!data.pendingBillNo || !data.pendingBillYear) return;

        const age = Date.now() - (data.pendingTimestamp || 0);
        if (age > 5 * 60 * 1000) {
            chrome.storage.local.remove(['pendingBillNo', 'pendingBillYear', 'pendingTimestamp']);
            return;
        }

        console.log(`[Munis] Storage fallback — BillNo: ${data.pendingBillNo}, BillYear: ${data.pendingBillYear}`);
        fillAndSearch(data.pendingBillNo, data.pendingBillYear);
    }
);