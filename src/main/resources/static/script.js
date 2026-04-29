document.querySelectorAll(".drop-zone__input").forEach((inputElement) => {
    const dropZoneElement = inputElement.closest(".drop-zone");

    dropZoneElement.addEventListener("click", (e) => {
        inputElement.click();
    });

    inputElement.addEventListener("change", (e) => {
        if (inputElement.files.length) {
            updateThumbnail(dropZoneElement, inputElement.files[0]);
        }
    });

    dropZoneElement.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZoneElement.classList.add("drop-zone--over");
    });

    ["dragleave", "dragend"].forEach((type) => {
        dropZoneElement.addEventListener(type, (e) => {
            dropZoneElement.classList.remove("drop-zone--over");
        });
    });

    dropZoneElement.addEventListener("drop", (e) => {
        e.preventDefault();

        if (e.dataTransfer.files.length) {
            inputElement.files = e.dataTransfer.files;
            updateThumbnail(dropZoneElement, e.dataTransfer.files[0]);
            checkFiles(e.dataTransfer.files);
        }

        dropZoneElement.classList.remove("drop-zone--over");
    });
});

/**
 * Updates the thumbnail on a drop zone element.
 *
 * @param {HTMLElement} dropZoneElement
 * @param {File} file
 */
function updateThumbnail(dropZoneElement, file) {
    let thumbnailElement = dropZoneElement.querySelector(".drop-zone__thumb");

    // First time - remove the prompt
    if (dropZoneElement.querySelector(".drop-zone__prompt")) {
        dropZoneElement.querySelector(".drop-zone__prompt").remove();
    }

    // First time - there is no thumbnail element, so lets create it
    if (!thumbnailElement) {
        thumbnailElement = document.createElement("div");
        thumbnailElement.classList.add("drop-zone__thumb");
        dropZoneElement.appendChild(thumbnailElement);
    }

    thumbnailElement.dataset.label = file.name;

    // Show thumbnail for image files
    if (file.type.startsWith("image/")) {
        const reader = new FileReader();

        reader.readAsDataURL(file);
        reader.onload = () => {
            thumbnailElement.style.backgroundImage = `url('${reader.result}')`;
        };
    } else {
        thumbnailElement.style.backgroundImage = null;
    }
}

function checkFiles(files) {
    console.log(files);

    if (files.length != 1) {
        alert("Please upload exactly one file.")
        return;
    }

    const fileSize = files[0].size / 1024 / 1024; // in MiB
    if (fileSize > 10) {
        alert("File too large (max. 10MB)");
        return;
    }

    // Show the answer part
    document.getElementById("answerPart").classList.remove("hidden");
    
    const file = files[0];

    // Preview
    if (file) {
        document.getElementById("preview").src = URL.createObjectURL(files[0])
    }

    // Show loading indicator
    document.getElementById("loadingPart").style.display = "block";
    document.getElementById("resultsPart").style.display = "none";

    // Upload
    const formData = new FormData();
    for (const name in files) {
        formData.append("image", files[name]);
    }

    fetch('/analyze', {
        method: 'POST',
        headers: {
        },
        body: formData
    }).then(
        response => {
            console.log("Response:", response)
            response.text().then(function (text) {
                console.log("Raw response text:", text);
                try {
                    // Parse JSON response
                    const jsonData = JSON.parse(text);
                    console.log("Parsed JSON:", jsonData);
                    
                    // Hide loading indicator
                    document.getElementById("loadingPart").style.display = "none";
                    document.getElementById("resultsPart").style.display = "block";
                    
                    // Display results
                    displayResults(jsonData);
                } catch (e) {
                    console.error("Error parsing JSON:", e);
                    console.error("Response text was:", text);
                    document.getElementById("loadingPart").style.display = "none";
                    alert("Error processing the response: " + e.message);
                }
            });

        }
    ).then(
        success => console.log(success)
    ).catch(
        error => {
            console.log("Fetch error:", error);
            document.getElementById("loadingPart").style.display = "none";
            alert("Error uploading file: " + error);
        }
    );
}

function displayResults(jsonData) {
    console.log("displayResults called with:", jsonData);
    
    let classifications = [];
    
    // DJL Classifications format: {"class": "ClassName", "probability": 0.95}
    // or array format: [{"className": "Boots", "probability": 0.95}, ...]
    
    if (Array.isArray(jsonData)) {
        // If it's an array
        classifications = jsonData.map(item => ({
            className: item.className || item.class || item.name,
            probability: parseFloat(item.probability || 0)
        }));
    } else if (jsonData.classes && Array.isArray(jsonData.classes)) {
        // If it has a "classes" array property
        classifications = jsonData.classes.map(item => ({
            className: item.className || item.class || item.name,
            probability: parseFloat(item.probability || 0)
        }));
    } else if (typeof jsonData === 'object') {
        // If it's a direct object with class names as keys
        for (const [key, value] of Object.entries(jsonData)) {
            if (key !== 'classes' && typeof value === 'number') {
                classifications.push({
                    className: key,
                    probability: parseFloat(value)
                });
            }
        }
    }
    
    console.log("Extracted classifications:", classifications);
    
    // Sort by probability descending
    classifications.sort((a, b) => b.probability - a.probability);
    
    // Display top result
    if (classifications.length > 0) {
        const topResult = classifications[0];
        const topLabel = topResult.className || "Unknown";
        const topProb = (parseFloat(topResult.probability) * 100).toFixed(1);
        
        console.log("Top result:", topLabel, topProb + "%");
        
        document.getElementById("topLabel").textContent = topLabel;
        document.getElementById("topPercentage").textContent = topProb + "%";
        document.getElementById("topResult").style.display = "flex";
    }
    
    // Display all classifications
    let classificationHTML = "";
    classifications.forEach((item, index) => {
        const label = item.className || "Unknown";
        const probability = parseFloat(item.probability);
        const percentage = (probability * 100).toFixed(1);
        
        // Skip the top result from the list
        if (index === 0) return;
        
        classificationHTML += `
            <div class="classification-item">
                <div class="classification-label">${label}</div>
                <div class="classification-bar">
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: ${percentage}%"></div>
                    </div>
                </div>
                <div class="classification-percentage">${percentage}%</div>
            </div>
        `;
    });
    
    document.getElementById("classificationList").innerHTML = classificationHTML;
    console.log("Results displayed");
}
