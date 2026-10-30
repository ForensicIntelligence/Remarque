---
name: remarque-about-style
description: Reuse the user's approved Remarque visual style when creating or redesigning About windows for their other apps, or when they ask for the Remarque look. Friendly characters made from the app icon, subtle animation, rounded typography, soft accents, and a spacious native layout. This is a saved design preference, not a request to redesign unrelated screens.
---

# Remarque About style

The user explicitly approved Remarque 3.0.4's About window on 30 October 2026: “That is the PERFECT look!” They asked to remember it for their other apps. Treat this as the preferred starting point for future About-window design unless they give different direction.

## Approved reference

View [the approved window](references/approved-about.jpg) before adapting the style. For SwiftUI/AppKit implementation, read [the original AboutView](references/RemarqueAboutView.swift). These copies make the reference usable without the original checkout.

Origin: Remarque 3.0.4 (742), private repository `ForensicIntelligence/Remarque`, implementation commit `32f8e6e76504caaf8cb35a4022d1407c7e162cd7`, `App/UI/AboutView.swift`. The reference source is a snapshot, not a drop-in component: adapt its `BuildInfo`, `AppWindows`, publisher, links, and window identifiers to the destination app.

## Visual character

- Polished, warm, quietly playful. Keep the actual product icon recognizable; add tiny eyes, a smile, and simple drawn arms and legs to make it a character.
- Use one central character with two smaller companions as the baseline. Offset the smaller characters in scale, height, and angle for a natural arrangement.
- Give the illustration breathing room above the product name. Use a soft accent-colour glow, faint ground shadows, a sparse dotted curve, and a couple of tiny sparkles.
- Use a large rounded bold product name, one understated tagline, and a quiet monospaced version capsule. Put a short feature row below, then a thin divider, documentation/website links, and a restrained publisher footer.
- Keep native surfaces, generous spacing, readable contrast, and a restrained palette. Remarque uses blue/cyan accents on a charcoal surface in dark appearance; adapt accent colours and characters to the destination app's own icon and identity. Support light appearance too.
- Preserve the balance of professional clarity and a little humour. Avoid busy backgrounds, loud gradients, large bouncing mascots, confetti, sound effects, or decorative animation outside the small illustration area unless requested.

## Motion and accessibility

The reference uses slow bobbing of about ±3 points and an additional ±1.5° of tilt, with different phases for the characters. Its bob cycle is approximately 7.4 seconds. Eyes blink briefly, about 0.16 seconds every 7.2 seconds. A 24 fps ceiling is sufficient for this restrained movement. These are starting values, not inflexible requirements for every app.

Respect Reduce Motion with a completely stationary pose, including no blinking. Pause animation when the window loses focus, the app becomes inactive, or the window closes. Hide decorative characters from accessibility navigation and keep meaningful text and links accessible.

## Layout and adaptation

The approved macOS window uses a 560 × 590 point content area, including a 230-point illustration. The main title is 40-point rounded bold; the tagline is 15 points; the version and link labels are around 12 points. Use these proportions as a reference and adjust for the target platform, content, and accessibility needs. Fit the available screen and retain a scrolling fallback. About windows should remain separate from document tabs.

Use the destination app's real product name, icon, version/build source, capabilities, publisher, and help/website actions. Place the face on a clear part of its icon; Remarque's face coordinates are specific to its blue R and should not be copied blindly. Preserve its original icon artwork and add native/vector character details where practical.

Compare the result visually with the approved screenshot, including hierarchy, whitespace, character scale, and restrained motion. This preference authorizes reuse when the requested work involves these surfaces; it does not authorize publishing an update or changing unrelated UI on its own.
