# LeadVault: LinkedIn Lead Management System

## 🚀 How to Load the Chrome Extension (IMPORTANT)
This project uses **TypeScript** and **Tailwind CSS**. Chrome cannot run the source files (`.ts`, `@tailwind`) directly. You must load the **compiled** files from the `dist` folder.

1.  Open your terminal in the `extension` directory.
2.  Run **`npm run build`** (this converts all `.ts` to `.js` and prepares the `dist` folder).
3.  Open Chrome and go to `chrome://extensions/`.
4.  Enable **"Developer mode"** (top right).
5.  Click **"Load unpacked"**.
6.  Select the **`extension/dist`** folder.

**Note on Background Script:** Even though you see `background.ts` in your source code, the manifest correctly points to `background.js` inside the `dist` folder. This is standard for modern TypeScript extensions!

---

A premium, full-stack solution for scraping LinkedIn profiles and managing leads in a lavish dashboard.

## 🚀 Getting Started

### 1. Next.js Dashboard Setup

Navigate to the `dashboard` directory:
```bash
cd dashboard
npm install
```

Configure your environment:
Create a `.env` file (already initialized with SQLite):
```env
DATABASE_URL="file:./dev.db"
```

Initialize the database:
```bash
npx prisma db push
npx prisma generate
```

Run the development server:
```bash
npm run dev
```
The dashboard will be available at [http://localhost:3000](http://localhost:3000).

---

### 2. Chrome Extension Setup

Navigate to the `extension` directory:
```bash
cd extension
npm install
npm run build
```

#### Installing in Chrome:
1. Open Chrome and go to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top right).
3. Click **Load unpacked**.
4. Select the `extension/dist` folder (ensure the `manifest.json` is present there).

---

## 🛠 Features

### Chrome Extension
- **Automated Scraping**: Extract name, title, company, location, bio, and more from any LinkedIn profile (`linkedin.com/in/*`).
- **One-Click Save**: Instantly send leads to your dashboard using the "Save to Dashboard" button.
- **Premium UI**: Dark-themed, animated popup with status indicators.

### Dashboard
- **Analytics Overview**: Real-time stats for total leads, new today, and qualified prospects.
- **Leads Table**: Comprehensive management view with search, filtering, and status tracking.
- **Lead Detail**: Deep-dive profile view with notes, tags, and direct LinkedIn links.
- **Lavish Design**: High-end dark mode aesthetics with glassmorphism and smooth animations.

## 🧰 Tech Stack
- **Extension**: Vite, TypeScript, Tailwind CSS, Manifest V3.
- **Dashboard**: Next.js 14 (App Router), Prisma ORM, SQLite, Shadcn/UI, Lucide React, Framer Motion.
