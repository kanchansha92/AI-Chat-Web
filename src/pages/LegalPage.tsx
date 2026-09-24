import { useEffect, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SiteFooter, SiteHeader } from "../components/landing/SiteChrome";

/* /legal - Terms of Service, Privacy Policy, Refund & Cancellation and
   Contact, one tab per document. The wording is the company's legal text and
   is kept word for word; change it here only when the legal text changes.

   The active document comes from the URL hash (#terms, #privacy, #refunds,
   #contact), so /legal#privacy can be linked from anywhere and the back
   button moves between tabs. An unknown or missing hash shows the Terms.

   Ungated in App.tsx: a policy only signed-in people can read is not a
   published policy, and the app stores ask for a URL that opens without an
   account. /privacy redirects here.

   The same page opens inside the app at /settings/legal (inApp): no site
   navbar or footer there, just a back button and a "Settings / Legal"
   breadcrumb, like the other settings pages. */

type DocId = "terms" | "privacy" | "refunds" | "contact";

const TABS: { id: DocId; label: string }[] = [
    { id: "terms", label: "Terms of Service" },
    { id: "privacy", label: "Privacy Policy" },
    { id: "refunds", label: "Refund & Cancellation" },
    { id: "contact", label: "Contact" },
];

const UPDATED = "Last updated: 24 September 2026";
const EMAIL = "care@privateaile.com";

/* ---------- small building blocks ---------- */

function Mail() {
    return <a href={`mailto:${EMAIL}`}>{EMAIL}</a>;
}

/** A paragraph whose lines are kept apart, as in an address block. */
function Lines({ lines }: { lines: ReactNode[] }) {
    return (
        <p>
            {lines.map((l, i) => (
                <span key={i}>
                    {i > 0 && <br />}
                    {l}
                </span>
            ))}
        </p>
    );
}

function Doc({
    id,
    title,
    active,
    updated = true,
    children,
}: {
    id: DocId;
    title: string;
    active: boolean;
    updated?: boolean;
    children: ReactNode;
}) {
    return (
        <section
            id={id}
            aria-labelledby={`${id}-h`}
            hidden={!active}
            className="lp-legal-doc lp-card print:block! print:border-0 print:shadow-none print:break-after-page"
        >
            <h1 id={`${id}-h`}>{title}</h1>
            {updated && <p className="lp-legal-updated">{UPDATED}</p>}
            {children}
        </section>
    );
}

/* ---------- page ---------- */

function BackIcon() {
    return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
        </svg>
    );
}

