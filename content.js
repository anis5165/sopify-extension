// Global flag to control whether the extension is capturing snapshots.
let extensionEnabled = true;

// Listen for messages to toggle the extension state.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "setExtensionState") {
    extensionEnabled = msg.enabled;
    sendResponse({ status: "ok" });
  }
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
        // Use the device pixel ratio to adjust coordinates if needed.
        const dpr = window.devicePixelRatio || 1;
        const sx = Math.max(cropRect.x * dpr, 0);
        const sy = Math.max(cropRect.y * dpr, 0);
        const sWidth = cropRect.width * dpr;
        const sHeight = cropRect.height * dpr;
        
        // Create a canvas to draw the cropped image.
        const canvas = document.createElement("canvas");
        canvas.width = sWidth;
        canvas.height = sHeight;
        const ctx = canvas.getContext("2d");
        // Draw the specified region from the full screenshot.
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
        const croppedData = canvas.toDataURL("image/png");
        storeScreenshot(description, croppedData);
      };
      img.src = response.imgData;
    }
  });
}

// Function to compute the union of the selection's rectangles, add margin, and capture the cropped region.
function highlightSelectionAndCapture() {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();
  
  // Compute the union of all client rects.
  let unionRect = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
  for (let rect of rects) {
    unionRect.left = Math.min(unionRect.left, rect.left);
    unionRect.top = Math.min(unionRect.top, rect.top);
    unionRect.right = Math.max(unionRect.right, rect.right);
    unionRect.bottom = Math.max(unionRect.bottom, rect.bottom);
  }
  
  // Define a margin (in CSS pixels) around the selected area.
  const margin = 20;
  let cropX = unionRect.left - margin;
  let cropY = unionRect.top - margin;
  let cropWidth = (unionRect.right - unionRect.left) + 2 * margin;
  let cropHeight = (unionRect.bottom - unionRect.top) + 2 * margin;
  
  // OPTIONAL: Create temporary overlays to highlight the selected area.
  let overlays = [];
  for (let rect of rects) {
    let overlay = document.createElement("div");
    // For overlays, adjust with window.scrollX/Y since they are added to the document.
    overlay.style.position = "absolute";
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.backgroundColor = "rgba(255, 255, 0, 0.4)"; // semi-transparent yellow
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "9999";
    document.body.appendChild(overlay);
    overlays.push(overlay);
  }
  
  // Wait briefly for overlays (if any) to render before capturing.
  setTimeout(() => {
    captureCroppedSnapshot({ x: cropX, y: cropY, width: cropWidth, height: cropHeight }, "Text selection cropped snapshot");
    overlays.forEach(overlay => overlay.remove());
  }, 100); // 100ms delay; adjust if needed
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
