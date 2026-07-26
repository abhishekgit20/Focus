import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, ShieldCheck, ShieldOff, KeyRound, LogOut, Download, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  changePassword,
  logoutAllDevices,
  enrollMfa,
  confirmMfaEnrollment,
  disableMfa,
  exportAccountData,
  deleteAccount,
} from "@/lib/api";
import { useLocation } from "wouter";

// Shared by both the client Profile page and the professional dashboard's
// Settings tab — account security shouldn't have two different
// implementations that can drift out of sync.
export function AccountSecuritySettings({ mfaEnabled: initialMfaEnabled }: { mfaEnabled: boolean }) {
  const [, setLocation] = useLocation();

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // MFA
  const [mfaEnabled, setMfaEnabled] = useState(initialMfaEnabled);
  const [enrollStep, setEnrollStep] = useState<"idle" | "scan" | "backup-codes">("idle");
  const [qrCode, setQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [enrollCode, setEnrollCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  // Danger zone
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed. You've been logged out of your other devices.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      toast.error(error.message || "Couldn't change your password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      await logoutAllDevices();
      toast.success("Logged out of all other devices.");
    } catch (error: any) {
      toast.error(error.message || "Something went wrong.");
    }
  };

  const startMfaEnrollment = async () => {
    setMfaBusy(true);
    try {
      const { qrCode, secret } = await enrollMfa();
      setQrCode(qrCode);
      setMfaSecret(secret);
      setEnrollStep("scan");
    } catch (error: any) {
      toast.error(error.message || "Couldn't start 2FA setup.");
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaBusy(true);
    try {
      const { backupCodes } = await confirmMfaEnrollment(enrollCode);
      setBackupCodes(backupCodes);
      setEnrollStep("backup-codes");
      setMfaEnabled(true);
      setEnrollCode("");
    } catch (error: any) {
      toast.error(error.message || "Invalid code. Please try again.");
    } finally {
      setMfaBusy(false);
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaBusy(true);
    try {
      await disableMfa(disablePassword);
      setMfaEnabled(false);
      setDisableDialogOpen(false);
      setDisablePassword("");
      toast.success("Two-factor authentication disabled.");
    } catch (error: any) {
      toast.error(error.message || "Couldn't disable 2FA.");
    } finally {
      setMfaBusy(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportAccountData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "focus-account-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error.message || "Couldn't export your data.");
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await deleteAccount(deletePassword || undefined);
      toast.success("Your account has been deleted.");
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error.message || "Couldn't delete your account.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Password</CardTitle>
          <CardDescription>Changing your password logs you out of every other device.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password-settings">New password</Label>
              <Input id="new-password-settings" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={changingPassword} data-testid="button-change-password">
              {changingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing...</> : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {mfaEnabled ? <ShieldCheck className="w-5 h-5 text-green-600" /> : <ShieldOff className="w-5 h-5" />}
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            {mfaEnabled ? "Your account is protected with an authenticator app." : "Add an extra layer of security with an authenticator app (Google Authenticator, Authy, etc.)."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mfaEnabled ? (
            <Button variant="outline" onClick={() => setDisableDialogOpen(true)} data-testid="button-disable-mfa">
              Disable 2FA
            </Button>
          ) : enrollStep === "idle" ? (
            <Button onClick={startMfaEnrollment} disabled={mfaBusy} data-testid="button-enroll-mfa">
              {mfaBusy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</> : "Enable 2FA"}
            </Button>
          ) : enrollStep === "scan" ? (
            <form onSubmit={confirmEnrollment} className="space-y-4 max-w-sm">
              <p className="text-sm text-muted-foreground">Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
              <img src={qrCode} alt="MFA QR code" className="w-40 h-40 border rounded-lg" />
              <p className="text-xs text-muted-foreground">Can't scan? Enter this code manually: <code className="font-mono">{mfaSecret}</code></p>
              <div className="space-y-2">
                <Label htmlFor="enroll-code">Verification code</Label>
                <Input id="enroll-code" inputMode="numeric" placeholder="123456" value={enrollCode} onChange={(e) => setEnrollCode(e.target.value)} required data-testid="input-mfa-confirm-code" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={mfaBusy} data-testid="button-confirm-mfa">
                  {mfaBusy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming...</> : "Confirm"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEnrollStep("idle")}>Cancel</Button>
              </div>
            </form>
          ) : (
            <div className="space-y-3 max-w-sm">
              <p className="text-sm font-medium">Save these backup codes somewhere safe.</p>
              <p className="text-xs text-muted-foreground">Each one can be used once to sign in if you lose access to your authenticator app. They won't be shown again.</p>
              <div className="bg-muted rounded-lg p-3 font-mono text-sm grid grid-cols-2 gap-2">
                {backupCodes.map((code) => <span key={code}>{code}</span>)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(backupCodes.join("\n"));
                  toast.success("Backup codes copied.");
                }}
              >
                <Copy className="w-4 h-4 mr-2" /> Copy codes
              </Button>
              <Button className="w-full" onClick={() => setEnrollStep("idle")}>Done</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LogOut className="w-5 h-5" /> Sessions</CardTitle>
          <CardDescription>Sign out of every other browser or device signed into your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogoutAllDevices} data-testid="button-logout-all-devices">
            Log out of all other devices
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5" /> Your Data</CardTitle>
          <CardDescription>Download a copy of everything associated with your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} data-testid="button-export-data">
            Export my data
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive"><Trash2 className="w-5 h-5" /> Delete Account</CardTitle>
          <CardDescription>Permanently removes your personal data. This can't be undone.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} data-testid="button-delete-account">
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>Enter your password to confirm.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDisableMfa} className="space-y-4">
            <Input type="password" placeholder="Current password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} required />
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={mfaBusy}>
                {mfaBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This removes your personal information permanently. Sessions and earnings tied to other people (e.g. a professional you've booked) are kept for their records, with your identity anonymized.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <Input type="password" placeholder="Current password (if you have one)" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={deleting} data-testid="button-confirm-delete-account">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Permanently delete my account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
