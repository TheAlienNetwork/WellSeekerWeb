# Well Seeker Pro Web Application - Design Guidelines

## Design Approach
**Design System:** Carbon Design System (IBM) - optimized for enterprise data-heavy applications with complex workflows and technical information density.

**Rationale:** Oil & gas industry professionals require efficient data access, clear information hierarchy, and robust table/form components. Carbon excels at data visualization, complex forms, and technical dashboards.

## Core Design Elements

### A. Typography
- **Primary Font:** IBM Plex Sans (via Google Fonts CDN)
- **Monospace Font:** IBM Plex Mono (for technical data, IDs, coordinates)
- **Scale:**
  - Page headers: 32px semibold
  - Section headers: 24px semibold  
  - Subsection headers: 18px medium
  - Body text: 14px regular
  - Data tables: 13px regular
  - Captions/labels: 12px regular
  - Technical IDs/codes: 13px monospace

### B. Layout System
**Spacing Units:** Tailwind units of 1, 2, 4, 6, 8, 12, 16, 24 for consistent rhythm throughout
- Component padding: p-4 to p-6
- Section spacing: py-8 to py-12
- Card margins: m-4
- Form field gaps: gap-4
- Table cell padding: p-2 to p-4

**Grid Structure:**
- Main application: Sidebar (280px fixed) + Content area (flex-1)
- Data tables: Full-width with horizontal scroll when needed
- Forms: 2-column layouts on desktop (grid-cols-2), single column on mobile
- Dashboard metrics: 3-4 column grid (grid-cols-3 lg:grid-cols-4)

### C. Component Library

**Authentication**
- Centered login card (max-w-md) on neutral background
- Email and password inputs with clear validation states
- Primary action button for sign in
- Minimal branding header

**Navigation**
- Left sidebar navigation with collapsed/expanded states
- Clear section grouping: Wells, BHA Data, Drilling Parameters, Reports
- Active state highlighting for current section
- User profile and logout at sidebar bottom

**Well Selection Interface**
- Searchable data table with sortable columns
- Filters for: Operator, Rig, Status, Date Range
- Well ID, Name, Location, Operator, Rig columns
- Selection highlights entire row
- Pagination for large datasets

**Well Details Dashboard**
- Top summary card with key info: Well Name, ID, Operator, Rig, Status
- Tabbed interface for different data categories
- Facility details section with coordinate data, dates, and technical specs
- Icon indicators for status (active/inactive/completed)

**BHA Data Display**
- Dropdown selector for Run/Section number
- Data table with columns: Component, Type, OD, ID, Length, Weight, Connections
- Tool component rows with technical specifications
- Expandable rows for detailed component information

**Drilling Parameters Panel**
- Metric cards in grid layout showing:
  - Depth In/Out with unit labels
  - Circulation Hours
  - Total Footage
  - Drill Hours
  - Plug/Unplug Times
- Real-time update indicators
- Timestamp of last refresh

**Data Tables**
- Zebra striping for readability
- Fixed header on scroll
- Sortable column headers with arrow indicators
- Row hover states for interaction feedback
- Compact row height for data density
- Horizontal scroll for wide tables

**Forms & Inputs**
- Clear field labels above inputs
- Helper text below fields when needed
- Validation states: error (red), success (green), warning (yellow)
- Disabled state with reduced opacity
- Required field indicators (*)

### D. Layout Specifications

**Login Page**
- Centered card on full-screen neutral background
- No hero imagery - professional utility focus
- Clean, minimal interface

**Main Application**
- Persistent left sidebar navigation
- Top bar with well selector dropdown and refresh button
- Content area with section headers and breadcrumbs
- Sticky headers for tables when scrolling

**Well List View**
- Full-width data table as primary element
- Search and filter controls above table
- Bulk action toolbar when rows selected
- Quick stats summary above table (Total Wells, Active, Completed)

**Well Details View**
- Horizontal tabs for: Overview, BHA, Drilling Parameters, Survey Data, Reports
- Each tab contains relevant data tables and forms
- Consistent padding and spacing across all tabs

## Images
No large hero images or marketing imagery. This is a professional data application.

**Icons Only:**
- Navigation icons from Heroicons (outline style)
- Status indicators (checkmarks, alerts, info icons)
- Tool/component icons for BHA visualization
- Refresh/sync icons for data updates

**Optional Technical Diagrams:**
- BHA schematic visualization (if available from API)
- Well trajectory diagrams
- These should be functional, not decorative

## Key Principles
- **Data First:** Maximize information density without overwhelming users
- **Professional Efficiency:** Minimize clicks to access critical data
- **Clear Hierarchy:** Use typography and spacing to guide attention to important information
- **Technical Precision:** Monospace fonts for IDs, coordinates, and measurements
- **Consistent Updates:** Visual feedback for data refresh states
- **Responsive Tables:** Horizontal scroll on mobile, full-width on desktop
- **No Animations:** Static, stable interface for professional data work