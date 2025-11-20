import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Database, LayoutDashboard, Settings, LogOut, FileText, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userEmail?: string;
}

const menuItems = [
  { title: "Dashboard", icon: Gauge, page: "dashboard" },
  { title: "Wells", icon: Database, page: "wells" },
  { title: "Well Details", icon: LayoutDashboard, page: "details" },
  { title: "Reports", icon: FileText, page: "reports" },
  { title: "Settings", icon: Settings, page: "settings" },
];

export function AppSidebar({ currentPage, onNavigate, onLogout, userEmail }: AppSidebarProps) {
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-semibold">Well Seeker Pro</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => onNavigate(item.page)}
                    isActive={currentPage === item.page}
                    data-testid={`button-nav-${item.page}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="space-y-2">
          {userEmail && (
            <p className="text-sm text-muted-foreground truncate" data-testid="text-user-email">{userEmail}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onLogout}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
