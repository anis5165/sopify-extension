let isRecording = false;

// Enable side panel
chrome.runtime.onInstalled.addListener(() => {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

// Handle messages from content script and side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "toggleRecording") {
        isRecording = request.enabled;
        // Notify content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "recordingStateChanged",
                    enabled: isRecording
                });
            }
        });
        sendResponse({ success: true });
    } else if (request.action === "captureScreenshot") {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }
            
            chrome.storage.local.get(['screenshots'], (result) => {
                const screenshots = result.screenshots || [];
                screenshots.push({
                    imgData: dataUrl,
                    timestamp: Date.now(),
                    url: request.url
                });
                chrome.storage.local.set({ screenshots: screenshots });
            });
        });
    }
    return true;
});
