import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t py-12 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <Link href="/about">
          <h3 className="font-serif text-3xl font-bold mb-4 text-primary hover:text-primary/80 transition-colors cursor-pointer inline-block tracking-tight">Focus</h3>
        </Link>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          An Integrated Mental Health Platform for India.
          Connecting you with verified professionals and ancient wisdom.
        </p>
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
          <a href="#" className="hover:text-primary transition-colors">Contact</a>
        </div>
        <p className="mt-8 text-xs text-muted-foreground/50">
          © 2025 Focus India. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
