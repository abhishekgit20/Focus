import { Resend } from "resend";
import type { CrisisEvent } from "@shared/schema";

const apiKey = process.env.RESEND_API_KEY?.trim();
const alertRecipients = process.env.CRISIS_ALERT_EMAIL?.split(",").map((e) => e.trim()).filter(Boolean);
// Resend's shared test sender - works without a verified domain, only delivers to
// the Resend account owner's own email until a real domain is verified.
const fromAddress = process.env.CRISIS_ALERT_FROM_EMAIL?.trim() || "Focus Alerts <onboarding@resend.dev>";

const resend = apiKey ? new Resend(apiKey) : null;

if (!apiKey) {
  console.warn("⚠️  RESEND_API_KEY not set. Crisis alert emails are disabled.");
} else if (!alertRecipients || alertRecipients.length === 0) {
  console.warn("⚠️  CRISIS_ALERT_EMAIL not set. Crisis alert emails are disabled.");
}

const SOURCE_LABEL: Record<string, string> = {
  chat: "Logged-in Chat",
  public_chat: "Public Chat Widget",
  journal: "Journal Entry",
};

export async function sendCrisisAlertEmail(event: CrisisEvent): Promise<void> {
  if (!resend || !alertRecipients || alertRecipients.length === 0) return;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: alertRecipients,
      subject: `🚨 Crisis alert - ${SOURCE_LABEL[event.source] || event.source}`,
      html: `
        <h2>A crisis/self-harm signal was detected</h2>
        <p><strong>Source:</strong> ${SOURCE_LABEL[event.source] || event.source}</p>
        <p><strong>User ID:</strong> ${event.userId || "Anonymous (public chat)"}</p>
        <p><strong>Detected at:</strong> ${event.createdAt}</p>
        <p><strong>Matched signals:</strong> ${event.matchedSignals.join(", ")}</p>
        <p><strong>Flagged excerpt:</strong></p>
        <blockquote>${escapeHtml(event.excerpt)}</blockquote>
        <p>Please review and follow up in the admin dashboard as soon as possible.</p>
      `,
    });
    // The Resend SDK resolves (doesn't throw) on API-level errors like a bad key
    // or unverified domain - it returns { data: null, error } instead.
    if (error) {
      console.error("Crisis alert email rejected by Resend:", error);
    } else {
      console.log(`Crisis alert email sent (Resend id: ${data?.id}) to ${alertRecipients.length} recipient(s).`);
    }
  } catch (error) {
    // Never let an alerting failure break the user-facing request that triggered it.
    console.error("Failed to send crisis alert email:", error);
  }
}

export async function sendDisputeAlertEmail(dispute: {
  gateway: string;
  gatewayDisputeId: string;
  sessionId: string | null;
  reason: string | null;
  amount: string;
  status: string;
}): Promise<void> {
  if (!resend || !alertRecipients || alertRecipients.length === 0) return;

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: alertRecipients,
      subject: `⚠️ Payment dispute opened - ₹${dispute.amount} (${dispute.gateway})`,
      html: `
        <h2>A chargeback/dispute was opened</h2>
        <p><strong>Gateway:</strong> ${escapeHtml(dispute.gateway)}</p>
        <p><strong>Gateway dispute ID:</strong> ${escapeHtml(dispute.gatewayDisputeId)}</p>
        <p><strong>Amount:</strong> ₹${escapeHtml(dispute.amount)}</p>
        <p><strong>Status:</strong> ${escapeHtml(dispute.status)}</p>
        <p><strong>Reason (from gateway):</strong> ${escapeHtml(dispute.reason || "not provided")}</p>
        <p><strong>Affected booking:</strong> ${dispute.sessionId ? escapeHtml(dispute.sessionId) : "Could not be matched to a booking automatically — check the gateway dashboard"}</p>
        <p>This is not handled automatically yet — please review in the gateway dashboard and respond within its deadline.</p>
      `,
    });
    if (error) {
      console.error("Dispute alert email rejected by Resend:", error);
    } else {
      console.log(`Dispute alert email sent (Resend id: ${data?.id}) to ${alertRecipients.length} recipient(s).`);
    }
  } catch (error) {
    console.error("Failed to send dispute alert email:", error);
  }
}

export async function sendReconciliationAlertEmail(mismatches: Array<{
  gateway: string;
  gatewayPaymentId: string;
  mismatchType: string;
  gatewayStatus: string | null;
  localStatus: string | null;
  amount: string | null;
}>): Promise<void> {
  if (!resend || !alertRecipients || alertRecipients.length === 0) return;
  if (mismatches.length === 0) return;

  try {
    const rows = mismatches.map((m) => `
      <tr>
        <td>${escapeHtml(m.gateway)}</td>
        <td>${escapeHtml(m.gatewayPaymentId)}</td>
        <td>${escapeHtml(m.mismatchType)}</td>
        <td>${escapeHtml(m.gatewayStatus || "-")}</td>
        <td>${escapeHtml(m.localStatus || "-")}</td>
        <td>${m.amount ? `₹${escapeHtml(m.amount)}` : "-"}</td>
      </tr>
    `).join("");
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: alertRecipients,
      subject: `⚠️ Payment reconciliation found ${mismatches.length} mismatch(es)`,
      html: `
        <h2>Daily reconciliation found gateway/DB mismatches</h2>
        <p>The following payments differ between the gateway and Focus's local records. Please review in the admin dashboard.</p>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
          <thead><tr><th>Gateway</th><th>Payment ID</th><th>Type</th><th>Gateway status</th><th>Local status</th><th>Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `,
    });
    if (error) {
      console.error("Reconciliation alert email rejected by Resend:", error);
    } else {
      console.log(`Reconciliation alert email sent (Resend id: ${data?.id}) to ${alertRecipients.length} recipient(s).`);
    }
  } catch (error) {
    console.error("Failed to send reconciliation alert email:", error);
  }
}

