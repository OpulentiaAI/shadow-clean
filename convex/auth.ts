import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const currentUser = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.userId) return null;
    return ctx.db.get(args.userId);
  },
});

export const upsertUser = mutation({
  args: {
    externalId: v.string(),
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        image: args.image,
        emailVerified: args.emailVerified ?? existing.emailVerified,
        updatedAt: now,
        externalId: args.externalId,
      });
      return existing._id;
    }

    return ctx.db.insert("users", {
      externalId: args.externalId,
      name: args.name,
      email: args.email,
      emailVerified: args.emailVerified ?? false,
      image: args.image,
      createdAt: now,
      updatedAt: now,
    });
  },
});

