import PDFDocument from "pdfkit";
import { db } from "../db";
import { invoices, sessions, users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { decomposeLockedPrice } from "../pricing";
import type { Invoice } from "@shared/schema";

export async function getOrCreateInvoice(sessionId: string): Promise<Invoice> {
  const [existing] = await db.select().from(invoices).where(eq(invoices.sessionId, sessionId));
  if (existing) return existing;

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session || !session.priceAtBooking) {
    throw new Error("Booking not found or not yet paid");
  }

  const pricing = decomposeLockedPrice(session.priceAtBooking);

  const seqResult = await db.execute(sql`SELECT nextval('invoice_number_seq') as n`);
  const seq = Number((seqResult.rows[0] as any).n);
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(seq).padStart(6, "0")}`;

  const [invoice] = await db
    .insert(invoices)
    .values({
      invoiceNumber,
      sessionId,
      userId: session.clientId,
      baseAmount: pricing.base,
      discountAmount: pricing.discount,
      taxAmount: pricing.tax,
      taxBreakdown: { gst: pricing.tax },
      platformCommissionAmount: pricing.commission,
      totalAmount: session.priceAtBooking,
    })
    .returning();

  return invoice;
}

// pdfkit's default Helvetica font doesn't reliably render the ₹ glyph, so
// the PDF uses "Rs." — the web UI (which renders with a real font stack)
// keeps ₹ everywhere else.
export async function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  const [session] = await db.select().from(sessions).where(eq(sessions.id, invoice.sessionId));
  const [client] = await db.select().from(users).where(eq(users.id, invoice.userId));
  const [professional] = session
    ? await db.select().from(users).where(eq(users.id, session.professionalId))
    : [undefined];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("Focus", { align: "left" });
    doc.fontSize(10).fillColor("#666").text("Wellness Session Invoice", { align: "left" });
    doc.moveDown(1.5);

    doc.fillColor("#000").fontSize(12);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${invoice.issuedAt.toDateString()}`);
    doc.text(`Booking ID: ${invoice.sessionId}`);
    doc.moveDown();
    doc.text(`Billed to: ${client?.fullName ?? "Client"}`);
    if (client?.email) doc.text(`Email: ${client.email}`);
    doc.text(`Professional: ${professional?.fullName ?? "Professional"}`);
    doc.moveDown(1.5);

    doc.text(`Base amount: Rs. ${invoice.baseAmount}`);
    if (Number(invoice.discountAmount) > 0) doc.text(`Discount: -Rs. ${invoice.discountAmount}`);
    doc.text(`GST: Rs. ${invoice.taxAmount}`);
    doc.moveDown();
    doc.fontSize(14).text(`Total: Rs. ${invoice.totalAmount}`, { align: "right" });
    doc.moveDown(2);
    doc.fontSize(9).fillColor("#666").text("This is a system-generated invoice for a mental wellness consultation.", { align: "center" });

    doc.end();
  });
}
