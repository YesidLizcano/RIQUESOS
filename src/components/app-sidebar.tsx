'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Receipt,
  Truck,
  LogOut,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Lotes', href: '/lotes', icon: Package },
  { label: 'Ventas', href: '/ventas', icon: ShoppingCart },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'Proveedores', href: '/proveedores', icon: Truck },
  { label: 'Gastos Fijos', href: '/gastos', icon: Receipt },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Riquesos</span>
            <span className="text-xs text-muted-foreground">Gestión de Quesos</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <form action="/api/auth/signout" method="POST" className="w-full">
          <Button
            variant="ghost"
            size="default"
            className="w-full justify-start gap-2"
            type="submit"
          >
            <LogOut className="size-4" />
            <span>Cerrar sesión</span>
          </Button>
        </form>
      </SidebarFooter>
    </Sidebar>
  );
}