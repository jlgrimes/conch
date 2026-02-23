const pricingTiers = [
  {
    name: "Starter",
    placeholder: "For solo builders and prototypes.",
  },
  {
    name: "Growth",
    placeholder: "For product teams shipping production agents.",
  },
  {
    name: "Enterprise",
    placeholder: "For high-scale memory governance and support.",
  },
];

const proofItems = [
  "Proof placeholder: benchmark snapshots and latency stats",
  "Proof placeholder: customer logos and technical case studies",
  "Proof placeholder: trust artifacts (security and reliability docs)",
];

export default function Home() {
  return (
    <main className="page-shell">
      <header className="hero card">
        <p className="eyebrow">Conch for External Users</p>
        <h1>Memory that helps agents learn, not just remember.</h1>
        <p className="lead">
          Conch gives AI workflows semantic recall with biologically inspired decay and reinforcement, so memory stays relevant as your
          product scales.
        </p>
        <div className="cta-row">
          <button type="button" className="primary-btn">
            Get Started
          </button>
          <span className="cta-note">CTA placeholder: wire to signup or waitlist when onboarding flow is ready.</span>
        </div>
      </header>

      <section className="card" aria-labelledby="pricing-title">
        <h2 id="pricing-title">Pricing and Offer</h2>
        <p className="section-note">Placeholder section for packaging, feature gates, and contract terms.</p>
        <div className="tier-grid">
          {pricingTiers.map((tier) => (
            <article className="tier" key={tier.name}>
              <h3>{tier.name}</h3>
              <p>{tier.placeholder}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="trust-title">
        <h2 id="trust-title">Trust and Proof</h2>
        <p className="section-note">Placeholder section for product credibility signals.</p>
        <ul className="proof-list">
          {proofItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="contact-title">
        <h2 id="contact-title">Contact and Onboarding Request</h2>
        <p className="section-note">Form placeholder only. Submission handling can be wired once backend endpoints are chosen.</p>
        <form className="contact-form">
          <label>
            Name
            <input type="text" name="name" placeholder="Jane Doe" />
          </label>
          <label>
            Work Email
            <input type="email" name="email" placeholder="jane@company.com" />
          </label>
          <label>
            Team Size
            <select name="teamSize" defaultValue="">
              <option value="" disabled>
                Select team size
              </option>
              <option value="1-5">1-5</option>
              <option value="6-20">6-20</option>
              <option value="21-100">21-100</option>
              <option value="101+">101+</option>
            </select>
          </label>
          <label>
            Use Case
            <textarea name="useCase" rows={4} placeholder="Describe what your agents need to remember." />
          </label>
          <button type="submit" className="secondary-btn">
            Request Onboarding
          </button>
        </form>
      </section>
    </main>
  );
}
