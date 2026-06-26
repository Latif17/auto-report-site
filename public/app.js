document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('report-form');
    const submitBtn = document.getElementById('submit-btn');
    const statusMessage = document.getElementById('status-message');
    
    // UI Sections
    const pooledUserStatus = document.getElementById('pooled-user-status');
    
    let isPooledUser = false;

    // Determine if pooled user
    const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
    if (savedDataJson) {
        try {
            isPooledUser = JSON.parse(savedDataJson).shareData === true;
        } catch (e) {}
    }

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
                
                const topIncident = data.recentIncidents[0];
                const isReported = topIncident.alreadyReported || localReported.includes(topIncident.id);
                
                const li = document.createElement('li');
                li.className = 'event-item';
                
                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'event-details';
                
                const strongTime = document.createElement('strong');
                strongTime.textContent = `${topIncident.date_of_smell} at ${topIncident.time_of_smell}`;
                
                const companyDiv = document.createElement('div');
                companyDiv.textContent = `Reported: ${topIncident.business_location}`;
                companyDiv.style.color = "var(--ink-light)";
                companyDiv.style.marginTop = "0.25rem";
                
                detailsDiv.appendChild(strongTime);
                detailsDiv.appendChild(companyDiv);
                
                if (isReported) {
                    const tag = document.createElement('span');
                    tag.textContent = 'You Logged This';
                    tag.style.fontSize = '0.7rem';
                    tag.style.background = 'var(--success-bg)';
                    tag.style.padding = '2px 6px';
                    tag.style.borderRadius = '4px';
                    tag.style.marginLeft = '10px';
                    detailsDiv.appendChild(tag);
                }

                li.appendChild(detailsDiv);
                listEl.appendChild(li);

                if (isPooledUser) {
                    pooledUserStatus.classList.remove('hidden');
                } else {
                    pooledUserStatus.classList.add('hidden');
                }
            } else {
                document.getElementById('active-alert').classList.remove('hidden');
                
                if (isPooledUser) {
                    pooledUserStatus.classList.remove('hidden');
                } else {
                    pooledUserStatus.classList.add('hidden');
                }
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

    // Set default date and time
    const now = new Date();
    document.getElementById('timeOfSmell').value = now.toTimeString().slice(0,5);
    // Format YYYY-MM-DD
    const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    document.getElementById('dateOfSmell').value = localDate;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // 1. Gather Data
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            postcode: document.getElementById('postcode').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            dateOfSmell: document.getElementById('dateOfSmell').value,
            timeOfSmell: document.getElementById('timeOfSmell').value,
            smellType: 'Industrial Stench',
            businessLocation: document.getElementById('businessLocation').value,
            storeLocally: document.getElementById('storeLocally').checked,
            shareData: document.getElementById('shareData').checked
        };

        // 2. Handle Local Storage
        if (formData.storeLocally) {
            const { dateOfSmell, timeOfSmell, smellType, businessLocation, ...dataToStore } = formData;
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
