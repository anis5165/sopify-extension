// Global flag to control whether the extension is capturing snapshots.
let extensionEnabled = true;

// Flag to control whether the extension is recording screenshots.
let isRecording = false;

// Listen for messages to toggle the extension state.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "setExtensionState") {
    extensionEnabled = msg.enabled;
    sendResponse({ status: "ok" });
  }
  if (msg.action === "recordingStateChanged") {
    isRecording = msg.enabled;
    sendResponse({ success: true });
  }
  return true;
});

// Helper function to store a screenshot in chrome.storage.
function storeScreenshot(description, imgData) {
  chrome.storage.local.get("screenshots", (result) => {
    let screenshots = result.screenshots || [];
    const screenshot = {
      timestamp: Date.now(),
      description: description,
      imgData: imgData
    };
    screenshots.push(screenshot);
    chrome.storage.local.set({ screenshots: screenshots }, () => {
      console.log("Screenshot stored in chrome.storage.");
    });
  });
}

// Function to capture a full-viewport snapshot.
function captureSnapshot(description) {
  chrome.runtime.sendMessage({ action: "takeSnapshot" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error taking snapshot:", chrome.runtime.lastError);
      return;
    }
    if (response && response.imgData) {
      console.log("Snapshot captured for:", description);
      storeScreenshot(description, response.imgData);
    } else {
      console.warn("No image data received for snapshot.");
    }
  });
}

// Function to capture a cropped snapshot based on a specified region.
function captureCroppedSnapshot(cropRect, description) {
  chrome.runtime.sendMessage({ action: "takeSnapshot" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("Error taking snapshot:", chrome.runtime.lastError);
      return;
    }
    if (response && response.imgData) {
      const img = new Image();
      img.onload = function() {
        const dpr = window.devicePixelRatio || 1;
        const sx = Math.max(cropRect.x * dpr, 0);
        const sy = Math.max(cropRect.y * dpr, 0);
        const sWidth = cropRect.width * dpr;
        const sHeight = cropRect.height * dpr;

        const canvas = document.createElement("canvas");
        canvas.width = sWidth;
        canvas.height = sHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        const croppedData = canvas.toDataURL("image/png");
        storeScreenshot(description, croppedData);
      };
      img.src = response.imgData;
    }
  });
}

// Capture a full snapshot on every click.
document.addEventListener("click", () => {
  if (extensionEnabled) {
    captureSnapshot("Click snapshot");
  }
});

// Capture a cropped snapshot when text is selected.
document.addEventListener("mouseup", () => {
  if (extensionEnabled && window.getSelection().toString().trim().length > 0) {
    highlightSelectionAndCapture();
  }
});

// Function to compute the union of the selection's rectangles, add margin, and capture the cropped region.
function highlightSelectionAndCapture() {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();

  let unionRect = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (let rect of rects) {
    unionRect.left = Math.min(unionRect.left, rect.left);
    unionRect.top = Math.min(unionRect.top, rect.top);
    unionRect.right = Math.max(unionRect.right, rect.right);
    unionRect.bottom = Math.max(unionRect.bottom, rect.bottom);
  }

  const margin = 20;
  let cropX = unionRect.left - margin;
  let cropY = unionRect.top - margin;
  let cropWidth = (unionRect.right - unionRect.left) + 2 * margin;
  let cropHeight = (unionRect.bottom - unionRect.top) + 2 * margin;

  let overlays = [];
  for (let rect of rects) {
    let overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundColor = "rgba(255, 255, 0, 0.4)";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "9999";
    document.body.appendChild(overlay);
    overlays.push(overlay);
  }

  setTimeout(() => {
    captureCroppedSnapshot({ x: cropX, y: cropY, width: cropWidth, height: cropHeight }, "Text selection cropped snapshot");
    overlays.forEach(overlay => overlay.remove());
  }, 100);
}

// ---------- Typing detection and snapshot ----------
function getBoundingClientRectOfElement(element) {
  const rect = element.getBoundingClientRect();
  const margin = 20; // Optional: add some padding around the element
  return {
    x: rect.left - margin,
    y: rect.top - margin,
    width: rect.width + margin * 2,
    height: rect.height + margin * 2
  };
}

function monitorTyping() {
  document.addEventListener('input', (event) => {
    if (!extensionEnabled) return;

    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable
    ) {
      const cropRect = getBoundingClientRectOfElement(target);
      captureCroppedSnapshot(cropRect, "Typing area snapshot");
    }
  });
}

// Initialize typing monitor
monitorTyping();

// Function to capture and send screenshot to background script.
function captureAndSendScreenshot() {
  if (!isRecording) return;

  chrome.runtime.sendMessage({
    action: "captureScreenshot",
    url: window.location.href
  });
}

// Add event listeners for user interactions.
document.addEventListener('click', captureAndSendScreenshot);
document.addEventListener('input', captureAndSendScreenshot);
