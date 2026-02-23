type SearchParams = Promise<{ submitted?: string; error?: string }>;

const pricingTiers = [
  {
    name: "Starter",
    detail: "For solo builders and prototypes.",
  },
  {
    name: "Growth",
    detail: "For product teams shipping production memory.",
  },
  {
    name: "Enterprise",
    detail: "For high-scale memory governance and support.",
  },
];

const proofItems = [
  "Semantic recall with reinforcement + decay",
  "Explainable recall exports and ranking diagnostics",
  "Reliability tooling for production memory operations",
];

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const submitted = params?.submitted === "1";
  const errored = params?.error === "1";

  return (
    <main className="page-shell">
      <header className="hero card">
        <p className="eyebrow">Conch App</p>
        <h1>Memory infrastructure for production AI agents.</h1>
        <p className="lead">
          Durable semantic memory with biologically inspired decay and reinforcement so agent context stays useful as your product scales.
        </p>
        <div className="cta-row">
          <a href="https://conch.lol/reliability" className="primary-btn">
            View reliability
          </a>
          <span className="cta-note">Use this portal to request onboarding.</span>
        </div>
      </header>

      <section className="card" aria-labelledby="pricing-title">
        <h2 id="pricing-title">Plans</h2>
        <div className="tier-grid">
          {pricingTiers.map((tier) => (
            <article className="tier" key={tier.name}>
              <h3>{tier.name}</h3>
              <p>{tier.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="trust-title">
        <h2 id="trust-title">Why teams pick Conch</h2>
        <ul className="proof-list">
          {proofItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="card" aria-labelledby="contact-title">
        <h2 id="contact-title">Request onboarding</h2>
        <p className="section-note">This form writes directly to our Supabase lead queue.</p>

        {submitted && <p className="status-ok">Thanks — we got your request and will reach out shortly.</p>}
        {errored && <p className="status-err">Couldn’t submit right now. Please try again in a moment.</p>}

        <form className="contact-form" method="post" action="/api/reliability-leads">
          <label>
            Name
            <input type="text" name="name" placeholder="Jane Doe" required />
          </label>
          <label>
            Work Email
            <input type="email" name="email" placeholder="jane@company.com" required />
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
