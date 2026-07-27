import { PageTransition } from "@/components/PageTransition";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold font-serif mb-3 text-foreground">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function RefundPolicy() {
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">Refund Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: July 28, 2026</p>
        </div>

        <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground/80">
          <strong className="text-foreground">Refunds under this policy are always issued as wallet credit —
          never back to your card, UPI, or bank account, and never as cash.</strong> This applies to every
          refund described below, including partial refunds for interrupted sessions.
        </div>

        <Section title="1. When You're Eligible for a Refund">
          <p>You're eligible for a refund when any of the following happens:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">A technical issue prevented the session from working</strong> — the call failed to connect, our platform was down, or audio/video didn't function.</li>
            <li><strong className="text-foreground">The professional did not show up</strong> for a session you had scheduled.</li>
            <li><strong className="text-foreground">The session never started at all</strong> — neither you nor the professional joined.</li>
          </ul>
        </Section>

        <Section title="2. When You're Not Eligible">
          <p>
            Once a session has been marked completed and delivered as described, it is not eligible for a
            refund under this policy. This is a deliberate, stated limit — dissatisfaction with a session's
            content, quality, or fit with a particular professional does not, by itself, qualify for a refund.
            We'd still like to hear that feedback (see our{" "}
            <a href="/feedback" className="text-primary underline">Feedback</a> page) so we can improve
            our professional matching, but it won't trigger a refund on its own.
          </p>
        </Section>

        <Section title="3. How Refunds Are Paid Out">
          <p>
            Every refund under this policy — full or partial — is credited to your Focus wallet. It is
            available immediately for future sessions, but it is not paid back to your original payment
            method (card/UPI) and is not issued as cash under any circumstance.
          </p>
        </Section>

        <Section title="4. Partial Refunds">
          <p>
            If a session started but was cut short by a technical issue (for example, a call that
            disconnects 10 minutes into a scheduled 60-minute session), we refund the unused portion of
            that session on a pro-rated basis to your wallet, rather than refunding the full amount.
          </p>
        </Section>

        <Section title="5. Request Window">
          <p>
            Raise a refund request within <strong className="text-foreground">48 hours</strong> of the
            affected session's scheduled time. Requests made after this window may not be honored, since we
            rely on session and connection logs from around that time to verify what happened.
          </p>
          <p>
            One exception: if a professional doesn't respond to an instant session request in time, that
            refund is issued automatically and immediately — you don't need to request it.
          </p>
        </Section>

        <Section title="6. How to Request a Refund">
          <p>
            Email <a href="mailto:focus.abhix@gmail.com" className="text-primary underline">focus.abhix@gmail.com</a>{" "}
            with your session date/time and what happened. We review each request against session records
            before processing it — most refund requests under this policy aren't automatic, so please
            include enough detail (which session, roughly when, what went wrong) for us to look it up quickly.
          </p>
        </Section>

        <Section title="7. Grievance Officer & Response Timeline">
          <p>
            In accordance with the Consumer Protection Act, 2019 and the Consumer Protection (E-Commerce)
            Rules, 2020, complaints or refund disputes under this policy can be escalated to our Grievance
            Officer, [Grievance Officer Name], at{" "}
            <a href="mailto:focus.abhix@gmail.com" className="text-primary underline">focus.abhix@gmail.com</a>.
          </p>
          <p>
            We acknowledge complaints within 48 hours and aim to resolve them within 5–7 business days.
            Focus is currently a small team, so we're stating a timeline we can actually meet rather than
            one that sounds better on paper.
          </p>
          <p className="text-xs italic">
            (Replace the placeholder name above with a real Grievance Officer before launch — this is a
            required disclosure under Indian consumer protection law, not decorative text.)
          </p>
        </Section>

        <div className="mt-10 p-4 bg-muted/50 border rounded-lg text-xs text-muted-foreground leading-relaxed">
          This policy is provided for transparency and does not replace your rights under applicable Indian
          consumer protection law. It has not yet been reviewed by a lawyer — treat it as a good-faith draft,
          not a final legal document. If a refund dispute under this policy isn't resolved to your
          satisfaction through the process above, you can also raise it with the{" "}
          <a href="https://consumerhelpline.gov.in" target="_blank" rel="noopener noreferrer" className="underline">
            National Consumer Helpline
          </a>{" "}
          or file a complaint on the{" "}
          <a href="https://edaakhil.nic.in" target="_blank" rel="noopener noreferrer" className="underline">
            e-Daakhil
          </a>{" "}
          portal.
        </div>
      </div>
    </PageTransition>
  );
}
