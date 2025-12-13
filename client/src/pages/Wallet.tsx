import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Wallet, CreditCard, ShieldCheck, Zap, Gift, Lock, UserCheck, Headset, Smartphone, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface WalletData {
  id: string;
  balance: string;
  totalRecharged: string;
}

interface RechargePack {
  amount: number;
  bonus: number;
  tag: string | null;
}

export default function WalletPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const [selectedPack, setSelectedPack] = useState<RechargePack | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const { data: wallet, isLoading: walletLoading } = useQuery<{ wallet: WalletData }>({
    queryKey: ["/api/wallet"],
    queryFn: async () => {
      const res = await fetch("/api/wallet", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return res.json();
    },
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      const amount = params.get("amount");
      toast({
        title: "Payment Successful!",
        description: `₹${amount} has been added to your wallet.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      window.history.replaceState({}, "", "/wallet");
    } else if (params.get("canceled") === "true") {
      toast({
        title: "Payment Cancelled",
        description: "Your payment was cancelled. No amount was charged.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/wallet");
    }
  }, [location, queryClient, toast]);

  const rechargePacks: RechargePack[] = [
    { amount: 200, bonus: 0, tag: null },
    { amount: 500, bonus: 50, tag: "Popular" },
    { amount: 1000, bonus: 150, tag: "Best Value" },
    { amount: 2000, bonus: 400, tag: "Super Saver" },
    { amount: 5000, bonus: 1200, tag: null },
    { amount: 10000, bonus: 3000, tag: "Mega Pack" },
  ];

  const handleSelectPack = (pack: RechargePack) => {
    setSelectedPack(pack);
    setPaymentDialogOpen(true);
  };

  const handleUPIPayment = async () => {
    if (!selectedPack || !razorpayLoaded) return;
    
    setIsProcessing(true);
    try {
      const orderRes = await fetch("/api/wallet/razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: selectedPack.amount,
          packName: `Wallet Recharge - ₹${selectedPack.amount}`,
        }),
      });

      if (!orderRes.ok) {
        const error = await orderRes.json();
        throw new Error(error.error || "Failed to create order");
      }

      const orderData = await orderRes.json();

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Focus",
        description: `Add ₹${selectedPack.amount} to your wallet`,
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch("/api/wallet/razorpay-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: selectedPack.amount,
              }),
            });

            if (verifyRes.ok) {
              toast({
                title: "Payment Successful!",
                description: `₹${selectedPack.amount} has been added to your wallet via UPI.`,
              });
              queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
            } else {
              throw new Error("Payment verification failed");
            }
          } catch (err) {
            toast({
              title: "Payment Error",
              description: "There was an issue verifying your payment. Please contact support.",
              variant: "destructive",
            });
          }
        },
        prefill: {},
        theme: {
          color: "#e07c00",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setPaymentDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate UPI payment",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardPayment = async () => {
    if (!selectedPack) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch("/api/wallet/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: selectedPack.amount,
          packName: `Wallet Recharge - ₹${selectedPack.amount}`,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate card payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const walletBalance = wallet?.wallet?.balance || "0.00";

  return (
    <PageTransition>
      <div className="min-h-screen bg-muted/30 pb-20">
        <div className="bg-primary text-primary-foreground pt-12 pb-24 rounded-b-[3rem] shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="container mx-auto px-4 relative z-10 text-center">
            <h1 className="text-3xl font-bold mb-2 font-serif">My Wallet</h1>
            <p className="opacity-90 mb-8">Recharge to talk to therapists and gurus</p>
            
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 max-w-sm mx-auto flex flex-col items-center">
              <span className="text-sm font-medium opacity-80 mb-1">Current Balance</span>
              {walletLoading ? (
                <Loader2 className="w-8 h-8 animate-spin mt-2" />
              ) : (
                <div className="text-5xl font-bold flex items-start" data-testid="text-wallet-balance">
                  <span className="text-2xl mt-2">₹</span>{parseFloat(walletBalance).toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-12 relative z-20">
          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            
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
                      onClick={() => handleSelectPack(pack)}
                      className="relative group border-2 border-muted hover:border-primary rounded-xl p-4 transition-all hover:shadow-md text-left bg-card"
                      data-testid={`button-pack-${pack.amount}`}
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

              <div className="bg-background rounded-3xl shadow-sm border p-6">
                <h3 className="font-bold text-lg mb-4">Recent Transactions</h3>
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No transactions yet. Recharge to start your journey.
                </div>
              </div>
            </div>

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

        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center">Choose Payment Method</DialogTitle>
              <DialogDescription className="text-center">
                {selectedPack && (
                  <span className="text-lg font-semibold text-foreground">
                    Recharge ₹{selectedPack.amount}
                    {selectedPack.bonus > 0 && (
                      <span className="text-green-600 text-sm ml-2">(+₹{selectedPack.bonus} bonus)</span>
                    )}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              <Button
                onClick={handleUPIPayment}
                disabled={isProcessing || !razorpayLoaded}
                className="w-full h-16 text-lg justify-start gap-4 bg-green-600 hover:bg-green-700"
                data-testid="button-pay-upi"
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Smartphone className="w-6 h-6" />
                )}
                <div className="text-left">
                  <div className="font-bold">Pay with UPI</div>
                  <div className="text-xs opacity-80">GPay, PhonePe, Paytm & more</div>
                </div>
              </Button>
              
              <Button
                onClick={handleCardPayment}
                disabled={isProcessing}
                variant="outline"
                className="w-full h-16 text-lg justify-start gap-4"
                data-testid="button-pay-card"
              >
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <CreditCard className="w-6 h-6" />
                )}
                <div className="text-left">
                  <div className="font-bold">Pay with Card</div>
                  <div className="text-xs text-muted-foreground">Visa, Mastercard, RuPay</div>
                </div>
              </Button>
            </div>
            
            <div className="mt-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Lock className="w-3 h-3" />
              Secured by Razorpay & Stripe
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
