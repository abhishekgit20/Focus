import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  getSessionTemplates,
  getMyOfferings,
  upsertOffering,
  getMyWorkingHours,
  setWorkingHours,
  deleteWorkingHours,
  getMyLeave,
  createLeave,
  deleteLeave,
  type SessionTemplate,
  type ProfessionalOffering,
} from "@/lib/api";

const CONSULTATION_TYPES = [
  { value: "chat" as const, label: "Chat Consultation" },
  { value: "audio" as const, label: "Voice Consultation" },
  { value: "video" as const, label: "Video Consultation" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SessionSettingsPanel() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PricingSection />
      <AvailabilitySection />
      <LeaveSection />
    </div>
  );
}

function PricingSection() {
  const queryClient = useQueryClient();
  const [localPrices, setLocalPrices] = useState<Record<string, string>>({});

  const { data: templatesData, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/session-templates"],
    queryFn: getSessionTemplates,
  });
  const { data: offeringsData, isLoading: offeringsLoading } = useQuery({
    queryKey: ["/api/professional/session-offerings"],
    queryFn: getMyOfferings,
  });

  const templates = templatesData?.templates || [];
  const offerings = offeringsData?.offerings || [];

  const findOffering = (type: string, templateId: string): ProfessionalOffering | undefined =>
    offerings.find((o) => o.consultationType === type && o.sessionTemplateId === templateId);

  const mutation = useMutation({
    mutationFn: upsertOffering,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional/session-offerings"] });
      toast.success("Pricing updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update pricing"),
  });

  const handleToggle = (type: "chat" | "audio" | "video", template: SessionTemplate, enabled: boolean) => {
    const existing = findOffering(type, template.id);
    const price = localPrices[`${type}:${template.id}`] || existing?.price || "";
    if (enabled && (!price || Number(price) <= 0)) {
      toast.error("Set a price before enabling this session");
      return;
    }
    mutation.mutate({ consultationType: type, sessionTemplateId: template.id, price: price || "0", enabled });
  };

  const handlePriceBlur = (type: "chat" | "audio" | "video", template: SessionTemplate) => {
    const key = `${type}:${template.id}`;
    const price = localPrices[key];
    if (!price) return;
    const existing = findOffering(type, template.id);
    if (existing && existing.price === price) return;
    mutation.mutate({ consultationType: type, sessionTemplateId: template.id, price, enabled: existing?.enabled ?? true });
  };

  const isLoading = templatesLoading || offeringsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Pricing</CardTitle>
        <CardDescription>Enable the session types and durations you offer, and set your price for each. You don't have to offer every combination.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-6">
            {CONSULTATION_TYPES.map((ct) => (
              <div key={ct.value}>
                <h4 className="font-medium text-sm mb-3">{ct.label}</h4>
                <div className="space-y-2">
                  {templates.map((t) => {
                    const existing = findOffering(ct.value, t.id);
                    const key = `${ct.value}:${t.id}`;
                    const priceValue = localPrices[key] ?? existing?.price ?? "";
                    return (
                      <div key={t.id} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/40">
                        <Switch
                          checked={!!existing?.enabled}
                          onCheckedChange={(checked) => handleToggle(ct.value, t, checked)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.durationMinutes} minutes</p>
                        </div>
                        <div className="relative w-32 shrink-0">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
                          <Input
                            type="number"
                            min={0}
                            className="pl-6 h-9"
                            placeholder="Price"
                            value={priceValue}
                            onChange={(e) => setLocalPrices((prev) => ({ ...prev, [key]: e.target.value }))}
                            onBlur={() => handlePriceBlur(ct.value, t)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AvailabilitySection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["/api/professional/working-hours"],
    queryFn: getMyWorkingHours,
  });
  const hours = data?.hours || [];

  const upsertMutation = useMutation({
    mutationFn: setWorkingHours,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/professional/working-hours"] }),
    onError: (e: any) => toast.error(e.message || "Failed to save working hours"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteWorkingHours,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/professional/working-hours"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Hours</CardTitle>
        <CardDescription>Set the days and times you accept scheduled sessions. Days left off are unavailable.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {DAYS.map((day, dayOfWeek) => {
              const existing = hours.find((h) => h.dayOfWeek === dayOfWeek);
              return (
                <div key={dayOfWeek} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                  <Switch
                    checked={!!existing?.enabled}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        upsertMutation.mutate({
                          dayOfWeek,
                          startTime: existing?.startTime || "09:00",
                          endTime: existing?.endTime || "17:00",
                          enabled: true,
                        });
                      } else if (existing) {
                        deleteMutation.mutate(dayOfWeek);
                      }
                    }}
                  />
                  <span className="w-24 text-sm">{day}</span>
                  {existing?.enabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        className="h-8 w-28"
                        defaultValue={existing.startTime}
                        onBlur={(e) => upsertMutation.mutate({ dayOfWeek, startTime: e.target.value, endTime: existing.endTime, enabled: true })}
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <Input
                        type="time"
                        className="h-8 w-28"
                        defaultValue={existing.endTime}
                        onBlur={(e) => upsertMutation.mutate({ dayOfWeek, startTime: existing.startTime, endTime: e.target.value, enabled: true })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LeaveSection() {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/professional/leave"],
    queryFn: getMyLeave,
  });
  const leave = data?.leave || [];

  const createMutation = useMutation({
    mutationFn: createLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/professional/leave"] });
      setStartDate(""); setEndDate(""); setReason("");
      toast.success("Leave added");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add leave"),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteLeave,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/professional/leave"] }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave / Time Off</CardTitle>
        <CardDescription>Block off dates so clients can't book scheduled sessions during your leave.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input type="date" className="h-9" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input type="date" className="h-9" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Input className="h-9 flex-1 min-w-[140px]" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!startDate || !endDate || createMutation.isPending}
            onClick={() => createMutation.mutate({ startDate, endDate, reason: reason || undefined })}
          >
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : leave.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave scheduled.</p>
        ) : (
          <div className="space-y-2">
            {leave.map((l) => (
              <div key={l.id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                <span>
                  {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                  {l.reason && <span className="text-muted-foreground"> · {l.reason}</span>}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteMutation.mutate(l.id)} aria-label="Delete leave">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
