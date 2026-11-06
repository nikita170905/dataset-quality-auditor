const features = [
  ["Quality scoring", "See the health of every dataset at a glance with clear, actionable metrics."],
  ["Deep diagnostics", "Find missing values, duplicates, label noise, and semantic inconsistencies before they cost you."],
  ["Practical guidance", "Get prioritized remediation and augmentation strategies for your next model iteration."],
];

function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <strong className="landing-logo">Dataset Quality Auditor</strong>
        <a className="landing-nav-link" href="/workspace">Open workspace</a>
      </nav>

      <section className="landing-hero">
        <p className="eyebrow">DATASET QUALITY, WITHOUT THE NOISE</p>
        <h1>Audit your datasets instantly</h1>
        <p className="landing-lede">
          A focused quality check for the data behind your next model. Upload a CSV,
          understand what needs attention, and move forward with confidence.
        </p>
        <a className="landing-cta" href="/workspace">Start an audit <span aria-hidden="true">→</span></a>
      </section>

      <section className="landing-section">
        <p className="eyebrow">BUILT FOR CLARITY</p>
        <div className="feature-grid">
          {features.map(([title, description]) => (
            <article className="feature-card" key={title}>
              <span className="feature-index">0{features.indexOf(features.find((item) => item[0] === title)) + 1}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section how-section">
        <p className="eyebrow">HOW IT WORKS</p>
        <div className="steps-grid">
          {[
            ["01", "Upload", "Drop in your CSV and let the auditor inspect its structure."],
            ["02", "Analyze", "Run a tabular, text, or complete dataset audit."],
            ["03", "Improve", "Use the report to resolve issues and strengthen your data."],
          ].map(([number, title, description]) => (
            <article className="step-card" key={number}>
              <span className="step-number">{number}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">DATASET QUALITY AUDITOR <span>© 2026</span></footer>
    </main>
  );
}

export default LandingPage;
