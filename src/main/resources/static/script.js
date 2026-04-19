const dropZone = document.getElementById('drop-zone');

if (dropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
    });

    dropZone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    checkFiles(files);
}

function checkFiles(files) {
    if (files.length != 1) {
        alert("Please upload exactly one file.")
        return;
    }

    const fileSize = files[0].size / 1024 / 1024;
    if (fileSize > 10) {
        alert("File too large (max. 10MB)");
        return;
    }

    document.getElementById("answerPart").classList.remove("hidden");
    
    const file = files[0];

    if (file) {
        document.getElementById("preview").src = URL.createObjectURL(files[0])
    }

    document.getElementById("loadingPart").style.display = "block";
    document.getElementById("resultsPart").style.display = "none";

    const formData = new FormData();
    formData.append("image", file);

    fetch('/analyze', {
        method: 'POST',
        body: formData
    }).then(
        response => {
            response.text().then(function (text) {
                try {
                    const jsonData = JSON.parse(text);
                    document.getElementById("loadingPart").style.display = "none";
                    document.getElementById("resultsPart").style.display = "block";
                    displayResults(jsonData);
                } catch (e) {
                    document.getElementById("loadingPart").style.display = "none";
                    alert("Error processing the response.");
                }
            });
        }
    ).catch(
        error => {
            document.getElementById("loadingPart").style.display = "none";
            alert("Error uploading file: " + error);
        }
    );
}

function displayResults(jsonData) {
    let classifications = [];
    
    if (Array.isArray(jsonData)) {
        classifications = jsonData.map(item => ({
            className: item.className || item.class || item.name,
            probability: parseFloat(item.probability || 0)
        }));
    } else if (jsonData.classes && Array.isArray(jsonData.classes)) {
        classifications = jsonData.classes.map(item => ({
            className: item.className || item.class || item.name,
            probability: parseFloat(item.probability || 0)
        }));
    } else if (typeof jsonData === 'object') {
        for (const [key, value] of Object.entries(jsonData)) {
            if (key !== 'classes' && typeof value === 'number') {
                classifications.push({
                    className: key,
                    probability: parseFloat(value)
                });
            }
        }
    }
    
    classifications.sort((a, b) => b.probability - a.probability);
    
    let classificationHTML = "";
    classifications.forEach((item, index) => {
        const label = item.className || "Unknown";
        const probability = parseFloat(item.probability);
        const percentage = (probability * 100).toFixed(2);
        const isTop = index === 0;
        
        classificationHTML += `
            <div class="classification-item ${isTop ? 'top-result' : ''}">
                <div class="classification-header">
                    <div class="classification-label">
                        ${isTop ? '⭐ ' : ''}${label}
                    </div>
                    <div class="classification-percentage">${percentage}%</div>
                </div>
                <div class="progress">
                    <div class="progress-bar" role="progressbar" 
                         style="width: 0%" 
                         data-width="${percentage}%"></div>
                </div>
            </div>
        `;
    });
    
    const listElement = document.getElementById("classificationList");
    listElement.innerHTML = classificationHTML;

    setTimeout(() => {
        const bars = listElement.querySelectorAll('.progress-bar');
        bars.forEach(bar => {
            bar.style.width = bar.getAttribute('data-width');
        });
    }, 100);
}
