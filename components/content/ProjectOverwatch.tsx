import Link from "next/link";

export default function ProjectOverwatch() {
  return (
    <article className="document project-document">
      <header className="document-header"><div><span className="doc-kicker">FIREFOX EXTENSION</span><h1>Overwatch AI</h1></div><span className="ink-stamp blue">200ms</span></header>
      <p className="lead">A Firefox extension that classifies distracting tabs using TypeSafe Jev in under 200ms.</p>
      <div className="project-visual overwatch-visual"><div className="browser-eye"><i /><span /></div><div className="scan-line" /></div>
      <div className="doc-grid">
        <section><h3>Implementation</h3><ul><li>Event-driven tab checks with a five-second warning.</li><li>Recovery tracking designed to cut false positives.</li><li>Allowlist rules and context evaluation for focused work.</li></ul></section>
        <aside><h3>Stack</h3><div className="doc-tags"><span>JavaScript</span><span>TypeSafe Jev API</span><span>Firefox</span></div><Link className="doc-link" href="https://github.com/linuxer77/Overwatch-AI" target="_blank">GitHub ↗</Link></aside>
      </div>
    </article>
  );
}
