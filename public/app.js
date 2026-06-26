document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('report-form');
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    
    // UI Sections
    const pooledUserStatus = document.getElementById('pooled-user-status');
    const activeIncidentSection = document.getElementById('active-incident-section');
    const newIncidentSection = document.getElementById('new-incident-section');
    
    let isPooledUser = false;
    let currentTopIncident = null;

    // Determine if pooled user
    const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
    if (savedDataJson) {
        try {
            isPooledUser = JSON.parse(savedDataJson).shareData === true;
        } catch (e) {}
    }

    // Toggle logic for switching to manual entry
    document.getElementById('log-different-time-btn').addEventListener('click', (e) => {
        e.preventDefault();
        activeIncidentSection.classList.add('hidden');
        newIncidentSection.classList.remove('hidden');
    });

    document.getElementById('join-incident-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (currentTopIncident) {
            document.getElementById('timeOfSmell').value = currentTopIncident.time_of_smell;
        }
        activeIncidentSection.classList.add('hidden');
        newIncidentSection.classList.remove('hidden');
        document.getElementById('report-form').scrollIntoView({ behavior: 'smooth' });
    });

    async function fetchStats() {
        try {
            const dataStr = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
            let emailQuery = '';
            if (dataStr) {
                try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.email && parsed.shareData) {
                        emailQuery = `?email=${encodeURIComponent(parsed.email)}`;
                    }
                } catch (e) {
                    console.error('Failed to parse local storage data for stats', e);
                }
            }
            const res = await fetch('/api/stats' + emailQuery);
            if (!res.ok) throw new Error('HTTP error');
            const data = await res.json();
            document.getElementById('opted-in-count').innerText = data.count;
            
            const listEl = document.getElementById('recent-events-list');
            listEl.innerHTML = '';
            
            let localReported = JSON.parse(localStorage.getItem('reported_incidents') || '[]');

            if (data.recentIncidents && data.recentIncidents.length > 0) {
                document.getElementById('active-alert').classList.add('hidden');
                
                // Set top incident
                currentTopIncident = data.recentIncidents[0];
                
                // Show/Hide top sections based on user state
                if (isPooledUser) {
                    pooledUserStatus.classList.remove('hidden');
                    activeIncidentSection.classList.add('hidden');
                    newIncidentSection.classList.remove('hidden');
                } else {
                    const isReported = currentTopIncident.alreadyReported || localReported.includes(currentTopIncident.id);
                    if (isReported) {
                        // Already reported, just show the new incident section
                        activeIncidentSection.classList.add('hidden');
                        newIncidentSection.classList.remove('hidden');
                    } else {
                        // Show active incident to join
                        document.getElementById('active-incident-time').textContent = currentTopIncident.time_of_smell;
                        document.getElementById('active-incident-count').textContent = currentTopIncident.report_count;
                        activeIncidentSection.classList.remove('hidden');
                        newIncidentSection.classList.add('hidden');
                    }
                }

                data.recentIncidents.forEach(inc => {
                    const li = document.createElement('li');
                    li.className = 'event-item';
                    
                    const isReported = inc.alreadyReported || localReported.includes(inc.id);
                    
                    const detailsDiv = document.createElement('div');
                    detailsDiv.className = 'event-details';
                    
                    const strongTime = document.createElement('strong');
                    strongTime.textContent = inc.time_of_smell;
                    
                    detailsDiv.appendChild(strongTime);
                    
                    const smallCount = document.createElement('div');
                    smallCount.textContent = `${inc.report_count} report(s) logged`;
                    smallCount.style.color = "var(--ink-light)";
                    smallCount.style.marginTop = "0.25rem";
                    detailsDiv.appendChild(smallCount);

                    const btn = document.createElement('button');
                    btn.className = 'btn-small select-event-btn';
                    btn.dataset.time = inc.time_of_smell;
                    if (isReported) {
                        btn.disabled = true;
                        btn.textContent = 'Already Logged';
                    } else {
                        btn.textContent = 'Log This Time';
                    }

                    li.appendChild(detailsDiv);
                    li.appendChild(btn);
                    listEl.appendChild(li);
                });

                document.querySelectorAll('.select-event-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        document.getElementById('timeOfSmell').value = e.currentTarget.dataset.time;
                        document.getElementById('report-form').scrollIntoView({ behavior: 'smooth' });
                        // Ensure the new incident section is visible
                        activeIncidentSection.classList.add('hidden');
                        newIncidentSection.classList.remove('hidden');
                    });
                });
            } else {
                document.getElementById('active-alert').classList.remove('hidden');
                
                // No recent incidents
                if (isPooledUser) {
                    pooledUserStatus.classList.remove('hidden');
                } else {
                    pooledUserStatus.classList.add('hidden');
                }
                activeIncidentSection.classList.add('hidden');
                newIncidentSection.classList.remove('hidden');
            }
        } catch (e) {
            console.error('Failed to fetch stats');
            const statsEl = document.getElementById('community-stats');
            if (statsEl) statsEl.style.display = 'none';
        }
    }
    fetchStats();

    // Load saved data from localStorage on init
    loadSavedData();

    // Set current time to default for ease of use
    const now = new Date();
    const timeString = now.toTimeString().slice(0,5);
    document.getElementById('timeOfSmell').value = timeString;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. Gather Data
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            postcode: document.getElementById('postcode').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            timeOfSmell: document.getElementById('timeOfSmell').value,
            smellType: 'Industrial Stench',
            businessLocation: 'Multiple (ReFood, Veolia, BioGas)',
            storeLocally: document.getElementById('storeLocally').checked,
            shareData: document.getElementById('shareData').checked
        };

        // 2. Handle Local Storage
        if (formData.storeLocally) {
            const { timeOfSmell, smellType, businessLocation, ...dataToStore } = formData;
            localStorage.setItem('freshAirWatchData_v2', JSON.stringify(dataToStore));
            localStorage.removeItem('freshAirWatchData');
        } else {
            localStorage.removeItem('freshAirWatchData_v2');
            localStorage.removeItem('freshAirWatchData');
        }
        
        // Update pooled user state internally for immediate UI feedback
        isPooledUser = formData.shareData;

        // 3. UI Loading State
        submitBtn.classList.add('loading');
        statusMessage.classList.add('hidden');
        statusMessage.className = 'status-message'; // Reset classes

        try {
            const response = await simulateSubmission(formData);
            
            if (response && response.incidentId) {
                try {
                    let reported = JSON.parse(localStorage.getItem('reported_incidents') || '[]');
                    if (!reported.includes(response.incidentId)) {
                        reported.push(response.incidentId);
                        localStorage.setItem('reported_incidents', JSON.stringify(reported));
                    }
                } catch (e) {
                    console.error('Failed to parse reported_incidents', e);
                }
            }
            fetchStats(); // Refresh stats
            
            // Success
            statusMessage.textContent = formData.shareData 
                ? 'Stink event logged successfully. Auto-reporting is active for future events.'
                : 'Stink event logged successfully.';
            statusMessage.classList.add('success');
            statusMessage.classList.remove('hidden');

        } catch (error) {
            // Error
            statusMessage.textContent = 'Failed to log stink event. Please try again.';
            statusMessage.classList.add('error');
            statusMessage.classList.remove('hidden');
        } finally {
            submitBtn.classList.remove('loading');
        }
    });

    // Helper to load data
    function loadSavedData() {
        const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
        
        if (savedDataJson) {
            try {
                const data = JSON.parse(savedDataJson);
                document.getElementById('fullName').value = data.fullName || '';
                document.getElementById('email').value = data.email || '';
                document.getElementById('postcode').value = data.postcode || '';
                document.getElementById('phone').value = data.phone || '';
                document.getElementById('address').value = data.address || '';

                document.getElementById('storeLocally').checked = data.storeLocally !== false;
                document.getElementById('shareData').checked = data.shareData === true;
            } catch (e) {
                console.error("Failed to parse local storage data", e);
            }
        }
    }

    // Simulate network request
    async function simulateSubmission(data) {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    }
});
