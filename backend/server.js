const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { submitGovForm } = require('./scraper');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Mock supabase client for test if env vars are missing
const supabase = process.env.SUPABASE_URL 
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : { 
        from: () => ({ 
            select: () => {
                const chain = {
                    eq: () => chain,
                    single: () => chain,
                    throwOnError: () => chain,
                    then: (resolve) => resolve({ count: 0, data: [] })
                };
                return chain;
            }, 
            upsert: () => {
                const chain = {
                    throwOnError: () => chain,
                    then: (resolve) => resolve({})
                };
                return chain;
            },
            update: () => {
                const chain = {
                    eq: () => chain,
                    throwOnError: () => chain,
                    then: (resolve) => resolve({})
                };
                return chain;
            }
        }) 
    };

app.get('/api/stats', async (req, res) => {
    try {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).throwOnError();
        const { data: sysData } = await supabase.from('system_stats').select('last_report_time').eq('id', 1).single().throwOnError();
        
        // Fetch recent incidents
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentIncidents } = await supabase.from('incidents')
            .select('*')
            .gte('created_at', twentyFourHoursAgo)
            .order('created_at', { ascending: false });

        let reportedIncidentIds = [];
        const userEmail = req.query.email;
        if (userEmail) {
            const { data: userReports } = await supabase.from('opted_in_user_reports')
                .select('incident_id')
                .eq('user_email', userEmail);
            if (userReports) {
                reportedIncidentIds = userReports.map(r => r.incident_id);
            }
        }

        // Group incidents
        const grouped = [];
        if (recentIncidents) {
            recentIncidents.forEach(inc => {
                const existing = grouped.find(g => 
                    g.time_of_smell === inc.time_of_smell && 
                    g.smell_type === inc.smell_type && 
                    g.business_location === inc.business_location
                );
                if (existing) {
                    existing.report_count++;
                    if (reportedIncidentIds.includes(inc.id)) {
                        existing.alreadyReported = true;
                    }
                } else {
                    grouped.push({
                        id: inc.id,
                        time_of_smell: inc.time_of_smell,
                        smell_type: inc.smell_type,
                        business_location: inc.business_location,
                        report_count: 1,
                        alreadyReported: reportedIncidentIds.includes(inc.id)
                    });
                }
            });
        }

        res.json({ count: count || 0, lastReport: sysData?.last_report_time, recentIncidents: grouped.slice(0, 5) });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/opt-in', async (req, res) => {
    const { email, fullName, postcode, phone, address } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }
    try {
        await supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address }).throwOnError();
        res.json({ success: true });
    } catch (error) {
        console.error('Opt-in error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/submit', async (req, res) => {
    const { email, fullName, postcode, phone, address, timeOfSmell, smellType, businessLocation, shareData } = req.body;
    
    const userData = { email, fullName, postcode, phone, address };
    const incidentData = { timeOfSmell, smellType, businessLocation };

    try {
        await supabase.from('system_stats').update({ last_report_time: new Date().toISOString() }).eq('id', 1).throwOnError();

        // Check for existing incident in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let { data: existingIncidents } = await supabase.from('incidents')
            .select('id')
            .eq('time_of_smell', timeOfSmell)
            .eq('smell_type', smellType)
            .eq('business_location', businessLocation)
            .gte('created_at', oneHourAgo)
            .throwOnError();

        let incidentId;
        if (existingIncidents && existingIncidents.length > 0) {
            incidentId = existingIncidents[0].id;
        } else {
            const { data: newIncident } = await supabase.from('incidents')
                .insert({ time_of_smell: timeOfSmell, smell_type: smellType, business_location: businessLocation })
                .select()
                .single()
                .throwOnError();
            incidentId = newIncident.id;
        }

        if (shareData) {
            await supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address }).throwOnError();
            const { error } = await supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: email });
            if (error && error.code !== '23505') throw error;
        }

        res.json({ success: true, message: "Report triggered", incidentId });

        (async () => {
            try {
                await submitGovForm(userData, incidentData);
                await triggerMassReporting(incidentData, email, incidentId);
            } catch (err) {
                console.error("Background submission error:", err);
            }
        })();
    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function triggerMassReporting(incidentData, excludeEmail, incidentId) {
    const { data: users } = await supabase.from('users').select('*');
    if (!users) return;
    
    for (const user of users) {
        if (user.email === excludeEmail) continue;
        const userData = {
            email: user.email,
            fullName: user.full_name,
            postcode: user.postcode,
            phone: user.phone,
            address: user.address
        };
        await submitGovForm(userData, incidentData);
        const { error } = await supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: user.email });
        if (error && error.code !== '23505') throw error;
    }
}


const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
module.exports = app;
