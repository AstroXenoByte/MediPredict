// static/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize any global functionality
    console.log('Health Prediction Dashboard initialized');
});

// static/js/eye-prediction.js
document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('drop-area');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('file-preview');
    const previewImage = document.getElementById('preview-image');
    const removeButton = document.getElementById('remove-file');
    const uploadForm = document.getElementById('eye-upload-form');
    const predictButton = document.getElementById('predict-btn');
    const resultsSection = document.getElementById('eye-results');
    const newAnalysisButton = document.getElementById('new-eye-analysis');
    
    let selectedFile = null;

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropArea.classList.add('highlight');
    }

    function unhighlight() {
        dropArea.classList.remove('highlight');
    }

    // Handle dropped files
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    fileInput.addEventListener('change', function() {
        handleFiles(this.files);
    });

    function handleFiles(files) {
        if (files.length) {
            selectedFile = files[0];
            
            if (!selectedFile.type.match('image.*')) {
                alert('Please select an image file (png, jpg, jpeg)');
                return;
            }
            
            previewFile(selectedFile);
            predictButton.disabled = false;
        }
    }

    function previewFile(file) {
        // Create a preview of the selected file
        const reader = new FileReader();
        
        reader.onloadend = function() {
            // First, send the image for preview processing
            fetch('/api/image-preview', {
                method: 'POST',
                body: createFormDataWithFile(file)
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error:', data.error);
                    return;
                }
                
                // Set the preview image
                previewImage.src = data.preview;
                dropArea.classList.add('hidden');
                previewContainer.classList.remove('hidden');
            })
            .catch(error => {
                console.error('Error:', error);
            });
        };
        
        reader.readAsDataURL(file);
    }

    function createFormDataWithFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        return formData;
    }

    removeButton.addEventListener('click', function() {
        // Reset the file input
        fileInput.value = '';
        selectedFile = null;
        
        // Hide preview and show drop area
        previewContainer.classList.add('hidden');
        dropArea.classList.remove('hidden');
        
        // Disable predict button
        predictButton.disabled = true;
    });

    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!selectedFile) {
            alert('Please select an image file');
            return;
        }
        
        // Create loading state
        predictButton.disabled = true;
        predictButton.textContent = 'Analyzing...';
        
        // Submit form data to the server
        const formData = createFormDataWithFile(selectedFile);
        
        fetch('/api/predict-eye', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
                predictButton.disabled = false;
                predictButton.textContent = 'Analyze Eye Image';
                return;
            }
            
            // Process and display results
            displayEyeResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
            
            predictButton.disabled = false;
            predictButton.textContent = 'Analyze Eye Image';
        });
    });

    function displayEyeResults(data) {
        // Update the results section with the prediction data
        document.getElementById('eye-condition').textContent = data.condition;
        
        const confidencePercent = Math.round(data.confidence * 100);
        document.getElementById('eye-confidence').style.width = confidencePercent + '%';
        document.getElementById('eye-confidence-text').textContent = confidencePercent + '% Confidence';
        
        // Generate probability bars
        const probabilitiesContainer = document.getElementById('eye-probabilities');
        probabilitiesContainer.innerHTML = '';
        
        // Sort probabilities in descending order
        const sortedProbabilities = Object.entries(data.probabilities)
            .sort((a, b) => b[1] - a[1]);
        
        sortedProbabilities.forEach(([condition, probability]) => {
            const probabilityPercent = Math.round(probability * 100);
            
            const probabilityItem = document.createElement('div');
            probabilityItem.className = 'probability-item';
            
            probabilityItem.innerHTML = `
                <div class="probability-label">
                    <span class="probability-name">${condition}</span>
                    <span class="probability-value">${probabilityPercent}%</span>
                </div>
                <div class="probability-bar">
                    <div class="probability-progress" style="width: ${probabilityPercent}%; background-color: ${getColorForProbability(probability)}"></div>
                </div>
            `;
            
            probabilitiesContainer.appendChild(probabilityItem);
        });
        
        // Show results section
        resultsSection.classList.remove('hidden');
        document.querySelector('.upload-section').classList.add('hidden');
        
        // Reset button state
        predictButton.textContent = 'Analyze Eye Image';
    }

    function getColorForProbability(probability) {
        // Return different colors based on probability value
        if (probability >= 0.7) return '#28a745'; // green for high probability
        if (probability >= 0.4) return '#ffc107'; // yellow for medium
        return '#dc3545'; // red for low
    }

    newAnalysisButton.addEventListener('click', function() {
        // Reset the form and show upload section
        fileInput.value = '';
        selectedFile = null;
        previewContainer.classList.add('hidden');
        dropArea.classList.remove('hidden');
        predictButton.disabled = true;
        resultsSection.classList.add('hidden');
        document.querySelector('.upload-section').classList.remove('hidden');
    });

    // Allow clicking on the drop area to trigger file selection
    dropArea.addEventListener('click', function() {
        fileInput.click();
    });
});

