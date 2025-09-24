import { NextResponse } from "next/server";

const LEETCODE_GRAPHQL = "https://leetcode.com/graphql";

async function gql<T>(query: string, variables: Record<string, any>) {
  const res = await fetch(LEETCODE_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: "https://leetcode.com/",
      "User-Agent": "Mozilla/5.0 (compatible; PortfolioBot/1.0)",
    },
    body: JSON.stringify({ query, variables }),
    // Revalidate every minute on Vercel if using cache
    // cache: "no-store", // uncomment if you want fresh always
  });
  const json = await res.json();
  if (!res.ok || json?.errors) {
    throw new Error(
      json?.errors?.[0]?.message || `LeetCode request failed: ${res.status}`
    );
  }
  return json.data as T;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("u") || "Harshit727";

  try {
    const profileQuery = /* GraphQL */ `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          profile {
            ranking
            userAvatar
            realName
          }
          submitStats {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
          }
        }
        allQuestionsCount {
          difficulty
          count
        }
      }
    `;
    const recentQuery = /* GraphQL */ `
      query recentSubs($username: String!) {
        recentSubmissionList(username: $username, limit: 10) {
          title
          titleSlug
          status
          timestamp
          lang
        }
      }
    `;

    const [profile, recent] = await Promise.all([
      gql<any>(profileQuery, { username }),
      gql<any>(recentQuery, { username }),
    ]);

    return NextResponse.json({
      username,
      profile: profile?.matchedUser,
      allQuestionsCount: profile?.allQuestionsCount,
      recent: recent?.recentSubmissionList ?? [],
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to load LeetCode data" },
      { status: 500 }
    );
  }
}
