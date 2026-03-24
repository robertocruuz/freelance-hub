# Freelance Hub

Freelance Hub is a comprehensive B2B SaaS platform focused on complete management for freelancers and small agencies. The system centralizes essential business operations, from lead capture and pipeline control to service delivery, time management, and invoicing.

The platform relies on a "Premium" visual interface, guided by *Flat Design* principles and a modern *Bento Grid Layout*, offering an immersive, responsive, and efficient experience.

## ✨ Key Features

- **Bento Grid Dashboard**: An executive overview condensing financial indicators, CRM status, budget summaries, active chronometers, daily/weekly tasks in an interactive calendar, and an active team block without information overload.
- **CRM & Client Management (Leads)**: Pipeline-structured internal CRM managing contacts, opportunities, values, and negotiation stages. Supports client logo uploads and **Custom Color per Client** dynamically applied throughout the platform's UI elements via YIQ contrast calculations.
- **Project & Task Management (Kanban)**: Supports project creation inheriting client logos/colors or using independent custom colors. Drag-and-drop Kanban interface for task tracking with priority tags, deadlines, and multi-user assignments.
- **Time Tracking**: Strict control of billable hours using a continuous global timer (Chronometer) or retroactive logging. Beautifully designed Timesheet reports easily exported to PDF.
- **Budgets & Invoicing**: High-fidelity commercial proposals converted directly to corporate PDFs and seamlessly turned into active projects upon approval (preventing duplicates). Clear tracking of payables/receivables with filtered visibility based on user roles (Admin/Collaborator).
- **Realtime Collaboration, Chat & Notifications**: Tasks, chat messages (Channels/DMs), and notifications update instantly across all team members without refreshing, thanks to Supabase Realtime integration.

## 🛠️ Technologies Used

- **Frontend**: React.js, TypeScript, Vite
- **UI & Animation**: Tailwind CSS, Shadcn UI (Radix UI) highly customized, Lucide React, Recharts, Framer Motion, Tailwind Animate
- **Backend (BaaS)**: Supabase (PostgreSQL, Authentication, Realtime Database, Edge Storage)
- **State & Data Fetching**: React Query
- **Utilities**: jsPDF (Report generation), date-fns, dnd-kit (Drag and Drop)

## 🚀 Getting Started

### Prerequisites

- Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

### Local Installation

1. Clone the repository:
   ```bash
   git clone <YOUR_GIT_URL>
   ```

2. Navigate to the project directory:
   ```bash
   cd freelance-hub
   ```

3. Install the necessary dependencies:
   ```bash
   npm i
   ```

4. Configure environment variables (you will need a Supabase project instance):
   Create a `.env` file in the root directory and add the necessary `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables.

5. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 Editing Code

You can make changes to this code in any IDE. Pushed changes will immediately be visible on your local server.

The project utilizes Vite for Fast Refresh, delivering an instant iteration loop.
