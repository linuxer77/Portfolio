import { TypeAnimation } from "react-type-animation";

export default function AboutContent() {
  return (
    <div className="prose prose-invert max-w-none">
      <div className="flex h-full min-h-[360px] w-full items-center justify-center text-center">
        <div>
          <h3 className="text-accent font-retroSans font-extrabold text-5xl md:text-6xl mb-3">
            Welcome
          </h3>
          <TypeAnimation
            sequence={["Hi there! I'm harshit...", 1200]}
            wrapper="p"
            speed={60}
            className="text-muted font-extrabold text-4xl md:text-5xl font-retroSans"
          />
        </div>
      </div>
    </div>
  );
}
