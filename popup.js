document.addEventListener("DOMContentLoaded", () => {
    const screenshotList = document.getElementById("screenshotList");
    const modal = document.getElementById("modal");
    const modalImg = document.getElementById("modalImg");
    const closeModal = document.querySelector(".close");
    const startBtn = document.getElementById("startExtension");
    const stopBtn = document.getElementById("stopExtension");
  
    // Function to render screenshots in the popup.
    function displayScreenshots(screenshots) {
      screenshotList.innerHTML = "";
      screenshots.forEach((screenshot) => {
        const img = document.createElement("img");
        img.src = screenshot.imgData;
        img.alt = screenshot.description;
        img.title = new Date(screenshot.timestamp).toLocaleString();
        img.addEventListener("click", () => {
          modal.style.display = "block";
          modalImg.src = screenshot.imgData;
        });
        screenshotList.appendChild(img);
      });
    }
  
    // Load screenshots from chrome.storage when the popup opens.
    chrome.storage.local.get("screenshots", (result) => {
      if (result.screenshots) {
        displayScreenshots(result.screenshots);
      }
    });
  
    // Update screenshots in real time when storage changes.
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.screenshots) {
        displayScreenshots(changes.screenshots.newValue);
      }
    });
  
    // Close the modal when the close button is clicked.
    closeModal.addEventListener("click", () => {
      modal.style.display = "none";
    });
  
    // Also close the modal if clicking outside the image.
    window.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.style.display = "none";
      }
    });
  
    // Function to send a message to the active tab's content script to set extension state.
    function setExtensionState(enabled) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "setExtensionState", enabled: enabled },
            (response) => {
              console.log("Extension state set to", enabled, response);
            }
          );
        }
      });
    }
  
    // Start button event handler.
    startBtn.addEventListener("click", () => {
      setExtensionState(true);
    });
  
    // Stop button event handler.
    stopBtn.addEventListener("click", () => {
      setExtensionState(false);
      // Clear screenshots from storage.
      chrome.storage.local.remove("screenshots", () => {
        console.log("Screenshots cleared from storage.");
        displayScreenshots([]);
      });
    });
  });
  