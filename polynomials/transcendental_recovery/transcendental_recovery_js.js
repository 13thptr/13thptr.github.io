// Main JavaScript for transcendental recovery

let searchWorker = null;
let searchResults = [];
let searchStopped = false;
let currentSearchParams = null;

// Initialize the page
function initializePage() {
    // Generate transcendental dropdown
    generateTranscendentalSelect('transcendental-select', true);
    
    // Set up event listeners
    document.getElementById('transcendental-value-input').addEventListener('input', updateAutoBounds);
    document.getElementById('transcendental-result-input').addEventListener('input', updateAutoBounds);
    document.getElementById('transcendental-select').addEventListener('change', onTranscendentalSelectChange);
    document.getElementById('max-coeff-input').addEventListener('input', updateAutoBounds);
    
    // Initialize transcendental info and select first option
    const selectElement = document.getElementById('transcendental-select');
    if (selectElement.options.length > 0) {
        selectElement.selectedIndex = 0;
        onTranscendentalSelectChange(); // This will populate the input and update bounds
    }
}

// Handle transcendental select change
function onTranscendentalSelectChange() {
    const selectedKey = document.getElementById('transcendental-select').value;
    const transcendentalValue = getTranscendentalValue(selectedKey);
    
    if (transcendentalValue) {
        document.getElementById('transcendental-value-input').value = transcendentalValue;
        updateTranscendentalSelectInfo();
        updateAutoBounds(); // Trigger bounds update immediately
    }
}

// Update transcendental select info
function updateTranscendentalSelectInfo() {
    updateTranscendentalInfo('transcendental-select', 'transcendental-info', 50);
}

// Update automatic bounds display
function updateAutoBounds() {
    const transcendentalValue = document.getElementById('transcendental-value-input').value;
    const resultValue = document.getElementById('transcendental-result-input').value;
    const info = document.getElementById('auto-bounds-info');
    
    if (!transcendentalValue) {
        info.textContent = 'Select a transcendental number or enter a custom value';
        info.className = 'status waiting';
        return;
    }
    
    try {
        const value = parseFloat(transcendentalValue);
        if (isNaN(value) || value <= 0) {
            info.textContent = 'Invalid transcendental value';
            info.className = 'status error';
            return;
        }
        
        if (resultValue) {
            const result = parseFloat(resultValue);
            if (!isNaN(result)) {
                const automaticBound = Math.floor(result);
                const userBound = parseInt(document.getElementById('max-coeff-input').value);
                if (automaticBound > 0 && automaticBound < userBound) {
                    info.innerHTML = `<strong>Automatic bound:</strong> For any polynomial with non-negative integer coefficients, each coefficient ≤ ⌊P(x)⌋ = ⌊${result}⌋ = ${automaticBound}. This is tighter than your bound of ${userBound}.`;
                    info.className = 'status ready';
                } else {
                    info.textContent = `Automatic bound: ${automaticBound > 0 ? automaticBound : 'Not applicable'} (using your bound of ${userBound})`;
                    info.className = 'status ready';
                }
            } else {
                info.textContent = 'Invalid evaluation result';
                info.className = 'status error';
            }
        } else {
            info.innerHTML = `<strong>Transcendental value:</strong> ${value.toString().substring(0, 25)}...<br>Enter P(transcendental) to see automatic coefficient bounds`;
            info.className = 'status waiting';
        }
    } catch (e) {
        info.textContent = 'Error parsing transcendental value';
        info.className = 'status error';
    }
}

