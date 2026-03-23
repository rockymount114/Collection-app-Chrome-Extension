// Injects the extension ID into the Flask app page as a meta tag
// Waits for document.head to be available before injecting

(function injectId() {
    const id = chrome.runtime.id;

    function inject() {
        // Guard FIRST before attempting anything
        if (!document || !document.head) {
            setTimeout(inject, 20);
            return;
        }

        // Remove any previous instance
        const existing = document.querySelector('meta[name="munis-extension-id"]');
        if (existing) existing.remove();

        const meta = document.createElement('meta');
        meta.name = 'munis-extension-id';
        meta.content = id;
        document.head.appendChild(meta);
    }

    // Use document_start safe approach:
    // If document.readyState is loading, wait for DOMContentLoaded
    // If already interactive or complete, inject immediately
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inject, { once: true });
    } else {
        inject();
    }
})();