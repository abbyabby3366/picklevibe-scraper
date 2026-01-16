// API base URL
const API_BASE = window.location.origin;

// DOM elements
const scrapeBtn = document.getElementById('scrape-btn');
const refreshStatusBtn = document.getElementById('refresh-status-btn');
const loadDataBtn = document.getElementById('load-data-btn');
const statusContainer = document.getElementById('status-container');
const lastRunEl = document.getElementById('last-run');
const messagesEl = document.getElementById('messages');
const statsSection = document.getElementById('stats-section');
const dataSection = document.getElementById('data-section');
const statsContent = document.getElementById('stats-content');
const dataContent = document.getElementById('data-content');

// Utility functions
function showMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.textContent = message;
    messagesEl.appendChild(messageEl);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        messageEl.remove();
    }, 5000);
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
}

function formatCurrency(amount) {
    return `RM ${amount.toFixed(2)}`;
}

// Status management
function updateStatus(status) {
    const statusEl = statusContainer.querySelector('.status-card');
    statusEl.className = 'status-card';

    if (status.isRunning) {
        statusEl.classList.add('status-running');
        statusEl.textContent = 'Status: Running';
        scrapeBtn.disabled = true;
        scrapeBtn.textContent = '⏳ Scraping in progress...';
    } else if (status.error) {
        statusEl.classList.add('status-error');
        statusEl.textContent = 'Status: Error';
        scrapeBtn.disabled = false;
        scrapeBtn.textContent = '🚀 Start Scraping';
    } else if (status.lastRun) {
        statusEl.classList.add('status-success');
        statusEl.textContent = 'Status: Ready';
        scrapeBtn.disabled = false;
        scrapeBtn.textContent = '🚀 Start Scraping';
    } else {
        statusEl.classList.add('status-idle');
        statusEl.textContent = 'Status: Idle';
        scrapeBtn.disabled = false;
        scrapeBtn.textContent = '🚀 Start Scraping';
    }

    lastRunEl.textContent = `Last run: ${formatDate(status.lastRun)}`;
}

// API calls
async function fetchStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        const status = await response.json();
        updateStatus(status);
        return status;
    } catch (error) {
        console.error('Failed to fetch status:', error);
        showMessage('Failed to fetch status', 'error');
    }
}

async function startScraping() {
    try {
        console.log('🚀 Start scraping button clicked!');
        console.log('API_BASE:', API_BASE);
        console.log('Full URL:', `${API_BASE}/api/scrape`);

        scrapeBtn.disabled = true;
        scrapeBtn.innerHTML = '<div class="loading"></div> Starting scrape...';
        showMessage('Initiating scraping request...', 'info');

        const response = await fetch(`${API_BASE}/api/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        const result = await response.json();
        console.log('Response result:', result);

        if (response.ok) {
            showMessage('Scraping started successfully!', 'success');
            // Refresh status after starting
            setTimeout(fetchStatus, 1000);
        } else {
            showMessage(`Scraping failed: ${result.error}`, 'error');
            scrapeBtn.disabled = false;
            scrapeBtn.textContent = '🚀 Start Scraping';
        }
    } catch (error) {
        console.error('Failed to start scraping:', error);
        showMessage(`Network error: ${error.message}`, 'error');
        scrapeBtn.disabled = false;
        scrapeBtn.textContent = '🚀 Start Scraping';
    }
}

async function loadStats() {
    try {
        statsContent.innerHTML = '<div class="loading"></div> Loading statistics...';
        statsSection.classList.add('show');

        const response = await fetch(`${API_BASE}/api/stats`);
        const result = await response.json();

        if (response.ok) {
            const stats = result.stats;
            statsContent.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalBookings}</div>
                        <div class="stat-label">Total Bookings</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatCurrency(stats.totalRevenue)}</div>
                        <div class="stat-label">Total Revenue</div>
                    </div>
                </div>
                <h3>By Organization</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Organization</th>
                            <th>Bookings</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(stats.organizations).map(([org, count]) =>
                            `<tr><td>${org}</td><td>${count}</td></tr>`
                        ).join('')}
                    </tbody>
                </table>
                <h3>By Status</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(stats.statusCounts).map(([status, count]) =>
                            `<tr><td>${status}</td><td>${count}</td></tr>`
                        ).join('')}
                    </tbody>
                </table>
            `;
        } else {
            statsContent.innerHTML = `<div class="message error">${result.error}</div>`;
        }
    } catch (error) {
        console.error('Failed to load stats:', error);
        statsContent.innerHTML = '<div class="message error">Failed to load statistics</div>';
    }
}

async function loadData() {
    try {
        dataContent.innerHTML = '<div class="loading"></div> Loading data...';
        dataSection.classList.add('show');

        const response = await fetch(`${API_BASE}/api/data`);
        const result = await response.json();

        if (response.ok) {
            const bookings = result.data;
            dataContent.innerHTML = `
                <p><strong>Total bookings: ${result.count}</strong></p>
                <table>
                    <thead>
                        <tr>
                            <th>Organization</th>
                            <th>Booking ID</th>
                            <th>Customer Name</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Start Date & Time</th>
                            <th>Duration</th>
                            <th>Resources</th>
                            <th>Price</th>
                            <th>Source</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookings.map(booking => `
                            <tr>
                                <td>${booking.organization || ''}</td>
                                <td>${booking.bookingId}</td>
                                <td>${booking.customer?.name || ''}</td>
                                <td>${booking.customer?.phone || ''}</td>
                                <td>${booking.customer?.email || ''}</td>
                                <td>${booking.startDateTime}</td>
                                <td>${booking.duration}</td>
                                <td>${booking.resources}</td>
                                <td>${booking.price}</td>
                                <td>${booking.source}</td>
                                <td>${booking.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        } else {
            dataContent.innerHTML = `<div class="message error">${result.error}</div>`;
        }
    } catch (error) {
        console.error('Failed to load data:', error);
        dataContent.innerHTML = '<div class="message error">Failed to load booking data</div>';
    }
}

// Event listeners
scrapeBtn.addEventListener('click', startScraping);
refreshStatusBtn.addEventListener('click', fetchStatus);
loadDataBtn.addEventListener('click', () => {
    loadStats();
    loadData();
});

// Auto-refresh status every 30 seconds when page is visible
setInterval(() => {
    if (!document.hidden) {
        fetchStatus();
    }
}, 30000);

// Initial load
fetchStatus();