// Start the search
function startSearch() {
    const transcendentalResult = document.getElementById('transcendental-result-input').value;
    const transcendentalValueStr = document.getElementById('transcendental-value-input').value;
    const transcendentalValue = parseFloat(transcendentalValueStr);
    const maxDegree = parseInt(document.getElementById('max-degree-input').value);
    const maxCoeff = parseInt(document.getElementById('max-coeff-input').value);
    const precision = parseInt(document.getElementById('precision-digits-input').value);
    
    // Debug logging
    console.log('Search parameters:');
    console.log('- Transcendental value string:', transcendentalValueStr);
    console.log('- Transcendental value parsed:', transcendentalValue);
    console.log('- Target result:', transcendentalResult);
    console.log('- Max degree:', maxDegree);
    console.log('- Max coeff:', maxCoeff);
    console.log('- Precision:', precision);
    
    // Better validation with specific error messages
    if (!transcendentalResult || transcendentalResult.trim() === '') {
        alert('Please enter the evaluation result P(transcendental)');
        return;
    }
    
    if (isNaN(parseFloat(transcendentalResult))) {
        alert('P(transcendental) must be a number. If you entered "x", please evaluate your polynomial at the transcendental number first using the polynomial evaluator.');
        return;
    }
    
    if (isNaN(transcendentalValue)) {
        alert('Please enter a valid transcendental number. Current value: ' + transcendentalValueStr);
        return;
    }
    
    if (isNaN(maxDegree) || maxDegree < 0) {
        alert('Please enter a valid maximum degree (≥ 0)');
        return;
    }
    
    if (isNaN(maxCoeff) || maxCoeff < 1) {
        alert('Please enter a valid maximum coefficient (≥ 1)');
        return;
    }
    
    if (isNaN(precision) || precision < 1) {
        alert('Please enter a valid precision (≥ 1)');
        return;
    }
    
    // Apply automatic bounds if applicable
    let effectiveMaxCoeff = maxCoeff;
    const result = parseFloat(transcendentalResult);
    if (!isNaN(result)) {
        const automaticBound = Math.floor(result);
        if (automaticBound > 0 && automaticBound < maxCoeff) {
            effectiveMaxCoeff = automaticBound;
            console.log('Applied automatic bound:', automaticBound);
        }
    }
    
    searchStopped = false;
    searchResults = [];
    
    currentSearchParams = {
        transcendentalValue,
        targetResult: transcendentalResult,
        maxDegree,
        maxCoeff: effectiveMaxCoeff,
        precision
    };
    
    console.log('Final search params:', currentSearchParams);
    
    // Create and start worker
    searchWorker = createSearchWorker();
    searchWorker.postMessage({
        type: 'start',
        params: currentSearchParams
    });
    
    // Set up UI
    document.getElementById('search-progress-section').style.display = 'block';
    document.getElementById('start-search-btn').disabled = true;
    document.getElementById('stop-search-btn').disabled = false;
    document.getElementById('continue-search-btn').disabled = true;
    document.getElementById('candidates-list').innerHTML = '';
    document.getElementById('uniqueness-info').innerHTML = '';
    
    // Handle worker messages
    searchWorker.onmessage = handleWorkerMessage;
}

// Stop the search
function stopSearch() {
    if (searchWorker) {
        searchWorker.postMessage({ type: 'stop' });
    }
}

// Continue the search with higher degree
function continueSearch() {
    if (!currentSearchParams || searchResults.length === 0) {
        alert('No previous search to continue');
        return;
    }
    
    const newMaxDegree = parseInt(document.getElementById('max-degree-input').value);
    if (newMaxDegree <= currentSearchParams.maxDegree) {
        alert('Please increase the maximum degree to continue searching');
        return;
    }
    
    currentSearchParams.maxDegree = newMaxDegree;
    searchStopped = false;
    
    // Create and start worker with updated parameters
    searchWorker = createSearchWorker();
    searchWorker.postMessage({
        type: 'start',
        params: currentSearchParams
    });
    
    // Update UI
    document.getElementById('start-search-btn').disabled = true;
    document.getElementById('stop-search-btn').disabled = false;
    document.getElementById('continue-search-btn').disabled = true;
    
    // Handle worker messages
    searchWorker.onmessage = handleWorkerMessage;
}

