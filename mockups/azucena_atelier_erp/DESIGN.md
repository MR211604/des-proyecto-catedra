---
name: Azucena Atelier ERP
colors:
  surface: '#fff7fc'
  surface-dim: '#e1d7e0'
  surface-bright: '#fff7fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf1fa'
  surface-container: '#f5ebf4'
  surface-container-high: '#efe5ef'
  surface-container-highest: '#e9dfe9'
  on-surface: '#1f1a20'
  on-surface-variant: '#4e444b'
  inverse-surface: '#342f36'
  inverse-on-surface: '#f8eef7'
  outline: '#80747b'
  outline-variant: '#d1c2cb'
  surface-tint: '#7b5074'
  primary: '#70466a'
  on-primary: '#ffffff'
  primary-container: '#8b5e83'
  on-primary-container: '#ffeaf7'
  inverse-primary: '#ecb6e0'
  secondary: '#7b535c'
  on-secondary: '#ffffff'
  secondary-container: '#fecad4'
  on-secondary-container: '#7a525b'
  tertiary: '#59525a'
  on-tertiary: '#ffffff'
  tertiary-container: '#726a72'
  on-tertiary-container: '#f7ecf5'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd7f4'
  primary-fixed-dim: '#ecb6e0'
  on-primary-fixed: '#310d2e'
  on-primary-fixed-variant: '#61395b'
  secondary-fixed: '#ffd9e0'
  secondary-fixed-dim: '#ecb9c4'
  on-secondary-fixed: '#2f121a'
  on-secondary-fixed-variant: '#613c45'
  tertiary-fixed: '#eadfe9'
  tertiary-fixed-dim: '#cec3cd'
  on-tertiary-fixed: '#1f1a20'
  on-tertiary-fixed-variant: '#4b454c'
  background: '#fff7fc'
  on-background: '#1f1a20'
  surface-variant: '#e9dfe9'
typography:
  display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  margin-mobile: 16px
  margin-desktop: 32px
  gutter: 24px
---

## Brand & Style

The design system is built for a family-owned tailoring and sewing enterprise, blending the precision of an ERP with the tactile elegance of high fashion. The personality is professional, sophisticated, and deeply rooted in the craft of garment making.

The visual style follows **Modern Minimalism** with a **Tactile** twist. It utilizes generous whitespace, refined typography, and subtle layering to evoke the feeling of a clean cutting table or a high-end studio. While the interface is functional and systematic for data management, it maintains an editorial aesthetic through high-contrast color pairings and intentional structural alignment. The goal is to provide a workspace that feels less like a spreadsheet and more like a curated digital atelier.

## Colors

The palette is inspired by textile dyes and natural fibers. The primary mauve (#8B5E83) serves as the "thread" that ties the interface together, used for primary actions and brand presence. The secondary dusty rose (#D8A7B1) acts as an accent for softer highlights and decorative elements.

The background uses a slightly warm "linen" white (#F8F6F7) to reduce screen glare during long working hours, while cards and surface containers remain pure white to create a clear visual hierarchy. Semantic colors for status (Success, Warning, Error) are desaturated to remain harmonious with the fashion-forward palette while maintaining accessibility.

## Typography

This design system uses **Inter** exclusively to ensure maximum legibility and a systematic, modern feel. The hierarchy is strictly enforced to guide users through complex ERP forms and inventory lists.

- **Headlines:** Use SemiBold (600) or Bold (700) weights with tighter letter spacing for a high-end look.
- **Body Text:** Always Regular (400) for clarity in dense data tables.
- **Labels & Buttons:** Use Medium (500) or SemiBold (600). Labels in all-caps should only be used for small, utility-level text (e.g., `label-sm`) with increased letter spacing for readability.

## Layout & Spacing

The layout is based on a **12-column fluid grid** for desktop and a **4-column grid** for mobile. The philosophy focuses on "Negative Space as Luxury"—ample margins and gutters are used to ensure that even complex sewing patterns or inventory data feel organized.

- **Sidebar Navigation:** Fixed width at 260px on desktop to provide a persistent "workbench" anchor.
- **Content Containers:** Use a maximum width of 1440px for data-heavy views to prevent line lengths from becoming unreadable.
- **Rhythm:** All spacing (padding, margins, gap) must be multiples of the 8px base unit.

## Elevation & Depth

To mirror the precision of tailoring, elevation is used sparingly and purposefully. We avoid heavy drop shadows in favor of **Tonal Layers** and **Soft Ambient Shadows**.

- **Level 0 (Background):** #F8F6F7. No shadow.
- **Level 1 (Cards/Surface):** Pure white with a very soft, diffused shadow (Offset: 0, 4px; Blur: 12px; Color: rgba(47, 41, 48, 0.05)).
- **Level 2 (Modals/Dropdowns):** Pure white with a more defined shadow (Offset: 0, 8px; Blur: 24px; Color: rgba(47, 41, 48, 0.10)).
- **Level 3 (Popovers):** Sharp 1px border using #D8A7B1 to provide extra definition without adding visual bulk.

## Shapes

The shape language is **Soft (0.25rem)**. This provides a professional, geometric foundation that feels architectural and precise, like a pattern-cutting board. 

- **Standard Elements (Inputs, Small Buttons):** 0.25rem (4px).
- **Cards & Containers:** 0.5rem (8px).
- **Large Components (Modals):** 0.75rem (12px).
- **Status Badges:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

### Buttons
- **Primary:** Background #8B5E83, Text #FFFFFF. Solid fill, no border.
- **Secondary:** Background #FFFFFF, Border 1.5px solid #8B5E83, Text #8B5E83.
- **Danger:** Background #C85C5C, Text #FFFFFF.
- **Size:** 40px height for standard, 32px for compact/table actions.

### Forms & Inputs
- **Inputs/Selects:** 1px border (#6F6870 at 20% opacity). On focus, border changes to #8B5E83 with a 2px subtle outer glow.
- **Date Pickers:** Use a clean calendar view with #8B5E83 for the selected date.
- **Search Bars:** Always include a leading icon (Magnifying glass) in #6F6870.

### Status Badges
- Used for order statuses (e.g., "In Progress," "Completed"). 
- Use a light background (10% opacity of the semantic color) and dark text (full opacity of the semantic color). 
- Text is always `label-sm` weight SemiBold.

### Tables & Lists
- **Header:** Background #F8F6F7, Text #2F2930, Weight SemiBold.
- **Rows:** 1px bottom border (#F8F6F7). Hover state uses a subtle #F8F6F7 background tint.
- **Cell Padding:** 12px vertical, 16px horizontal.

### Navigation
- **Sidebar:** Darker background (#2F2930) or a soft muted mauve background (#F8F6F7). Active items marked with a left-side vertical accent line in #8B5E83.
- **Header:** Fixed white background with a thin bottom border. Contains breadcrumbs and user avatar.

### Empty & Loading States
- **Empty States:** Center-aligned, using a simplified line-art icon of a needle or thread spool, with a clear Primary action button.
- **Loading:** A bespoke "stitching" animation or a standard circular spinner in #8B5E83.