// main.js - Main application controller
class PolynomialRecoveryApp {
    constructor() {
        this.worker = null;
        this.isSearching = false;
        this.startTime = null;
        this.timerInterval = null;
        this.matches = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupDefaultValues();
    }

    initializeElements() {
        // Input elements
        this.liouvilleInput = document.getElementById('liouville-evaluation');
        this.precisionInput = document.getElementById('precision');
        this.epsilonInput = document.getElementById('epsilon');
        this.strategyInputs = document.querySelectorAll('input[name="strategy"]');
        this.maxDegreeInput = document.getElementById('max-degree');
        this.maxCoeffInput = document.getElementById('max-coeff');
        this.batchSizeInput = document.getElementById('batch-size');
        
        // Control buttons
        this.startBtn = document.getElementById('start-search');
        this.stopBtn = document.getElementById('stop-search');
        this.clearBtn = document.getElementById('clear-results');
        
        // Progress elements
        this.progressFill = document.getElementById('progress-fill');
        this.progressPercentage = document.getElementById('progress-percentage');
        this.progressInfo = document.getElementById('progress-info');
        this.currentDegree = document.getElementById('current-degree');
        this.polynomialsTested = document.getElementById('polynomials-tested');
        this.timeElapsed = document.getElementById('time-elapsed');
        this.testRate = document.getElementById('test-rate');
        
        // Results
        this.resultsContainer = document.getElementById('results-container');
        
        // Strategy options
        this.boundedOptions = document.getElementById('bounded-options');
        this.infiniteOptions = document.getElementById('infinite-options');
        
        // Add optimization stats display
        this.optimizationStats = document.createElement('div');
        this.optimizationStats.className = 'optimization-stats';
        this.optimizationStats.style.display = 'none';
        document.querySelector('.progress-section').appendChild(this.optimizationStats);
    }

    setupEventListeners() {
        this.startBtn.addEventListener('click', () => this.startSearch());
        this.stopBtn.addEventListener('click', () => this.stopSearch());
        this.clearBtn.addEventListener('click', () => this.clearResults());
        
        this.strategyInputs.forEach(input => {
            input.addEventListener('change', () => this.toggleStrategyOptions());
        });
        
        // Real-time epsilon validation
        this.epsilonInput.addEventListener('input', () => this.validateEpsilon());
    }

    setupDefaultValues() {
        // Set default Liouville evaluation (approximate)
        const defaultLiouville = "0.11000100000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000100";
        this.liouvilleInput.value = defaultLiouville;
        
        this.toggleStrategyOptions();
    }

    toggleStrategyOptions() {
        const strategy = document.querySelector('input[name="strategy"]:checked').value;
        
        if (strategy === 'bounded') {
            this.boundedOptions.style.display = 'block';
            this.infiniteOptions.style.display = 'none';
        } else {
            this.boundedOptions.style.display = 'none';
            this.infiniteOptions.style.display = 'block';
        }
    }

    validateEpsilon() {
        const epsilon = parseFloat(this.epsilonInput.value);
        const precision = parseInt(this.precisionInput.value);
        
        if (epsilon > 0) {
            const digitsToCompare = Math.floor(-Math.log10(epsilon));
            const info = `Will compare ${digitsToCompare} decimal digits`;
            
            // Show validation info
            let infoElement = document.getElementById('epsilon-info');
            if (!infoElement) {
                infoElement = document.createElement('small');
                infoElement.id = 'epsilon-info';
                infoElement.style.color = '#2b6cb0';
                this.epsilonInput.parentNode.appendChild(infoElement);
            }
            infoElement.textContent = info;
        }
    }

    getConfiguration() {
        const strategy = document.querySelector('input[name="strategy"]:checked').value;
        
        const config = {
            targetValue: this.liouvilleInput.value.trim(),
            precision: parseInt(this.precisionInput.value),
            epsilon: parseFloat(this.epsilonInput.value),
            strategy: strategy
        };
        
        if (strategy === 'bounded') {
            config.maxDegree = parseInt(this.maxDegreeInput.value);
            config.maxCoeff = parseInt(this.maxCoeffInput.value);
        } else {
            config.batchSize = parseInt(this.batchSizeInput.value);
        }
        
        return config;
    }

