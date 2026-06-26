const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);

app.use(express.json());
app.use(cors());

app.use(helmet());

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3, // Limit each IP to 3 requests per `window` for sensitive endpoints
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many submissions. Please try again later.' }
});

app.use(globalLimiter);

app.use(express.static(path.join(__dirname, 'public')));

const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });

// Mock supabase client for test if env vars are missing
const supabase = process.env.SUPABASE_URL 
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)
    : { 
        from: (table) => ({ 
            select: () => {
                const chain = {
                    eq: () => chain,
                    single: () => chain,
                    throwOnError: () => chain,
                    gte: () => chain,
                    order: () => chain,
                    limit: () => chain,
                    then: (resolve) => {
                        if (table === 'incidents') {
                            const mockTime = new Date();
                            const defaultDate = dateFormatter.format(mockTime);
                            const defaultTime = timeFormatter.format(mockTime);
                            return resolve({
                                count: 1,
                                data: [{
                                    id: 9999,
                                    date_of_smell: defaultDate,
                                    time_of_smell: defaultTime,
                                    smell_type: 'Industrial Stench',
                                    business_location: 'Multiple (ReFood, Veolia, BioGas)',
                                    status: 'pending',
                                    created_at: mockTime.toISOString()
                                }]
                            });
                        }
                        if (table === 'users') {
                            return resolve({ count: 42, data: [] });
                        }
                        return resolve({ count: 0, data: [] });
                    }
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
            },
            insert: () => {
                const chain = {
                    select: () => chain,
                    single: () => chain,
                    throwOnError: () => chain,
                    then: (resolve) => resolve({ data: { id: 1 }, error: null })
                };
                return chain;
            }
        }) 
    };

app.get('/api/stats', async (req, res) => {
    try {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true }).throwOnError();
        const { data: sysData } = await supabase.from('system_stats').select('last_report_time').eq('id', 1).single().throwOnError();
        
        // Fetch only the absolute latest incident
        const { data: recentIncidents } = await supabase.from('incidents')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .throwOnError();

        let reportedIncidentIds = [];
        const userEmail = req.query.email;
        if (userEmail && recentIncidents && recentIncidents.length > 0) {
            const { data: userReports } = await supabase.from('opted_in_user_reports')
                .select('incident_id')
                .eq('user_email', userEmail)
                .eq('incident_id', recentIncidents[0].id)
                .throwOnError();
            if (userReports) {
                reportedIncidentIds = userReports.map(r => r.incident_id);
            }
        }

        const formattedIncident = recentIncidents && recentIncidents.length > 0 ? {
            ...recentIncidents[0],
            alreadyReported: reportedIncidentIds.includes(recentIncidents[0].id)
        } : null;

        res.json({ count: count || 0, lastReport: sysData?.last_report_time, recentIncidents: formattedIncident ? [formattedIncident] : [] });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/opt-in', strictLimiter, async (req, res) => {
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

app.post('/api/submit', strictLimiter, async (req, res) => {
    let { email, fullName, postcode, phone, address, dateOfSmell, timeOfSmell, smellType, businessLocation, shareData } = req.body;

    try {
        await supabase.from('system_stats').update({ last_report_time: new Date().toISOString() }).eq('id', 1).throwOnError();

        const now = new Date();
        if (!timeOfSmell) {
            timeOfSmell = timeFormatter.format(now);
        }
        if (!dateOfSmell) {
            dateOfSmell = dateFormatter.format(now);
        }

        const todayDate = dateFormatter.format(now);
        if (dateOfSmell > todayDate || (dateOfSmell === todayDate && timeOfSmell > timeFormatter.format(now))) {
            return res.status(400).json({ error: 'Cannot report an event in the future.' });
        }

        const { data: newIncident } = await supabase.from('incidents')
            .insert({ date_of_smell: dateOfSmell, time_of_smell: timeOfSmell, smell_type: smellType, business_location: businessLocation, status: 'pending' })
            .select()
            .single()
            .throwOnError();
        
        const incidentId = newIncident.id;

        if (shareData) {
            await supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address }).throwOnError();
        }

        // Even if they don't share data with community, we still track they reported it so the script runs for them
        const { error } = await supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: email });
        if (error && error.code !== '23505') throw error;

        res.json({ success: true, message: "Report triggered", incidentId });

    } catch (error) {
        console.error('Submit error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/join', strictLimiter, async (req, res) => {
    let { email, fullName, postcode, phone, address, incidentId } = req.body;
    if (!email || !incidentId) return res.status(400).json({ error: 'Missing required fields' });

    try {
        await supabase.from('users').upsert({ email, full_name: fullName, postcode, phone, address }).throwOnError();
        
        const { error } = await supabase.from('opted_in_user_reports').insert({ incident_id: incidentId, user_email: email });
        if (error && error.code !== '23505') throw error;

        res.json({ success: true, message: "Joined report successfully" });
    } catch (error) {
        console.error('Join error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
module.exports = app;
