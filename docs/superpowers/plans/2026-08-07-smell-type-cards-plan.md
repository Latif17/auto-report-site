# Smell Type Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the "What does it smell like?" selection in the main form to use selectable cards with built-in descriptive guidance, replacing the dropdown and separate guidance block.

**Architecture:** HTML structure change from `<select>` to a CSS Grid of `.smell-card` elements, alongside a hidden input to preserve form validation and data extraction. CSS will handle the grid layout and visual active states (using a `.selected` class). JS in `app.js` will handle click events on the cards to update the hidden input and toggle the `.selected` class.

**Tech Stack:** Vanilla HTML/CSS/JS

## Global Constraints

- No external CSS frameworks, use `style.css`.
- Preserve existing form submission logic via hidden input.

---

### Task 1: HTML Structure Update

**Files:**
- Modify: `vercel/public/index.html`

**Interfaces:**
- Consumes: Existing form structure
- Produces: A hidden `<input>` with `id="businessLocation"` and `.smell-card` div elements.

- [ ] **Step 1: Replace dropdown with cards in HTML**

Edit `vercel/public/index.html` (around line 155). Replace the `<select id="businessLocation">` and the separate `Guidance:` div with the new hidden input and card grid.

```html
<label>What does it smell like?</label>
<input type="hidden" id="businessLocation" name="businessLocation" required>
<div class="smell-cards-grid">
    <div class="smell-card" data-value="sewage_drain">
        <div class="smell-card-title">Sewage or drain</div>
        <div class="smell-card-desc">Human waste, raw sewage, or strong sulfur (rotten eggs).</div>
    </div>
    <div class="smell-card" data-value="rotting_rubbish">
        <div class="smell-card-title">Rotting rubbish</div>
        <div class="smell-card-desc">Sour compost, old garbage, or rotting food.</div>
    </div>
    <div class="smell-card" data-value="chemical_plastic">
        <div class="smell-card-title">Chemical or plastic</div>
        <div class="smell-card-desc">Burning plastic, acrid smoke, or industrial chemicals.</div>
    </div>
    <div class="smell-card" data-value="cant_tell">
        <div class="smell-card-title">Can't tell</div>
        <div class="smell-card-desc">Not sure? Logged internally to track trends, but not submitted to the EPA.</div>
    </div>
</div>
```
Make sure to remove the old `<select>` and the old `<div style="font-size: 0.8rem; color: var(--ink-light); margin-top: 0.5rem; line-height: 1.4;">...</div>` that contained the previous guidance.

- [ ] **Step 2: Commit**

```bash
git add vercel/public/index.html
git commit -m "feat: update HTML structure for smell type cards"
```

### Task 2: CSS Styling

**Files:**
- Modify: `vercel/public/style.css`

**Interfaces:**
- Consumes: `.smell-cards-grid`, `.smell-card`, `.smell-card-title`, `.smell-card-desc`, `.smell-card.selected`
- Produces: Styled grid of cards.

- [ ] **Step 1: Add CSS for the new cards**

Append the following CSS to `vercel/public/style.css`:

```css
.smell-cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 0.5rem;
}

.smell-card {
    border: 2px solid var(--border);
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    background: var(--paper);
    transition: all 0.2s ease;
}

.smell-card:hover {
    border-color: var(--accent);
    background: var(--surface);
}

.smell-card.selected {
    border-color: var(--accent);
    background: rgba(var(--accent-rgb), 0.1); /* fallback to solid if var undefined */
    box-shadow: 0 0 0 1px var(--accent);
}

/* If --accent-rgb doesn't exist, we use a simple background change */
@supports not (background: rgba(var(--accent-rgb), 0.1)) {
    .smell-card.selected {
        background: #f0f7ff; /* Assuming accent is bluish, adapt as needed */
    }
}

.smell-card-title {
    font-weight: 600;
    font-size: 1rem;
    color: var(--ink);
    margin-bottom: 0.25rem;
}

.smell-card-desc {
    font-size: 0.85rem;
    color: var(--ink-light);
    line-height: 1.4;
}
```

- [ ] **Step 2: Test rendering visually**

Since there are no unit tests for CSS, this is validated by opening `vercel/public/index.html` in a browser or just verifying syntax. We can proceed to commit.

- [ ] **Step 3: Commit**

```bash
git add vercel/public/style.css
git commit -m "style: add CSS for smell type cards"
```

### Task 3: Interactivity (JS)

**Files:**
- Modify: `vercel/public/app.js`

**Interfaces:**
- Consumes: The DOM elements from Task 1.
- Produces: Interactive selection that populates the hidden input.

- [ ] **Step 1: Add click listeners for smell cards**

In `vercel/public/app.js`, within the `DOMContentLoaded` event listener (likely at the top or near the other DOM listeners), add logic to handle clicks on the `.smell-card` elements.

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // [Existing code inside DOMContentLoaded...]

    // Smell Card Selection Logic
    const smellCards = document.querySelectorAll('.smell-card');
    const businessLocationInput = document.getElementById('businessLocation');
    // We also need to trigger a 'change' event when it's selected to handle any existing logic like hiding error texts.
    
    smellCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selected class from all
            smellCards.forEach(c => c.classList.remove('selected'));
            // Add selected to clicked
            card.classList.add('selected');
            // Update hidden input
            businessLocationInput.value = card.getAttribute('data-value');
            
            // Dispatch change event to clear errors or trigger experimental wind feature
            const event = new Event('change', { bubbles: true });
            businessLocationInput.dispatchEvent(event);
        });
    });
});
```
*Note: Locate the best place within `app.js` to insert this. It should be after the DOM is ready.*

- [ ] **Step 2: Commit**

```bash
git add vercel/public/app.js
git commit -m "feat: add click handlers for smell type cards"
```

