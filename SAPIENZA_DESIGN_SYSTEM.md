# Sapienza Foiling Team Design System

This document extracts the core design tokens and UI components from the Sapienza Foiling Team website for use in other projects.

## 🎨 Design Tokens

### Colors

Mainly based on the official Sapienza branding with a modern, high-contrast twist.

| Name                   | Hex       | Variable        | Usage                                      |
| ---------------------- | --------- | --------------- | ------------------------------------------ |
| **Sapienza Burgundy**  | `#822433` | `--brand`       | Primary buttons, links, branding elements. |
| **Brand Dark**         | `#6b1d28` | `--brand-dark`  | Hover states, darker backgrounds.          |
| **Brand Light**        | `#a34252` | `--brand-light` | Accents, lighter hover states.             |
| **Void (Deep Black)**  | `#0a0808` | `--void`        | Hero backgrounds, deep dark mode.          |
| **Carbon**             | `#141212` | `--carbon`      | Secondary dark backgrounds.                |
| **Background (Light)** | `#fffcfd` | `--background`  | Standard page background.                  |
| **Foreground (Dark)**  | `#1a1718` | `--foreground`  | Default text color.                        |

### Typography

The design uses a mix of modern sans-serifs and bold, high-impact fonts.

- **Primary Sans:** `Geist` (Modern, neutral, highly readable)
- **Brand/Display:** `Syne` (Bold, geometric, high-impact for headings)
- **Fallback:** `Kelson` (Secondary geometric sans-serif)

### Animations (Tailwind + Framer Motion)

- **`fade-in-up`**: Smooth upward entrance.
- **`float`**: Subtle vertical hovering effect for icons/buttons.
- **`bounce-slow`**: Attention-grabbing movement.

---

## 🏗️ Component Library

### 1. Navigation Shells

#### Navbar (Floating Island)

A rounded, centered navbar that feels modern and lightweight.

- **Mobile:** Expands into a full-width menu.
- **Desktop:** Floating pill shape with a glassmorphism effect.

```tsx
// Tailwind Classes
const navbarClass = "fixed top-0 left-0 right-0 z-50 px-4 py-3";
const containerClass =
  "bg-white text-black font-semibold text-center mx-auto max-w-4xl shadow-xl rounded-full px-6 py-3 flex items-center justify-between";
const brandButton =
  "px-6 py-2 bg-[#822433] text-white rounded-full hover:bg-[#6b1d28] transition-all";
```

### 2. Heroes

#### Main Hero (Immersive)

Uses a full-screen image background with a dark overlay and bold, uppercase staggered headings.

- **Headline 1:** `text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter`
- **Headline 2:** `text-white/80 font-bold uppercase tracking-tight`

#### Page Hero (Patterned)

Uses a radial dot pattern and large blurred color blobs for depth.

- **Background Pattern:** `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)`
- **Glass Card Icon:** `p-5 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10`

### 3. Layouts

#### Page Layout (Floating Content)

A signature layout where the content sits in a large, rounded white card over a dark burgundy background.

```tsx
<main className="min-h-screen bg-[#6b1d28] pt-32">
  <div className="relative z-10 mx-4">
    <div className="max-w-7xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden min-h-[600px] mb-10">
      {children}
    </div>
  </div>
</main>
```

### 4. Footer

A high-contrast footer featuring a massive "watermark" text.

- **Watermark:** `text-[8rem] font-black text-black/5 tracking-widest select-none`
- **Standard Links:** `text-gray-400 hover:text-[#822433] transition-colors`

---

## 🛠️ Implementation Snippets (Tailwind Config)

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#822433",
          dark: "#6b1d28",
          light: "#a34252",
        },
        void: "#0a0808",
        carbon: "#141212",
      },
      fontFamily: {
        geist: ["var(--font-geist)", "sans-serif"],
        syne: ["var(--font-syne)", "sans-serif"],
      },
      animation: {
        "fade-in-up": "fadeInUp 0.8s ease-out forwards",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
    },
  },
};
```
