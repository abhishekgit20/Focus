import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/PageTransition";
import { ArrowLeft, Loader2, Upload, CheckCircle2, Clock, XCircle, FileCheck } from "lucide-react";
import { applyAsProfessional, getMyProfessionalApplication, DOCUMENT_TYPES, type DocumentType } from "@/lib/api";
import { toast } from "sonner";

const DOCUMENT_LABELS: Record<DocumentType, { label: string; required: boolean; hint: string }> = {
  government_id: { label: "Government ID", required: true, hint: "Aadhaar, PAN, passport, or driver's license" },
  professional_license: { label: "Professional License", required: true, hint: "Medical/practice registration number proof" },
  degree: { label: "Degree Certificate", required: false, hint: "Highest relevant qualification" },
  certificate: { label: "Additional Certificate", required: false, hint: "Any specialization certificate" },
  experience_proof: { label: "Experience Proof", required: false, hint: "Employment letter, practice certificate, etc." },
};

export default function ApplyProfessional() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reapplying, setReapplying] = useState(false);
  const [files, setFiles] = useState<Partial<Record<DocumentType, File>>>({});
  const [form, setForm] = useState({
    specialization: "",
    qualification: "",
    experience: "",
    bio: "",
    languages: "English",
    licenseNumber: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["/api/professional-applications/mine"],
    queryFn: getMyProfessionalApplication,
  });

  const existing = data?.application;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missingRequired = DOCUMENT_TYPES.filter(
      (type) => DOCUMENT_LABELS[type].required && !files[type]
    );
    if (missingRequired.length > 0) {
      toast.error(`Please upload: ${missingRequired.map((t) => DOCUMENT_LABELS[t].label).join(", ")}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await applyAsProfessional({
        specialization: form.specialization,
        qualification: form.qualification,
        experience: Number(form.experience),
        bio: form.bio || undefined,
        languages: form.languages.split(",").map((l) => l.trim()).filter(Boolean),
        licenseNumber: form.licenseNumber || undefined,
        documents: files,
      });
      toast.success("Application submitted! We'll review it and email you the outcome.");
      setReapplying(false);
      queryClient.invalidateQueries({ queryKey: ["/api/professional-applications/mine"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/profile">
          <Button variant="ghost" className="gap-2 mb-6 pl-0">
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </Button>
        </Link>

        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-serif font-bold">Apply as a Professional</h1>
          <p className="text-muted-foreground">
            Submit your credentials for review. Once approved, your account gains professional access and your profile goes live to clients.
          </p>
        </div>

        {existing && !(existing.status === "rejected" && reapplying) ? (
          <ApplicationStatusCard
            application={existing}
            // A rejected application previously had no path back to the
            // form at all — hasPendingOrApprovedApplication on the server
            // only ever blocked pending/approved, so reapplication was
            // already supported end-to-end except for this missing button.
            onReapply={existing.status === "rejected" ? () => setReapplying(true) : undefined}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Professional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization *</Label>
                    <Input
                      id="specialization"
                      placeholder="e.g. Clinical Psychology"
                      value={form.specialization}
                      onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="qualification">Qualification *</Label>
                    <Input
                      id="qualification"
                      placeholder="e.g. M.Phil Clinical Psychology"
                      value={form.qualification}
                      onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience *</Label>
                    <Input
                      id="experience"
                      type="number"
                      min={0}
                      value={form.experience}
                      onChange={(e) => setForm({ ...form, experience: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      placeholder="e.g. MCI-12345"
                      value={form.licenseNumber}
                      onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="languages">Languages (comma separated)</Label>
                  <Input
                    id="languages"
                    placeholder="English, Hindi"
                    value={form.languages}
                    onChange={(e) => setForm({ ...form, languages: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell clients about your approach and experience..."
                    className="min-h-[100px]"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  />
                </div>

                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                  Pricing isn't set here — once approved, you'll configure your own prices per session type and duration in Session Settings on your dashboard.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Supporting Documents</CardTitle>
                <p className="text-sm text-muted-foreground">PDF, JPEG, or PNG. Max 8MB per file.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {DOCUMENT_TYPES.map((type) => (
                  <div key={type} className="flex items-center justify-between gap-4 p-3 rounded-lg border">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {DOCUMENT_LABELS[type].label}
                        {DOCUMENT_LABELS[type].required && <span className="text-red-500 ml-1">*</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{DOCUMENT_LABELS[type].hint}</p>
                      {files[type] && (
                        <p className="text-xs text-primary flex items-center gap-1 mt-1">
                          <FileCheck className="w-3 h-3" /> {files[type]!.name}
                        </p>
                      )}
                    </div>
                    <Label
                      htmlFor={`file-${type}`}
                      className="shrink-0 cursor-pointer inline-flex items-center gap-2 h-9 px-4 rounded-lg border text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      {files[type] ? "Replace" : "Upload"}
                      <input
                        id={`file-${type}`}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setFiles((prev) => ({ ...prev, [type]: file }));
                        }}
                      />
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full h-12 text-base font-semibold rounded-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                "Submit Application"
              )}
            </Button>
          </form>
        )}
      </div>
    </PageTransition>
  );
}

function ApplicationStatusCard({
  application,
  onReapply,
}: {
  application: { status: string; rejectionReason?: string | null; createdAt: string | Date };
  onReapply?: () => void;
}) {
  const statusConfig = {
    pending: { icon: Clock, label: "Under Review", color: "text-amber-600 bg-amber-50 border-amber-200" },
    approved: { icon: CheckCircle2, label: "Approved", color: "text-green-600 bg-green-50 border-green-200" },
    rejected: { icon: XCircle, label: "Not Approved", color: "text-red-600 bg-red-50 border-red-200" },
  }[application.status] || { icon: Clock, label: application.status, color: "text-muted-foreground bg-muted" };

  const Icon = statusConfig.icon;

  return (
    <Card>
      <CardContent className="p-8 text-center space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto border ${statusConfig.color}`}>
          <Icon className="w-8 h-8" />
        </div>
        <div>
          <Badge className={statusConfig.color} variant="outline">{statusConfig.label}</Badge>
          <h2 className="text-xl font-semibold mt-3">
            {application.status === "pending" && "Your application is being reviewed"}
            {application.status === "approved" && "You're approved!"}
            {application.status === "rejected" && "Application not approved"}
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Submitted on {new Date(application.createdAt).toLocaleDateString()}
          </p>
          {application.status === "rejected" && application.rejectionReason && (
            <p className="text-sm text-red-600 mt-4 bg-red-50 border border-red-100 rounded-lg p-3 text-left">
              <strong>Reason:</strong> {application.rejectionReason}
            </p>
          )}
          {application.status === "rejected" && onReapply && (
            <Button className="mt-4" onClick={onReapply}>Submit a New Application</Button>
          )}
          {application.status === "approved" && (
            <Link href="/professional-dashboard">
              <Button className="mt-4">Go to your Dashboard</Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
