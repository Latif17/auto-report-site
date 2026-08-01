const request = require('supertest');
const app = require('./server'); // Import the express app

async function runTests() {
    console.log('Testing /api/submit with an existing incident...');
    
    const resSubmit = await request(app)
        .post('/api/submit')
        .send({
            email: 'test@example.com',
            fullName: 'Test User',
            dateOfSmell: '2026-07-20',
            timeOfSmell: '10:00',
            smellType: 'Sewage',
            businessLocation: 'Multiple (ReFood, Veolia, BioGas)',
            shareData: true
        });
    console.log('/api/submit Status:', resSubmit.status);
    console.log('/api/submit Body:', resSubmit.body);

    console.log('Testing /api/join...');
    const resJoin = await request(app)
        .post('/api/join')
        .send({
            email: 'test2@example.com',
            fullName: 'Test User 2',
            incidentId: 201,
            shareData: true
        });
    console.log('/api/join Status:', resJoin.status);
    console.log('/api/join Body:', resJoin.body);
    
    console.log('Testing duplicate email on /api/submit...');
    const resSubmitDup = await request(app)
        .post('/api/submit')
        .send({
            email: 'duplicate@example.com',
            fullName: 'Duplicate User',
            dateOfSmell: '2026-07-20',
            timeOfSmell: '10:00',
            smellType: 'Sewage',
            businessLocation: 'Multiple (ReFood, Veolia, BioGas)'
        });
    console.log('/api/submit (Dup) Status:', resSubmitDup.status);
    console.log('/api/submit (Dup) Body:', resSubmitDup.body);
}

runTests().catch(console.error);