    validateConfiguration(config) {
        const errors = [];
        
        if (!config.targetValue) {
            errors.push('Liouville evaluation is required');
        }
        
        if (config.precision < 10 || config.precision > 200) {
            errors.push('Precision must be between 10 and 200 digits');
        }
        
        if (config.epsilon <= 0) {
            errors.push('Epsilon must be positive');
        }
        
        if (config.strategy === 'bounded') {
            if (config.maxDegree < 0) errors.push('Max degree must be non-negative');
            if (config.maxCoeff < 1) errors.push('Max coefficient must be at least 1');
        } else {
            if (config.batchSize < 1) errors.push('Batch size must be at least 1');
        }
        
        return errors;
    }

    startSearch() {
        if (this.isSearching) return;
        
        const config = this.getConfiguration();
        const errors = this.validateConfiguration(config);
        
        if (errors.length > 0) {
            alert('Configuration errors:\n' + errors.join('\n'));
            return;
        }
        
        this.isSearching = true;
        this.startTime = Date.now();
        this.matches = [];
        
        // Update UI
        this.startBtn.disabled = true;
        this.stopBtn.disabled = false;
        this.progressInfo.textContent = 'Initializing search...';
        this.progressFill.style.width = '0%';
        this.progressPercentage.textContent = '0%';
        
        // Start timer
        this.startTimer();
        
        // Create and start worker
        const workerBlob = new Blob([this.getWorkerCode()], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(workerBlob));
        
        this.worker.onmessage = (e) => this.handleWorkerMessage(e);
        this.worker.onerror = (e) => this.handleWorkerError(e);
        
        this.worker.postMessage({ type: 'start', data: config });
    }