const APP_URL = process.env.BASE_URL || "http://localhost:5000";

async function sendTransactional(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    console.warn(`⚠️  RESEND_API_KEY not set — skipped sending "${subject}" to a user.`);
    return;
  }
  try {
    const { error } = await resend.emails.send({ from: fromAddress, to, subject, html });
    if (error) console.error(`Email "${subject}" rejected by Resend:`, error);
  } catch (error) {
    console.error(`Failed to send email "${subject}":`, error);
  }
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const link = `${APP_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await sendTransactional(to, "Verify your Focus account", `
    <h2>Confirm your email address</h2>
    <p>Click the link below to verify your Focus account. This link expires in 24 hours.</p>
    <p><a href="${link}">${link}</a></p>
    <p>If you didn't create this account, you can ignore this email.</p>
  `);
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await sendTransactional(to, "Reset your Focus password", `
    <h2>Reset your password</h2>
    <p>We received a request to reset your Focus password. This link expires in 1 hour and can only be used once.</p>
    <p><a href="${link}">${link}</a></p>
    <p>If you didn't request this, you can safely ignore this email — your password will not be changed.</p>
  `);
}

export async function sendPasswordChangedAlertEmail(to: string): Promise<void> {
  await sendTransactional(to, "Your Focus password was changed", `
    <h2>Your password was just changed</h2>
    <p>If this was you, no action is needed — you've been logged out of all other devices as a precaution.</p>
    <p>If you did <strong>not</strong> make this change, please reset your password immediately and contact support.</p>
  `);
}

export async function sendNewDeviceAlertEmail(to: string, context: { ipAddress?: string; userAgent?: string }): Promise<void> {
  await sendTransactional(to, "New sign-in to your Focus account", `
    <h2>New sign-in detected</h2>
    <p>Your Focus account was just signed into from a device or location we haven't seen before.</p>
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
    ${context.ipAddress ? `<p><strong>IP address:</strong> ${escapeHtml(context.ipAddress)}</p>` : ""}
    ${context.userAgent ? `<p><strong>Browser:</strong> ${escapeHtml(context.userAgent)}</p>` : ""}
    <p>If this was you, no action is needed. If you don't recognize this activity, reset your password immediately.</p>
  `);
}

export async function sendProfessionalApplicationApprovedEmail(to: string, fullName: string): Promise<void> {
  await sendTransactional(to, "You're approved as a Focus professional!", `
    <h2>Congratulations, ${escapeHtml(fullName)}!</h2>
    <p>Your application to join Focus as a verified professional has been approved. Your profile is now live and clients can book sessions with you.</p>
    <p><a href="${APP_URL}/professional-dashboard">Go to your dashboard</a></p>
  `);
}

export async function sendProfessionalApplicationRejectedEmail(to: string, fullName: string, reason: string): Promise<void> {
  await sendTransactional(to, "Update on your Focus professional application", `
    <h2>Hi ${escapeHtml(fullName)},</h2>
    <p>Thanks for applying to join Focus as a professional. After review, we're not able to approve your application at this time.</p>
    <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
    <p>You're welcome to submit a new application once you're able to address the above.</p>
  `);
}

export async function sendProfessionalSuspendedEmail(to: string, fullName: string, reason: string): Promise<void> {
  await sendTransactional(to, "Your Focus professional account has been suspended", `
    <h2>Hi ${escapeHtml(fullName)},</h2>
    <p>Your professional account on Focus has been suspended and is no longer visible to clients.</p>
    <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
    <p>If you believe this is a mistake, please contact support.</p>
  `);
}

export async function sendInvoiceEmail(to: string, fullName: string, invoiceNumber: string, pdf: Buffer): Promise<void> {
  if (!resend) {
    console.warn(`⚠️  RESEND_API_KEY not set — skipped emailing invoice ${invoiceNumber}.`);
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: fromAddress,
      to,
      subject: `Your Focus invoice ${invoiceNumber}`,
      html: `
        <h2>Hi ${escapeHtml(fullName)},</h2>
        <p>Attached is your invoice ${escapeHtml(invoiceNumber)} for a recent Focus session.</p>
      `,
      attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf }],
    });
    if (error) console.error(`Invoice email rejected by Resend:`, error);
  } catch (error) {
    console.error(`Failed to send invoice email:`, error);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
