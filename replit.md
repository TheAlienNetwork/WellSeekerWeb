# Well Seeker Pro Web Application

## Overview
A web-based application that connects to the Well Seeker Pro (Innova Cloud Portal) API to display well information, BHA components, drilling parameters, and tool data for oil & gas operations.

## Current State
- ✅ Professional UI matching Excel application design
- ✅ Session-based authentication with Well Seeker Pro validation
- ✅ Frontend pages: Login, Dashboard, Wells List, Well Details
- ✅ **NEW: Modern Dashboard** - Grid-style layout with comprehensive well data visualization
- ✅ Data visualization components: Well Details Header, BHA Data Table, Drilling Parameters Panel, Tool Components Panel
- ✅ Responsive design with dark mode support
- ✅ API client with error handling and loading states

## Architecture
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express.js with session management
- **API Integration**: Well Seeker Pro (ICP API)
- **State Management**: TanStack Query (React Query)
- **Storage**: In-memory (MemStorage) for session data and token caching

## Well Seeker Pro Integration

### Authentication Flow
1. User enters email and password
2. Backend validates credentials by attempting to obtain a Well Seeker Pro API token
3. On success, creates a session and caches the token
4. All subsequent API calls use the cached token with automatic retry on 401

### API Endpoints
The application currently uses mock data for well information while the Well Seeker Pro API structure is being configured. The backend is set up to integrate with:
- `POST /api/authToken` - Authentication
- Well list endpoint (to be configured)
- Well details endpoint (to be configured)
- BHA components endpoint (to be configured)
- Drilling parameters endpoint (to be configured)
- Tool components endpoint (to be configured)

### Configuration Required
To connect to Well Seeker Pro, set these environment variables:
- `WELLSEEKER_USERNAME` - Your Well Seeker Pro username
- `WELLSEEKER_PASSWORD` - Your Well Seeker Pro password
- `WELLSEEKER_PRODUCT_KEY` - Product key provided by Innova

The app includes automatic token caching and refresh logic to minimize API calls.

## Project Structure
```
client/
  src/
    components/       # Reusable UI components
    pages/           # Page components (login, dashboard, wells, well-details)
    lib/             # API client and utilities
server/
  routes.ts         # API endpoints
  storage.ts        # In-memory storage interface
shared/
  schema.ts         # TypeScript types and API interfaces
```

## Recent Changes (Latest Session)
- **Enhanced Visual Design System**:
  - Added vibrant color scheme with success (green), warning (amber), info (cyan), and destructive (red) variants
  - Extended Badge component to support new color variants (success, warning, info)
  - Added comprehensive icon integration using lucide-react throughout the application
  
- **Dashboard Page Enhancements**:
  - Added colorful icons to all data cards (MapPin, Drill, Clock, Users, Gauge, Calendar, etc.)
  - Implemented color-coded status badges with CheckCircle2/XCircle icons
  - Enhanced visual hierarchy with better spacing and typography
  - Improved loading states and error handling
  
- **Wells Page Improvements**:
  - Added database icon to page header for better visual identity
  - Enhanced search input with search icon
  - Implemented dynamic filtered badge indicator showing search results count
  - Added icons to Rig (Drill) and Operator (Building2) columns in table
  - Improved status badge logic with color-coded variants based on well status
  - Made job numbers bold and well names medium weight for better scanability
  
- **Data Flow Verification**:
  - Confirmed well selection flow works correctly: WellsPage → App.tsx → Dashboard
  - Dashboard properly receives selectedWell prop and displays data based on wellId from URL or prop
  - All components properly integrated with TanStack Query for data fetching

## Next Steps
1. Configure actual Well Seeker Pro API endpoints (once documentation is available)
2. Add proper endpoint mapping for wells, BHA, drilling parameters
3. Implement dynamic BHA run list fetching
4. Add report generation functionality
5. Implement real-time data refresh capabilities

## User Preferences
- Professional, data-dense interface similar to Excel application
- IBM Plex Sans font family for enterprise feel
- Clean, minimal design focused on data display efficiency
- Monospace fonts for technical data (IDs, coordinates, measurements)
