import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Menu, X, Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState("English");

  const links = [
    { href: "/", label: "Home" },
    { href: "/services", label: "Services" },
    { href: "/therapists", label: "Professionals" },
    { href: "/recommendations", label: "Reads" },
    { href: "/about", label: "About" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/about">
            <a className="text-2xl font-serif font-bold text-primary flex items-center gap-2 drop-shadow-sm hover:opacity-90 transition-opacity">
              Focus
            </a>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <a
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    location === link.href
                      ? "text-primary font-bold"
                      : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </a>
              </Link>
            ))}
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-primary">
                <Globe className="w-4 h-4" /> {lang}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLang("English")}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Hindi")}>Hindi</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Tamil")}>Tamil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Bengali")}>Bengali</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Telugu")}>Telugu</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Marathi")}>Marathi</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Kannada")}>Kannada</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Malayalam")}>Malayalam</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Gujarati")}>Gujarati</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Punjabi")}>Punjabi</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link href="/profile">
            <Button variant="ghost" size="icon" className="rounded-full w-9 h-9">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20">
                <img 
                  src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&auto=format&fit=crop&q=60" 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              </div>
            </Button>
          </Link>

          <Link href="/login">
            <Button variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-6">
              Login
            </Button>
          </Link>
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
            <Link key={link.href} href={link.href}>
              <a
                className={cn(
                  "text-lg font-medium py-2",
                  location === link.href ? "text-primary" : "text-muted-foreground"
                )}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            </Link>
          ))}
          <Link href="/login">
            <Button className="w-full bg-primary text-primary-foreground rounded-full" onClick={() => setIsOpen(false)}>Login</Button>
          </Link>
        </div>
      )}
    </nav>
  );
}
