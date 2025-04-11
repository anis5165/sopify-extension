document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const clearBtn = document.getElementById('clearBtn');
    const screenshotsDiv = document.getElementById('screenshots');

    function updateScreenshots() {
        chrome.storage.local.get(['screenshots'], function(result) {
            screenshotsDiv.innerHTML = '';
            const screenshots = result.screenshots || [];
            screenshots.reverse().forEach(screenshot => {
                const container = document.createElement('div');
                container.className = 'screenshot-container';
                
                const img = document.createElement('img');
                img.src = screenshot.imgData;
                img.alt = 'Screenshot';
                
                const timestamp = document.createElement('div');
                timestamp.className = 'timestamp';
                timestamp.textContent = new Date(screenshot.timestamp).toLocaleString();
                
                container.appendChild(img);
                container.appendChild(timestamp);
                screenshotsDiv.appendChild(container);
            });
        });
    }

    startBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ 
            action: 'toggleRecording', 
            enabled: true 
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            }
        });
    });

    stopBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ 
            action: 'toggleRecording', 
            enabled: false 
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
            }
        });
    });

    clearBtn.addEventListener('click', () => {
        chrome.storage.local.set({ screenshots: [] }, updateScreenshots);
    });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.screenshots) {
            updateScreenshots();
        }
    });

    // Initial load
    updateScreenshots();
});