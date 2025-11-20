# Well Seeker Pro Web Application

A modern web-based application for accessing and managing well data from the Well Seeker Pro (Innova Cloud Portal) API. This application provides a professional interface for viewing well information, BHA components, drilling parameters, and tool data.

## Features

- **User Authentication**: Secure login with Well Seeker Pro credential validation
- **Wells Management**: Browse and search through available wells
- **Well Details**: Comprehensive view of well information including:
  - Facility details and coordinates
  - BHA (Bottom Hole Assembly) components
  - Drilling parameters
  - Tool components and configurations
- **Professional UI**: Clean, data-dense interface optimized for oil & gas professionals
- **Dark Mode**: Built-in theme support for different lighting conditions
- **Responsive Design**: Works on desktop and mobile devices

## Setup

### Prerequisites

- Node.js 20 or higher
- Well Seeker Pro credentials (username, password, product key)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   
   Add your Well Seeker Pro credentials to the Replit Secrets:
   - `WELLSEEKER_USERNAME` - Your Well Seeker Pro username
   - `WELLSEEKER_PASSWORD` - Your Well Seeker Pro password
   - `WELLSEEKER_PRODUCT_KEY` - Product key provided by Innova Drilling

   The application will validate these credentials on login.

3. Start the development server:
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5000`

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, Express Session
- **State Management**: TanStack Query (React Query)
- **API**: Well Seeker Pro (ICP API) - https://www.icpwebportal.com/api/

## Well Seeker Pro Integration

The application authenticates with the Well Seeker Pro API and caches access tokens for efficient API usage. All API calls include automatic token refresh on expiration.

### API Endpoints Used

The application connects to these Well Seeker Pro API endpoints:
- `POST /api/authToken` - Authentication
- `GET /api/jobList` - List of wells/jobs
- `GET /api/job/{jobNum}` - Well/job details
- `GET /api/bha/{jobNum}/{runNum}` - BHA components for a specific run
- `GET /api/runList/{jobNum}` - Available BHA runs for a job
- `GET /api/run/{jobNum}/{runNum}` - Drilling parameters for a specific run
- `GET /api/toolComponents/{jobNum}/{runNum}` - Tool components for a specific run

### Configuration

1. Add your credentials to Replit Secrets:
   - `WELLSEEKER_PRODUCT_KEY` - Your Well Seeker Pro product key

2. Users log in with their Well Seeker Pro username and password

### Deployment

To deploy the application:
1. Ensure all secrets are configured
2. Click the "Deploy" button in Replit
3. The application will be published and accessible via the deployment URL

The deployment uses the production build with optimized assets and server-side rendering.

## Usage

1. **Login**: Enter your email and password (validated against Well Seeker Pro)
2. **View Wells**: Browse the list of available wells, use search to filter
3. **Select Well**: Click on a well to view detailed information
4. **View Details**: Navigate through tabs to see BHA components, drilling parameters, and tool components
5. **Refresh Data**: Use the refresh button to update data from the API

## Development

### Project Structure

```
client/src/
  components/      # Reusable UI components
  pages/          # Page components
  lib/            # API client and utilities

server/
  routes.ts       # API endpoints and Well Seeker Pro integration
  storage.ts      # Session and token storage

shared/
  schema.ts       # TypeScript types and API interfaces
```

### Key Files

- `server/routes.ts` - Backend API routes and Well Seeker Pro integration
- `client/src/lib/api.ts` - Frontend API client
- `shared/schema.ts` - Shared TypeScript types

## Support

For Well Seeker Pro API access or questions, contact: [email protected]

## License

Proprietary - For authorized use only
