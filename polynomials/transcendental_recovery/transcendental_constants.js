// Transcendental constants with high precision
const TRANSCENDENTAL_CONSTANTS = {
    liouville_10: '0.11000100000000000000000100000000000000000000000000000000000000000000000000000000000000000000000001',
    liouville_2: '0.11000100000000000000000100000000000000000000000000000000000000000000000000000000000000000000000001',
    pi_frac: '0.14159265358979323846264338327950288419716939937510582097494459230781640628620899862803482534211706',
    e_frac: '0.71828182845904523536028747135266249775724709369995957496696762772407663035354759457138217852516643',
    gelfond_frac: '0.66514414269022518865029567372204985358467962648080768331715880439170210077073647106840620473776'
};

// Descriptions for each transcendental constant
const TRANSCENDENTAL_DESCRIPTIONS = {
    liouville_10: 'Liouville number in base-10: 0.110001000000000000000001...',
    liouville_2: 'Liouville number in base-2: 0.110001000000000000000001...',
    pi_frac: 'π - 3 (fractional part of π)',
    e_frac: 'e - 2 (fractional part of e)',
    gelfond_frac: '2^√2 - 2 (Gelfond-Schneider constant minus 2)',
    liouville_10_plus1: '1 + Liouville (base-10)',
    liouville_2_plus1: '1 + Liouville (base-2)',
    pi_frac_plus1: 'π - 2',
    e_frac_plus1: 'e - 1',
    gelfond_frac_plus1: '2^√2 - 1'
};

// Get all transcendental constants (including +1 variants)
function getAllTranscendentals() {
    const base = { ...TRANSCENDENTAL_CONSTANTS };
    const all = { ...base };
    
    // Add +1 variants
    Object.keys(base).forEach(key => {
        const value = parseFloat(base[key]);
        all[key + '_plus1'] = (value + 1).toString();
    });
    
    return all;
}

// Get description for a transcendental constant
function getTranscendentalDescription(key) {
    return TRANSCENDENTAL_DESCRIPTIONS[key] || 'Unknown transcendental constant';
}

// Generate HTML for transcendental select dropdown
function generateTranscendentalSelect(selectId, includeGroups = true) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '';
    
    if (includeGroups) {
        // Group 1: Numbers between 0 and 1
        const group1 = document.createElement('optgroup');
        group1.label = 'Numbers between 0 and 1';
        
        const group1Options = [
            { value: 'liouville_10', text: 'Liouville number (base-10)' },
            { value: 'liouville_2', text: 'Liouville number (base-2)' },
            { value: 'pi_frac', text: 'π - 3' },
            { value: 'e_frac', text: 'e - 2' },
            { value: 'gelfond_frac', text: '2^√2 - 2' }
        ];
        
        group1Options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            group1.appendChild(option);
        });
        
        // Group 2: Numbers between 1 and 2
        const group2 = document.createElement('optgroup');
        group2.label = 'Numbers between 1 and 2';
        
        const group2Options = [
            { value: 'liouville_10_plus1', text: '1 + Liouville (base-10)' },
            { value: 'liouville_2_plus1', text: '1 + Liouville (base-2)' },
            { value: 'pi_frac_plus1', text: 'π - 2' },
            { value: 'e_frac_plus1', text: 'e - 1' },
            { value: 'gelfond_frac_plus1', text: '2^√2 - 1' }
        ];
        
        group2Options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            group2.appendChild(option);
        });
        
        select.appendChild(group1);
        select.appendChild(group2);
    } else {
        // Simple list without groups
        const allConstants = getAllTranscendentals();
        Object.keys(allConstants).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = getTranscendentalDescription(key).split(':')[0]; // Just the name part
            select.appendChild(option);
        });
    }
}

// Update transcendental info display
function updateTranscendentalInfo(selectId, infoId, precision = 50) {
    const select = document.getElementById(selectId);
    const info = document.getElementById(infoId);
    
    if (!select || !info) return;
    
    const key = select.value;
    const allConstants = getAllTranscendentals();
    const value = allConstants[key];
    
    if (value) {
        const description = getTranscendentalDescription(key);
        const displayLength = Math.min(precision + 5, 60);
        info.innerHTML = description + '<br>Value: ' + value.substring(0, displayLength) + '...';
    } else {
        info.innerHTML = 'Select a transcendental number to see its value';
    }
}

// Get transcendental value by key
function getTranscendentalValue(key) {
    const allConstants = getAllTranscendentals();
    return allConstants[key];
}