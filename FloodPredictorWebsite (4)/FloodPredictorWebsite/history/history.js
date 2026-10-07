

// State
let historicalData = null;
let currentTab = 'weekly';

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupTabListeners();
});

// Load historical data
async function loadData() {
    showLoading();

    try {
        const response = await fetch('historical_flood_data.json');
        if (!response.ok) throw new Error('Failed to load data');

        historicalData = await response.json();
        renderCurrentTab();
    } catch (error) {
        console.error('Error loading data:', error);
        showError();
    }
}

// Tab functionality
function setupTabListeners() {
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

function switchTab(tab) {
    currentTab = tab;

    // Update button states
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update content visibility
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-content`);
    });

    renderCurrentTab();
}

function renderCurrentTab() {
    if (!historicalData) return;

    const data = historicalData[currentTab];
    const timeline = document.getElementById(`${currentTab}-timeline`);

    // Update summary stats
    updateSummary(data);

    // Render timeline cards
    timeline.innerHTML = data.map(record => createHistoryCard(record)).join('');

    // Setup card interactions
    setupCardListeners();
}

// Update summary bar
function updateSummary(data) {
    const recordCount = document.getElementById('record-count');
    const avgProbability = document.getElementById('avg-probability');
    const highestRisk = document.getElementById('highest-risk');

    // Calculate stats
    const count = data.length;
    const avg = Math.round(data.reduce((sum, r) => sum + r.flood_probability, 0) / count);
    const maxProb = Math.max(...data.map(r => r.flood_probability));
    const highest = data.find(r => r.flood_probability === maxProb);

    recordCount.textContent = count;
    avgProbability.textContent = `${avg}%`;
    highestRisk.textContent = highest.period;
}

// Create history card HTML
function createHistoryCard(record) {
    const riskClass = `risk-${record.risk_status}`;
    const riskLabel = formatRiskLabel(record.risk_status);

    let yearlySummaryHTML = '';
    if (record.summary) {
        yearlySummaryHTML = `
            <div class="yearly-summary">
                <div class="summary-stat">
                    <div class="summary-stat-value">${record.summary.flood_events}</div>
                    <div class="summary-stat-label">Flood Events</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${record.summary.affected_areas}</div>
                    <div class="summary-stat-label">Areas Affected</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${record.summary.peak_month}</div>
                    <div class="summary-stat-label">Peak Month</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${record.summary.avg_rainfall}</div>
                    <div class="summary-stat-label">Avg Rainfall</div>
                </div>
            </div>
        `;
    }

    return `
        <div class="history-card ${riskClass}" data-id="${record.id}">
            <div class="card-main">
                <div class="period-info">
                    <div class="period-label">${record.label}</div>
                    <div class="period-date">${record.period}</div>
                </div>
                
                <div class="probability-display">
                    <div class="probability-value ${riskClass}">${record.flood_probability}%</div>
                    <div class="probability-label">Flood Probability</div>
                </div>
                
                <div class="risk-badge ${riskClass}">${riskLabel}</div>
                
                <span class="expand-indicator">▼</span>
            </div>
            
            <div class="card-details">
                <div class="details-header">Contributing Factors</div>
                <div class="factors-grid">
                    ${createFactorsGrid(record.factors)}
                </div>
                ${yearlySummaryHTML}
            </div>
        </div>
    `;
}

// Create factors grid HTML
function createFactorsGrid(factors) {
    const labels = historicalData.factor_labels;

    return Object.entries(factors).map(([key, value]) => {
        const level = getScoreLevel(value);
        const percentage = value * 10;

        return `
            <div class="factor-item">
                <span class="factor-name">${labels[key] || formatFactorKey(key)}</span>
                <div class="factor-score">
                    <div class="score-bar">
                        <div class="score-fill level-${level}" style="width: ${percentage}%"></div>
                    </div>
                    <span class="score-value">${value}/10</span>
                </div>
            </div>
        `;
    }).join('');
}

// Setup card expand/collapse
function setupCardListeners() {
    const cards = document.querySelectorAll('.history-card');

    cards.forEach(card => {
        const main = card.querySelector('.card-main');
        main.addEventListener('click', () => {
            // Close other expanded cards
            cards.forEach(c => {
                if (c !== card) c.classList.remove('expanded');
            });
            // Toggle current card
            card.classList.toggle('expanded');
        });
    });
}

// Helper functions
function formatRiskLabel(status) {
    const labels = {
        low: 'Low Risk',
        medium: 'Medium Risk',
        high: 'High Risk',
        critical: 'Critical'
    };
    return labels[status] || status;
}

function formatFactorKey(key) {
    return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function getScoreLevel(score) {
    if (score <= 4) return 'low';
    if (score <= 7) return 'medium';
    return 'high';
}

// Loading state
function showLoading() {
    const timelines = document.querySelectorAll('.timeline');
    timelines.forEach(timeline => {
        timeline.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading historical data...</p>
            </div>
        `;
    });
}

// Error state
function showError() {
    const timelines = document.querySelectorAll('.timeline');
    timelines.forEach(timeline => {
        timeline.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Unable to load historical data. Please try again later.</p>
            </div>
        `;
    });
}