// static/js/health-prediction.js
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const healthForm = document.getElementById('health-form');
    const resultsSection = document.getElementById('health-results');
    const newAnalysisButton = document.getElementById('new-health-analysis');
    
    let activeTab = 'diabetes'; // Default active tab

    // Tab switching
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab
            activeTab = tabId;
            
            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to current button and content
            this.classList.add('active');
            document.getElementById(tabId + '-tab').classList.add('active');
        });
    });

    // Form submission
    healthForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data based on active tab
        const formData = new FormData(healthForm);
        const submitButton = healthForm.querySelector('button[type="submit"]');
        
        // Create loading state
        submitButton.disabled = true;
        submitButton.textContent = 'Generating Prediction...';
        
        // Submit form data to the server
        fetch('/api/predict-health', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error: ' + data.error);
                submitButton.disabled = false;
                submitButton.textContent = 'Generate Prediction';
                return;
            }
            
            // Process and display results
            displayHealthResults(data);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
            
            submitButton.disabled = false;
            submitButton.textContent = 'Generate Prediction';
        });
    });

    function displayHealthResults(data) {
        // Update the results section with the prediction data
        document.getElementById('health-condition').textContent = data.condition;
        
        const confidencePercent = Math.round(data.confidence * 100);
        document.getElementById('health-confidence').style.width = confidencePercent + '%';
        document.getElementById('health-confidence-text').textContent = confidencePercent + '% Confidence';
        
        // Update risk level
        const riskLevel = document.getElementById('risk-level');
        riskLevel.textContent = data.risk_level;
        
        // Add appropriate class based on risk level
        riskLevel.className = 'risk-value';
        if (data.risk_level === 'Medium') {
            riskLevel.classList.add('medium');
        } else if (data.risk_level === 'High') {
            riskLevel.classList.add('high');
        }
        
        // Generate probability bars
        const probabilitiesContainer = document.getElementById('health-probabilities');
        probabilitiesContainer.innerHTML = '';
        
        // Sort probabilities in descending order
        const sortedProbabilities = Object.entries(data.probabilities)
            .sort((a, b) => b[1] - a[1]);
        
        sortedProbabilities.forEach(([condition, probability]) => {
            const probabilityPercent = Math.round(probability * 100);
            
            const probabilityItem = document.createElement('div');
            probabilityItem.className = 'probability-item';
            
            probabilityItem.innerHTML = `
                <div class="probability-label">
                    <span class="probability-name">${condition}</span>
                    <span class="probability-value">${probabilityPercent}%</span>
                </div>
                <div class="probability-bar">
                    <div class="probability-progress" style="width: ${probabilityPercent}%; background-color: ${getColorForProbability(probability)}"></div>
                </div>
            `;
            
            probabilitiesContainer.appendChild(probabilityItem);
        });
        
        // Show results section and hide form
        resultsSection.classList.remove('hidden');
        document.querySelector('.form-section').classList.add('hidden');
        
        // Reset button state
        const submitButton = healthForm.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Generate Prediction';
    }

    function getColorForProbability(probability) {
        // Return different colors based on probability value
        if (probability >= 0.7) return '#28a745'; // green for high probability
        if (probability >= 0.4) return '#ffc107'; // yellow for medium
        return '#dc3545'; // red for low
    }

    newAnalysisButton.addEventListener('click', function() {
        // Reset the form and show form section
        healthForm.reset();
        
        // Show form and hide results
        resultsSection.classList.add('hidden');
        document.querySelector('.form-section').classList.remove('hidden');
    });
});
