# Modern CRM Application

A beautiful, modern Customer Relationship Management (CRM) application built with Next.js 14, TypeScript, and Supabase. Features an Anthropic-inspired design with warm beige/cream color palette and clean, professional aesthetics.

## Features

- 🔐 **Authentication** - Secure login/signup with Supabase Auth
- 📊 **Dashboard** - Comprehensive metrics and performance overview
- 👥 **Contact Management** - Add, edit, and search contacts
- 🏢 **Company Management** - Organize business relationships
- 💼 **Deal Pipeline** - Drag-and-drop deal tracking with stages
- 📱 **Responsive Design** - Works seamlessly on mobile and desktop
- 🎨 **Anthropic-Inspired Design** - Warm, professional aesthetic

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom Anthropic-inspired theme
- **UI Components**: Shadcn/ui
- **Backend**: Supabase (Authentication, Database, Storage)
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React

## Design System

### Color Palette
- **Primary Background**: Warm beige/cream (#F5F3F0, #EAE7E3)
- **Text**: High contrast black for readability
- **Accent**: Coral/orange (#E07856, #D16849) for interactive elements
- **Typography**: Inter font family for clean, modern appearance

### Design Principles
- Minimalist interface with generous whitespace
- Soft, rounded corners on cards and buttons
- Professional, calming aesthetic
- Clear visual hierarchy and intuitive navigation

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create a new Supabase project
   - Copy the project URL and anon key
   - Update `.env.local` with your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Set up the database**
   - Run the SQL schema found in `supabase_schema.sql` in your Supabase SQL editor
   - This will create all necessary tables with proper relationships and RLS policies

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Visit [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
crm-app/
├── app/                          # Next.js 14 App Router
│   ├── (auth)/                   # Authentication routes
│   │   ├── login/
│   │   └── signup/
│   ├── (dashboard)/              # Protected dashboard routes
│   │   ├── dashboard/
│   │   ├── contacts/
│   │   ├── companies/
│   │   ├── deals/
│   │   └── settings/
│   ├── globals.css              # Global styles and Tailwind imports
│   └── layout.tsx               # Root layout
├── components/                   # Reusable components
│   ├── ui/                      # Shadcn/ui components
│   └── dashboard/               # Dashboard-specific components
├── lib/                         # Utility functions
│   ├── supabase.ts             # Supabase client configuration
│   └── utils.ts                # General utilities
├── types/                       # TypeScript type definitions
│   └── supabase.ts             # Database type definitions
├── middleware.ts                # Next.js middleware for auth
├── supabase_schema.sql          # Database schema
└── tailwind.config.ts           # Tailwind configuration
```

## Key Features Explained

### Authentication Flow
- Secure authentication using Supabase Auth
- Protected routes with middleware
- Automatic redirects for authenticated/unauthenticated users

### Dashboard
- Real-time metrics and KPIs
- Recent activity feed
- Performance overview with progress indicators

### Contact Management
- Add, edit, and delete contacts
- Search and filter functionality
- Company associations and contact details

### Deal Pipeline
- Visual kanban-style pipeline
- Drag-and-drop between stages
- Deal value tracking and close date management

### Responsive Design
- Mobile-first approach
- Collapsible sidebar navigation
- Optimized touch interactions

## Database Schema

The application uses a PostgreSQL database with the following main tables:
- `contacts` - Customer contact information
- `companies` - Business organization data
- `deals` - Sales opportunities and pipeline
- `activities` - Activity logs and interactions

All tables include Row Level Security (RLS) policies to ensure data isolation between users.

## Development

### Adding New Features
1. Create new pages in the appropriate route group
2. Add navigation items to the sidebar component
3. Implement the UI using existing design patterns
4. Connect to Supabase for data persistence

### Styling Guidelines
- Use the predefined color palette (`cream`, `coral`, etc.)
- Follow the existing spacing and typography patterns
- Maintain the minimalist, professional aesthetic
- Ensure responsive design for all components

## Deployment

The application can be deployed to Vercel, Netlify, or any platform supporting Next.js:

1. Build the application: `npm run build`
2. Set environment variables on your hosting platform
3. Deploy the built application

## License

This project is licensed under the MIT License.
