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
        <Link href="/">
          <a className="text-2xl font-serif font-bold text-primary flex items-center gap-2 drop-shadow-sm">
            Focus
          </a>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
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
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <Globe className="w-4 h-4" /> {lang}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLang("English")}>English</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Hindi")}>Hindi</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Tamil")}>Tamil</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLang("Bengali")}>Bengali</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="default" size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
            Get Started
          </Button>
        </div>

        {/* Mobile Nav Toggle */}
        <button
          className="md:hidden p-2"
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
          <Button className="w-full bg-primary text-primary-foreground rounded-full">Get Started</Button>
        </div>
      )}
    </nav>
  );
}
