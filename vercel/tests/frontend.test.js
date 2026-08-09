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
        it('contains hidden input for businessLocation and smell cards grid', () => {
            expect(htmlContent).toContain('<input type="hidden" id="businessLocation" name="businessLocation">');
            expect(htmlContent).toContain('class="smell-cards-grid"');
            expect(htmlContent).toContain('data-value="sewage_drain"');
            expect(htmlContent).toContain('data-value="rotting_rubbish"');
            expect(htmlContent).toContain('data-value="chemical_plastic"');
            expect(htmlContent).toContain('data-value="cant_tell"');
        });

        it('contains smell cards content and descriptions', () => {
            expect(htmlContent).toContain('Sewage or drain');
            expect(htmlContent).toContain('Human waste, raw sewage, or strong sulfur (rotten eggs).');
            expect(htmlContent).toContain('Rotting rubbish');
            expect(htmlContent).toContain('Sour compost, old garbage, or rotting food.');
            expect(htmlContent).toContain('Chemical or plastic');
            expect(htmlContent).toContain('Burning plastic, acrid smoke, or industrial chemicals.');
            expect(htmlContent).toContain('Can\'t tell');
            expect(htmlContent).toContain('Not sure? Logged internally to track trends, but not submitted to the EPA.');
        });

        it('contains the experimental wind feature container', () => {
            expect(htmlContent).toContain('id="experimental-wind-feature"');
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

    describe('Wind-Based Sewage Plant Identification (Task 2)', () => {
        it('app.js contains open-meteo wind fetch and direction mapping logic', () => {
            expect(appJsContent).toContain("fetch('https://api.open-meteo.com/v1/forecast?latitude=51.52&longitude=0.12&current_weather=true&hourly=windspeed_10m,winddirection_10m&past_hours=3')");
            expect(appJsContent).toContain("plant = 'Beckton Sewage Treatment Works'");
            expect(appJsContent).toContain("plant = 'Crossness Sewage Treatment Works'");
            expect(appJsContent).toContain("plant = 'Riverside Sewage Treatment Works'");
        });

        it('app.js maps sewage_drain using specific wind plant if available', () => {
            expect(appJsContent).toContain("mappedBusinessLocation = specificWindPlant ? specificWindPlant : 'Multiple (Beckton, Riverside, Crossness)'");
        });

        function determineWindPlant(windDir) {
            let plant = null;
            
            if (windDir >= 210 && windDir <= 330) {
                plant = 'Beckton Sewage Treatment Works';
            } else if (windDir >= 120 && windDir < 210) {
                plant = 'Crossness Sewage Treatment Works';
            } else if (windDir >= 30 && windDir < 120) {
                plant = 'Riverside Sewage Treatment Works';
            }
            return plant;
        }

        it('determines plant correctly based on wind direction degree ranges', () => {
            expect(determineWindPlant(270)).toEqual('Beckton Sewage Treatment Works');
            expect(determineWindPlant(150)).toEqual('Crossness Sewage Treatment Works');
            expect(determineWindPlant(45)).toEqual('Riverside Sewage Treatment Works');
            expect(determineWindPlant(10)).toEqual(null);
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

    describe('Smell Card Selection Interactivity (Task 3)', () => {
        it('app.js contains smell card query and click listener logic', () => {
            expect(appJsContent).toContain("querySelectorAll('.smell-card')");
            expect(appJsContent).toContain("card.classList.add('selected')");
            expect(appJsContent).toContain("card.getAttribute('data-value')");
            expect(appJsContent).toContain("new Event('change'");
        });

        it('click listener updates selection state and dispatches change event', () => {
            function createMockElement(id, extra = {}) {
                const classListSet = new Set();
                const listeners = {};
                return {
                    id,
                    value: '',
                    checked: false,
                    textContent: '',
                    innerHTML: '',
                    disabled: false,
                    style: {},
                    onclick: null,
                    dataset: extra.dataset || {},
                    getAttribute: (attr) => (attr === 'data-value' ? extra.dataset?.value : null),
                    setAttribute: jest.fn(),
                    classList: {
                        add: (...cls) => cls.forEach(c => classListSet.add(c)),
                        remove: (...cls) => cls.forEach(c => classListSet.delete(c)),
                        contains: (c) => classListSet.has(c),
                        toggle: (c) => classListSet.has(c) ? classListSet.delete(c) : classListSet.add(c)
                    },
                    addEventListener: (event, fn) => {
                        if (!listeners[event]) listeners[event] = [];
                        listeners[event].push(fn);
                    },
                    dispatchEvent: jest.fn(function(evt) {
                        evt.target = evt.target || this;
                        if (listeners[evt.type]) {
                            listeners[evt.type].forEach(fn => fn(evt));
                        }
                    }),
                    click: function() {
                        if (listeners['click']) {
                            listeners['click'].forEach(fn => fn({ type: 'click' }));
                        }
                    },
                    ...extra
                };
            }

            const cards = [
                createMockElement('card1', { dataset: { value: 'sewage_drain' } }),
                createMockElement('card2', { dataset: { value: 'rotting_rubbish' } })
            ];

            const domListeners = {};
            const elementsById = {};

            const mockDocument = {
                addEventListener: (event, fn) => {
                    if (!domListeners[event]) domListeners[event] = [];
                    domListeners[event].push(fn);
                },
                getElementById: (id) => {
                    if (!elementsById[id]) {
                        elementsById[id] = createMockElement(id);
                    }
                    return elementsById[id];
                },
                querySelectorAll: (selector) => {
                    if (selector === '.smell-card') {
                        return cards;
                    }
                    return [];
                }
            };

            const mockWindow = {
                location: { origin: 'http://localhost' }
            };

            const mockLocalStorage = {
                getItem: jest.fn(() => null),
                setItem: jest.fn(),
                removeItem: jest.fn()
            };

            const mockFetch = jest.fn().mockImplementation((url) => {
                if (typeof url === 'string' && url.includes('open-meteo.com')) {
                    return Promise.resolve({
                        ok: true,
                        json: async () => ({
                            current_weather: { winddirection: 270, windspeed: 10, time: '2026-08-07T20:00' },
                            hourly: { 
                                time: ['2026-08-07T17:00', '2026-08-07T18:00', '2026-08-07T19:00', '2026-08-07T20:00'], 
                                winddirection_10m: [270, 270, 270, 270],
                                windspeed_10m: [10, 10, 10, 10]
                            }
                        })
                    });
                }
                return Promise.resolve({
                    ok: true,
                    json: async () => ({ recentIncidents: [] })
                });
            });

            class MockEvent {
                constructor(type, options = {}) {
                    this.type = type;
                    this.bubbles = options.bubbles || false;
                }
            }

            // Execute app.js in context
            const runScript = new Function(
                'document', 'window', 'Event', 'localStorage', 'fetch', 'Intl', 'setTimeout',
                appJsContent
            );
            runScript(mockDocument, mockWindow, MockEvent, mockLocalStorage, mockFetch, Intl, setTimeout);

            // Trigger DOMContentLoaded so app.js attaches its click handlers
            expect(domListeners['DOMContentLoaded']).toBeDefined();
            domListeners['DOMContentLoaded'].forEach(fn => fn());

            const businessLocationInput = elementsById['businessLocation'];

            // Click card 2 (rotting_rubbish)
            cards[1].click();

            expect(businessLocationInput.value).toBe('rotting_rubbish');
            expect(cards[1].classList.contains('selected')).toBe(true);
            expect(cards[0].classList.contains('selected')).toBe(false);
            expect(businessLocationInput.dispatchEvent).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'change', bubbles: true })
            );

            // Click card 1 (sewage_drain)
            cards[0].click();

            expect(businessLocationInput.value).toBe('sewage_drain');
            expect(cards[0].classList.contains('selected')).toBe(true);
            expect(cards[1].classList.contains('selected')).toBe(false);
        });
    });

    describe('index.html SEO & Open Graph metadata', () => {
        it('has a search-friendly title and description', () => {
            expect(htmlContent).toContain('<title>Report the Barking Riverside Smell | Stink Log</title>');
            expect(htmlContent).toContain('<meta name="description" content="Report the recurring industrial smell in Barking Riverside, London. Log an incident in under a minute and we\'ll submit it to GOV.UK on your behalf.">');
        });

        it('has Open Graph tags for social link previews', () => {
            expect(htmlContent).toContain('<meta property="og:type" content="website">');
            expect(htmlContent).toContain('<meta property="og:title" content="Report the Barking Riverside Smell">');
            expect(htmlContent).toContain('<meta property="og:description" content="Log the recurring industrial smell in Barking Riverside — takes under a minute, submitted to GOV.UK for you.">');
            expect(htmlContent).toContain('<meta property="og:url" content="https://barking-riverside-report-smell.vercel.app/">');
            expect(htmlContent).toContain('<meta property="og:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">');
        });

        it('has Twitter Card tags', () => {
            expect(htmlContent).toContain('<meta name="twitter:card" content="summary_large_image">');
            expect(htmlContent).toContain('<meta name="twitter:title" content="Report the Barking Riverside Smell">');
            expect(htmlContent).toContain('<meta name="twitter:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">');
        });
    });
});

describe('about-the-smell.html info page', () => {
    const aboutPath = path.join(__dirname, '../public/about-the-smell.html');
    const navPath = path.join(__dirname, '../public/nav.js');
    let aboutContent;
    let navContent;

    beforeAll(() => {
        aboutContent = fs.readFileSync(aboutPath, 'utf8');
        navContent = fs.readFileSync(navPath, 'utf8');
    });

    it('explains the backstory and names the suspected culprits', () => {
        expect(aboutContent).toContain('Barking Riverside');
        expect(aboutContent).toContain('ReFood UK');
        expect(aboutContent).toContain('East London BioGas');
        expect(aboutContent).toContain('Veolia');
    });

    it('names all 6 suspected sites, including the 3 sewage treatment works', () => {
        expect(aboutContent).toContain('Beckton Sewage Treatment Works');
        expect(aboutContent).toContain('Crossness Sewage Treatment Works');
        expect(aboutContent).toContain('Riverside Sewage Treatment Works');
    });

    it('groups the culprit cards by smell category', () => {
        expect(aboutContent).toContain('class="culprit-grid"');
        expect(aboutContent).toContain('class="culprit-card"');
        expect((aboutContent.match(/class="culprit-card"/g) || []).length).toBe(6);
    });

    it('embeds the demo clip and links back to the report form', () => {
        expect(aboutContent).toContain('<img src="/demo-clip.gif"');
        expect(aboutContent).toContain('href="/"');
    });

    it('has Open Graph and Twitter Card tags', () => {
        expect(aboutContent).toContain('<meta property="og:type" content="website">');
        expect(aboutContent).toContain('<meta property="og:title" content="Why Does Barking Riverside Smell?">');
        expect(aboutContent).toContain('<meta property="og:description" content="The 20-year history, the suspected industrial culprits, and how residents are reporting it.">');
        expect(aboutContent).toContain('<meta property="og:url" content="https://barking-riverside-report-smell.vercel.app/about-the-smell.html">');
        expect(aboutContent).toContain('<meta property="og:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">');
        expect(aboutContent).toContain('<meta name="twitter:card" content="summary_large_image">');
    });

    it('is linked from the navigation menu', () => {
        expect(navContent).toContain('<a href="/about-the-smell.html">Why Does It Smell?</a>');
    });

    it('embeds an interactive Leaflet map of the suspected sites', () => {
        expect(aboutContent).toContain('id="culprit-map"');
        expect(aboutContent).toContain('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        expect(aboutContent).toContain('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        expect(aboutContent).toContain('<script defer src="/culprit-map.js"></script>');
    });
});

describe('Share with a neighbour button', () => {
    const htmlPath = path.join(__dirname, '../public/index.html');
    const appJsPath = path.join(__dirname, '../public/app.js');
    let htmlContent;
    let appJsContent;

    beforeAll(() => {
        htmlContent = fs.readFileSync(htmlPath, 'utf8');
        appJsContent = fs.readFileSync(appJsPath, 'utf8');
    });

    it('index.html contains a hidden share button after the status message', () => {
        expect(htmlContent).toContain('<div id="status-message" class="status-message hidden"></div>');
        expect(htmlContent).toContain('<button type="button" id="share-btn" class="btn btn-secondary hidden"');
    });

    it('app.js wires navigator.share with a clipboard fallback', () => {
        expect(appJsContent).toContain('navigator.share(');
        expect(appJsContent).toContain('navigator.clipboard.writeText(');
        expect(appJsContent).toContain("getElementById('share-btn')");
    });

    it('app.js defines buildShareMessage with the expected share copy', () => {
        expect(appJsContent).toContain('function buildShareMessage(origin)');
        expect(appJsContent).toContain("title: 'Stink Log — Barking Riverside'");
        expect(appJsContent).toContain("text: \"I just reported the smell in Barking Riverside — if you've smelt it too, you can log it here in under a minute:\"");
        expect(appJsContent).toContain("url: origin + '/'");
    });
});

describe('dashboard.html SEO & Open Graph metadata', () => {
    const dashboardPath = path.join(__dirname, '../public/dashboard.html');
    let dashboardContent;

    beforeAll(() => {
        dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    });

    it('has a search-friendly title and description', () => {
        expect(dashboardContent).toContain('<title>Barking Riverside Smell Reports — Live Stats | Stink Log</title>');
        expect(dashboardContent).toContain('<meta name="description" content="Live count of industrial smell reports logged and submitted to GOV.UK by Barking Riverside residents.">');
    });

    it('has Open Graph tags including a live-stats placeholder for og:description', () => {
        expect(dashboardContent).toContain('<meta property="og:type" content="website">');
        expect(dashboardContent).toContain('<meta property="og:title" content="Barking Riverside Smell Reports — Live Stats">');
        expect(dashboardContent).toContain('<meta property="og:description" content="__OG_STATS_PLACEHOLDER__">');
        expect(dashboardContent).toContain('<meta property="og:url" content="https://barking-riverside-report-smell.vercel.app/dashboard.html">');
        expect(dashboardContent).toContain('<meta property="og:image" content="https://barking-riverside-report-smell.vercel.app/og-image.png">');
    });

    it('has a Twitter Card', () => {
        expect(dashboardContent).toContain('<meta name="twitter:card" content="summary_large_image">');
    });
});

describe('dashboard.html Monthly Chart Navigation (Task 4)', () => {
    const dashboardPath = path.join(__dirname, '../public/dashboard.html');
    let dashboardContent;

    beforeAll(() => {
        dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    });

    it('contains navigation header and buttons in tab-monthly', () => {
        expect(dashboardContent).toContain('<div id="tab-monthly" class="tab-content" style="display: none;">');
        expect(dashboardContent).toContain('<div class="nav-header">');
        expect(dashboardContent).toContain('onclick="changeMonth(-1)"');
        expect(dashboardContent).toContain('id="month-label"');
        expect(dashboardContent).toContain('id="next-month-btn"');
        expect(dashboardContent).toContain('onclick="changeMonth(1)"');
    });

    it('defines currentMonthOffset, changeMonth, and updates renderMonthlyChart to filter by current month and year', () => {
        expect(dashboardContent).toContain('let currentMonthOffset = 0;');
        expect(dashboardContent).toContain('function changeMonth(delta)');
        expect(dashboardContent).toContain('document.getElementById(\'next-month-btn\').disabled = (currentMonthOffset === 0);');
        expect(dashboardContent).toContain('month-label');
        expect(dashboardContent).toContain('currentMonthOffset');
    });
});


