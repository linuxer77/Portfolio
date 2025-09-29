import { FaGithub, FaLinkedin, FaXTwitter, FaInstagram } from "react-icons/fa6";

export default function ConnectLinks() {
  const items = [
    { label: "GitHub", href: "https://github.com/linuxer77", Icon: FaGithub },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/harshit-gupta-046b66278/",
      Icon: FaLinkedin,
    },
    {
      label: "X (Twitter)",
      href: "https://x.com/linuxer771",
      Icon: FaXTwitter,
    },
    {
      label: "Instagram",
      href: "https://www.instagram.com/async.def_",
      Icon: FaInstagram,
    },
  ];
  return (
    <div className="grid gap-3">
      {items.map(({ label, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-4 rounded-lg bg-panel/70 p-3 md:p-4 ring-1 ring-ring/50 hover:bg-panel/90 hover:ring-ring/80 active:bg-panel/80"
          >
          <Icon className="text-accent" size={24} />
          <span className="font-retroSans font-extrabold text-lg">{label}</span>
        </a>
      ))}
    </div>
  );
}
