# The Gents Dollhouse — Design System & Aesthetic Standard (Impeccable & Emil Kowalski)

This document defines the strict aesthetic standards, craft guidelines, and physical micro-interaction rules for **The Gents Dollhouse (TGD)**.

---

## 1. Brand Identity & Visual Atmosphere
* **Mood**: Luxury, exclusive, tactile, cinematic dark mode.
* **Core Contrast Principle**: Avoid flat, murky grays. Use deep obsidian backgrounds (`hsl(0 0% 7%)`) paired with warm off-white typography (`hsl(30 15% 94%)`) and glowing crimson accents (`hsl(0 85% 48%)`).
* **No AI Slop**:
  - Never use generic purple-to-blue gradients.
  - Never use unstyled raw HTML elements.
  - Never use arbitrary inline styling when semantic design tokens (`bg-background`, `text-primary`, `border-border/60`) are available.

---

## 2. Touch Ergonomics (Mobile-First)
* **Minimum Touch Target**: Every interactive element on mobile must have a minimum target of **44×44px** (buttons, nav items, icons) to prevent misclicks on touchscreens.
* **Safe Area Inset Handling**: All bottom-docked bars and floating buttons must include safe area padding:
  ```css
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem);
  ```
* **No Overlapping Dialogs**: Modals and sheets must sit at distinct z-indexes (`z-50` for modals, `z-40` for navigation, `z-30` for floating trays).

---

## 3. Motion & Micro-Physics (Emil Kowalski Rules)
* **Tactile Button Feedback**: Every pressable element must physically compress on touch:
  ```css
  button:not(:disabled):active {
    transform: scale(0.97) !important;
  }
  ```
* **Never Animate From `scale(0)`**:
  - In the real world, objects never spawn out of thin air.
  - Modals and popovers enter from `scale(0.95)` with `opacity: 0` to `scale(1)` with `opacity: 1` over **180–220ms**.
* **Custom Physical Easing**:
  - **Ease-out for entrances**: `cubic-bezier(0.23, 1, 0.32, 1)` (starts snappy, settles naturally).
  - **Drawer curve for sheets**: `cubic-bezier(0.32, 0.72, 0, 1)`.
  - **Spring curve for indicators**: `cubic-bezier(0.34, 1.56, 0.64, 1)`.
  - **Never use `ease-in` for UI animations** (it delays the initial movement and feels sluggish).

---

## 4. Typography & Visual Hierarchy
* **Primary Headings**: Bold/Black tracking-tight (`tracking-tight font-black`).
* **Sub-labels & Badges**: Uppercase with wide letter spacing (`text-[10px] uppercase font-bold tracking-wider`).
* **Numerical Metrics**: Use [`AnimatedCounter`](file:///home/hamisi/Downloads/mali/src/components/ui/AnimatedCounter.tsx) with cubic easing instead of static number snaps to make the dashboard feel active and live.

---

## 5. Media & Post Presentation
* **Feed Cards**: Rounded-2xl borders (`rounded-2xl border border-border/80 bg-card`).
* **Hover Lifts**: Smooth `translate-y-[-2px]` with subtle shadow bloom on card hover.
* **Video Previews**: Blurred background glow matching the media's primary tone.

