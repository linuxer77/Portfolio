declare module "next-pwa" {
  import type { NextConfig } from "next";
  type Options = {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
  };
  export default function withPWA(
    options?: Options
  ): (config: NextConfig) => NextConfig;
}
