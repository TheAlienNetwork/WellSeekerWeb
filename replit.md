# Peeker

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

## API Field Mapping (Certified Mapping Document)

### Well Dashboard Data Field Sources

**WS_Wells** (`/wells` endpoint - wellName parameter):
- Operator, Rig, Well, Job #, Wellbore, county, state, latitude, longitude, Push Time Stamp

**SelectedBHA** (`/well/drillString/getBha` endpoint - wellName | bhaNum parameters):
- Plug In, Unplug, PW, Probe Order, Itemized BHA, MWD Make, MWD Model
- UBHO SN, Helix SN, Helix Type, Pulser SN, Gamma SN, Directional SN, Battery SN (1, 2, 3), Shock Tool SN
- Svy Offset, Gam Offset, Stickup, Retrievable, Pin To Set Screw, GCF
- MWD Coordinator, Directional Coordinator, Pulser Version

**MySection** (`/well/drillString/getBhaHeaders` endpoint - wellName parameter):
- MWD #, BHA#, Section, Time In, Time Out, Depth In, Depth Out

**GetWellRunInfo** (`/well/wellInfo/getWellInfo`, `/well/motorReport`, `/well/actualWellData` endpoints):
- North Ref, VS, Grid Conv, Motor Fail, MWD Fail, POOH, MWD Comments
- SSQ, TFSQ, Crossover, DAO, Surface System Version, LIH, # Stalls, NPT
- MWD Min Temp, MWD Max Temp, DD Lead, MWD Lead, Plan Name

**Mags** (`/well/getMagnetics` endpoint - wellName parameter):
- Declination, MagField (bTotal), Dip, Mag Model, Mag Date

**Drilling Operations** (from BHA Headers):
- Circ Hrs, Drilling Hrs, BRT Hrs

## Recent Changes (Latest Session)
- ✅ **Fixed Critical Well Lookup** - Resolved well ID matching issue for formatted IDs (job-XXXX-XXXX format)
- ✅ **MWD Survey Station Integration** - Complete survey data table with `/survey/getSurveys` API
- ✅ **Updated Probe Order Endpoint** - Added `/api/update-probe-order` for MWD probe order updates
- ✅ **Vibrant Cyan Styling** - 185° 100% 50% color scheme with glassmorphism effects throughout
- ✅ **Accurate Field Mapping** - All dashboard fields mapped to correct Well Seeker Pro API endpoints

## User Preferences
- Professional, data-dense interface similar to Excel application
- Vibrant cyan tech aesthetic (185° 100% 50%) with glassmorphism
- IBM Plex Sans font family for enterprise feel
- Monospace fonts for technical data (IDs, coordinates, measurements)
- Clean, minimal design focused on data display efficiency