// Handle worker messages
function handleWorkerMessage(e) {
    const { type, ...data } = e.data;
    
    switch (type) {
        case 'debug':
            console.log('Worker debug:', data.message);
            break;
            
        case 'degree-start':
            document.getElementById('current-degree').textContent = data.degree;
            document.getElementById('search-status').textContent = `Searching degree ${data.degree}...`;
            document.getElementById('progress-bar').style.width = '0%';
            document.getElementById('degree-progress').textContent = '0';
            break;
            
        case 'progress':
            document.getElementById('progress-bar').style.width = `${data.progress}%`;
            document.getElementById('degree-progress').textContent = Math.round(data.progress);
            document.getElementById('search-status').textContent = 
                `Degree ${data.degree}: ${data.candidatesFound} candidates found, ${data.totalChecked} checked`;
            break;
            
        case 'candidate-found':
            searchResults.push(data.candidate);
            updateCandidatesList();
            break;
            
        case 'degree-complete':
            document.getElementById('progress-bar').style.width = '100%';
            document.getElementById('degree-progress').textContent = '100';
            break;
            
        case 'search-complete':
            document.getElementById('search-status').textContent = 
                `Search complete! ${data.candidates.length} candidates found, ${data.totalChecked} polynomials checked`;
            document.getElementById('start-search-btn').disabled = false;
            document.getElementById('stop-search-btn').disabled = true;
            document.getElementById('continue-search-btn').disabled = true;
            searchWorker.terminate();
            searchWorker = null;
            updateUniquenessInfo();
            break;
            
        case 'search-stopped':
            document.getElementById('search-status').textContent = 'Search stopped by user';
            document.getElementById('start-search-btn').disabled = false;
            document.getElementById('stop-search-btn').disabled = true;
            document.getElementById('continue-search-btn').disabled = searchResults.length === 0;
            searchStopped = true;
            updateUniquenessInfo();
            break;
    }
}

// Update the candidates list display
function updateCandidatesList() {
    const candidatesList = document.getElementById('candidates-list');
    
    if (searchResults.length === 0) {
        candidatesList.innerHTML = '<p>No candidates found yet...</p>';
        return;
    }
    
    let html = `<p><strong>${searchResults.length} candidate(s) found:</strong></p>`;
    
    searchResults.forEach((candidate, index) => {
        const { coefficients, degree, evaluationResult } = candidate;
        const coeffStr = coefficients.join(',');
        const polyStr = formatPolynomial(coefficients);
        
        html += `
            <div class="candidate-item">
                <h4>Candidate ${index + 1} (Degree ${degree})</h4>
                <p><strong>Coefficients:</strong> [${coeffStr}]</p>
                <p><strong>Polynomial:</strong> ${polyStr}</p>
                <p><strong>Evaluation:</strong> ${evaluationResult}</p>
                <button onclick="copyCoefficients('${coeffStr}')" class="copy-btn">Copy Coefficients</button>
            </div>
        `;
    });
    
    candidatesList.innerHTML = html;
}

// Update uniqueness information
function updateUniquenessInfo() {
    const uniquenessInfo = document.getElementById('uniqueness-info');
    
    if (searchResults.length === 0) {
        uniquenessInfo.innerHTML = '<div class="alert alert-error">No matching polynomials found. Try lowering precision or loosening search bounds.</div>';
    } else if (searchResults.length === 1) {
        uniquenessInfo.innerHTML = `
            <div class="alert alert-success">
                <strong>Unique solution found!</strong> With ${currentSearchParams.precision} digits of precision, 
                exactly one polynomial matches the given evaluation.
            </div>
        `;
    } else {
        const warning = searchStopped ? 
            'Search was stopped. There may be more candidates at higher degrees.' : 
            'Multiple candidates found. This suggests the precision may be insufficient to distinguish between different polynomials.';
        
        uniquenessInfo.innerHTML = `
            <div class="alert alert-warning">
                <strong>Multiple candidates found (${searchResults.length}).</strong> ${warning}
                <br><br>
                <strong>Suggestions:</strong>
                <ul>
                    <li>Increase precision to distinguish between candidates</li>
                    <li>Use a different transcendental number</li>
                    <li>Continue search to higher degrees</li>
                </ul>
            </div>
        `;
    }
}

// Initialize when page loads
window.addEventListener('load', initializePage);