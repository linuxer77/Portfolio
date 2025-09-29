import {
  SiLinux,
  SiGit,
  SiGithub,
  SiVisualstudiocode,
  SiDocker,
  SiAmazon,
  SiRemix,
  SiIpfs,
  SiJsonwebtokens,
} from "react-icons/si";
import { IoCloudOutline } from "react-icons/io5";

const items = [
  { label: "Linux", Icon: SiLinux },
  { label: "Git", Icon: SiGit },
  { label: "Github", Icon: SiGithub },
  { label: "VS Code", Icon: SiVisualstudiocode },
  { label: "Docker", Icon: SiDocker },
  { label: "AWS", Icon: SiAmazon },
  { label: "Remix IDE", Icon: SiRemix },
  { label: "REST APIs", Icon: SiJsonwebtokens },
  { label: "IPFS", Icon: SiIpfs },
  { label: "Smart Contracts", Icon: SiJsonwebtokens },
  { label: "Blockchain", Icon: SiJsonwebtokens },
  { label: "JWT Auth", Icon: SiJsonwebtokens },
  { label: "OAuth", Icon: SiJsonwebtokens },
  { label: "Cloud", Icon: IoCloudOutline },
];

export default function TechTechnologies() {
  return (
    <div className="prose prose-invert max-w-none">
      <h3 className="text-accent font-retroSans font-extrabold text-4xl md:text-5xl">
        Technologies
      </h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg bg-panel/70 px-3 py-2 md:px-4 md:py-3 ring-1 ring-ring/60"
          >
            <Icon className="text-accent" size={26} />
            <span className="font-retroSans font-extrabold text-lg">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
