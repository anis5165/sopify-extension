let recording = false;
const startStopBtn = document.getElementById("startStopBtn");
const screenshotList = document.getElementById("screenshotList");

if (startStopBtn) {  // Check if startStopBtn exists
  startStopBtn.addEventListener("click", () => {
    console.log("Button clicked!"); // DEBUGGING: Check if button is clicked

    console.log("Before toggle: recording =", recording); // DEBUGGING: Check recording value before toggle
    recording = !recording;
    console.log("After toggle: recording =", recording);  // DEBUGGING: Check recording value after toggle

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log("chrome.tabs.query tabs:", tabs); // DEBUGGING: Check the tabs array

      if (tabs && tabs.length > 0) {
        const activeTab = tabs[0];

        if (recording) {
          console.log("Sending startRecording message"); // DEBUGGING: Check if message is sent
          chrome.runtime.sendMessage({ action: "startRecording" });
          startStopBtn.textContent = "Stop Recording";
        } else {
          chrome.runtime.sendMessage({ action: "stopRecording" }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error during stopRecording:", JSON.stringify(chrome.runtime.lastError));
            } else if (response && response.screenshots) {
              displayScreenshots(response.screenshots);
            }
          });
          startStopBtn.textContent = "Start Recording";
        }
      } else {
        console.error("No active tabs found!"); // DEBUGGING: Check if tabs are found
      }
    });
  });
} else {
    console.error("startStopBtn element not found in popup.html");
}

function displayScreenshots(screenshots) {
    screenshotList.innerHTML = "";  // Clear previous screenshots
    screenshots.forEach(shot => {
        const img = document.createElement("img");
        img.src = shot.imgData;
        img.alt = shot.description;
        img.style.maxWidth = "180px";
        img.style.maxHeight = "100px";
        screenshotList.appendChild(img);
    });
}