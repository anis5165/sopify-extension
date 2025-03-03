let recording = false;
let screenshots = [];

console.log("Content script loaded."); // DEBUGGING: Check if content script loads

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);
    if (request.action === "startRecording") {
        recording = true;
        console.log("Content script: Recording started");
    } else if (request.action === "stopRecording") {
        recording = false;
        console.log("Content script: Recording stopped");
        sendResponse({screenshots: screenshots}); // Send screenshots back
        screenshots = []; // Clear for next recording
        return true; // Important for asynchronous responses
    } else if (request.action === "takeScreenshot") { // Added takeScreenshot action
        chrome.tabs.captureVisibleTab(null, {}, (imgData) => {
          sendResponse({ imgData: imgData });
        });
        return true; // Important for asynchronous responses
    }
});


function takeScreenshot(description = "Screenshot") {
    if (!recording) return;

    chrome.runtime.sendMessage({action: "takeScreenshot"}, (response) => {
      if (response && response.imgData) {
        screenshots.push({description: description, imgData: response.imgData});
        console.log("Screenshot taken:", description);

        // Store in localStorage (example - consider a more robust storage solution)
        chrome.storage.local.set({ "screenshots": screenshots }, () => {
          console.log("Screenshots saved to local storage.");
        });
      }
    });
}

// Listener function to capture changes
function mutationCallback(mutationsList, observer) {
    if (!recording) return;

    for(const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            console.log('A child node has been added or removed.');
            takeScreenshot("Child node change");
        } else if (mutation.type === 'attributes') {
            console.log('The ' + mutation.attributeName + ' attribute was modified.');
            takeScreenshot("Attribute change");
        } else if (mutation.type === 'characterData') {
            console.log('The character data of a node has been modified.');
            takeScreenshot("Character data change");
        }
    }
}


// ---  Event Listeners and Observers  ---

document.addEventListener("click", (event) => {
    if (recording) {
        takeScreenshot("Click on paragraph");
    }
});

document.addEventListener("mouseup", (event) => {
    if (recording) {
        if (window.getSelection().toString().length > 0) { //Something is selected
            takeScreenshot("Text selected");
        }
    }
});

// Observe the document for changes
const observer = new MutationObserver(mutationCallback);

observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true // Track text changes
});