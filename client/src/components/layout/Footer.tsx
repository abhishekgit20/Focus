export function Footer() {
  return (
    <footer className="bg-muted/30 border-t py-12 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <h3 className="font-serif text-xl font-bold mb-4">SereneMind</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          A safe space for your mental wellness journey. 
          Connect with professionals, practice mindfulness, and find balance.
        </p>
        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
          <a href="#" className="hover:text-primary transition-colors">Contact</a>
        </div>
        <p className="mt-8 text-xs text-muted-foreground/50">
          © 2024 SereneMind. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
