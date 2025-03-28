import { getSession } from "./lib/auth";

import { NextResponse, NextRequest } from "next/server";
import { headers } from "next/headers";

export async function middleware(request: NextRequest) {
  //   return NextResponse.redirect(new URL("/login", request.url));

  const session = await getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
