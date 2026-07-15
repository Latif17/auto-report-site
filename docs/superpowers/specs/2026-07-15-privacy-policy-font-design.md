# Privacy Policy Font Readability Enhancement

## Purpose
Improve the legibility and readability of long-form text (privacy policy and data promise) specifically for mobile users, without disrupting the layout of the rest of the application.

## Approach
Create a targeted CSS class (`.reading-content`) to enhance the reading experience using the existing 'Inter' font.

## CSS Updates (`style.css`)
- **Base Text**: Increase font size to `1.125rem` (18px).
- **Line Height**: Increase to `1.65` for better vertical spacing.
- **Paragraphs (`p`)**: Add a bottom margin of `1.5rem` to space out text blocks.
- **Headings (`h3`)**: Add a top margin of `2rem` (and a bottom margin of `0.75rem`) to create clear section breaks.
- **Text Alignment**: Set text alignment to left within this class to standardize rendering and remove inline styles.

## HTML Updates (`privacy.html` and `promise.html`)
- Apply the `.reading-content` class to the `.primary-action-section` wrapper containing the text.
- Remove the inline `style="text-align: left;"` from the wrappers, as this will now be handled by `.reading-content`.

## Scope
This change is strictly isolated to long-form reading pages and will not affect form elements, buttons, or dashboard statistics.
