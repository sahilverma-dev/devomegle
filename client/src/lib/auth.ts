import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";

import * as schema from "@/db/schema/user-schema";

export const auth = betterAuth({
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
});
