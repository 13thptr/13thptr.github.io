// Search worker for polynomial coefficient recovery
function createSearchWorker() {
    return new Worker('worker.js');
}