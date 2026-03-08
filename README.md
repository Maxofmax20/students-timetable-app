# Timetable Workspace V2.0

![Timetable Workspace Logo](file:///d:/ClaudeProjects/Timetable/public/globe.svg)

**The Ultimate Scheduling Platform for Educational Institutions**

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Prisma](https://img.shields.io/badge/Prisma-ORM-teal)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC)
![NextAuth](https://img.shields.io/badge/NextAuth-Secure-green)

Timetable Workspace V2.0 is a complete reimagining of the legacy student timetable application. Designed with a premium, modern SaaS aesthetic, it provides robust tools to visually manage courses, instructors, rooms, and student cohorts while actively preventing scheduling conflicts.

## ✨ Key Features

- **Advanced Timetable Grid:** Visually manage and edit courses on a calendar-style timetable grid.
- **Smart Conflict Detection:** Instantly highlights overlapping instructors, rooms, and cohorts.
- **Dedicated Management Pages:** Full CRUD control for Groups, Instructors, and Rooms.
- **Command Palette:** Lightning-fast navigation and actions via the ActionCenter.
- **Responsive & Dark Mode First:** A carefully crafted CSS custom-property design system with a stunning dark mode default.
- **OAuth Authentication:** Seamless Google and GitHub login powered by NextAuth.js.

## 📸 Screenshots

> Note: Screenshots of the Landing Page, Auth Flow, Dashboard, Grid View, Course Editor, and Settings sections will be added shortly.

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or later
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/timetable.git
   cd timetable
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   Copy your environment variables into `.env`.
   ```env
   DATABASE_URL="postgres://..."
   NEXTAUTH_SECRET="your-secret"
   NEXTAUTH_URL="http://localhost:3000"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   GITHUB_ID="your-github-id"
   GITHUB_SECRET="your-github-secret"
   ```

4. Run Database Migrations:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Start the Development Server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

## 🏗️ Architecture

```text
├── src
│   ├── app               # Next.js App Router
│   │   ├── auth          # Authentication Pages
│   │   ├── workspace     # Core App Module (Dashboard, Timetable, Courses, Settings)
│   │   └── api           # Serverless API routes
│   ├── components        # Reusable React UI Code
│   │   ├── ui            # Base primitives (Avatars, DatePickers, Modals)
│   │   ├── layout        # Global structural pieces (Sidebar, Header, AppShell)
│   │   └── workspace     # High-level feature components
│   ├── lib               # Utilities, Auth Options, database connections
│   └── types             # Strict TypeScript models
├── prisma                # Relational Database schema definition
└── public                # Static SVGs, generic assets
```

## 🤝 Contributing

Contributions are welcome! Please adhere to our established architecture, primarily pulling from the centralized GUI CSS custom variable design token system (`src/app/globals.css`).

## 📝 License

This project is licensed under the MIT License.
