

const API_URL = 'http://localhost:5000';  // Change for production

function calculateRiskFromProbability(floodProbability) {
    if (floodProbability >= 75) {
        return {
            riskLevel: 'CRITICAL',
            riskColor: 'risk-critical',
            emoji: '😱'
        };
    } else if (floodProbability >= 50) {
        return {
            riskLevel: 'HIGH',
            riskColor: 'risk-high',
            emoji: '😰'
        };
    } else if (floodProbability >= 25) {
        return {
            riskLevel: 'MEDIUM',
            riskColor: 'risk-medium',
            emoji: '😐'
        };
    } else {
        return {
            riskLevel: 'LOW',
            riskColor: 'risk-low',
            emoji: '😊'
        };
    }
}

// Get AI prediction for a district
async function getAIPrediction(districtData) {
    try {
        const response = await fetch(`${API_URL}/predict-district`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                districtName: districtData.name,
                parameters: {
                    environmental: {
                        climateWeather: {
                            monsoonIntensity: districtData.details.monsoonIntensity,
                            climateChange: districtData.details.climateChange
                        },
                        topography: {
                            topographyDrainage: districtData.details.topographyDrainage,
                            siltation: districtData.details.siltation,
                            wetlandLoss: districtData.details.wetlandLoss
                        },
                        watershed: {
                            watersheds: districtData.details.watersheds,
                            riverManagement: districtData.details.riverManagement
                        }
                    },
                    infrastructure: {
                        critical: {
                            drainageSystem: districtData.details.drainageSystem,
                            damsQuality: districtData.details.damsQuality,
                            deterioratingInfrastructure: districtData.details.deterioratingInfrastructure
                        }
                    },
                    urbanSocial: {
                        urbanDevelopment: {
                            urbanization: districtData.details.urbanization,
                            encroachments: districtData.details.encroachments
                        },
                        population: {
                            populationScore: districtData.details.populationScore
                        }
                    },
                    governance: {
                        disasterPreparedness: {
                            ineffectiveDisasterPreparedness: districtData.details.ineffectiveDisasterPreparedness || 50
                        },
                        planningPolicy: {
                            inadequatePlanning: districtData.details.inadequatePlanning,
                            politicalFactors: districtData.details.politicalFactors
                        }
                    }
                }
            })
        });

        const result = await response.json();

        if (result.success) {
            return result.prediction;
        } else {
            console.error('AI Prediction Error:', result.error);
            return null;
        }
    } catch (error) {
        console.error('AI API Error:', error);
        return null;
    }
}

