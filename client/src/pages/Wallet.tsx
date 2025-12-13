import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, CreditCard, ShieldCheck, ArrowRight, Zap, Gift, Lock, UserCheck, Headset } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WalletPage() {
  const { toast } = useToast();

  const handleRecharge = (amount: number, bonus: number) => {
    toast({
      title: "Redirecting to Payment Gateway",
      description: `Initiating secure recharge of ₹${amount} (+ ₹${bonus} Bonus)`,
    });
  };

  const rechargePacks = [
    { amount: 200, bonus: 0, tag: null },
    { amount: 500, bonus: 50, tag: "Popular" },
    { amount: 1000, bonus: 150, tag: "Best Value" },
    { amount: 2000, bonus: 400, tag: "Super Saver" },
    { amount: 5000, bonus: 1200, tag: null },
    { amount: 10000, bonus: 3000, tag: "Mega Pack" },
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/30 pb-20">
        {/* Wallet Header */}
        <div className="bg-primary text-primary-foreground pt-12 pb-24 rounded-b-[3rem] shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="text-3xl font-bold mb-2 font-serif">My Wallet</h1>
            <p className="opacity-90 mb-8">Recharge to talk to therapists and gurus</p>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-sm mx-auto flex flex-col items-center">
              <span className="text-sm font-medium opacity-80 mb-1">Current Balance</span>
              <div className="text-5xl font-bold flex items-start">
                <span className="text-2xl mt-2">₹</span>0.00
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-12 relative z-20">
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            
            {/* Recharge Options */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-background rounded-3xl shadow-sm border p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Add Money to Wallet</h2>
                    <p className="text-sm text-muted-foreground">Balance never expires</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {rechargePacks.map((pack, i) => (
                    <button
                      key={i}
                      onClick={() => handleRecharge(pack.amount, pack.bonus)}
                      className="relative group border-2 border-muted hover:border-primary rounded-xl p-4 transition-all hover:shadow-md text-left bg-card"
                    >
                      {pack.tag && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                          {pack.tag}
                        </span>
                      )}
                      <div className="font-bold text-lg mb-1">₹{pack.amount}</div>
                      {pack.bonus > 0 ? (
                        <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                          <Gift className="w-3 h-3" /> Get ₹{pack.bonus} Extra
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Standard Pack</div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-blue-50 text-blue-800 rounded-xl text-sm flex gap-3 items-start border border-blue-100">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <p>Your payment is 100% secure. We use 256-bit encryption to protect your financial information.</p>
                </div>
              </div>

              {/* Transactions Preview */}
              <div className="bg-background rounded-3xl shadow-sm border p-6">
                <h3 className="font-bold text-lg mb-4">Recent Transactions</h3>
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No transactions yet. Recharge to start your journey.
                </div>
              </div>
            </div>

            {/* Sidebar info */}
            <div className="space-y-6">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <CardContent className="p-6 relative z-10">
                  <h3 className="font-bold text-xl mb-4">Why Recharge?</h3>
                  <ul className="space-y-4">
                    <li className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold">Pay per minute</div>
                        <div className="text-sm text-white/70">Only pay for the time you speak</div>
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold">Money Back Guarantee</div>
                        <div className="text-sm text-white/70">If you're not satisfied with the session</div>
                      </div>
                    </li>
                  </ul>
                  <Button className="w-full mt-6 bg-white text-slate-900 hover:bg-white/90 font-bold" variant="secondary">
                    Read Refund Policy
                  </Button>
                </CardContent>
              </Card>

              <div className="bg-background rounded-2xl border p-6">
                 <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                   <ShieldCheck className="w-5 h-5 text-green-600" />
                   Trust & Safety
                 </h3>
                 <div className="space-y-4">
                   <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                       <Lock className="w-4 h-4" />
                     </div>
                     <div>
                       <div className="font-semibold text-sm">Secure Payments</div>
                       <div className="text-xs text-muted-foreground">256-bit SSL Encrypted</div>
                     </div>
                   </div>
                   <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                       <UserCheck className="w-4 h-4" />
                     </div>
                     <div>
                       <div className="font-semibold text-sm">Verified Partners</div>
                       <div className="text-xs text-muted-foreground">100% Background Checked</div>
                     </div>
                   </div>
                   <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                       <Headset className="w-4 h-4" />
                     </div>
                     <div>
                       <div className="font-semibold text-sm">24/7 Support</div>
                       <div className="text-xs text-muted-foreground">Instant Help Available</div>
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