export default function LegalPage({ inApp = false }: { inApp?: boolean }) {
    const navigate = useNavigate();
    const { hash } = useLocation();
    const wanted = hash.replace(/^#/, "");
    const active: DocId = TABS.some((t) => t.id === wanted) ? (wanted as DocId) : "terms";
    const activeLabel = TABS.find((t) => t.id === active)!.label;

    // Each tab opens at the top of its document, and names the browser tab.
    useEffect(() => {
        window.scrollTo(0, 0);
        const prev = document.title;
        document.title = `${activeLabel}  Private Aile`;
        return () => {
            document.title = prev;
        };
    }, [activeLabel]);

    return (
        <div
            className={"lp relative min-h-dvh w-full overflow-x-clip app-gradient text-ink flex flex-col" + (inApp ? " lp-legal-app" : "")}
            style={inApp ? { paddingTop: "env(safe-area-inset-top)" } : undefined}
        >
            {!inApp && <SiteHeader current="/legal" />}

            {inApp ? (
                <div className="w-full max-w-[1080px] mx-auto px-4 sm:px-6 pt-4 md:pt-8 pb-2 md:pb-3 flex flex-col min-[821px]:flex-row min-[821px]:items-center min-[821px]:justify-between gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            aria-label="Back to settings"
                            onClick={() => navigate("/settings")}
                            className="h-9 w-9 md:h-10 md:w-10 shrink-0 rounded-full bg-cream-light border border-hairline/70 text-ink-soft flex items-center justify-center hover:brightness-95 hover:-translate-x-0.5 active:scale-95 transition cursor-pointer print:hidden"
                        >
                            <BackIcon />
                        </button>
                        <nav aria-label="Breadcrumb" className="lp-serif">
                            <ol className="flex items-baseline gap-1.5 text-[1.3rem] sm:text-[1.375rem] tracking-[-0.01em]">
                                <li>
                                    <Link to="/settings" className="text-ink-soft hover:text-ink no-underline transition-colors">
                                        Settings
                                    </Link>
                                </li>
                                <li aria-hidden="true" className="text-ink-soft">
                                    /
                                </li>
                                <li>
                                    <span aria-current="page" className="text-ink font-semibold">
                                        Legal
                                    </span>
                                </li>
                            </ol>
                        </nav>
                    </div>
                    <p className="lp-serif text-ink-soft text-[0.875rem] print:hidden min-[821px]:text-right">
                        Operated by SHVANA AI and Robotics Private Limited
                    </p>
                </div>
            ) : (
                <div className="lp-serif w-full max-w-[1080px] mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-1 sm:pb-2 flex flex-col min-[821px]:flex-row min-[821px]:items-baseline min-[821px]:justify-between gap-0.5">
                    <Link to="/" className="text-ink no-underline text-[1.375rem] font-semibold tracking-[-0.01em]">
                        Private Aile <span className="font-normal text-ink-soft">/ Legal</span>
                    </Link>
                    <p className="text-ink-soft text-[0.875rem] print:hidden">Operated by SHVANA AI and Robotics Private Limited</p>
                </div>
            )}

            <div className="lp-legal-wrap flex-1">
                <nav aria-label="Legal documents" className="lp-legal-tabs lp-serif print:hidden">
                    {TABS.map((t) => (
                        <Link
                            key={t.id}
                            to={{ hash: t.id }}
                            aria-current={t.id === active ? "page" : undefined}
                        >
                            {t.label}
                        </Link>
                    ))}
                </nav>

                <main className="min-w-0 lp-serif">
                    <Doc id="terms" title="Terms of Service" active={active === "terms"}>
                        <p>These Terms govern your use of the Private Aile website and application at privateaile.com (the "Service"). By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.</p>
                        <h2>1. Who we are</h2>
                        <p>The Service is operated by <strong>SHVANA AI and Robotics Private Limited</strong>, a company incorporated in India (CIN: U62090DL2026PTC467490), with its registered office at Innv8 Okhla Phase III, 211 Okhla Industrial Estate, New Delhi, South Delhi 110020, Delhi, India ("we", "us", "the Company"). Contact: <Mail />.</p>
                        <h2>2. Eligibility</h2>
                        <p>You must be <strong>at least 18 years of age</strong> and legally capable of entering into a binding contract to use the Service. By using the Service you represent that you meet this requirement. We may ask you to verify your age, and we may suspend or terminate any account we reasonably believe belongs to a minor.</p>
                        <h2>3. What the Service is</h2>
                        <p>Private Aile is a privacy-focused AI chat and creative-writing platform. It lets you converse with AI models, write and role-play interactive fiction with AI characters, and generate images. The AI generates content automatically in response to your inputs. <strong>You are always interacting with an AI, not a human.</strong> The Service periodically reminds you of this.</p>
                        <p>AI output may be inaccurate, incomplete, or inappropriate. Do not rely on it for medical, legal, financial, or safety-critical decisions. AI characters are fictional and are not a substitute for professional advice, therapy, or human relationships.</p>
                        <h2>4. Your account</h2>
                        <p>You are responsible for keeping your login credentials secure and for all activity under your account. Notify us immediately at <Mail /> if you suspect unauthorised use. One person may hold one account. You may not share, sell, or transfer your account.</p>
                        <h2>5. Mature content setting</h2>
                        <p>The Service includes an optional <strong>mature content</strong> setting, off by default, that permits adult themes in text-based fiction between adult characters. This setting is available only to verified adults, applies to text only, and is subject to Section 6 at all times. You may turn it off at any time in Settings.</p>
                        <h2>6. Prohibited uses</h2>
                        <p>You must not use the Service to create, request, or share content that:</p>
                        <ul>
                            <li>depicts or sexualises anyone under 18, or any character presented as a minor, in any form, including fictional framing;</li>
                            <li>depicts real, identifiable people in sexual or intimate situations without their consent;</li>
                            <li>provides instructions or material assistance for weapons, explosives, malware, or other real-world harm;</li>
                            <li>promotes violence, terrorism, or hatred against any group;</li>
                            <li>harasses, threatens, or defames any person;</li>
                            <li>infringes another person's intellectual property or privacy rights;</li>
                            <li>violates any applicable law in India or in your jurisdiction.</li>
                        </ul>
                        <p>You must not attempt to access the Service through automated means, scrape it, reverse-engineer it, circumvent usage limits or safety filters, resell access, or interfere with its operation.</p>
                        <p>We use automated screening on inputs and outputs to enforce this section. Violations may result in immediate termination without refund, and where required by law we may report content to the relevant authorities.</p>
                        <h2>7. Your content and our content</h2>
                        <p>You retain ownership of the prompts you write and, to the extent permitted by law, the outputs generated for you. You grant us a limited licence to process your inputs and outputs solely to operate the Service for you. <strong>We do not use your conversations to train AI models.</strong></p>
                        <p>The Service, its software, design, characters we create, and trademarks (including "Private Aile") are owned by the Company or its licensors and are protected by law.</p>
                        <h2>8. Subscriptions, payments, and usage limits</h2>
                        <p>Certain features require a paid subscription. Prices, plan features, and usage limits are shown at privateaile.com/pricing and may change with notice. Subscriptions renew automatically at the end of each billing period unless cancelled. Payments are processed by Razorpay; we do not store your card details.</p>
                        <p>Plans include fair-use limits on messages, context, and images. We may throttle or restrict usage that exceeds these limits. Refunds and cancellations are governed by our Refund &amp; Cancellation Policy.</p>
                        <p>Prices for customers in India include GST where applicable. Prices for customers outside India are shown in USD and are exclusive of any taxes your jurisdiction may impose.</p>
                        <h2>9. Privacy</h2>
                        <p>Our Privacy Policy explains what data we collect and how we use it. In summary: your conversations are stored only with your consent, we do not sell your data, and we do not use it to train AI models.</p>
                        <h2>10. Availability and changes</h2>
                        <p>We aim for high availability but do not guarantee uninterrupted service. We may modify, suspend, or discontinue features, models, or the Service itself. We will give reasonable notice of material changes where practicable.</p>
                        <h2>11. Termination</h2>
                        <p>You may delete your account at any time in Settings. We may suspend or terminate your account for breach of these Terms, suspected illegal activity, or where required by law. On termination, your right to use the Service ends and we will delete your account data in accordance with our Privacy Policy.</p>
                        <h2>12. Disclaimers</h2>
                        <p>The Service is provided "as is" and "as available". To the fullest extent permitted by law, we disclaim all warranties, express or implied, including fitness for a particular purpose and non-infringement. AI-generated content does not reflect the views of the Company.</p>
                        <h2>13. Limitation of liability</h2>
                        <p>To the fullest extent permitted by law, the Company shall not be liable for any indirect, incidental, consequential, or punitive damages, or for any loss of data, profits, or goodwill, arising from your use of the Service. Our total liability for any claim shall not exceed the amount you paid us in the three months preceding the claim.</p>
                        <h2>14. Indemnity</h2>
                        <p>You agree to indemnify the Company against claims, losses, and expenses arising from your breach of these Terms or your misuse of the Service.</p>
                        <h2>15. Governing law and disputes</h2>
                        <p>These Terms are governed by the laws of India. Subject to Section 16, the courts at New Delhi, India shall have exclusive jurisdiction.</p>
                        <h2>16. Grievance redressal</h2>
                        <p>In accordance with the Information Technology Act, 2000 and rules thereunder, our Grievance Officer is:</p>
                        <Lines
                            lines={[
                                "Authorised Signatory, SHVANA AI and Robotics Private Limited",
                                "SHVANA AI and Robotics Private Limited",
                                "Innv8 Okhla Phase III, 211 Okhla Industrial Estate, New Delhi, South Delhi 110020, Delhi",
                                <>Email: <Mail /></>,
                            ]}
                        />
                        <p>We acknowledge complaints within 24 hours and aim to resolve them within 15 days.</p>
                        <h2>17. Changes to these Terms</h2>
                        <p>We may update these Terms. We will post the new version here and update the date above; material changes will be notified in-app or by email. Continued use after changes take effect constitutes acceptance.</p>
                        <h2>18. Contact</h2>
                        <Lines
                            lines={[
                                "SHVANA AI and Robotics Private Limited",
                                "Innv8 Okhla Phase III, 211 Okhla Industrial Estate, New Delhi, South Delhi 110020, Delhi",
                                <Mail />,
                            ]}
                        />
                    </Doc>

                    <Doc id="privacy" title="Privacy Policy" active={active === "privacy"}>
                        <p>Privacy is the reason Private Aile exists. This policy explains, in plain language, what we collect, why, and what we don't do with it.</p>
                        <h2>1. Who is responsible</h2>
                        <p>SHVANA AI and Robotics Private Limited, Innv8 Okhla Phase III, 211 Okhla Industrial Estate, New Delhi, South Delhi 110020, Delhi, India, is the data fiduciary for the Service. Contact: <Mail />.</p>
                        <h2>2. The short version</h2>
                        <ul>
                            <li><strong>We do not read, sell, or use your conversations to train AI models.</strong></li>
                            <li>Your chats are stored on our servers <strong>only if you turn on Sync</strong>. Otherwise they stay on your device.</li>
                            <li>The AI providers we use process your messages to generate a reply and <strong>do not retain them</strong> (zero data retention).</li>
                            <li>We keep the minimum needed to run your account and bill you.</li>
                        </ul>
                        <h2>3. What we collect</h2>
                        <p><strong>Account data</strong>  email address, a hashed password (or sign-in provider ID), display name if you set one, age-verification status, and plan details.</p>
                        <p><strong>Billing data</strong>  payments are handled by Razorpay. We receive a transaction ID, amount, plan, and the last four digits and type of your card. We never see or store full card numbers.</p>
                        <p className="mb-1.5!"><strong>Conversation data</strong> </p>
                        <ul>
                            <li><em>Sync off (default):</em> your chats, characters, and settings are stored in your browser on your device. They are sent to our servers only for the moment needed to generate a reply and are not stored there.</li>
                            <li><em>Sync on:</em> your chats and characters are stored on our servers, encrypted at rest, so you can access them from other devices. You can turn Sync off and delete synced data at any time in Settings.</li>
                        </ul>
                        <p><strong>Usage data</strong>  message counts, tokens used, model used, image counts, timestamps, and feature flags. This is billing and fair-use metadata; it contains no message content.</p>
                        <p><strong>Safety data</strong>  when our automated screening flags a message under our prohibited-content rules, we record the category and time of the flag and, where necessary to investigate abuse, the flagged text. This is kept separately and for a limited period.</p>
                        <p><strong>Technical data</strong>  IP address, browser type, device type, approximate region, and error logs, kept briefly for security and reliability.</p>
                        <p>We do not collect precise location, contacts, or data from other apps.</p>
                        <h2>4. How we use it</h2>
                        <ul>
                            <li>To provide the Service, generate AI responses, and keep your conversations available where you've asked us to.</li>
                            <li>To bill you and manage your subscription.</li>
                            <li>To enforce usage limits and our Terms, including detecting prohibited content.</li>
                            <li>To verify that users are adults.</li>
                            <li>To keep the Service secure and fix problems.</li>
                            <li>To send essential account and billing emails. Marketing emails are sent only if you opt in, and you can unsubscribe at any time.</li>
                        </ul>
                        <p>We do <strong>not</strong> use your conversations for advertising, profiling, or model training, and we do not sell personal data to anyone.</p>
                        <h2>5. Who we share it with</h2>
                        <p><strong>AI model providers.</strong> Your messages are sent to third-party inference providers to generate replies. Our primary provider, DeepInfra, operates under a zero-data-retention agreement: it processes the request and does not store your prompts or responses. We strip account identifiers before forwarding. We may use additional providers; any provider we use for conversation content must offer equivalent retention terms.</p>
                        <p><strong>Payment processor.</strong> Razorpay processes payments under its own privacy policy.</p>
                        <p><strong>Age verification.</strong> An independent age-verification provider verifies age on our behalf and returns only a pass/fail result to us.</p>
                        <p><strong>Infrastructure.</strong> Cloud hosting and email delivery providers who process data only on our instructions.</p>
                        <p><strong>Legal.</strong> We may disclose data if required by law, court order, or a lawful government request, or to protect the rights and safety of users and the public. We will notify you where legally permitted.</p>
                        <p>We do not share data with advertisers or data brokers.</p>
                        <h2>6. Where data is stored</h2>
                        <p>Account and billing data is stored in India. Synced conversations are stored in India. AI inference is performed on our providers' servers, which may be outside India; no conversation content is retained there.</p>
                        <h2>7. How long we keep it</h2>
                        <ul>
                            <li>Account data: until you delete your account, then removed within 30 days.</li>
                            <li>Synced conversations: until you delete them or turn off Sync, then removed within 30 days.</li>
                            <li>Billing records: 8 years, as required by Indian tax law.</li>
                            <li>Usage metadata: 12 months.</li>
                            <li>Safety flags: 12 months, or longer if needed for an active investigation or legal requirement.</li>
                            <li>Technical logs: 30 days.</li>
                        </ul>
                        <h2>8. Your rights</h2>
                        <p>Under the Digital Personal Data Protection Act, 2023 and applicable law, you can:</p>
                        <ul>
                            <li>access a copy of your personal data;</li>
                            <li>correct or update it;</li>
                            <li>delete your account and data;</li>
                            <li>withdraw consent (for example, turn off Sync or opt out of marketing);</li>
                            <li>nominate a person to exercise these rights on your behalf;</li>
                            <li>raise a grievance with us, and if unresolved, with the Data Protection Board of India.</li>
                        </ul>
                        <p>Most of these can be done directly in Settings. For anything else, email <Mail />. We respond within 30 days.</p>
                        <h2>9. Security</h2>
                        <p>We use encryption in transit (TLS) and at rest, access controls, and logging. Your password is stored as a salted hash. No system is perfectly secure; if a breach affects your data, we will notify you and the relevant authorities as required by law.</p>
                        <h2>10. Children</h2>
                        <p>The Service is for adults only. We do not knowingly collect data from anyone under 18. If you believe a minor has an account, contact us and we will remove it.</p>
                        <h2>11. Cookies</h2>
                        <p>We use strictly necessary cookies and local storage to keep you signed in and remember your settings. We do not use advertising or cross-site tracking cookies.</p>
                        <h2>12. Grievance Officer</h2>
                        <Lines
                            lines={[
                                "Authorised Signatory, SHVANA AI and Robotics Private Limited",
                                "SHVANA AI and Robotics Private Limited",
                                "Innv8 Okhla Phase III, 211 Okhla Industrial Estate, New Delhi, South Delhi 110020, Delhi",
                                <Mail />,
                            ]}
                        />
                        <h2>13. Changes</h2>
                        <p>We will post updates here and notify you in-app or by email for material changes.</p>
                    </Doc>

                    <Doc id="refunds" title="Refund & Cancellation" active={active === "refunds"}>
                        <h2>Subscriptions</h2>
                        <p>Private Aile offers monthly subscription plans that renew automatically at the end of each billing period. Prices and plan features are listed at privateaile.com/pricing.</p>
                        <h2>Cancellation</h2>
                        <p>You can cancel your subscription at any time from <strong>Settings → Subscription</strong>. Cancellation takes effect at the end of your current billing period. You keep full access until then, and you will not be charged again. Your conversations and settings remain available on the free plan, subject to its limits.</p>
                        <h2>Refunds</h2>
                        <p><strong>First purchase:</strong> if you are on your first paid subscription and request a refund within <strong>7 days</strong> of purchase, and you have used fewer than <strong>100 messages</strong> and <strong>10 images</strong> in that period, we will refund the full amount. Contact <Mail /> with your account email.</p>
                        <p><strong>Renewals:</strong> renewal payments are non-refundable, since you receive a reminder email before each renewal and can cancel at any time. If you believe a renewal was charged in error, contact us within 48 hours and we will review it.</p>
                        <p><strong>Service failure:</strong> if the Service is unavailable for a significant part of your billing period due to a fault on our side, contact us and we will provide a pro-rated refund or credit.</p>
                        <p><strong>Termination for breach:</strong> no refund is provided if your account is terminated for violating our Terms of Service.</p>
                        <p>Approved refunds are processed to the original payment method within 5–7 business days via Razorpay; your bank may take additional time to reflect the credit.</p>
                        <h2>Price changes</h2>
                        <p>If we change the price of your plan, we will notify you at least 14 days before it takes effect. You may cancel before the new price applies.</p>
                        <h2>Contact</h2>
                        <Lines
                            lines={[
                                "SHVANA AI and Robotics Private Limited",
                                "Innv8 Okhla Phase III, 211 Okhla Industrial Estate, New Delhi, South Delhi 110020, Delhi",
                                <Mail />,
                            ]}
                        />
                    </Doc>

                    <Doc id="contact" title="Contact" active={active === "contact"} updated={false}>
                        <p><strong>Private Aile</strong> is operated by</p>
                        <Lines
                            lines={[
                                <strong>SHVANA AI and Robotics Private Limited</strong>,
                                "Innv8 Okhla Phase III",
                                "211 Okhla Industrial Estate",
                                "New Delhi, South Delhi 110020, Delhi",
                                "India",
                                "CIN: U62090DL2026PTC467490",
                            ]}
                        />
                        <Lines
                            lines={[
                                <><strong>All enquiries (support, billing, privacy, grievances):</strong> <Mail /></>,
                                <><strong>Grievance Officer:</strong> Authorised Signatory, SHVANA AI and Robotics Private Limited, <Mail /></>,
                            ]}
                        />
                        <p>We respond to support requests within 2 business days and acknowledge grievances within 24 hours.</p>
                        <p>For legal notices, please write to the registered address above.</p>
                    </Doc>

                    <p className="text-ink-soft text-[0.875rem] leading-[1.6] mt-6 px-4 min-[821px]:px-0 max-w-[72ch]">
                        © 2026 SHVANA AI and Robotics Private Limited. Private Aile is a trademark of SHVANA AI and Robotics Private Limited. Questions:{" "}
                        <a href={`mailto:${EMAIL}`} className="text-rust underline underline-offset-2">
                            {EMAIL}
                        </a>
                    </p>
                </main>
            </div>

            {!inApp && <SiteFooter />}
        </div>
    );
}
