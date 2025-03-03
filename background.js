let recording = false;
let tabIdToRecord = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request, "Sender:", sender);

  if (request.action === "startRecording") {
    // Check if sender.tab exists before accessing its properties
    if (sender.tab && sender.tab.id) {
      recording = true;
      tabIdToRecord = sender.tab.id;
      console.log("Recording started for tab ID:", tabIdToRecord);
    } else {
      console.error("Error: Could not get tab ID from sender.");
      // Optionally send an error message back to the popup (example):
      // sendResponse({ error: "Could not get tab ID." });
    }
  } else if (request.action === "stopRecording") {
    recording = false;
    tabIdToRecord = null;
    console.log("Recording stopped.");
  }
});

// Listen for tab updates (e.g., page navigation)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === tabIdToRecord && changeInfo.status === 'complete') {
    // Re-inject content script if the page is reloaded or navigated within the same tab.
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  }
});

// Listen for when a tab is removed
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === tabIdToRecord) {
    recording = false;
    tabIdToRecord = null;
    console.log("Recording stopped because tab was closed.");
  }
});