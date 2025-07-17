let searchParams = null;
let shouldStop = false;

function evaluatePolynomial(coeffs, x) {
    let result = 0;
    let power = 1;
    for (let i = coeffs.length - 1; i >= 0; i--) {
        result += coeffs[i] * power;
        power *= x;
    }
    return result;
}

function matchesTarget(value, target, precision) {
    const valueStr = value.toString();
    const targetStr = target.toString();
    
    // Debug logging
    if (valueStr === targetStr) {
        self.postMessage({
            type: 'debug',
            message: "Exact match found: ${valueStr} === ${targetStr}"
        });
        return true;
    }
    
    // Find decimal points
    const valueDot = valueStr.indexOf('.');
    const targetDot = targetStr.indexOf('.');
    
    // Extract integer parts
    const valueInt = valueDot === -1 ? valueStr : valueStr.substring(0, valueDot);
    const targetInt = targetDot === -1 ? targetStr : targetStr.substring(0, targetDot);
    
    // Integer parts must match exactly
    if (valueInt !== targetInt) {
        return false;
    }
    
    // Extract decimal parts
    const valueDec = valueDot === -1 ? '' : valueStr.substring(valueDot + 1);
    const targetDec = targetDot === -1 ? '' : targetStr.substring(targetDot + 1);
    
    // Pad shorter decimal with zeros for comparison
    const maxLen = Math.max(valueDec.length, targetDec.length, precision);
    const valuePadded = valueDec.padEnd(maxLen, '0');
    const targetPadded = targetDec.padEnd(maxLen, '0');
    
    // Compare exactly 'precision' decimal digits
    for (let i = 0; i < precision; i++) {
        if (valuePadded[i] !== targetPadded[i]) {
            return false;
        }
    }
    
    // Debug successful match
    self.postMessage({
        type: 'debug',
        message: "Precision match found: ${valueStr} matches ${targetStr} to ${precision} digits"
    });
    
    return true;
}

function generatePolynomials(degree, maxCoeff) {
    const coeffs = new Array(degree + 1).fill(0);
    const totalCombinations = degree === 0 ? 
        maxCoeff + 1 : // For degree 0, coefficient can be 0 to maxCoeff
        Math.pow(maxCoeff + 1, degree) * maxCoeff; // For degree > 0, leading coeff is 1 to maxCoeff
    
    function* enumerate() {
        function* helper(pos) {
            if (pos === coeffs.length) {
                yield [...coeffs];
                return;
            }
            
            if (pos === 0 && degree > 0) {
                // Leading coefficient must be non-zero for degree > 0
                for (let i = 1; i <= maxCoeff; i++) {
                    coeffs[pos] = i;
                    yield* helper(pos + 1);
                }
            } else {
                // Other coefficients can be 0 to maxCoeff
                for (let i = 0; i <= maxCoeff; i++) {
                    coeffs[pos] = i;
                    yield* helper(pos + 1);
                }
            }
        }
        yield* helper(0);
    }
    
    return { enumerate, totalCombinations };
}

self.onmessage = function(e) {
    if (e.data.type === 'start') {
        searchParams = e.data.params;
        shouldStop = false;
        
        const { transcendentalValue, targetResult, maxDegree, maxCoeff, precision } = searchParams;
        
        let foundCandidates = [];
        let totalChecked = 0;
        
        for (let degree = 0; degree <= maxDegree && !shouldStop; degree++) {
            self.postMessage({
                type: 'degree-start',
                degree: degree
            });
            
            const { enumerate, totalCombinations } = generatePolynomials(degree, maxCoeff);
            let checkedInDegree = 0;
            
            for (const coeffs of enumerate()) {
                if (shouldStop) break;
                
                const result = evaluatePolynomial(coeffs, transcendentalValue);
                totalChecked++;
                checkedInDegree++;
                
                if (matchesTarget(result, targetResult, precision)) {
                    foundCandidates.push({
                        coefficients: [...coeffs],
                        degree: degree,
                        evaluationResult: result
                    });
                    
                    self.postMessage({
                        type: 'candidate-found',
                        candidate: {
                            coefficients: [...coeffs],
                            degree: degree,
                            evaluationResult: result
                        },
                        totalCandidates: foundCandidates.length
                    });
                }
                
                if (checkedInDegree % 1000 === 0) {
                    self.postMessage({
                        type: 'progress',
                        degree: degree,
                        progress: (checkedInDegree / totalCombinations) * 100,
                        totalChecked: totalChecked,
                        candidatesFound: foundCandidates.length
                    });
                }
            }
            
            self.postMessage({
                type: 'degree-complete',
                degree: degree,
                candidatesFound: foundCandidates.length,
                totalChecked: totalChecked
            });
        }
        
        if (!shouldStop) {
            self.postMessage({
                type: 'search-complete',
                candidates: foundCandidates,
                totalChecked: totalChecked
            });
        }
    } else if (e.data.type === 'stop') {
        shouldStop = true;
        self.postMessage({
            type: 'search-stopped'
        });
    }
};