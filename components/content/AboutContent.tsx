import Image from "next/image";
import { TypeAnimation } from "react-type-animation";

export default function AboutContent() {
  return (
    <article className="document welcome-document">
      <div className="welcome-copy">
        <span className="doc-kicker">BACKEND DEVELOPER</span>
        <h1>Harshit<br /><em>Gupta.</em></h1>
        <div className="typed-line">
          <TypeAnimation
            sequence={["Backend developer.", 1300, "Systems builder.", 1300, "Go + Python engineer.", 1300]}
            wrapper="span" speed={55} repeat={Infinity}
          />
        </div>
        <p>Computer Science Engineering student working primarily with Go and Python across backend systems, payments, infrastructure, and security.</p>
      </div>
      <div className="welcome-art"><div className="mini-sun" /><Image src="/samurai-engineer-pixel.png" alt="Cyber samurai" fill priority sizes="400px" /></div>
    </article>
  );
}