    getWorkerCode() {
        // Fallback worker code if script loading fails
        return `
            importScripts('https://cdnjs.cloudflare.com/ajax/libs/decimal.js/10.4.3/decimal.min.js');
            
            class PolynomialSearcher {
                constructor(config) {
                    this.config = config;
                    this.targetValue = new Decimal(config.targetValue);
                    this.precision = config.precision;
                    this.epsilon = new Decimal(config.epsilon);
                    this.liouvilleNumber = this.generateLiouvilleNumber();
                    this.isRunning = false;
                    this.polynomialsTested = 0;
                    this.startTime = Date.now();
                    
                    Decimal.precision = this.precision;
                }

                generateLiouvilleNumber() {
                    let liouville = new Decimal(0);
                    const factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];
                    
                    for (let i = 1; i < factorials.length && factorials[i] <= this.precision; i++) {
                        liouville = liouville.plus(new Decimal(10).pow(-factorials[i]));
                    }
                    
                    return liouville;
                }

                evaluatePolynomial(coefficients, x) {
                    if (coefficients.length === 0) return new Decimal(0);
                    
                    let result = new Decimal(coefficients[coefficients.length - 1]);
                    for (let i = coefficients.length - 2; i >= 0; i--) {
                        result = result.times(x).plus(coefficients[i]);
                    }
                    return result;
                }

                isClose(a, b) {
                    return a.minus(b).abs().lessThan(this.epsilon);
                }

                // Calculate evaluation bounds for given degree and max coefficient
                getEvaluationBounds(degree, maxCoeff) {
                    // Lower bound: only leading coefficient = 1, rest = 0
                    const minCoeffs = new Array(degree + 1).fill(0);
                    minCoeffs[degree] = 1;
                    const minEval = this.evaluatePolynomial(minCoeffs, this.liouvilleNumber);
                    
                    // Upper bound: all coefficients = maxCoeff
                    const maxEval = this.evaluatePolynomial(Array(degree + 1).fill(maxCoeff), this.liouvilleNumber);
                    
                    return { minEval, maxEval };
                }

                // Estimate required max coefficient for a given degree to reach target
                estimateRequiredMaxCoeff(degree, target) {
                    // For polynomial sum = target, estimate max coefficient needed
                    // Upper bound formula: target ≈ maxCoeff * (1 + L + L² + ... + L^degree)
                    // Geometric series sum: (1 - L^(degree+1)) / (1 - L)
                    
                    const L = this.liouvilleNumber;
                    const geometricSum = (new Decimal(1).minus(L.pow(degree + 1))).div(new Decimal(1).minus(L));
                    const estimatedMaxCoeff = target.div(geometricSum);
                    
                    return Math.max(1, Math.ceil(estimatedMaxCoeff.toNumber()));
                }

                // Check if a (degree, maxCoeff) combination can possibly reach target
                canReachTarget(degree, maxCoeff) {
                    const bounds = this.getEvaluationBounds(degree, maxCoeff);
                    
                    // Target must be within [minEval - epsilon, maxEval + epsilon]
                    const targetMin = this.targetValue.minus(this.epsilon);
                    const targetMax = this.targetValue.plus(this.epsilon);
                    
                    return bounds.maxEval.greaterThanOrEqualTo(targetMin) && 
                           bounds.minEval.lessThanOrEqualTo(targetMax);
                }

                *generateCoefficients(degree, maxCoeff) {
                    const coefficients = new Array(degree + 1).fill(0);
                    coefficients[degree] = 1;
                    
                    function* generate(index) {
                        if (index < 0) {
                            yield [...coefficients];
                            return;
                        }
                        
                        const start = index === degree ? 1 : 0;
                        const end = index === degree ? maxCoeff : maxCoeff;
                        
                        for (let i = start; i <= end; i++) {
                            coefficients[index] = i;
                            yield* generate(index - 1);
                        }
                    }
                    
                    yield* generate(degree);
                }

                *boundedSearch() {
                    const { maxDegree, maxCoeff } = this.config;
                    let tested = 0;
                    let skippedRegions = 0;
                    
                    // Calculate total polynomials for progress tracking (approximate)
                    let totalPolynomials = 0;
                    for (let degree = 0; degree <= maxDegree; degree++) {
                        for (let coeff = 1; coeff <= maxCoeff; coeff++) {
                            if (this.canReachTarget(degree, coeff)) {
                                totalPolynomials += Math.pow(coeff, degree) * coeff;
                            }
                        }
                    }
                    
                    for (let degree = 0; degree <= maxDegree; degree++) {
                        let currentMaxCoeff = 1;
                        
                        while (currentMaxCoeff <= maxCoeff) {
                            // Check if this (degree, currentMaxCoeff) region can reach target
                            if (!this.canReachTarget(degree, currentMaxCoeff)) {
                                // Skip this region - try higher maxCoeff
                                const requiredMaxCoeff = this.estimateRequiredMaxCoeff(degree, this.targetValue);
                                const jumpTo = Math.min(maxCoeff, Math.max(currentMaxCoeff + 1, requiredMaxCoeff));
                                
                                skippedRegions++;
                                
                                if (tested % 1000 === 0) {
                                    self.postMessage({
                                        type: 'optimization',
                                        data: {
                                            message: \`Skipped region: degree=\${degree}, maxCoeff=\${currentMaxCoeff}. Jumping to \${jumpTo}\`,
                                            skippedRegions
                                        }
                                    });
                                }
                                
                                currentMaxCoeff = jumpTo;
                                continue;
                            }
                            
                            // Search in this valid region
                            for (const coefficients of this.generateCoefficients(degree, currentMaxCoeff)) {
                                if (!this.isRunning) return;
                                
                                const evaluation = this.evaluatePolynomial(coefficients, this.liouvilleNumber);
                                tested++;
                                this.polynomialsTested = tested;
                                
                                if (tested % 100 === 0) {
                                    self.postMessage({
                                        type: 'progress',
                                        data: {
                                            degree,
                                            tested,
                                            total: totalPolynomials,
                                            percentage: totalPolynomials > 0 ? (tested / totalPolynomials) * 100 : 0,
                                            currentMaxCoeff,
                                            skippedRegions
                                        }
                                    });
                                }
                                
                                if (this.isClose(evaluation, this.targetValue)) {
                                    yield {
                                        coefficients: [...coefficients],
                                        degree,
                                        evaluation: evaluation.toString(),
                                        tested,
                                        optimizationStats: { skippedRegions }
                                    };
                                }
                            }
                            
                            currentMaxCoeff++;
                        }
                    }
                    
                    // Report final optimization stats
                    self.postMessage({
                        type: 'optimization',
                        data: {
                            message: \`Search completed. Skipped \${skippedRegions} impossible regions\`,
                            skippedRegions,
                            totalTested: tested
                        }
                    });
                }

                *infiniteSearch() {
                    const { batchSize } = this.config;
                    let degree = 0;
                    let tested = 0;
                    let maxCoeff = 1;
                    let skippedRegions = 0;
                    
                    while (this.isRunning) {
                        // Check if current (degree, maxCoeff) can reach target
                        if (!this.canReachTarget(degree, maxCoeff)) {
                            skippedRegions++;
                            
                            if (tested % 1000 === 0) {
                                self.postMessage({
                                    type: 'optimization',
                                    data: {
                                        message: \`Skipped: degree=\${degree}, maxCoeff=\${maxCoeff}\`,
                                        skippedRegions
                                    }
                                });
                            }
                            
                            // Move to next region in zig-zag pattern
                            degree++;
                            if (degree > maxCoeff) {
                                degree = 0;
                                maxCoeff++;
                            }
                            continue;
                        }
                        
                        let batchCount = 0;
                        
                        for (const coefficients of this.generateCoefficients(degree, maxCoeff)) {
                            if (!this.isRunning) return;
                            
                            const evaluation = this.evaluatePolynomial(coefficients, this.liouvilleNumber);
                            tested++;
                            this.polynomialsTested = tested;
                            batchCount++;
                            
                            if (tested % 100 === 0) {
                                self.postMessage({
                                    type: 'progress',
                                    data: {
                                        degree,
                                        tested,
                                        total: null,
                                        percentage: null,
                                        currentMaxCoeff: maxCoeff,
                                        skippedRegions
                                    }
                                });
                            }
                            
                            if (this.isClose(evaluation, this.targetValue)) {
                                yield {
                                    coefficients: [...coefficients],
                                    degree,
                                    evaluation: evaluation.toString(),
                                    tested,
                                    optimizationStats: { skippedRegions }
                                };
                            }
                            
                            if (batchCount >= batchSize) {
                                break;
                            }
                        }
                        
                        degree++;
                        if (degree > maxCoeff) {
                            degree = 0;
                            maxCoeff++;
                        }
                    }
                }

                async start() {
                    this.isRunning = true;
                    this.startTime = Date.now();
                    
                    const searchGenerator = this.config.strategy === 'bounded' 
                        ? this.boundedSearch() 
                        : this.infiniteSearch();
                    
                    try {
                        for (const result of searchGenerator) {
                            if (!this.isRunning) break;
                            
                            self.postMessage({
                                type: 'match',
                                data: result
                            });
                        }
                        
                        if (this.isRunning) {
                            self.postMessage({
                                type: 'complete',
                                data: {
                                    tested: this.polynomialsTested,
                                    timeElapsed: Date.now() - this.startTime
                                }
                            });
                        }
                    } catch (error) {
                        self.postMessage({
                            type: 'error',
                            data: { message: error.message }
                        });
                    }
                }

                stop() {
                    this.isRunning = false;
                }
            }

            let searcher = null;

            self.onmessage = function(e) {
                const { type, data } = e.data;
                
                switch (type) {
                    case 'start':
                        searcher = new PolynomialSearcher(data);
                        searcher.start();
                        break;
                        
                    case 'stop':
                        if (searcher) {
                            searcher.stop();
                        }
                        break;
                        
                    case 'ping':
                        self.postMessage({ type: 'pong' });
                        break;
                }
            };
        `;
    }

