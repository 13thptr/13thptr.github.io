// search-visualizer.js - Real-time search space visualization
class SearchSpaceVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.hoverInfo = document.getElementById('hover-info');
        
        // Grid state
        this.regions = new Map(); // (degree,maxCoeff) -> region data
        this.currentRegion = null;
        this.matches = [];
        
        // View parameters
        this.cellSize = 40;
        this.padding = 60;
        this.maxDegree = 15;
        this.maxCoeff = 15;
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1;
        
        // Animation
        this.animationSpeed = 5;
        this.lastFrameTime = 0;
        this.pulsePhase = 0;
        
        // Colors
        this.colors = {
            background: '#ffffff',
            grid: '#e2e8f0',
            axis: '#4a5568',
            text: '#2d3748',
            completed: '#48bb78',
            current: '#667eea',
            queued: '#4299e1',
            skipped: '#a0aec0',
            match: '#f6e05e',
            impossible: '#fed7d7'
        };
        
        this.setupEventListeners();
        this.startAnimation();
        this.draw();
    }
    
    setupEventListeners() {
        // Mouse interaction
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => this.hideHoverInfo());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        
        // Controls
        document.getElementById('auto-zoom').addEventListener('change', (e) => {
            if (e.target.checked && this.currentRegion) {
                this.autoZoomToRegion(this.currentRegion.degree, this.currentRegion.maxCoeff);
            }
        });
        
        document.getElementById('animation-speed').addEventListener('input', (e) => {
            this.animationSpeed = parseInt(e.target.value);
        });
        
        document.getElementById('reset-zoom').addEventListener('click', () => {
            this.resetView();
        });
    }
    
    startAnimation() {
        const animate = (timestamp) => {
            const deltaTime = timestamp - this.lastFrameTime;
            this.lastFrameTime = timestamp;
            
            // Update pulse animation
            this.pulsePhase += deltaTime * 0.001 * this.animationSpeed;
            
            this.draw();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }
    
    updateRegion(degree, maxCoeff, status, data = {}) {
        const key = `${degree},${maxCoeff}`;
        const existing = this.regions.get(key) || {};
        
        this.regions.set(key, {
            degree,
            maxCoeff,
            status, // 'completed', 'current', 'queued', 'skipped', 'impossible'
            polynomialsTested: data.polynomialsTested || existing.polynomialsTested || 0,
            totalPolynomials: data.totalPolynomials || existing.totalPolynomials || 0,
            bounds: data.bounds || existing.bounds,
            lastUpdate: Date.now(),
            ...data
        });
        
        // Auto-zoom if enabled
        if (status === 'current' && document.getElementById('auto-zoom').checked) {
            this.autoZoomToRegion(degree, maxCoeff);
        }
    }
    
    setCurrentRegion(degree, maxCoeff) {
        // Mark previous current as completed
        if (this.currentRegion) {
            this.updateRegion(
                this.currentRegion.degree, 
                this.currentRegion.maxCoeff, 
                'completed'
            );
        }
        
        this.currentRegion = { degree, maxCoeff };
        this.updateRegion(degree, maxCoeff, 'current');
    }
    
    addMatch(degree, maxCoeff, polynomial) {
        this.matches.push({
            degree,
            maxCoeff,
            polynomial,
            timestamp: Date.now()
        });
        
        // Mark region as having a match
        this.updateRegion(degree, maxCoeff, 'match', { hasMatch: true });
    }
    
    markRegionSkipped(degree, maxCoeff, reason) {
        this.updateRegion(degree, maxCoeff, 'skipped', { skipReason: reason });
    }
    
    markRegionImpossible(degree, maxCoeff, bounds) {
        this.updateRegion(degree, maxCoeff, 'impossible', { bounds });
    }
    
    screenToGrid(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        const gridX = (canvasX - this.padding + this.offsetX) / (this.cellSize * this.zoom);
        const gridY = (this.canvas.height - canvasY - this.padding + this.offsetY) / (this.cellSize * this.zoom);
        
        return {
            degree: Math.floor(gridX),
            maxCoeff: Math.floor(gridY) + 1
        };
    }
    
    gridToScreen(degree, maxCoeff) {
        const x = this.padding + degree * this.cellSize * this.zoom - this.offsetX;
        const y = this.canvas.height - this.padding - (maxCoeff - 1) * this.cellSize * this.zoom + this.offsetY;
        
        return { x, y };
    }
    
    handleMouseMove(e) {
        const { degree, maxCoeff } = this.screenToGrid(e.clientX, e.clientY);
        
        if (degree >= 0 && maxCoeff >= 1 && degree <= this.maxDegree && maxCoeff <= this.maxCoeff) {
            this.showHoverInfo(e.clientX, e.clientY, degree, maxCoeff);
        } else {
            this.hideHoverInfo();
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom = Math.max(0.3, Math.min(3, this.zoom * zoomFactor));
    }
    
    handleClick(e) {
        const { degree, maxCoeff } = this.screenToGrid(e.clientX, e.clientY);
        console.log(`Clicked region: degree=${degree}, maxCoeff=${maxCoeff}`);
        // Could add region detail popup here
    }
    
    autoZoomToRegion(degree, maxCoeff) {
        const targetX = this.padding + degree * this.cellSize * this.zoom - this.canvas.width / 2;
        const targetY = this.canvas.height - this.padding - (maxCoeff - 1) * this.cellSize * this.zoom - this.canvas.height / 2;
        
        // Smooth animation to target
        this.animateToOffset(targetX, targetY);
    }
    
    animateToOffset(targetX, targetY) {
        const startX = this.offsetX;
        const startY = this.offsetY;
        const duration = 500; // ms
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            
            this.offsetX = startX + (targetX - startX) * easeProgress;
            this.offsetY = startY + (targetY - startY) * easeProgress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }
    
    resetView() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.zoom = 1;
    }
    
    showHoverInfo(x, y, degree, maxCoeff) {
        const key = `${degree},${maxCoeff}`;
        const region = this.regions.get(key);
        
        document.getElementById('hover-degree').textContent = degree;
        document.getElementById('hover-maxcoeff').textContent = maxCoeff;
        document.getElementById('hover-status').textContent = region ? region.status : 'not visited';
        document.getElementById('hover-count').textContent = region ? 
            `${region.polynomialsTested?.toLocaleString() || 0}` : '0';
        document.getElementById('hover-bounds').textContent = region?.bounds ? 
            `[${region.bounds.min?.toFixed(3) || 'N/A'}, ${region.bounds.max?.toFixed(3) || 'N/A'}]` : 'N/A';
        
        this.hoverInfo.style.left = `${x + 10}px`;
        this.hoverInfo.style.top = `${y - 10}px`;
        this.hoverInfo.classList.add('visible');
    }
    
    hideHoverInfo() {
        this.hoverInfo.classList.remove('visible');
    }
    
    draw() {
        const ctx = this.ctx;
        
        // Clear canvas
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw grid and regions
        this.drawGrid();
        this.drawRegions();
        this.drawAxes();
        this.drawMatches();
        this.drawTraversalPath();
    }
    
    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        
        // Vertical lines (degrees)
        for (let degree = 0; degree <= this.maxDegree; degree++) {
            const { x } = this.gridToScreen(degree, 1);
            ctx.beginPath();
            ctx.moveTo(x, this.padding);
            ctx.lineTo(x, this.canvas.height - this.padding);
            ctx.stroke();
        }
        
        // Horizontal lines (maxCoeff)
        for (let maxCoeff = 1; maxCoeff <= this.maxCoeff; maxCoeff++) {
            const { y } = this.gridToScreen(0, maxCoeff);
            ctx.beginPath();
            ctx.moveTo(this.padding, y);
            ctx.lineTo(this.canvas.width - this.padding, y);
            ctx.stroke();
        }
    }
    
    drawRegions() {
        const ctx = this.ctx;
        
        for (const [key, region] of this.regions) {
            const { x, y } = this.gridToScreen(region.degree, region.maxCoeff);
            const size = this.cellSize * this.zoom;
            
            // Skip if outside visible area
            if (x + size < 0 || x > this.canvas.width || y + size < 0 || y > this.canvas.height) {
                continue;
            }
            
            // Draw region background
            ctx.fillStyle = this.getRegionColor(region);
            ctx.fillRect(x, y, size, size);
            
            // Draw border
            ctx.strokeStyle = this.colors.grid;
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, size, size);
            
            // Draw progress indicator if testing
            if (region.status === 'current' || region.polynomialsTested > 0) {
                this.drawProgressIndicator(x, y, size, region);
            }
            
            // Draw text if cell is large enough
            if (size > 30) {
                this.drawRegionText(x, y, size, region);
            }
        }
    }
    
    getRegionColor(region) {
        const baseColors = {
            completed: this.colors.completed,
            current: this.colors.current,
            queued: this.colors.queued,
            skipped: this.colors.skipped,
            match: this.colors.match,
            impossible: this.colors.impossible
        };
        
        let color = baseColors[region.status] || '#f7fafc';
        
        // Add pulsing effect for current region
        if (region.status === 'current') {
            const pulse = 0.7 + 0.3 * Math.sin(this.pulsePhase * 2);
            color = this.adjustColorBrightness(color, pulse);
        }
        
        return color;
    }
    
    adjustColorBrightness(hex, factor) {
        // Simple brightness adjustment
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.floor((num >> 16) * factor);
        const g = Math.floor(((num >> 8) & 0x00FF) * factor);
        const b = Math.floor((num & 0x0000FF) * factor);
        
        return `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
    }
    
    drawProgressIndicator(x, y, size, region) {
        if (!region.totalPolynomials || region.totalPolynomials === 0) return;
        
        const ctx = this.ctx;
        const progress = region.polynomialsTested / region.totalPolynomials;
        const barHeight = 4;
        
        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x + 2, y + size - barHeight - 2, size - 4, barHeight);
        
        // Progress
        ctx.fillStyle = this.colors.current;
        ctx.fillRect(x + 2, y + size - barHeight - 2, (size - 4) * progress, barHeight);
    }
    
    drawRegionText(x, y, size, region) {
        const ctx = this.ctx;
        ctx.fillStyle = this.colors.text;
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        // Draw degree and maxCoeff
        ctx.fillText(`(${region.degree},${region.maxCoeff})`, centerX, centerY - 5);
        
        // Draw count if available
        if (region.polynomialsTested > 0) {
            ctx.font = '8px Arial';
            ctx.fillText(`${region.polynomialsTested}`, centerX, centerY + 8);
        }
    }
    
    drawAxes() {
        const ctx = this.ctx;
        ctx.strokeStyle = this.colors.axis;
        ctx.lineWidth = 2;
        ctx.font = '14px Arial';
        ctx.fillStyle = this.colors.text;
        ctx.textAlign = 'center';
        
        // X-axis (degree)
        ctx.beginPath();
        ctx.moveTo(this.padding, this.canvas.height - this.padding);
        ctx.lineTo(this.canvas.width - this.padding, this.canvas.height - this.padding);
        ctx.stroke();
        
        // Y-axis (maxCoeff)
        ctx.beginPath();
        ctx.moveTo(this.padding, this.padding);
        ctx.lineTo(this.padding, this.canvas.height - this.padding);
        ctx.stroke();
        
        // Labels
        ctx.fillText('Degree →', this.canvas.width / 2, this.canvas.height - 10);
        
        ctx.save();
        ctx.translate(15, this.canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Max Coefficient →', 0, 0);
        ctx.restore();
    }
    
    drawMatches() {
        const ctx = this.ctx;
        
        for (const match of this.matches) {
            const { x, y } = this.gridToScreen(match.degree, match.maxCoeff);
            const size = this.cellSize * this.zoom;
            
            // Draw sparkle effect
            const age = (Date.now() - match.timestamp) / 1000;
            if (age < 5) { // Show for 5 seconds
                const alpha = Math.max(0, 1 - age / 5);
                ctx.save();
                ctx.globalAlpha = alpha;
                
                // Star effect
                ctx.fillStyle = '#ffd700';
                ctx.beginPath();
                const centerX = x + size / 2;
                const centerY = y + size / 2;
                const sparkleSize = 8;
                
                for (let i = 0; i < 8; i++) {
                    const angle = (i * Math.PI) / 4;
                    const length = i % 2 === 0 ? sparkleSize : sparkleSize / 2;
                    const px = centerX + Math.cos(angle + this.pulsePhase) * length;
                    const py = centerY + Math.sin(angle + this.pulsePhase) * length;
                    
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                
                ctx.restore();
            }
        }
    }
    
    drawTraversalPath() {
        // Draw the diagonal traversal pattern
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(102, 126, 234, 0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        // Draw diagonal lines showing the zig-zag pattern
        for (let maxCoeff = 1; maxCoeff <= this.maxCoeff; maxCoeff++) {
            ctx.beginPath();
            for (let degree = 0; degree <= maxCoeff && degree <= this.maxDegree; degree++) {
                const { x, y } = this.gridToScreen(degree, maxCoeff);
                const centerX = x + (this.cellSize * this.zoom) / 2;
                const centerY = y + (this.cellSize * this.zoom) / 2;
                
                if (degree === 0) ctx.moveTo(centerX, centerY);
                else ctx.lineTo(centerX, centerY);
            }
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
    }
}