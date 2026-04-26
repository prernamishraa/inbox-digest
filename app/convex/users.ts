import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByUsername = query({
  args: { substackUsername: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_substackUsername", (q) =>
        q.eq("substackUsername", args.substackUsername)
      )
      .unique();
  },
});

export const getSubscriptions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(200);
  },
});

export const upsertUser = mutation({
  args: {
    substackUsername: v.string(),
    categories: v.array(v.string()),
    about: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_substackUsername", (q) =>
        q.eq("substackUsername", args.substackUsername)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        categories: args.categories,
        about: args.about,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      substackUsername: args.substackUsername,
      categories: args.categories,
      about: args.about,
      createdAt: Date.now(),
    });
  },
});

export const getUsersForDelivery = internalQuery({
  args: { deliveryTime: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_deliveryTime", (q) => q.eq("deliveryTime", args.deliveryTime))
      .collect();
  },
});

export const updateUserEmail = mutation({
  args: {
    substackUsername: v.string(),
    gmailAddress: v.string(),
    deliveryTime: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_substackUsername", (q) =>
        q.eq("substackUsername", args.substackUsername)
      )
      .unique();
    if (!existing) return null;
    await ctx.db.patch(existing._id, {
      gmailAddress: args.gmailAddress,
      deliveryTime: args.deliveryTime,
    });
    return existing._id;
  },
});

export const saveSubscriptions = mutation({
  args: {
    userId: v.id("users"),
    subscriptions: v.array(
      v.object({
        newsletterName: v.string(),
        authorName: v.string(),
        publicationUrl: v.string(),
        subscriberCount: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(200);

    for (const sub of existing) {
      await ctx.db.delete(sub._id);
    }

    for (const sub of args.subscriptions) {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        ...sub,
      });
    }
  },
});
