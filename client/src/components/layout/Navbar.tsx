import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Menu, X, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { logout } from "@/lib/api";
import { NotificationBell } from "@/components/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    try {
      // Call logout API to clear server session and cookie
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Invalidate auth query to clear cached user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Dispatch auth change event
      window.dispatchEvent(new Event('auth-change'));
      
      // Redirect to home if on protected pages
      if (window.location.pathname === '/profile' || window.location.pathname === '/professional-dashboard' || window.location.pathname.startsWith('/admin')) {
        window.location.href = '/';
      }
    }
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/therapists", label: "Professionals" },
    { href: "/recommendations", label: "Reads" },
    // Only show "For Professionals" if not logged in
    ...(!isAuthenticated ? [{ href: "/partner", label: "For Professionals" }] : []),
    { href: "/about", label: "About" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="text-2xl font-serif font-bold text-primary flex items-center gap-2 drop-shadow-sm hover:opacity-90 transition-opacity">
            Focus
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={cn(
              "text-sm font-medium transition-colors hover:text-primary",
              location === link.href
                ? "text-primary font-bold"
                : "text-muted-foreground"
            )}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <>
            <NotificationBell />
            <DropdownMenu onOpenChange={(open) => {
              if (open) window.dispatchEvent(new Event('hide-crisis-banner'));
            }}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full w-9 h-9" aria-label="Account menu">
                  <Avatar className="w-9 h-9 border border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {user?.fullName 
                        ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                        : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user?.role === 'admin' || user?.role === 'super_admin' ? (
                  <>
                    <Link href="/admin/feedback">
                      <DropdownMenuItem className="cursor-pointer">Admin Dashboard</DropdownMenuItem>
                    </Link>
                    <Link href="/admin/applications">
                      <DropdownMenuItem className="cursor-pointer">Professional Applications</DropdownMenuItem>
                    </Link>
                    <Link href="/admin/payments">
                      <DropdownMenuItem className="cursor-pointer">Payments & Refunds</DropdownMenuItem>
                    </Link>
                    <Link href="/admin/crisis-alerts">
                      <DropdownMenuItem className="cursor-pointer text-red-600">Crisis Alerts</DropdownMenuItem>
                    </Link>
                    <Link href="/admin/analytics">
                      <DropdownMenuItem className="cursor-pointer">Analytics</DropdownMenuItem>
                    </Link>
                  </>
                ) : user?.role === 'professional' ? (
                  <Link href="/professional-dashboard">
                    <DropdownMenuItem className="cursor-pointer">Professional Dashboard</DropdownMenuItem>
                  </Link>
                ) : (
                  <>
                    <Link href="/profile">
                      <DropdownMenuItem className="cursor-pointer">My Profile</DropdownMenuItem>
                    </Link>
                    <Link href="/wallet">
                      <DropdownMenuItem className="cursor-pointer">Wallet (₹0.00)</DropdownMenuItem>
                    </Link>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <Link href="/login">
              <Button variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
                Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Nav Toggle */}
        <button
          className="md:hidden p-2 text-muted-foreground hover:text-primary transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-background border-b p-4 flex flex-col gap-4 shadow-lg animate-in slide-in-from-top-5">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={cn(
              "text-lg font-medium py-2",
              location === link.href ? "text-primary" : "text-muted-foreground"
            )} onClick={() => setIsOpen(false)}>
              {link.label}
            </Link>
          ))}
          {isAuthenticated ? (
            <>
              {user?.role === 'admin' || user?.role === 'super_admin' ? (
                <>
                  <Link href="/admin/feedback" className="text-lg font-medium py-2 text-muted-foreground" onClick={() => setIsOpen(false)}>
                    Admin Dashboard
                  </Link>
                  <Link href="/admin/applications" className="text-lg font-medium py-2 text-muted-foreground" onClick={() => setIsOpen(false)}>
                    Professional Applications
                  </Link>
                  <Link href="/admin/payments" className="text-lg font-medium py-2 text-muted-foreground" onClick={() => setIsOpen(false)}>
                    Payments & Refunds
                  </Link>
                  <Link href="/admin/crisis-alerts" className="text-lg font-medium py-2 text-red-600" onClick={() => setIsOpen(false)}>
                    Crisis Alerts
                  </Link>
                  <Link href="/admin/analytics" className="text-lg font-medium py-2 text-muted-foreground" onClick={() => setIsOpen(false)}>
                    Analytics
                  </Link>
                </>
              ) : user?.role === 'professional' ? (
                <Link href="/professional-dashboard" className="text-lg font-medium py-2 text-muted-foreground" onClick={() => setIsOpen(false)}>
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/profile" className="text-lg font-medium py-2 text-muted-foreground" onClick={() => setIsOpen(false)}>
                    My Profile
                  </Link>
                  <Link href="/wallet" className="text-lg font-medium py-2 text-muted-foreground" onClick={() => setIsOpen(false)}>
                    Wallet (₹0.00)
                  </Link>
                </>
              )}
              <Button 
                variant="ghost" 
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" 
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
              >
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button className="w-full bg-primary text-primary-foreground rounded-full" onClick={() => setIsOpen(false)}>Login</Button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
