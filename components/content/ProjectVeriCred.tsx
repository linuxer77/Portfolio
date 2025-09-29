import Image from "next/image";
import Link from "next/link";

export default function ProjectVeriCred() {
  return (
    <div className="prose prose-invert max-w-none">
      <h3 className="font-retroSans font-extrabold text-4xl md:text-5xl text-accent">
        VeriCred: Blockchain Credentialing
      </h3>

      <div className="my-3 overflow-hidden rounded-lg ring-1 ring-ring/50">
        <Link href="https://vericred-frontend-fs1a.vercel.app/" target="_blank">
          <Image
            src="/projects/vericred.png"
            alt="VeriCred screenshot"
            width={1280}
            height={720}
            className="h-auto w-full"
            priority
          />
        </Link>
      </div>

      <p className="space-x-4">
        <Link
          href="https://github.com/linuxer77/VeriCred"
          target="_blank"
          className="text-accent underline underline-offset-4 hover:text-accent2"
        >
          GitHub
        </Link>
        <Link
          href="https://vericred-frontend-fs1a.vercel.app/"
          target="_blank"
          className="text-accent underline underline-offset-4 hover:text-accent2"
        >
          Live Demo
        </Link>
      </p>

      <p>
        VeriCred is a blockchain-based system for issuing and verifying academic
        credentials. Institutions mint tamper‑proof credentials, recipients own
        them in their wallets, and employers can verify authenticity instantly.
        A secure web portal streamlines the full flow from issuer onboarding to
        credential creation and verification.
      </p>
    </div>
  );
}
