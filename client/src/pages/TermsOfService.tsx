import { PageTransition } from "@/components/PageTransition";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold font-serif mb-3 text-foreground">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsOfService() {
  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold font-serif mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: July 5, 2026</p>
        </div>

        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-900">
          <strong>Focus is not an emergency service.</strong> If you or someone else is in immediate
          danger, call <strong>112</strong> (India Emergency) or go to your nearest hospital. Our AI
          companion and professional consultations are wellness support, not a substitute for
          emergency medical or psychiatric care.
        </div>

        <Section title="1. Acceptance of These Terms">
          <p>
            By creating an account or using Focus, you agree to these Terms of Service and our{" "}
            <a href="/privacy" className="text-primary underline">Privacy Policy</a>. If you do not
            agree, please do not use the platform.
          </p>
        </Section>

        <Section title="2. Who Can Use Focus">
          <p>
            You must be at least 18 years old, or using Focus with the involvement and consent of a
            parent or guardian, to create an account. By registering, you confirm the information you
            provide is accurate.
          </p>
        </Section>

        <Section title="3. What Focus Is — and Isn't">
          <p>
            Focus provides an AI wellness companion, journaling, mood tracking, guided practices, and a
            marketplace to book consultations with independent mental health and wellness professionals.
          </p>
          <p>
            <strong className="text-foreground">Focus is not a substitute for professional medical, psychiatric, or psychological
            treatment, and it is not an emergency or crisis response service.</strong> Our AI companion
            provides supportive, general wellness conversation — it does not diagnose conditions,
            prescribe treatment, or replace a licensed professional's judgment. If you are experiencing
            a medical or psychiatric emergency, contact emergency services immediately.
          </p>
        </Section>

        <Section title="4. Professional Consultations">
          <p>
            Professionals listed on Focus (psychiatrists, psychologists, counselors, yoga/wellness
            experts) are independent practitioners, not employees of Focus. Focus facilitates the
            connection and payment for these consultations but is not a party to the clinical
            relationship between you and the professional, and is not liable for the advice or
            treatment a professional provides. We do take professional verification and platform
            safety seriously, and we welcome reports of any concerning conduct.
          </p>
        </Section>

        <Section title="5. Payments & Wallet">
          <p>
            Sessions are billed on a per-minute basis from a prepaid wallet balance, which you top up
            via Stripe (international cards) or Razorpay (UPI and Indian payment methods). Wallet
            recharges are generally non-refundable except as required by law or at our discretion for
            demonstrated platform errors. You are responsible for all charges incurred through your
            account.
          </p>
        </Section>

        <Section title="6. Your Responsibilities">
          <ul className="list-disc list-inside space-y-1">
            <li>Keep your login credentials confidential and secure.</li>
            <li>Provide accurate information about yourself and, if you are a professional, your qualifications.</li>
            <li>Do not use Focus for any unlawful purpose, to harass others, or to misrepresent yourself.</li>
            <li>Do not attempt to circumvent security measures, rate limits, or crisis-detection systems.</li>
          </ul>
        </Section>

        <Section title="7. AI-Generated Content">
          <p>
            Responses from our AI companion, including any journaling insights, are generated using
            third-party AI models and may occasionally be inaccurate or incomplete. Use your own
            judgment, and consult a qualified professional for anything requiring medical, psychiatric,
            legal, or financial certainty.
          </p>
        </Section>

        <Section title="8. Account Suspension & Termination">
          <p>
            We may suspend or terminate accounts that violate these terms, pose a safety risk to others,
            or engage in fraud or abuse of the platform. You may close your account at any time; see our{" "}
            <a href="/privacy" className="text-primary underline">Privacy Policy</a> for what happens to
            your data afterward.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, Focus and its team are not liable for indirect,
            incidental, or consequential damages arising from your use of the platform, including
            actions or advice from independent professionals listed on it. Nothing in these terms
            limits liability that cannot be excluded under Indian law.
          </p>
        </Section>

        <Section title="10. Governing Law">
          <p>
            These terms are governed by the laws of India. Any disputes will be subject to the
            jurisdiction of the courts of India.
          </p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p>
            We may update these terms as Focus evolves. Continued use of the platform after changes
            take effect constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Questions about these terms can be sent to{" "}
            <a href="mailto:focus.abhix@gmail.com" className="text-primary underline">focus.abhix@gmail.com</a>.
          </p>
          <p className="text-xs italic">
            (Replace this placeholder email with a real, monitored support inbox before launch.)
          </p>
        </Section>
      </div>
    </PageTransition>
  );
}
