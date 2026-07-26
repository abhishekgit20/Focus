import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, FileText, CheckCircle2, XCircle, Clock, ExternalLink, Ban, RotateCcw } from "lucide-react";
import {
  getApplicationsByStatus,
  approveApplication,
  rejectApplication,
  getApplicationDocumentUrl,
  suspendProfessional,
  reactivateProfessional,
} from "@/lib/api";
import { toast } from "sonner";
import type { ProfessionalApplication, User } from "@shared/schema";

type Status = "pending" | "approved" | "rejected";
type ApplicationWithApplicant = ProfessionalApplication & { applicant: User; suspended?: boolean };

export default function AdminApplications() {
  const [status, setStatus] = useState<Status>("pending");
  const [rejectTarget, setRejectTarget] = useState<ApplicationWithApplicant | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [suspendTarget, setSuspendTarget] = useState<ApplicationWithApplicant | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/professional-applications", status],
    queryFn: () => getApplicationsByStatus(status),
  });

  const applications = data?.applications || [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["/api/admin/professional-applications"] });

  const handleApprove = async (application: ApplicationWithApplicant) => {
    setBusyId(application.id);
    try {
      await approveApplication(application.id);
      toast.success(`${application.applicant.fullName} approved as a professional.`);
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve application");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectionReason.trim()) return;
    setBusyId(rejectTarget.id);
    try {
      await rejectApplication(rejectTarget.id, rejectionReason.trim());
      toast.success(`Application rejected.`);
      setRejectTarget(null);
      setRejectionReason("");
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject application");
    } finally {
      setBusyId(null);
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget || !suspendReason.trim()) return;
    setBusyId(suspendTarget.id);
    try {
      await suspendProfessional(suspendTarget.userId, suspendReason.trim());
      toast.success(`${suspendTarget.applicant.fullName} suspended.`);
      setSuspendTarget(null);
      setSuspendReason("");
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to suspend professional");
    } finally {
      setBusyId(null);
    }
  };

  const handleReactivate = async (application: ApplicationWithApplicant) => {
    setBusyId(application.id);
    try {
      await reactivateProfessional(application.userId);
      toast.success(`${application.applicant.fullName} reactivated.`);
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to reactivate professional");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-serif font-bold">Professional Applications</h1>
          <p className="text-muted-foreground">Review credentials and approve or reject applicants.</p>
        </div>

        <Tabs value={status} onValueChange={(v) => setStatus(v as Status)} className="mb-6">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              No {status} applications.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card key={application.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">{application.applicant.fullName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{application.applicant.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={application.status as Status} />
                    {application.status === "approved" && application.suspended && (
                      <Badge variant="outline" className="gap-1.5 text-slate-600 bg-slate-100 border-slate-200">
                        <Ban className="w-3.5 h-3.5" /> Suspended
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <Field label="Specialization" value={application.specialization} />
                    <Field label="Qualification" value={application.qualification} />
                    <Field label="Experience" value={`${application.experience} years`} />
                    {application.licenseNumber && <Field label="License #" value={application.licenseNumber} />}
                    <Field label="Languages" value={(application.languages || []).join(", ")} />
                  </div>

                  {application.bio && (
                    <p className="text-sm text-muted-foreground border-t pt-3">{application.bio}</p>
                  )}

                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Documents</p>
                    <div className="flex flex-wrap gap-2">
                      {(application.documents as any[]).map((doc) => (
                        <a
                          key={doc.storageKey}
                          href={getApplicationDocumentUrl(application.id, doc.storageKey)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border hover:bg-muted/50 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          {doc.documentType.replace(/_/g, " ")}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>

                  {application.status === "rejected" && application.rejectionReason && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
                      <strong>Rejection reason:</strong> {application.rejectionReason}
                    </p>
                  )}

                  {application.status === "pending" && (
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => handleApprove(application)}
                        disabled={busyId === application.id}
                        className="gap-2"
                      >
                        {busyId === application.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRejectTarget(application)}
                        disabled={busyId === application.id}
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>
                  )}

                  {application.status === "approved" && (
                    <div className="flex gap-3 pt-2">
                      {application.suspended ? (
                        <Button
                          onClick={() => handleReactivate(application)}
                          disabled={busyId === application.id}
                          className="gap-2"
                        >
                          {busyId === application.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                          Reactivate
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => setSuspendTarget(application)}
                          disabled={busyId === application.id}
                          className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Ban className="w-4 h-4" />
                          Suspend
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject application</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Give {rejectTarget?.applicant.fullName} a reason. This is included in their notification email.
          </p>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. License number couldn't be verified against the registry."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button
              onClick={handleReject}
              disabled={!rejectionReason.trim() || busyId === rejectTarget?.id}
              className="bg-red-600 hover:bg-red-700"
            >
              {busyId === rejectTarget?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!suspendTarget} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend professional</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {suspendTarget?.applicant.fullName} will be hidden from clients immediately and notified by email. This does not delete their account.
          </p>
          <Textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            placeholder="e.g. Multiple client complaints under review."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendTarget(null)}>Cancel</Button>
            <Button
              onClick={handleSuspend}
              disabled={!suspendReason.trim() || busyId === suspendTarget?.id}
              className="bg-red-600 hover:bg-red-700"
            >
              {busyId === suspendTarget?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Suspend Professional"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}:</span> <span className="font-medium">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const config = {
    pending: { icon: Clock, label: "Pending", className: "text-amber-600 bg-amber-50 border-amber-200" },
    approved: { icon: CheckCircle2, label: "Approved", className: "text-green-600 bg-green-50 border-green-200" },
    rejected: { icon: XCircle, label: "Rejected", className: "text-red-600 bg-red-50 border-red-200" },
  }[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`gap-1.5 ${config.className}`}>
      <Icon className="w-3.5 h-3.5" /> {config.label}
    </Badge>
  );
}