// Display AI prediction panel
function displayAIPrediction(prediction, districtName) {
    // Remove existing AI panel
    const existingPanel = document.querySelector('.ai-prediction-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    // Get risk attributes from flood probability
    const riskAttrs = calculateRiskFromProbability(prediction.floodProbability);

    // Create AI panel
    const panel = document.createElement('div');
    panel.className = 'ai-prediction-panel';
    panel.innerHTML = `
        <div class="ai-prediction-header">
            <h3>🤖 AI Prediction Results</h3>
            <span class="ai-confidence">Model Confidence: ${prediction.confidencePercent}%</span>
        </div>
        <div class="ai-prediction-body">
            <div class="ai-flood-probability">
                <div class="flood-prob-label">Flood Probability</div>
                <div class="flood-prob-value ${riskAttrs.riskColor}">${prediction.floodProbability}%</div>
                <div class="flood-prob-emoji">${riskAttrs.emoji}</div>
            </div>
            <div class="ai-risk-result">
                <div class="risk-label">Risk Level</div>
                <div class="risk-value risk-${riskAttrs.riskLevel.toLowerCase()}">${riskAttrs.riskLevel}</div>
            </div>
            <div class="ai-probabilities">
                <h4>Probability Breakdown</h4>
                ${Object.entries(prediction.probabilitiesPercent).map(([level, prob]) => `
                    <div class="prob-item">
                        <div class="prob-label">${level}</div>
                        <div class="prob-bar-container">
                            <div class="prob-bar prob-${level.toLowerCase()}" style="width: ${prob}%"></div>
                        </div>
                        <div class="prob-value">${prob}%</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    // Insert after quick stats
    const quickStats = document.querySelector('.quick-stats');
    if (quickStats) {
        quickStats.after(panel);
    }
}

// Global variable to store flood data
let jakartaCitiesData = {};
let districtsList = [];

// Load data from JSON file
async function loadFloodData() {
    try {
        const response = await fetch('model/jakarta-flood-data.json');
        const data = await response.json();

        // Convert JSON array to object format
        data.districts.forEach(district => {
            jakartaCitiesData[district.name] = {
                name: district.name,
                // Default values - will be overwritten by AI prediction
                riskLevel: 'PENDING',
                riskColor: 'risk-pending',
                emoji: '⏳',
                floodProbability: null,
                monsoonIntensity: district.quickStats.monsoonIntensity,
                drainageEfficiency: district.quickStats.drainageEfficiency,
                wetlandLoss: district.quickStats.wetlandLoss,
                activeAlerts: district.quickStats.activeAlerts,
                populationAtRisk: district.quickStats.populationAtRisk,
                details: {
                    monsoonIntensity: district.parameters.environmental.climateWeather.monsoonIntensity,
                    climateChange: district.parameters.environmental.climateWeather.climateChange,
                    topographyDrainage: district.parameters.environmental.topography.topographyDrainage,
                    siltation: district.parameters.environmental.topography.siltation,
                    wetlandLoss: district.parameters.environmental.topography.wetlandLoss,
                    watersheds: district.parameters.environmental.watershed.watersheds,
                    riverManagement: district.parameters.environmental.watershed.riverManagement,
                    drainageSystem: district.parameters.infrastructure.critical.drainageSystem,
                    damsQuality: district.parameters.infrastructure.critical.damsQuality,
                    deterioratingInfrastructure: district.parameters.infrastructure.critical.deterioratingInfrastructure,
                    urbanization: district.parameters.urbanSocial.urbanDevelopment.urbanization,
                    encroachments: district.parameters.urbanSocial.urbanDevelopment.encroachments,
                    populationScore: district.parameters.urbanSocial.population.populationScore,
                    ineffectiveDisasterPreparedness: district.parameters.governance.disasterPreparedness?.ineffectiveDisasterPreparedness || 50,
                    inadequatePlanning: district.parameters.governance.planningPolicy.inadequatePlanning,
                    politicalFactors: district.parameters.governance.planningPolicy.politicalFactors
                }
            };
        });

        districtsList = Object.keys(jakartaCitiesData);
        console.log('✅ Flood data loaded successfully');
        return true;
    } catch (error) {
        console.error('Error loading flood data:', error);
        loadFallbackData();
        return false;
    }
}

// Fallback data
function loadFallbackData() {
    jakartaCitiesData = {
        'Menteng': {
            name: 'Menteng',
            riskLevel: 'MEDIUM',
            riskColor: 'risk-medium',
            emoji: '😐',
            monsoonIntensity: 72,
            drainageEfficiency: 62,
            wetlandLoss: 65,
            activeAlerts: 8,
            populationAtRisk: 15200,
            details: {
                monsoonIntensity: 72, climateChange: 68,
                topographyDrainage: 45, siltation: 75, wetlandLoss: 65,
                watersheds: 52, riverManagement: 55,
                drainageSystem: 62, damsQuality: 72, deterioratingInfrastructure: 68,
                urbanization: 88, encroachments: 75,
                populationScore: 82,
                inadequatePlanning: 62, politicalFactors: 58
            }
        }
    };
    districtsList = ['Menteng'];
}

// Update dashboard with AI prediction
async function updateDashboardWithAI(cityData) {
    // Show loading state first
    const hero = document.querySelector('.hero');
    const heroTitle = hero.querySelector('h1');
    const statusIcon = hero.querySelector('.status-icon');
    statusIcon.textContent = '⏳';

    // Get AI prediction
    const prediction = await getAIPrediction(cityData);

    if (prediction) {
        // Calculate risk attributes from flood probability
        const riskAttrs = calculateRiskFromProbability(prediction.floodProbability);

        // Update cityData with AI-calculated values
        cityData.floodProbability = prediction.floodProbability;
        cityData.riskLevel = riskAttrs.riskLevel;
        cityData.riskColor = riskAttrs.riskColor;
        cityData.emoji = riskAttrs.emoji;

        // Update basic dashboard with AI-calculated values
        updateDashboard(cityData);

        // Display AI prediction panel
        displayAIPrediction(prediction, cityData.name);
    } else {
        // Fallback if AI prediction fails
        cityData.riskLevel = 'UNKNOWN';
        cityData.riskColor = 'risk-unknown';
        cityData.emoji = '❓';
        updateDashboard(cityData);
        showNotification('AI prediction unavailable. Please check if the API server is running.', 'error');
    }
}

// Update dashboard (original function) - now uses dynamic risk values
function updateDashboard(cityData) {
    // Hero section
    const hero = document.querySelector('.hero');
    const heroSubtitle = hero.querySelector('p:first-of-type');
    const heroTitle = hero.querySelector('h1');
    const heroDescription = hero.querySelector('p:last-of-type');
    const statusIcon = hero.querySelector('.status-icon');

    // Update hero with dynamic risk color
    // Remove all hero color classes first
    hero.classList.remove('hero-low', 'hero-medium', 'hero-high', 'hero-critical');

    // Add the appropriate hero color class based on risk level
    const heroColorClass = `hero-${cityData.riskLevel.toLowerCase()}`;
    hero.classList.add(heroColorClass);

    heroSubtitle.textContent = `Current Risk Status - ${cityData.name}`;
    heroTitle.textContent = cityData.name;

    // Show flood probability if available
    if (cityData.floodProbability !== null && cityData.floodProbability !== undefined) {
        heroDescription.textContent = `Flood Probability: ${cityData.floodProbability}% | Risk Level: ${cityData.riskLevel}`;
    } else {
        heroDescription.textContent = `Risk Level: ${cityData.riskLevel}`;
    }
    statusIcon.textContent = cityData.emoji;

    // Update quick stats
    const stats = document.querySelectorAll('.stat-value');
    stats[0].textContent = cityData.riskLevel;
    stats[0].parentElement.className = `stat-card ${cityData.riskColor}`;
    stats[1].textContent = cityData.monsoonIntensity + '%';
    stats[2].textContent = cityData.drainageEfficiency + '%';
    stats[3].textContent = cityData.wetlandLoss + '%';
    stats[4].textContent = cityData.activeAlerts;
    stats[5].textContent = cityData.populationAtRisk.toLocaleString();

    // Update all detail parameters
    updateDetailValue('Monsoon Intensity', cityData.details.monsoonIntensity);
    updateDetailValue('Climate Change Impact', cityData.details.climateChange);
    updateDetailValue('Topography Drainage', cityData.details.topographyDrainage);
    updateDetailValue('Siltation Level', cityData.details.siltation);
    updateDetailValue('Wetland Loss', cityData.details.wetlandLoss);
    updateDetailValue('Watersheds Condition', cityData.details.watersheds);
    updateDetailValue('River Management Score', cityData.details.riverManagement);
    updateDetailValue('Drainage System Efficiency', cityData.details.drainageSystem);
    updateDetailValue('Dams Quality', cityData.details.damsQuality);
    updateDetailValue('Deteriorating Infrastructure', cityData.details.deterioratingInfrastructure);
    updateDetailValue('Urbanization Rate', cityData.details.urbanization);
    updateDetailValue('Encroachments', cityData.details.encroachments);
    updateDetailValue('Population Score', cityData.details.populationScore);
    updateDetailValue('Inadequate Planning', cityData.details.inadequatePlanning);
    updateDetailValue('Political Factors Impact', cityData.details.politicalFactors);
}

// Helper function to update detail values
function updateDetailValue(label, value) {
    const items = document.querySelectorAll('.detail-item');
    items.forEach(item => {
        const itemLabel = item.querySelector('.detail-label');
        if (itemLabel && itemLabel.textContent === label) {
            const progressFill = item.querySelector('.progress-fill');
            const valueText = item.querySelector('.value-text');
            const badge = item.querySelector('.badge');

            if (progressFill) progressFill.style.width = value + '%';
            if (valueText) valueText.textContent = value + '%';

            // Update badge and color
            if (progressFill && badge) {
                if (value >= 70) {
                    progressFill.className = 'progress-fill danger';
                    badge.className = 'badge badge-danger';
                    badge.textContent = 'High';
                } else if (value >= 50) {
                    progressFill.className = 'progress-fill warning';
                    badge.className = 'badge badge-warning';
                    badge.textContent = 'Moderate';
                } else {
                    progressFill.className = 'progress-fill good';
                    badge.className = 'badge badge-good';
                    badge.textContent = 'Good';
                }
            }
        }
    });
}

// Search functionality
function searchLocation(searchTerm) {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const cityKey = Object.keys(jakartaCitiesData).find(key =>
        key.toLowerCase().includes(normalizedSearch) ||
        jakartaCitiesData[key].name.toLowerCase().includes(normalizedSearch)
    );

    if (cityKey) {
        const cityData = jakartaCitiesData[cityKey];
        setActiveMapCell(cityData.name);  // Highlight on map
        updateDashboardWithAI(cityData);  // Use AI version
    } else {
        showNotification(`District not found. Try: ${districtsList.join(', ')}`, 'error');
    }
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Show notification
function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize
async function initializeDashboard() {
    console.log('🚀 Initializing dashboard...');

    // Load data
    await loadFloodData();

    // Setup search
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchLocation(e.target.value);
            }
        });
    }

    // Initialize map click handlers
    initializeMapClickHandlers();

    // Load first district with AI
    if (jakartaCitiesData['Menteng']) {
        setActiveMapCell('Menteng');
        updateDashboardWithAI(jakartaCitiesData['Menteng']);
    }

    // Load all district predictions for the map (in background)
    loadAllDistrictsPredictions();

    console.log('✅ Dashboard initialized');
}

