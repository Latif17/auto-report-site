const fs = require('fs');
const path = require('path');

describe('Frontend Options and Mappings (Task 1)', () => {
    const htmlPath = path.join(__dirname, '../public/index.html');
    const appJsPath = path.join(__dirname, '../public/app.js');
    let htmlContent;
    let appJsContent;

    beforeAll(() => {
        htmlContent = fs.readFileSync(htmlPath, 'utf8');
        appJsContent = fs.readFileSync(appJsPath, 'utf8');
    });

    describe('index.html structure', () => {
        it('contains the correct dropdown options in businessLocation select', () => {
            expect(htmlContent).toContain('<option value="cant_tell">Can\'t tell (See note below)</option>');
            expect(htmlContent).toContain('<option value="sewage_drain">Sewage or drain smell</option>');
            expect(htmlContent).toContain('<option value="chemical_plastic">Chemical or plastic odour</option>');
            expect(htmlContent).toContain('<option value="rotting_rubbish">Rotting rubbish, compost, or food waste</option>');
        });

        it('contains the updated guidance text', () => {
            expect(htmlContent).toContain('<strong>Can\'t tell:</strong> Note: If you select this, your report will only be logged internally to track trends, but will NOT be submitted to the EPA. Ask your neighbors if you aren\'t sure.');
            expect(htmlContent).toContain('<strong>Sewage or drain:</strong> Smells like rotten eggs, sulfur, or human waste.');
            expect(htmlContent).toContain('<strong>Chemical or plastic:</strong> Can smell like burning plastic, sulfur, or industrial chemicals.');
            expect(htmlContent).toContain('<strong>Rotting rubbish:</strong> Often smells like garbage, sour compost, or old food.');
        });
    });

    describe('app.js mapping logic', () => {
        function mapSmellSelection(rawSmellSelection) {
            // Function mirroring app.js mapping logic for unit testing
            let mappedBusinessLocation = '';
            let mappedSmellType = '';

            if (rawSmellSelection === 'rotting_rubbish') {
                mappedBusinessLocation = 'Multiple (ReFood, East London Bio Gas)';
                mappedSmellType = 'Rubbish or refuse';
            } else if (rawSmellSelection === 'chemical_plastic') {
                mappedBusinessLocation = 'Veolia Dagenham (Plastics)';
                mappedSmellType = 'Plastic';
            } else if (rawSmellSelection === 'sewage_drain') {
                mappedBusinessLocation = 'Multiple (Beckton, Riverside, Crossness)';
                mappedSmellType = 'Sewage';
            } else if (rawSmellSelection === 'cant_tell') {
                mappedBusinessLocation = 'Unknown';
                mappedSmellType = 'Unknown';
            } else {
                console.error(`Unexpected smell selection: ${rawSmellSelection}`);
                throw new Error('Invalid smell selection');
            }
            return { mappedBusinessLocation, mappedSmellType };
        }

        it('app.js file content contains the new mapping logic branch for cant_tell and Plastic', () => {
            expect(appJsContent).toContain("rawSmellSelection === 'cant_tell'");
            expect(appJsContent).toContain("mappedSmellType = 'Plastic'");
            expect(appJsContent).toContain("mappedBusinessLocation = 'Unknown'");
            expect(appJsContent).toContain("mappedSmellType = 'Unknown'");
        });

        it('maps rotting_rubbish correctly', () => {
            const res = mapSmellSelection('rotting_rubbish');
            expect(res).toEqual({
                mappedBusinessLocation: 'Multiple (ReFood, East London Bio Gas)',
                mappedSmellType: 'Rubbish or refuse'
            });
        });

        it('maps chemical_plastic correctly', () => {
            const res = mapSmellSelection('chemical_plastic');
            expect(res).toEqual({
                mappedBusinessLocation: 'Veolia Dagenham (Plastics)',
                mappedSmellType: 'Plastic'
            });
        });

        it('maps sewage_drain correctly', () => {
            const res = mapSmellSelection('sewage_drain');
            expect(res).toEqual({
                mappedBusinessLocation: 'Multiple (Beckton, Riverside, Crossness)',
                mappedSmellType: 'Sewage'
            });
        });

        it('maps cant_tell correctly', () => {
            const res = mapSmellSelection('cant_tell');
            expect(res).toEqual({
                mappedBusinessLocation: 'Unknown',
                mappedSmellType: 'Unknown'
            });
        });

        it('throws an error for unexpected smell selection', () => {
            expect(() => mapSmellSelection('invalid_option')).toThrow('Invalid smell selection');
        });
    });

    describe('Frontend User Notes (Task 3)', () => {
        it('index.html contains joinAdditionalNotes and newAdditionalNotes textareas', () => {
            expect(htmlContent).toContain('id="joinAdditionalNotes"');
            expect(htmlContent).toContain('id="newAdditionalNotes"');
            expect(htmlContent).toContain('This note is included in <strong>your</strong> official report only. It will not be submitted for other community members, even if they share data.');
        });

        it('app.js includes additionalNotes in form submission data', () => {
            expect(appJsContent).toContain("additionalNotes:");
            expect(appJsContent).toContain("document.getElementById('joinAdditionalNotes').value.trim()");
            expect(appJsContent).toContain("document.getElementById('newAdditionalNotes').value.trim()");
        });
    });
});

