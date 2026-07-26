import { PageTransition } from "@/components/PageTransition";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold font-serif mb-3 text-foreground">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: July 5, 2026</p>
        </div>

        <div className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground/80">
          Focus is a mental wellness platform, and we know the information you share with us —
          journal entries, mood check-ins, chat conversations — is sensitive. This policy explains
          what we collect, why, and what rights you have over it.
        </div>

        <Section title="1. Who We Are">
          <p>
            Focus ("we", "our", "us") operates a mental health and wellness platform for users in India,
            connecting clients with psychiatrists, psychologists, counselors, and yoga/wellness professionals,
            alongside an AI wellness companion, journaling, mood tracking, and related features.
          </p>
        </Section>

        <Section title="2. Information We Collect">
          <p><strong className="text-foreground">Account information:</strong> name, email, phone number, password (stored as a one-way hash, never in plain text), and role (client or professional).</p>
          <p><strong className="text-foreground">Wellness data:</strong> journal entries, mood check-ins, AI companion chat messages, guided-practice completions (breathing, grounding, gratitude, meditation), and session history with professionals.</p>
          <p><strong className="text-foreground">Payment information:</strong> processed by Stripe and Razorpay directly — we do not store your card, UPI, or bank details on our own servers. We retain transaction records (amount, status, timestamp) for your wallet history.</p>
          <p><strong className="text-foreground">Technical information:</strong> IP address, device/browser information, and log data, used for security, rate-limiting, and fraud prevention.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul className="list-disc list-inside space-y-1">
            <li>To provide the core service: AI companion conversations, journaling with AI-generated reflections, mood tracking, and connecting you with professionals.</li>
            <li>To process payments and maintain your wallet balance.</li>
            <li>To detect and respond to signs of crisis or self-harm risk in what you share (see Section 4 below — this is important and specific to a platform like ours).</li>
            <li>To improve the platform and investigate misuse, fraud, or security incidents.</li>
            <li>To communicate with you about your account, bookings, and — if you opt in — product updates.</li>
          </ul>
        </Section>

        <Section title="4. Crisis & Safety Monitoring — Please Read This">
          <p>
            When you use our AI companion or journal, our systems automatically scan for language that
            may indicate a mental health crisis or risk of self-harm. This detection happens on our servers,
            not just in your browser, so it applies consistently regardless of how you access Focus.
          </p>
          <p>
            If a crisis signal is detected, we (a) immediately show you emergency helpline numbers and
            safety resources in the moment, (b) create an internal safety record containing a short excerpt
            of the flagged message so a member of our team can review it, and (c) notify a designated
            member of our safety team by email so a human can follow up. This record is accessible only
            to authorized admin accounts and is not used for any purpose other than user safety and,
            where legally required, compliance.
          </p>
          <p>
            We do this because we believe a real chance to check on someone's safety outweighs the
            sensitivity of this data being reviewed by a small, trusted internal team. If you have concerns
            about this, please contact us using the details in Section 10.
          </p>
        </Section>

        <Section title="5. AI Processing">
          <p>
            Conversations with our AI companion and AI-generated journal insights are processed using
            OpenAI's API. Message content is sent to OpenAI to generate a response and is subject to
            OpenAI's own data handling terms. We do not use your personal conversations to train third-party
            AI models beyond what is inherent in using their API for inference.
          </p>
        </Section>

        <Section title="6. Who We Share Data With">
          <p>We do not sell your personal data. We share data only with:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong className="text-foreground">Service providers</strong> who help us operate the platform: our database/hosting provider, OpenAI (AI responses), Stripe and Razorpay (payments), Resend (transactional and safety-alert emails), and Cloudflare (relays encrypted call traffic when a direct peer-to-peer connection isn't possible — see Section 11).</li>
            <li><strong className="text-foreground">The professional you book a session with</strong>, limited to what's necessary for that consultation (e.g. your name and session notes you choose to share).</li>
            <li><strong className="text-foreground">Law enforcement or authorities</strong>, only where required by law or to protect someone's immediate safety.</li>
          </ul>
        </Section>

        <Section title="7. Data Retention">
          <p>
            We retain your account and wellness data for as long as your account is active, so your
            journal, chat history, and progress remain available to you. Safety records created under
            Section 4 are retained for audit purposes even if related content is later deleted. You can
            request deletion of your account and associated data at any time (see Section 8).
          </p>
        </Section>

        <Section title="8. Your Rights">
          <p>Under India's Digital Personal Data Protection Act, 2023, and as a matter of our own policy, you have the right to:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate information in your profile.</li>
            <li>Request deletion of your account and personal data, subject to our legal obligation to retain certain safety and financial records.</li>
            <li>Withdraw consent for non-essential communications at any time.</li>
          </ul>
          <p>To exercise any of these rights, contact us using the details in Section 10.</p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>
            Focus is intended for users aged 18 and older. If you are under 18, you may use Focus only
            with the involvement and consent of a parent or guardian, in accordance with applicable law.
          </p>
        </Section>

        <Section title="10. Grievance Officer & Contact">
          <p>
            In accordance with Indian law, if you have questions, complaints, or requests regarding your
            personal data, please contact our Grievance Officer at{" "}
            <a href="mailto:privacy@focus.example.com" className="text-primary underline">privacy@focus.example.com</a>.
          </p>
          <p className="text-xs italic">
            (Replace this placeholder email with a real, monitored inbox before launch — this is a required
            contact point under the DPDP Act, not decorative text.)
          </p>
        </Section>

        <Section title="11. Voice & Video Calls">
          <p>
            Voice and video sessions with a professional connect your device directly to theirs
            (peer-to-peer WebRTC) — the audio/video itself is never sent to, processed by, or stored on
            our servers, and we do not record sessions. Only the two participants on a session can access
            its call.
          </p>
          <p>
            When a direct connection isn't possible (for example, on a restrictive network), a relay
            service (Cloudflare Calls) forwards the connection. The audio/video stream stays end-to-end
            encrypted in transit, so the relay forwards encrypted packets without being able to read
            their content.
          </p>
        </Section>

        <Section title="12. Changes to This Policy">
          <p>
            We may update this policy as our platform evolves. We will update the "Last updated" date
            above, and for significant changes, we'll notify you directly.
          </p>
        </Section>
      </div>
    </PageTransition>
  );
}
