# FoundFit → Foundation Fitness Adaptation Spec

## Goal
Adapt the existing Next.js 16 / React 19 / TypeScript app to match the design, branding, content, and page structure from the Hostinger export at `C:\Users\woodb\Downloads\foundfit-export\`.

## Reference Files
The Hostinger export is a Vite + React (JSX) app. Use it as a DESIGN REFERENCE only — do NOT copy code directly. Adapt patterns to Next.js App Router with TypeScript.

## 1. Branding Changes
- **Name:** "FoundFit" → "Foundation Fitness"
- **Logo icon:** Flame → Dumbbell (from lucide-react)
- **Brand text:** Use gradient text: `bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent`
- **Tagline:** "Transform Your Fitness Journey"
- **Focus:** Women's empowerment, supportive community

## 2. Color Theme (globals.css)
Replace the current warm/amber oklch theme with pink/purple/cyan. The reference uses Tailwind CSS v3 HSL vars. Since our project uses Tailwind v4 with oklch, convert accordingly:

### Target Palette (approximate oklch equivalents):
- **Primary:** Purple-600 area → oklch(0.50 0.20 300) 
- **Primary foreground:** White
- **Background:** Soft pink/purple/cyan gradient feel → oklch(0.97 0.01 320)
- **Accent colors:** Pink-500, Purple-500, Cyan-500 for gradients
- **Footer:** Dark gray-900 background

### Gradient Classes Used Throughout:
- Hero/CTA backgrounds: `bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500`
- Heading text: `bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent`
- Page background: `bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50`
- Buttons: `bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white`
- Feature icon boxes: `bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500`

## 3. Navigation
- Sticky top, white/80 with backdrop-blur-md
- Left: Dumbbell icon + "Foundation Fitness" gradient text
- Right: Location link (with MapPin icon), Login (ghost button), Get Started (gradient button)

## 4. Homepage Sections (src/app/page.tsx)
Rebuild to match the reference `HomePage.jsx`:

### Hero
- Large gradient heading: "Transform Your Fitness Journey"
- Subtitle: "Experience personalized training that adapts to your goals, schedule, and lifestyle"
- Two CTAs: "Book Your First Session" (gradient) + "View Pricing" (outline purple)
- Hero image below (use placeholder or reference the Hostinger CDN URL)

### Features (4 cards)
- Easy Booking (Calendar icon)
- Flexible Timing (Clock icon) 
- Flexible Payment (CreditCard icon)
- Expert Training (Trophy icon)
- White cards with shadow, gradient icon boxes

### Trainer Profile / About Section
- Two-column: image left, content right
- Decorative blurred circles (purple/pink)
- Tags: "Woman-Focused" (pink), "Community" (purple)
- Heading: "Empowering Women Through Fitness"
- Trainer bio: Caroline, 10+ years, certified PT / Nutrition Coach / Pre-Post Natal
- Quote from Caroline
- Two small cards: "One-on-One" and "Group Sessions"

### Pricing Section (6 tiers)
| Plan | Price | Note |
|------|-------|------|
| Pay As You Go | $40/session | 1-hour, flexible, no commitment |
| Buddy Session | $25/person | Train with a friend |
| 6-Week Plan | $125 one-time | Structured program, weekly check-ins |
| Unlimited Monthly | $200/month | **FEATURED/Popular** - purple gradient card |
| Buddy Unlimited | $150/person/mo | Best value |
| Meal Plan | $75/month | Add-on, customized plans |

### CTA Section
- Full-width gradient background (pink→purple→cyan)
- "Ready to Start Your Journey?"
- White "Sign Up Now" button

### Footer
- Dark gray-900 background
- 4 columns: Brand, Quick Links, Legal, Contact
- Contact: 6184 Mortimer CT NW, Acworth GA 30101
- Email: contact@foundationfitness.com
- Social icons: Instagram, Twitter, Facebook
- Copyright line

## 5. Page Structure (App Router)
Keep existing pages, add missing ones:

### Already exists (update styling):
- `/` - Homepage (major rework above)
- `/login` - Login page
- `/signup` - Signup page  
- `/dashboard` - Client dashboard (in (dashboard) group)
- `/trainer/*` - Trainer pages
- `/admin/*` - Admin pages
- `/book` - Booking page

### Add new pages:
- `/location` - Location page (map, address, directions)
- `/privacy-policy` - Privacy policy page
- `/booking-confirmation` - Public booking confirmation

### Auth notes:
- Admin check: email === 'foundationfitnessad@gmail.com'
- Roles: client, trainer, admin (from profiles table)

## 6. Supabase Configuration
Use the EXISTING Supabase project from the Hostinger export:
- URL: `https://lpkzufdjtrksbiazwiwv.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwa3p1ZmRqdHJrc2JpYXp3aXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTg5OTcsImV4cCI6MjA4MzAzNDk5N30.ynec0ex4X9zFy18QjGIDCrjLzvnPRrhdpJZ2ArzL9xw`

Create/update `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://lpkzufdjtrksbiazwiwv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxwa3p1ZmRqdHJrc2JpYXp3aXd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NTg5OTcsImV4cCI6MjA4MzAzNDk5N30.ynec0ex4X9zFy18QjGIDCrjLzvnPRrhdpJZ2ArzL9xw
```

The existing `src/lib/supabase/client.ts`, `server.ts`, and `middleware.ts` already use `@supabase/ssr` with env vars — this is correct. Just set the env vars.

## 7. Key Design Patterns
- **Font:** Inter (already configured)
- **Animations:** The reference uses framer-motion. We can add subtle CSS animations or keep it simple for now.
- **Glassmorphism:** bg-white/80 backdrop-blur-md on nav, bg-white/50 backdrop-blur-sm on sections
- **Cards:** rounded-2xl, shadow-xl, hover:shadow-2xl transition
- **Buttons:** Gradient primary buttons, ghost and outline variants
- **Responsive:** Mobile-first, grid layouts collapse properly

## 8. DO NOT Change
- The Next.js App Router structure pattern
- TypeScript (the reference is JSX but we stay with TSX)
- Supabase SSR auth pattern (client.ts, server.ts, middleware.ts)
- API routes structure
- shadcn/ui component library approach

## 9. Priority Order
1. Update globals.css theme colors
2. Rebuild homepage (page.tsx) with all sections
3. Update layout.tsx metadata for "Foundation Fitness"
4. Create Footer component
5. Update nav/sidebar styling
6. Add /location page
7. Add /privacy-policy page
8. Set up .env.local with Supabase credentials
9. Update login/signup pages styling to match theme
