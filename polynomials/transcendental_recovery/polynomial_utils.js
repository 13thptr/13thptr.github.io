// Polynomial utility functions

// Format polynomial coefficients as a readable string
function formatPolynomial(coeffs) {
    if (coeffs.length === 0) return '0';
    
    const degree = coeffs.length - 1;
    const terms = [];
    
    for (let i = 0; i < coeffs.length; i++) {
        const coeff = coeffs[i];
        const power = degree - i;
        
        if (coeff === 0) continue;
        
        let term = '';
        if (power === 0) {
            term = coeff.toString();
        } else if (power === 1) {
            term = coeff === 1 ? 'x' : `${coeff}x`;
        } else {
            term = coeff === 1 ? `x^${power}` : `${coeff}x^${power}`;
        }
        
        terms.push(term);
    }
    
    return terms.length === 0 ? '0' : terms.join(' + ');
}

// Display polynomial using KaTeX
function displayPolynomial(coeffs, displayElementId) {
    const display = document.getElementById(displayElementId);
    if (!display) return;
    
    const degree = coeffs.length - 1;
    let latex = '';
    
    for (let i = 0; i < coeffs.length; i++) {
        const coeff = coeffs[i];
        const power = degree - i;
        
        if (coeff === 0) continue;
        
        if (latex && coeff > 0) latex += ' + ';
        
        if (power === 0) {
            latex += coeff.toString();
        } else if (power === 1) {
            if (coeff === 1) {
                latex += 'x';
            } else {
                latex += coeff + 'x';
            }
        } else {
            if (coeff === 1) {
                latex += 'x^{' + power + '}';
            } else {
                latex += coeff + 'x^{' + power + '}';
            }
        }
    }
    
    if (latex === '') latex = '0';
    
    try {
        katex.render(latex, display);
    } catch (error) {
        display.innerHTML = '<span class="error">Error rendering polynomial: ' + error.message + '</span>';
    }
}

// Parse coefficient string (comma-separated)
function parseCoefficients(input) {
    const coeffs = input.split(',').map(c => c.trim());
    const result = [];
    
    for (const coeff of coeffs) {
        if (!/^\d+$/.test(coeff)) {
            throw new Error('All coefficients must be non-negative integers');
        }
        result.push(parseInt(coeff));
    }
    
    if (result.length === 0) {
        throw new Error('At least one coefficient is required');
    }
    
    return result;
}

// Copy text to clipboard with visual feedback
function copyToClipboard(text, buttonElement = null) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            if (buttonElement) {
                const originalText = buttonElement.textContent;
                buttonElement.textContent = 'Copied!';
                setTimeout(() => {
                    buttonElement.textContent = originalText;
                }, 2000);
            }
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (buttonElement) {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = 'Copied!';
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 2000);
        }
    }
}

// Copy coefficients from element ID
function copyCoefficientsFromElement(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.textContent;
    const button = element.nextElementSibling;
    copyToClipboard(text, button);
}

// Copy coefficients directly
function copyCoefficients(coeffStr) {
    copyToClipboard(coeffStr);
}

// Calculate automatic coefficient bounds
function calculateAutomaticBounds(transcendentalValue, targetResult) {
    if (transcendentalValue <= 1) return null;
    
    const result = parseFloat(targetResult);
    if (isNaN(result)) return null;
    
    return Math.floor(result / transcendentalValue);
}

// Format number with limited precision for display
function formatNumber(num, precision = 15) {
    const str = num.toString();
    if (str.length <= precision) return str;
    
    const dotIndex = str.indexOf('.');
    if (dotIndex === -1) return str;
    
    return str.substring(0, dotIndex + precision + 1);
}

// Evaluate polynomial at given value
function evaluatePolynomial(coeffs, x) {
    let result = 0;
    let power = 1;
    
    for (let i = coeffs.length - 1; i >= 0; i--) {
        result += coeffs[i] * power;
        power *= x;
    }
    
    return result;
}