// Start when page loads
document.addEventListener('DOMContentLoaded', initializeDashboard);


// Update a single district cell on the map
function updateMapCell(districtName, riskColor, emoji, floodProbability) {
    const cellId = 'map-' + districtName.toLowerCase().replace(/ /g, '-');
    const cell = document.getElementById(cellId);

    if (cell) {
        // Remove all risk classes
        cell.classList.remove('risk-low', 'risk-medium', 'risk-high', 'risk-critical', 'risk-pending');
        // Add new risk class
        cell.classList.add(riskColor);

        // Update emoji
        const emojiEl = cell.querySelector('.district-emoji');
        if (emojiEl) emojiEl.textContent = emoji;

        // Add or update probability display
        let probEl = cell.querySelector('.district-prob');
        if (floodProbability !== null && floodProbability !== undefined) {
            if (!probEl) {
                probEl = document.createElement('div');
                probEl.className = 'district-prob';
                cell.appendChild(probEl);
            }
            probEl.textContent = floodProbability + '%';
        }
    }
}

// Set active state on map
function setActiveMapCell(districtName) {
    // Remove active from all cells
    document.querySelectorAll('.district-cell').forEach(cell => {
        cell.classList.remove('active');
    });

    // Add active to selected cell
    const cellId = 'map-' + districtName.toLowerCase().replace(/ /g, '-');
    const cell = document.getElementById(cellId);
    if (cell) {
        cell.classList.add('active');
    }
}

// Initialize map click handlers
function initializeMapClickHandlers() {
    document.querySelectorAll('.district-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            const districtName = cell.dataset.district;
            if (jakartaCitiesData[districtName]) {
                setActiveMapCell(districtName);
                updateDashboardWithAI(jakartaCitiesData[districtName]);
            }
        });
    });
}

// Load all districts predictions for the map
async function loadAllDistrictsPredictions() {
    console.log('🗺️ Loading predictions for all districts...');

    for (const districtName of districtsList) {
        const cityData = jakartaCitiesData[districtName];
        try {
            const prediction = await getAIPrediction(cityData);
            if (prediction) {
                const riskAttrs = calculateRiskFromProbability(prediction.floodProbability);
                // Update the stored data
                cityData.floodProbability = prediction.floodProbability;
                cityData.riskLevel = riskAttrs.riskLevel;
                cityData.riskColor = riskAttrs.riskColor;
                cityData.emoji = riskAttrs.emoji;
                // Update the map cell
                updateMapCell(districtName, riskAttrs.riskColor, riskAttrs.emoji, prediction.floodProbability);
            }
        } catch (error) {
            console.error(`Error loading prediction for ${districtName}:`, error);
        }
    }

    console.log('✅ All district predictions loaded');
}