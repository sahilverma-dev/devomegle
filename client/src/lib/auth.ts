import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

import * as schema from "@/db/schema/user-schema";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/login") {
        return;
      }
      if (!ctx.body?.email.endsWith("@example.com")) {
        throw new APIError("BAD_REQUEST", {
          message: "Email must end with @example.com",
        });
      }
    }),
  },

  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),

  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,

      // mapProfileToUser: (profile: any) => ({
      //   id: profile.id,
      //   email: profile.email,
      //   // Map additional profile fields
      //   name: profile.name,
      //   username: profile.login,
      //   bio: profile.bio,
      //   image: profile.avatar_url,
      // }),
    },
  },

  plugins: [nextCookies()],
});

export const { getSession } = auth.api;
