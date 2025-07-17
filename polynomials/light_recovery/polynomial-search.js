// polynomial-search.js - Web Worker for polynomial search
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
        
        // Set Decimal precision
        Decimal.precision = this.precision;
    }

    generateLiouvilleNumber() {
        // Generate Liouville's number: sum of 10^(-n!) for n=1 to some limit
        // L = 0.11000100000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000100...
        let liouville = new Decimal(0);
        const factorials = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];
        
        for (let i = 1; i < factorials.length && factorials[i] <= this.precision; i++) {
            liouville = liouville.plus(new Decimal(10).pow(-factorials[i]));
        }
        
        return liouville;
    }

    // Horner's method for polynomial evaluation
    evaluatePolynomial(coefficients, x) {
        if (coefficients.length === 0) return new Decimal(0);
        
        let result = new Decimal(coefficients[coefficients.length - 1]);
        for (let i = coefficients.length - 2; i >= 0; i--) {
            result = result.times(x).plus(coefficients[i]);
        }
        return result;
    }

    // Check if two decimal numbers are close enough
    isClose(a, b) {
        return a.minus(b).abs().lessThan(this.epsilon);
    }

    // Generate all coefficient combinations for a given degree and max coefficient
    *generateCoefficients(degree, maxCoeff) {
        const coefficients = new Array(degree + 1).fill(0);
        
        // Leading coefficient must be non-zero
        coefficients[degree] = 1;
        
        const self = this;
        function* generate(index) {
            if (index < 0) {
                yield [...coefficients];
                return;
            }
            
            const start = index === degree ? 1 : 0; // Leading coefficient starts from 1
            const end = index === degree ? maxCoeff : maxCoeff;
            
            for (let i = start; i <= end; i++) {
                coefficients[index] = i;
                yield* generate(index - 1);
            }
        }
        
        yield* generate(degree);
    }

    // Bounded search strategy
    *boundedSearch() {
        const { maxDegree, maxCoeff } = this.config;
        let totalPolynomials = 0;
        
        // Calculate total polynomials for progress tracking
        for (let degree = 0; degree <= maxDegree; degree++) {
            totalPolynomials += Math.pow(maxCoeff, degree) * maxCoeff;
        }
        
        let tested = 0;
        
        for (let degree = 0; degree <= maxDegree; degree++) {
            for (const coefficients of this.generateCoefficients(degree, maxCoeff)) {
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
                            percentage: (tested / totalPolynomials) * 100
                        }
                    });
                }
                
                if (this.isClose(evaluation, this.targetValue)) {
                    yield {
                        coefficients: [...coefficients],
                        degree,
                        evaluation: evaluation.toString(),
                        tested
                    };
                }
            }
        }
    }

    // Infinite enumeration strategy (zig-zag)
    *infiniteSearch() {
        const { batchSize } = this.config;
        let degree = 0;
        let tested = 0;
        let maxCoeff = 1;
        
        while (this.isRunning) {
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
                            total: null, // Infinite search
                            percentage: null
                        }
                    });
                }
                
                if (this.isClose(evaluation, this.targetValue)) {
                    yield {
                        coefficients: [...coefficients],
                        degree,
                        evaluation: evaluation.toString(),
                        tested
                    };
                }
                
                if (batchCount >= batchSize) {
                    break;
                }
            }
            
            // Zig-zag pattern: increment degree, then coefficient bound
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