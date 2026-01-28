# HopBuilds Homepage Redesign

## Overview

Modernize the homepage while keeping the vanilla HTML/CSS/JS stack. Remove scroll hijacking, add a conventional navigation, and simplify the layout for natural scrolling.

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Tech stack | Keep vanilla HTML/CSS/JS (no React migration) |
| Hero animation | Load animation (fade-in/scale) instead of scroll-triggered |
| 3D model | Keep full-screen Spline background |
| Navigation | Conventional nav with blur-on-scroll |
| Stats overlay | None (clean hero) |
| Pill button | None |
| Accent color | Blue `#2563eb` (existing) |
| Sections | Hero → Projects → Footer (consolidated) |
| Scrolling | Natural scrolling, no hijacking |

---

## Page Structure

### 1. Navigation (Fixed)

```
[HopBuilds]                         [Projects]  [About]    [Join Us →]
```

**Behavior:**
- Fixed position at top
- Transparent initially over hero
- On scroll: white background with backdrop blur
- Smooth transition between states

**Styling:**
- Logo: "HopBuilds" in Chillax font (or icon + text)
- Links: Clean, medium weight
- "Join Us" CTA: Blue filled button, white text

---

### 2. Hero Section

**Layout:**
- Full-screen with Spline 3D model as background
- Dark overlay for text readability
- Content centered vertically and horizontally

**Content:**
```
        HopBuilds builds products
         for students, by students.

  We are a student-run organization of 60+ members
  who code, design, market, and manage 8+ products
         that improve life at Johns Hopkins.
```

**Typography:**
- Headline: Chillax font, 600 weight, ~3-4rem
- "HopBuilds" in accent blue (`#2563eb`), rest in white
- Subheadline: Lighter weight, muted gray, smaller size

**Animation:**
- On load: headline fades in and scales from 0.95 to 1
- Subheadline fades in with slight delay
- CSS animations or simple GSAP timeline (no ScrollTrigger)

---

### 3. Projects Section

**Layout:**
- Light background (`#F8FAFC` or white) to contrast with dark hero
- Single featured project (expandable to grid later)

**Content:**
- Large project card with image, name, description, link
- "View Project →" button

**Styling:**
- Clean card with subtle shadow or border
- Plenty of whitespace

---

### 4. Footer

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Want to grow your skills?          ┌────────────────────────┐  │
│   Join our team!                     │ Developers             │  │
│                                      │ Build products used by │  │
│   We are looking for students        │ thousands of students  │  │
│   passionate about software          └────────────────────────┘  │
│   development and technology.        ┌────────────────────────┐  │
│                                      │ Designers              │  │
│                                      │ Craft intuitive user   │  │
│   [Apply Now →]                      │ experiences            │  │
│                                      └────────────────────────┘  │
│                                      ┌────────────────────────┐  │
│                                      │ Strategists            │  │
│                                      │ Drive marketing and    │  │
│                                      │ product decisions      │  │
│                                      └────────────────────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│     dguo10@jh.edu   •   Instagram   •   GitHub   •   © 2025     │
└──────────────────────────────────────────────────────────────────┘
```

**Left column:**
- Headline: "Want to grow your skills? Join our team!"
- Subtext: "We are looking for students passionate about software development and technology."
- "Apply Now →" button (links to Google Form, opens new tab)

**Right column:**
- 3 stacked role cards: Developers, Designers, Strategists
- Each card: Role title + short description blurb

**Bottom bar:**
- Email: dguo10@jh.edu
- Social links: Instagram, GitHub
- Copyright: © 2025 HopBuilds

**Styling:**
- Dark background (matches hero)
- Cards with subtle border or lighter background
- Clean typography

---

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#2563eb` | "HopBuilds" text, CTA buttons |
| `--bg-dark` | `#1a1d29` | Hero, footer backgrounds |
| `--bg-light` | `#F8FAFC` | Projects section |
| `--text-light` | `#ffffff` | Text on dark backgrounds |
| `--text-secondary` | `#6b7280` | Subheadlines, muted text |

---

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Nav logo | Chillax | 1.25rem | 600 |
| Nav links | Inter | 0.875rem | 500 |
| Hero headline | Chillax | 3-4rem | 600 |
| Hero subheadline | Inter | 1.125rem | 400 |
| Section headings | Chillax | 2.5rem | 600 |
| Body text | Inter | 1rem | 400 |

---

## Implementation Tasks

1. **Navigation**
   - Create fixed nav with logo, links, CTA
   - Add blur-on-scroll effect with JS
   - Style transparent → blurred transition

2. **Hero Section**
   - Update headline to full tagline
   - Style "HopBuilds" with accent color
   - Add subheadline
   - Replace scroll animation with load animation
   - Remove scroll-triggered clip-path reveal

3. **Projects Section**
   - Create single featured project card
   - Light background section
   - Remove info carousel and its scroll hijacking

4. **Footer**
   - Two-column layout
   - Left: headline, subtext, apply button
   - Right: 3 role cards stacked
   - Bottom bar with links

5. **Cleanup**
   - Remove ScrollTrigger scroll hijacking
   - Remove info carousel section
   - Remove upcoming carousel section
   - Ensure natural scrolling throughout

---

## Files to Modify

- `index.html` - Update structure
- `css/globals.css` - Update variables if needed
- `css/home/hero.css` - New hero styles
- `css/home/home.css` - Layout changes
- `css/home/footer.css` - New footer design
- `js/home.js` - Remove scroll hijacking, add load animations
- Delete or simplify: `css/home/carousel.css`, `css/home/services.css`
