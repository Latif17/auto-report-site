const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
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
                    then: (resolve) => resolve({ count: 0, data: {} })
                };
                return chain;
            }, 
            upsert: () => {
                const chain = {
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
        const { data } = await supabase.from('system_stats').select('last_report_time').eq('id', 1).single().throwOnError();
        res.json({ count: count || 0, lastReport: data?.last_report_time });
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

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
module.exports = app;