    handleWorkerMessage(e) {
        const { type, data } = e.data;
        
        switch (type) {
            case 'progress':
                this.updateProgress(data);
                break;
                
            case 'match':
                this.addMatch(data);
                break;
                
            case 'complete':
                this.handleSearchComplete(data);
                break;
                
            case 'error':
                this.handleSearchError(data);
                break;
                
            case 'optimization':
                this.handleOptimizationMessage(data);
                break;
        }
    }

    handleWorkerError(e) {
        console.error('Worker error:', e);
        this.handleSearchError({ message: 'Worker error: ' + e.message });
    }

    updateProgress(data) {
        this.currentDegree.textContent = data.degree;
        this.polynomialsTested.textContent = data.tested.toLocaleString();
        
        // Get current maxCoeff for display
        const currentMaxCoeff = data.currentMaxCoeff || 'calculating...';
        
        if (data.total) {
            // Bounded search
            this.progressFill.style.width = `${data.percentage}%`;
            this.progressPercentage.textContent = `${data.percentage.toFixed(1)}%`;
            this.progressInfo.textContent = `Testing degree ${data.degree}, maxCoeff ${currentMaxCoeff}`;
        } else {
            // Infinite search
            this.progressFill.style.width = '100%';
            this.progressFill.style.background = 'linear-gradient(90deg, #667eea, #764ba2)';
            this.progressFill.classList.add('loading');
            this.progressPercentage.textContent = '∞';
            this.progressInfo.textContent = `Infinite search - degree ${data.degree}, maxCoeff ${currentMaxCoeff}`;
        }
        
        // Update test rate
        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = data.tested / elapsed;
        this.testRate.textContent = `${rate.toFixed(1)} poly/s`;
        
        // Show optimization stats if available
        if (data.skippedRegions !== undefined) {
            this.optimizationStats.style.display = 'block';
            this.optimizationStats.innerHTML = `
                <h4>Optimization Stats</h4>
                <p>Skipped impossible regions: <strong>${data.skippedRegions.toLocaleString()}</strong></p>
            `;
        }
    }

