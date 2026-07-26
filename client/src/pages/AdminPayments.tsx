import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Loader2, IndianRupee } from "lucide-react";
import { getAdminPayments, getAdminRefunds, issueManualRefund, issuePartialRefund } from "@/lib/api";
import { toast } from "sonner";

export default function AdminPayments() {
  const [tab, setTab] = useState<"payments" | "refunds">("payments");
  const [refundSessionId, setRefundSessionId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(""); // blank = full refund
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualRefundOpen, setManualRefundOpen] = useState(false);
  // Generated once per dialog session and reused on retry, so a network
  // failure followed by re-clicking "Issue Refund" can't double-refund —
  // the server treats a repeated key as a no-op. Regenerated on open.
  const partialRefundIdempotencyKey = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // Previously a plain useQuery hard-capped at 200 rows with no way to see
  // anything older — useInfiniteQuery here mirrors the offset-based paging
  // the server now supports, so admins can actually reach older records.
  const {
    data: paymentsData,
    isLoading: paymentsLoading,
    refetch: refetchPayments,
    fetchNextPage: fetchNextPayments,
    hasNextPage: hasMorePayments,
    isFetchingNextPage: isFetchingMorePayments,
  } = useInfiniteQuery({
    queryKey: ["/api/admin/payments"],
    queryFn: ({ pageParam }) => getAdminPayments(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.flatMap((p) => p.payments).length : undefined),
    enabled: tab === "payments",
  });
  const payments = paymentsData?.pages.flatMap((p) => p.payments) ?? [];

  const {
    data: refundsData,
    isLoading: refundsLoading,
    refetch: refetchRefunds,
    fetchNextPage: fetchNextRefunds,
    hasNextPage: hasMoreRefunds,
    isFetchingNextPage: isFetchingMoreRefunds,
  } = useInfiniteQuery({
    queryKey: ["/api/admin/refunds"],
    queryFn: ({ pageParam }) => getAdminRefunds(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => (lastPage.hasMore ? pages.flatMap((p) => p.refunds).length : undefined),
    enabled: tab === "refunds",
  });
  const refunds = refundsData?.pages.flatMap((p) => p.refunds) ?? [];

  const handleManualRefund = async () => {
    if (!refundSessionId.trim() || !refundReason.trim()) return;
    setIsSubmitting(true);
    try {
      if (refundAmount.trim()) {
        if (!partialRefundIdempotencyKey.current) {
          partialRefundIdempotencyKey.current = crypto.randomUUID();
        }
        await issuePartialRefund(refundSessionId.trim(), refundAmount.trim(), refundReason.trim(), partialRefundIdempotencyKey.current);
        toast.success(`₹${refundAmount.trim()} refund issued`);
      } else {
        await issueManualRefund(refundSessionId.trim(), refundReason.trim());
        toast.success("Full refund issued");
      }
      setManualRefundOpen(false);
      setRefundSessionId("");
      setRefundReason("");
      setRefundAmount("");
      partialRefundIdempotencyKey.current = null;
      queryClient.invalidateQueries({ queryKey: ["/api/admin/refunds"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to issue refund");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 font-serif">Payments & Refunds</h1>
            <p className="text-muted-foreground">All booking payments and refunds, most recent first.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setManualRefundOpen(true)}>
              <IndianRupee className="w-4 h-4 mr-2" /> Issue Manual Refund
            </Button>
            <Button variant="outline" onClick={() => (tab === "payments" ? refetchPayments() : refetchRefunds())}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "payments" | "refunds")} className="mb-6">
          <TabsList>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "payments" ? (
          paymentsLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : payments.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">No payments yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {payments.map((p) => (
                <Card key={p.id}>
                  <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-medium">₹{p.amount} — {p.gateway}{p.method ? ` (${p.method})` : ""}</p>
                      <p className="text-xs text-muted-foreground">Booking {p.sessionId} · {new Date(p.createdAt).toLocaleString()}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </CardContent>
                </Card>
              ))}
              {hasMorePayments && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" onClick={() => fetchNextPayments()} disabled={isFetchingMorePayments}>
                    {isFetchingMorePayments ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Load More
                  </Button>
                </div>
              )}
            </div>
          )
        ) : refundsLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : refunds.length === 0 ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">No refunds yet.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {refunds.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-sm font-medium">₹{r.amount} — {r.reason.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">Booking {r.sessionId} · to {r.destination} · {new Date(r.createdAt).toLocaleString()}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </CardContent>
              </Card>
            ))}
            {hasMoreRefunds && (
              <div className="flex justify-center pt-2">
                <Button variant="outline" onClick={() => fetchNextRefunds()} disabled={isFetchingMoreRefunds}>
                  {isFetchingMoreRefunds ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog
        open={manualRefundOpen}
        onOpenChange={(open) => {
          setManualRefundOpen(open);
          if (!open) {
            setRefundAmount("");
            partialRefundIdempotencyKey.current = null;
          }
        }}
      >
        <DialogContent>
          <DialogHeader><DialogTitle>Issue manual refund</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Booking (session) ID" value={refundSessionId} onChange={(e) => setRefundSessionId(e.target.value)} />
            <Input
              placeholder="Amount — leave blank for a full refund"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              inputMode="decimal"
            />
            <p className="text-xs text-muted-foreground -mt-1">
              {refundAmount.trim()
                ? "Partial refund: the booking stays active, only ₹" + refundAmount.trim() + " is returned."
                : "Full refund: every funding leg is reversed and the booking is cancelled."}
            </p>
            <Textarea placeholder="Reason for refund" value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="min-h-[80px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualRefundOpen(false)}>Cancel</Button>
            <Button onClick={handleManualRefund} disabled={isSubmitting || !refundSessionId.trim() || !refundReason.trim()}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : refundAmount.trim() ? "Issue Partial Refund" : "Issue Full Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "succeeded" || status === "captured"
      ? "text-green-600 bg-green-50 border-green-200"
      : status === "failed"
      ? "text-red-600 bg-red-50 border-red-200"
      : "text-amber-600 bg-amber-50 border-amber-200";
  return <Badge variant="outline" className={color}>{status}</Badge>;
}
