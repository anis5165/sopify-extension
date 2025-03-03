let recording = false;
let screenshots = [];

console.log("Content script loaded.");

// Listen for messages from the background script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Content script received message:", request);

    if (request.action === "startRecording") {
        recording = true;
        console.log("Content script: Recording started");
    } else if (request.action === "stopRecording") {
        recording = false;
        console.log("Content script: Recording stopped");
        sendResponse({ screenshots: screenshots });
        screenshots = [];
        return true;
    } else if (request.action === "takeScreenshot") {
        chrome.tabs.captureVisibleTab(null, {}, (imgData) => {
            if (chrome.runtime.lastError) {
                console.error("Error capturing tab:", chrome.runtime.lastError);
                sendResponse({ error: chrome.runtime.lastError.message }); // Send error back
            } else if (imgData) {
                sendResponse({ imgData: imgData });
            } else {
                console.warn("captureVisibleTab returned no data");
                sendResponse({ error: "captureVisibleTab returned no data" });
            }

            return true; // Ensure asynchronous response
        });
        return true;  //Important: for async response
    } else {
        console.warn("Content script received unknown message:", request);
    }
    return false; // Important: for async response
});

function takeScreenshot(description = "Screenshot") {
  if (!recording) return;

  console.log("Attempting to take screenshot:", description); // DEBUGGING

  chrome.runtime.sendMessage({ action: "takeScreenshot" }, (response) => {
      if (chrome.runtime.lastError) {
          console.error("Error during takeScreenshot message:", chrome.runtime.lastError);
          return;  // Exit if there's an error
      }
      if (response && response.imgData) {
          screenshots.push({ description: description, imgData: response.imgData });
          console.log("Screenshot taken:", description);

          chrome.storage.local.set({ "screenshots": screenshots }, () => {
              console.log("Screenshots saved to local storage.");
          });
      } else {
          console.warn("No image data received for screenshot:", description);
      }
  });
}

// Listener function to capture changes
function mutationCallback(mutationsList, observer) {
    if (!recording) return;

    for (const mutation of mutationsList) {
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

// --- Event Listeners and Observers ---

document.addEventListener("click", (event) => {
    if (recording) {
        console.log("Click event detected");  //DEBUGGING
        takeScreenshot("Click on paragraph");
    }
});

document.addEventListener("mouseup", (event) => {
    if (recording) {
        if (window.getSelection().toString().length > 0) {
            console.log("Text selected"); //DEBUGGING
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