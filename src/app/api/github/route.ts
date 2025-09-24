import { NextResponse } from "next/server";
import { graphql } from "@octokit/graphql";

export const runtime = "nodejs";
export const revalidate = 0;

// Simple in-memory cache (per server instance) to reduce GitHub calls in dev
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

type CacheEntry = { data: any; expires: number };
const getCache = () => (globalThis as any).__ghCache as CacheEntry | undefined;
const setCache = (entry: CacheEntry) => {
  (globalThis as any).__ghCache = entry;
};

export async function GET() {
  const token = process.env.GITHUB_TOKEN;

  // Serve from cache if fresh
  const cached = getCache();
  const now = Date.now();
  if (cached && cached.expires > now) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  }

  const client = graphql.defaults({
    headers: token ? { authorization: `bearer ${token}` } : {},
  });

  // Minimal query (no includePrivateContributions; it's not a valid arg)
  const query = /* GraphQL */ `
    query ($login: String!) {
      rateLimit {
        limit
        remaining
        resetAt
        cost
      }
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  try {
    const data = await client(query, { login: "linuxer77" });
    const payload = Object.assign({}, data as any, { _auth: Boolean(token) });

    // cache it
    setCache({ data: payload, expires: now + CACHE_TTL_MS });

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
      },
    });
  } catch (error: any) {
    const message =
      error?.errors?.[0]?.message || error?.message || "GitHub API error";
    const lower = String(message).toLowerCase();
    const status = /rate limit/.test(lower)
      ? 429
      : /auth/.test(lower)
      ? 401
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
