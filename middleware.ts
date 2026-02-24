import { NextResponse, type NextRequest } from "next/server";

const SEARCH_EXPERIMENT_COOKIE = "ww_exp_search_ui";
const SEARCH_VARIANTS = ["control", "immersive"] as const;

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const existing = request.cookies.get(SEARCH_EXPERIMENT_COOKIE)?.value;

  if (!existing || !SEARCH_VARIANTS.includes(existing as (typeof SEARCH_VARIANTS)[number])) {
    const variant = Math.random() < 0.5 ? SEARCH_VARIANTS[0] : SEARCH_VARIANTS[1];
    response.cookies.set(SEARCH_EXPERIMENT_COOKIE, variant, {
      path: "/",
      maxAge: 60 * 60 * 24 * 60,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
