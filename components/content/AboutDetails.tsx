export default function AboutDetails() {
  return (
    <article className="document">
      <header className="document-header"><div><span className="doc-kicker">PROFILE</span><h1>About me</h1></div></header>
      <p className="lead">I&apos;m Harshit Gupta, a Computer Science Engineering student at JUET and a backend engineer focused on systems that are fast, secure, and dependable.</p>
      <div className="doc-grid"><section><h3>What I do</h3><p>I work primarily with Go and Python across payment infrastructure, API security, packaging pipelines, cloud deployments, blockchain systems, and high-concurrency applications.</p></section><section><h3>Beyond work</h3><p>I develop and test algorithmic trading strategies, including a live system that monitors 400+ crypto tickers and produces real-world results.</p></section></div>
    </article>
  );
}
