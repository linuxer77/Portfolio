import Image from "next/image";
import Link from "next/link";

export default function ProjectAlgoTrading() {
  return (
    <div className="prose prose-invert max-w-none">
      <h3 className="font-retroSans font-extrabold text-accent text-4xl md:text-5xl">
        Algo Trading System
      </h3>

      <div className="my-2 overflow-hidden rounded-lg ring-1 ring-ring/50 max-w-[520px] md:max-w-[620px] mx-auto">
        <Link
          href="https://www.linkedin.com/feed/update/urn:li:activity:7347274128862687232/"
          target="_blank"
        >
          <Image
            src="/projects/algo-trading.png"
            alt="Algo Trading System screenshot"
            width={1280}
            height={720}
            className="h-auto w-full"
            priority
          />
        </Link>
      </div>

      <p>
        <Link
          href="https://www.linkedin.com/feed/update/urn:li:activity:7347274128862687232/"
          target="_blank"
          className="text-accent underline underline-offset-4 hover:text-accent2"
        >
          LinkedIn
        </Link>
      </p>

      <p>
        Built a CoinDCX trading system generating ≈₹10,000 monthly profit, using
        a Go bot to track 400+ tokens with real-time alerts via Pushover, fully
        controllable through Telegram Bot, deployed on AWS EC2 for 24/7
        reliability.{" "}
      </p>
    </div>
  );
}
