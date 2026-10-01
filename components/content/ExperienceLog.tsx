const roles = [
  { company: "Maximize.money", role: "Backend Developer Intern", date: "Apr — Aug 2026", bullets: ["Patched TOCTOU race conditions and unauthenticated booking exploits, preventing credit-line drain.", "Fixed BOLA/IDOR vulnerabilities, securing Amazon and Dominos gift card credentials and customer PII.", "Implemented thread-safe RS256 JWT caching in Go for SuperCoins, cutting S2S API latency by 70%.", "Built v3 canonical request signing to remove client-side hashing overhead and tuned DB connection pools."] },
  { company: "Playto.so", role: "Software Engineer Intern", date: "Apr — Aug 2026", bullets: ["Built backend features for a payment platform serving 10,000+ active users across multiple geographies.", "Implemented payout logic for refunds, chargebacks, negative balances, and settlements.", "Built a unified refund, chargeback, and dispute system across xPay and Razorpay.", "Integrated Customer.io for payment notifications and transactional emails."] },
  { company: "Asama AI", role: "Backend Developer Intern", date: "Aug — Sep 2026", bullets: ["Built unified GitHub Actions pipelines for Debian, RPM, and Docker releases.", "Modularized packaging for the Host Agent and OpenTelemetry Collector.", "Integrated Pulp for package publishing and repository management."] },
  { company: "NuVista Technologies", role: "Backend Developer · Contract", date: "Sep — Dec 2025", bullets: ["Engineered server-side features with Django REST APIs, integrating PostgreSQL for seamless data flow.", "Deployed the application on AWS Elastic Beanstalk using Gunicorn as the WSGI server."] },
];

export default function ExperienceLog() {
  return (
    <article className="document experience-document">
      <header className="document-header">
        <div><span className="doc-kicker">WORK HISTORY</span><h1>Experience</h1></div>
      </header>
      <div className="experience-list">
        {roles.map((item, index) => (
          <section className="experience-entry" key={item.company}>
            <div className="entry-index">0{index + 1}</div>
            <div className="entry-body">
              <div className="entry-top"><div><span>{item.role}</span><h2>{item.company}</h2></div><time>{item.date}</time></div>
              <ul>{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
