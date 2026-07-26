import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, CreditCard, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import paymentImg from "@assets/generated_images/secure_payment_gateway_interface_with_indian_rupee.png";

export default function Subscription() {
  const { toast } = useToast();

  const handleSubscribe = (plan: string) => {
    // Subscription billing isn't built yet - no Stripe recurring-billing integration
    // exists behind this page. Be honest about that instead of faking a checkout redirect.
    toast({
      title: "Coming soon",
      description: `Subscriptions aren't live yet. We'll let you know as soon as the ${plan} plan is available.`,
    });
  };

  const plans = [
    {
      name: "Basic",
      price: "₹499",
      duration: "/month",
      description: "Essential tools for self-care and mindfulness",
      features: [
        "Daily Gita Wisdom",
        "Basic Mood Tracking",
        "Community Access",
        "1 Guided Meditation/day"
      ],
      popular: false
    },
    {
      name: "Premium",
      price: "₹1,499",
      duration: "/month",
      description: "Complete mental wellness journey",
      features: [
        "Unlimited AI Chat",
        "Advanced Analytics",
        "Priority Therapist Booking",
        "Full Meditation Library",
        "Video Consultations (2/mo)"
      ],
      popular: true
    },
    {
      name: "Family",
      price: "₹2,999",
      duration: "/month",
      description: "Wellness for your entire family",
      features: [
        "Up to 4 Profiles",
        "Family Counseling Sessions",
        "Parental Controls",
        "All Premium Features",
        "Dedicated Care Manager"
      ],
      popular: false
    }
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              Coming Soon
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 font-serif">Invest in Your Peace of Mind</h1>
            <p className="text-xl text-muted-foreground">
              Here's what we're planning. Subscriptions aren't live yet — let us know which plan you're
              interested in and we'll notify you the moment it launches.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
            {plans.map((plan, i) => (
              <Card key={i} className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl ${plan.popular ? 'border-primary shadow-lg scale-105 z-10' : 'border-border'}`}>
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 text-sm font-medium rounded-bl-xl">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.duration}</span>
                  </div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm">
                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full rounded-full ${plan.popular ? 'bg-primary hover:bg-primary/90' : 'bg-secondary hover:bg-secondary/80 text-foreground'}`}
                    size="lg"
                    onClick={() => handleSubscribe(plan.name)}
                  >
                    Notify Me When Available
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Security Badge Section */}
          <div className="bg-background border rounded-3xl p-8 md:p-12 shadow-sm max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-6 font-serif flex items-center gap-2">
                  <Shield className="w-8 h-8 text-green-600" />
                  Built on Bank-Grade Security
                </h3>
                <p className="text-muted-foreground mb-8">
                  When subscriptions launch, we'll process payments through Stripe — a globally trusted
                  payment processor — so your financial data is never stored on our own servers.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Encrypted Data</h4>
                      <p className="text-sm text-muted-foreground">End-to-end encryption for all sensitive information.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CreditCard className="w-5 h-5 text-primary mt-1" />
                    <div>
                      <h4 className="font-semibold mb-1">Secure Checkout</h4>
                      <p className="text-sm text-muted-foreground">Backed by Stripe's PCI-DSS Level 1 compliant infrastructure.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden border shadow-inner bg-slate-50">
                <img 
                  src={paymentImg} 
                  alt="Secure Payment Interface" 
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
