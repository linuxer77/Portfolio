export function LinksPanel() {
  const items = [
    { label: "GitHub", href: "https://github.com/" },
    { label: "LinkedIn", href: "https://www.linkedin.com/" },
  ];
  return (
    <div className="grid gap-3">
      {items.map((i) => (
        <a
          key={i.label}
          href={i.href}
          target="_blank"
          rel="noreferrer noopener"
          className="flex items-center justify-between rounded-lg bg-panel/60 p-3 ring-1 ring-ring/50 hover:ring-ring/80 hover:bg-panel/80"
        >
          <span>{i.label}</span>
          <span className="text-accent">↗</span>
        </a>
      ))}
    </div>
  );
}
