
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
            
            let localReported = JSON.parse(localStorage.getItem('reported_incidents') || '[]');

            const activeSection = document.getElementById('active-incident-section');
            const newSection = document.getElementById('new-incident-section');
            
            if (data.recentIncidents && data.recentIncidents.length > 0) {
                const topIncident = data.recentIncidents[0];
                const isReported = topIncident.alreadyReported || localReported.includes(topIncident.id);
                
                const tsDate = new Date(topIncident.smell_timestamp);
                const formattedDate = tsDate.toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' });
                const formattedTime = tsDate.toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' });
                document.getElementById('active-incident-time').textContent = `${formattedDate} - ${formattedTime}`;
                document.getElementById('active-incident-location').textContent = `Reported: ${topIncident.business_location}`;
                
                const joinBtn = document.getElementById('join-incident-btn');
                if (isReported) {
                    joinBtn.textContent = 'You Logged This Event';
                    joinBtn.disabled = true;
                    joinBtn.style.opacity = '0.5';
                    joinBtn.style.cursor = 'not-allowed';
                    joinBtn.onclick = null;
                } else {
                    joinBtn.textContent = 'I smelt this too! (Join)';
                    joinBtn.disabled = false;
                    joinBtn.style.opacity = '1';
                    joinBtn.style.cursor = 'pointer';
                    joinBtn.onclick = (e) => {
                        e.preventDefault();
                        window.joinIncident(topIncident.id);
                    };
                }
                
                activeSection.classList.remove('hidden');
                newSection.classList.add('hidden');
                
                // Allow user to toggle to the new incident form
                document.getElementById('show-new-incident-btn').onclick = () => {
                    activeSection.classList.add('hidden');
                    newSection.classList.remove('hidden');
                };

                if (isPooledUser) {
                    pooledUserStatus.classList.remove('hidden');
                } else {
                    pooledUserStatus.classList.add('hidden');
                }
            } else {
                activeSection.classList.add('hidden');
                newSection.classList.remove('hidden');
                
                if (isPooledUser) {
                    pooledUserStatus.classList.remove('hidden');
                } else {
                    pooledUserStatus.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error('Failed to fetch stats', e);
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

        const joinIncidentId = document.getElementById('joinIncidentId').value;
        const endpoint = joinIncidentId ? '/api/join' : '/api/submit';
        
        if (joinIncidentId) {
            formData.incidentId = joinIncidentId;
            // Ensure they pool data if they are joining
            formData.shareData = true; 
        }

        // 3. UI Loading State
        submitBtn.classList.add('loading');
        statusMessage.classList.add('hidden');
        statusMessage.className = 'status-message'; // Reset classes

        try {
            const response = await simulateSubmission(formData, endpoint);
            
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
            if (joinIncidentId) {
                statusMessage.textContent = 'Successfully joined the report. Your details have been added.';
                document.getElementById('joinIncidentId').value = '';
                document.getElementById('submit-btn-text').textContent = 'Log this smell';
            } else {
                statusMessage.textContent = formData.shareData 
                    ? 'Stink event logged successfully. Auto-reporting is active for future events.'
                    : 'Stink event logged successfully.';
            }
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
    async function simulateSubmission(data, endpoint = '/api/submit') {
        const response = await fetch(endpoint, {
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

    // Join Incident Logic
    window.joinIncident = async function(incidentId) {
        const savedDataJson = localStorage.getItem('freshAirWatchData_v2') || localStorage.getItem('freshAirWatchData');
        let hasValidData = false;
        if (savedDataJson) {
            try {
                const data = JSON.parse(savedDataJson);
                if (data.email && data.fullName && data.postcode && data.address) {
                    hasValidData = true;
                    // Auto join
                    submitBtn.classList.add('loading');
                    try {
                        await simulateSubmission({ ...data, incidentId }, '/api/join');
                        let reported = JSON.parse(localStorage.getItem('reported_incidents') || '[]');
                        reported.push(incidentId);
                        localStorage.setItem('reported_incidents', JSON.stringify(reported));
                        fetchStats();
                    } catch (e) {
                        alert('Failed to join report automatically.');
                    } finally {
                        submitBtn.classList.remove('loading');
                    }
                }
            } catch (e) {}
        }
        
        if (!hasValidData) {
            // Need to fill out form to join
            document.getElementById('joinIncidentId').value = incidentId;
            document.getElementById('submit-btn-text').textContent = 'Join this report';
            
            // Show message and scroll
            statusMessage.textContent = 'Please fill out your personal details below to join this report.';
            statusMessage.className = 'status-message alert-info';
            statusMessage.classList.remove('hidden');
            
            document.getElementById('reporter-details').scrollIntoView({ behavior: 'smooth' });
        }
    };
});
