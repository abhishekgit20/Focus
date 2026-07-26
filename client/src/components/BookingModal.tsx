import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, Calendar as CalendarIcon, Wallet, CreditCard, Split, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  getProfessionalOfferings,
  getAvailabilitySlots,
  getWallet,
  reserveBookingSlot,
  payForBooking,
  verifyBookingPayment,
  type ProfessionalOffering,
} from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

type Mode = "instant" | "scheduled";
type Step = "mode" | "template" | "datetime" | "payment" | "confirmed";
type PaymentMethod = "wallet" | "gateway" | "split";

interface BookingModalProps {
  professionalId: string;
  professionalName: string;
  isOnline: boolean;
  consultationType: "chat" | "audio" | "video";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_LABEL: Record<string, string> = { chat: "Chat", audio: "Voice", video: "Video" };

export function BookingModal({ professionalId, professionalName, isOnline, consultationType, open, onOpenChange }: BookingModalProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState<Mode>("instant");
  const [selectedOffering, setSelectedOffering] = useState<ProfessionalOffering | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("gateway");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedSessionId, setConfirmedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep("mode");
      setMode(isOnline ? "instant" : "scheduled");
      setSelectedOffering(null);
      setSelectedDate(undefined);
      setSelectedSlot(null);
      setCalendarOpen(false);
      setPaymentMethod("gateway");
      setConfirmedSessionId(null);
    }
  }, [open, isOnline]);

  const { data: offeringsData, isLoading: offeringsLoading } = useQuery({
    queryKey: ["/api/professionals", professionalId, "offerings"],
    queryFn: () => getProfessionalOfferings(professionalId),
    enabled: open,
  });

  const offerings = (offeringsData?.offerings || []).filter((o) => o.consultationType === consultationType);

  const { data: walletData } = useQuery({
    queryKey: ["/api/wallet"],
    queryFn: getWallet,
    enabled: open,
  });
  const walletBalance = Number(walletData?.wallet.balance ?? 0);

  const { data: slotsData, isLoading: slotsLoading } = useQuery({
    queryKey: ["/api/professionals", professionalId, "availability-slots", selectedDate?.toDateString(), selectedOffering?.sessionTemplateId],
    // A plain YYYY-MM-DD built from the calendar's own local date fields —
    // not selectedDate.toISOString(), which converts through UTC and can
    // land on the previous day for any IST user, silently showing/booking
    // slots for the wrong calendar day.
    queryFn: () => getAvailabilitySlots(professionalId, format(selectedDate!, "yyyy-MM-dd"), selectedOffering!.sessionTemplateId),
    enabled: open && mode === "scheduled" && !!selectedDate && !!selectedOffering,
  });

  const price = selectedOffering ? Number(selectedOffering.price) : 0;
  const walletCoversFull = walletBalance >= price;
  const walletCoversPartial = walletBalance > 0 && walletBalance < price;

  const handleReserveAndPay = async () => {
    if (!selectedOffering) return;
    setIsProcessing(true);
    try {
      const { session } = await reserveBookingSlot({
        professionalId,
        consultationType,
        sessionTemplateId: selectedOffering.sessionTemplateId,
        mode,
        scheduledAt: mode === "scheduled" ? selectedSlot! : undefined,
      });

      const result = await payForBooking(session.id, paymentMethod);

      if (result.paid) {
        finishBooking(session.id);
        return;
      }

      // Gateway or split — open Razorpay Checkout for the remaining amount.
      const loaded = await loadRazorpayScript();
      if (!loaded || !result.razorpayOrderId) {
        toast.error("Couldn't load the payment gateway. Please try again.");
        setIsProcessing(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: result.keyId,
        order_id: result.razorpayOrderId,
        amount: Math.round(Number(result.gatewayAmount) * 100),
        currency: result.currency || "INR",
        name: "Focus",
        description: `${TYPE_LABEL[consultationType]} session with ${professionalName}`,
        handler: async (response: any) => {
          // Razorpay has already captured the money by the time this fires —
          // a network blip on *this* call must not read as "booking failed."
          // The verify endpoint is idempotent (retrying against an
          // already-captured payment just returns paid:true), so retry a
          // couple of times on a genuine network failure before giving up.
          for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) await new Promise((r) => setTimeout(r, 1500 * attempt));
            try {
              await verifyBookingPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              finishBooking(session.id);
              return;
            } catch (err: any) {
              // A TypeError here means fetch() itself failed (offline, DNS,
              // CORS) — worth retrying. Anything else is a real rejection
              // from the server (bad signature, booking no longer payable)
              // that won't change on retry.
              if (!(err instanceof TypeError) || attempt === 2) {
                toast.error(
                  err instanceof TypeError
                    ? "Your payment went through with Razorpay, but we couldn't confirm it here. Check your bookings in a minute, or contact support if it doesn't appear."
                    : err.message || "Payment verification failed"
                );
                setIsProcessing(false);
                return;
              }
            }
          }
        },
        modal: {
          ondismiss: () => setIsProcessing(false),
        },
        theme: { color: "#0f172a" },
      });
      rzp.open();
    } catch (error: any) {
      const message = error.message || "Booking failed. Please try again.";
      toast.error(message);
      setIsProcessing(false);
      // A slot conflict means another client booked it between when this
      // list was fetched and now — previously this just showed the error
      // and left the stale, now-taken slot selected, so retrying reproduced
      // the same 409 indefinitely. Send them back to pick a fresh slot from
      // an actually up-to-date list instead.
      if (mode === "scheduled" && /no longer available/i.test(message)) {
        setSelectedSlot(null);
        queryClient.invalidateQueries({ queryKey: ["/api/professionals", professionalId, "availability-slots"] });
        setStep("datetime");
      }
    }
  };

  const finishBooking = (sessionId: string) => {
    setIsProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
    if (mode === "instant") {
      onOpenChange(false);
      setLocation(`/consultation/${sessionId}`);
    } else {
      setConfirmedSessionId(sessionId);
      setStep("confirmed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isProcessing && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "confirmed" ? "Booking Confirmed" : `Book a ${TYPE_LABEL[consultationType]} session`}
          </DialogTitle>
        </DialogHeader>

        {step === "mode" && (
          <div className="space-y-3">
            <button
              disabled={!isOnline}
              onClick={() => { setMode("instant"); setStep("template"); }}
              className="w-full text-left p-4 rounded-xl border hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-start gap-3"
            >
              <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Instant Session</p>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? "Connect immediately — professional is online now." : "Professional is currently offline."}
                </p>
              </div>
            </button>
            <button
              onClick={() => { setMode("scheduled"); setStep("template"); }}
              className="w-full text-left p-4 rounded-xl border hover:border-primary transition-colors flex items-start gap-3"
            >
              <CalendarIcon className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Scheduled Session</p>
                <p className="text-xs text-muted-foreground">Book a consultation for a future date and time.</p>
              </div>
            </button>
          </div>
        )}

        {step === "template" && (
          <div className="space-y-3">
            {offeringsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : offerings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No {TYPE_LABEL[consultationType].toLowerCase()} sessions available from this professional.</p>
            ) : (
              offerings.map((o) => (
                <button
                  key={o.id}
                  onClick={() => { setSelectedOffering(o); setStep(mode === "instant" ? "payment" : "datetime"); }}
                  className="w-full text-left p-3 rounded-xl border hover:border-primary transition-colors flex items-center justify-between"
                >
                  <span className="text-sm font-medium">Session</span>
                  <span className="text-sm font-semibold text-primary">₹{o.price}</span>
                </button>
              ))
            )}
            <Button variant="ghost" size="sm" onClick={() => setStep("mode")}>Back</Button>
          </div>
        )}

        {step === "datetime" && (
          <div className="space-y-4">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {selectedDate ? format(selectedDate, "PPP") : "Choose a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); setCalendarOpen(false); }}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>

            {selectedDate && (
              slotsLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : (slotsData?.slots.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No available slots on this date.</p>
              ) : (
                <Select value={selectedSlot ?? undefined} onValueChange={setSelectedSlot}>
                  <SelectTrigger><SelectValue placeholder="Choose a time" /></SelectTrigger>
                  <SelectContent>
                    {slotsData!.slots.map((s) => (
                      <SelectItem key={s} value={s}>{format(new Date(s), "p")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )
            )}

            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep("template")}>Back</Button>
              <Button size="sm" disabled={!selectedSlot} onClick={() => setStep("payment")}>Continue</Button>
            </div>
          </div>
        )}

        {step === "payment" && selectedOffering && (
          <div className="space-y-4">
            <div className="rounded-xl border p-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Professional</span><span>{professionalName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Session type</span><span>{TYPE_LABEL[consultationType]}</span></div>
              {mode === "scheduled" && selectedSlot && (
                <div className="flex justify-between"><span className="text-muted-foreground">When</span><span>{format(new Date(selectedSlot), "PPp")}</span></div>
              )}
              <div className="flex justify-between font-semibold pt-1 border-t mt-1"><span>Total</span><span>₹{price.toFixed(2)}</span></div>
            </div>

            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)} className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer has-[:checked]:border-primary">
                <RadioGroupItem value="gateway" id="pm-gateway" />
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <Label htmlFor="pm-gateway" className="cursor-pointer">Pay Now</Label>
                  <p className="text-xs text-muted-foreground">UPI, card, net banking, or wallets via Razorpay</p>
                </div>
              </label>

              {walletCoversFull && (
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer has-[:checked]:border-primary">
                  <RadioGroupItem value="wallet" id="pm-wallet" />
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="pm-wallet" className="cursor-pointer">Pay Using Wallet</Label>
                    <p className="text-xs text-muted-foreground">Balance ₹{walletBalance.toFixed(2)} — remaining after: ₹{(walletBalance - price).toFixed(2)}</p>
                  </div>
                </label>
              )}

              {walletCoversPartial && (
                <label className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer has-[:checked]:border-primary">
                  <RadioGroupItem value="split" id="pm-split" />
                  <Split className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <Label htmlFor="pm-split" className="cursor-pointer">Split Payment</Label>
                    <p className="text-xs text-muted-foreground">₹{walletBalance.toFixed(2)} from wallet + ₹{(price - walletBalance).toFixed(2)} via UPI/card</p>
                  </div>
                </label>
              )}
            </RadioGroup>

            <div className="flex justify-between items-center">
              <Button variant="ghost" size="sm" onClick={() => setStep(mode === "instant" ? "template" : "datetime")} disabled={isProcessing}>Back</Button>
              <Button onClick={handleReserveAndPay} disabled={isProcessing}>
                {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : `Pay ₹${price.toFixed(2)}`}
              </Button>
            </div>
          </div>
        )}

        {step === "confirmed" && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <p className="text-muted-foreground">Your session with {professionalName} is booked. We'll remind you before it starts.</p>
            <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