    addMatch(data) {
        this.matches.push(data);
        
        // Remove "no results" message
        const noResults = this.resultsContainer.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }
        
        // Create result element
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        
        const polynomial = this.formatPolynomial(data.coefficients);
        
        resultDiv.innerHTML = `
            <div class="result-polynomial">${polynomial}</div>
            <div class="result-details">
                <div><strong>Degree:</strong> ${data.degree}</div>
                <div><strong>Coefficients:</strong> [${data.coefficients.join(', ')}]</div>
                <div><strong>Evaluation:</strong> ${data.evaluation.substring(0, 50)}...</div>
                <div><strong>Found at:</strong> ${data.tested.toLocaleString()} tests</div>
            </div>
        `;
        
        this.resultsContainer.appendChild(resultDiv);
        
        // Scroll to the new result
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    handleOptimizationMessage(data) {
        console.log('Optimization:', data.message);
        
        // Update optimization stats display
        if (data.skippedRegions !== undefined) {
            this.optimizationStats.style.display = 'block';
            this.optimizationStats.innerHTML = `
                <h4>Search Optimization</h4>
                <p><strong>${data.skippedRegions.toLocaleString()}</strong> impossible regions skipped</p>
                <p class="optimization-message">${data.message}</p>
            `;
        }
    }

    formatPolynomial(coefficients) {
        const terms = [];
        
        for (let i = coefficients.length - 1; i >= 0; i--) {
            const coeff = coefficients[i];
            if (coeff === 0) continue;
            
            let term = '';
            
            // Coefficient
            if (i === coefficients.length - 1) {
                // Leading coefficient
                term += coeff === 1 ? '' : coeff.toString();
            } else {
                // Other coefficients
                if (coeff === 1) {
                    term += terms.length > 0 ? ' + ' : '';
                } else {
                    term += (terms.length > 0 ? ' + ' : '') + coeff.toString();
                }
            }
            
            // Variable part
            if (i > 1) {
                term += `x^${i}`;
            } else if (i === 1) {
                term += 'x';
            }
            
            terms.push(term);
        }
        
        return terms.length > 0 ? terms.join('') : '0';
    }

    handleSearchComplete(data) {
        this.stopSearch();
        this.progressInfo.textContent = `Search completed - ${data.tested.toLocaleString()} polynomials tested`;
        
        if (this.matches.length === 0) {
            this.resultsContainer.innerHTML = '<p class="no-results">No matching polynomials found. Try adjusting the epsilon value or search parameters.</p>';
        }
    }

    handleSearchError(data) {
        this.stopSearch();
        this.progressInfo.textContent = `Error: ${data.message}`;
        console.error('Search error:', data);
        alert('Search error: ' + data.message);
    }

    stopSearch() {
        this.isSearching = false;
        
        if (this.worker) {
            this.worker.postMessage({ type: 'stop' });
            this.worker.terminate();
            this.worker = null;
        }
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Update UI
        this.startBtn.disabled = false;
        this.stopBtn.disabled = true;
        this.progressFill.classList.remove('loading');
    }

    clearResults() {
        this.matches = [];
        this.resultsContainer.innerHTML = '<p class="no-results">No results yet. Configure parameters and start the search.</p>';
        
        // Reset progress
        this.progressFill.style.width = '0%';
        this.progressPercentage.textContent = '0%';
        this.progressInfo.textContent = 'Ready to start';
        this.currentDegree.textContent = '-';
        this.polynomialsTested.textContent = '0';
        this.timeElapsed.textContent = '0s';
        this.testRate.textContent = '0 poly/s';
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                this.timeElapsed.textContent = this.formatTime(elapsed);
            }
        }, 1000);
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PolynomialRecoveryApp();
});