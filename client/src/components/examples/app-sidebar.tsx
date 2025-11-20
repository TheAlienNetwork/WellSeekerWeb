import { useState } from 'react';
import { AppSidebar } from '../app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';

export default function AppSidebarExample() {
  const [currentPage, setCurrentPage] = useState('wells');

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar
          currentPage={currentPage}
          onNavigate={(page) => {
            console.log('Navigate to:', page);
            setCurrentPage(page);
          }}
          onLogout={() => console.log('Logout clicked')}
          userEmail="user@example.com"
        />
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-semibold">Current Page: {currentPage}</h1>
        </div>
      </div>
    </SidebarProvider>
  );
}
