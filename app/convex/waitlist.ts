import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const join = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) return { alreadyJoined: true };
    await ctx.db.insert("waitlist", { email, joinedAt: Date.now() });
    return { alreadyJoined: false };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("waitlist").collect();
    const count = entries.length;
    return {
      waitlistCount: count,
      minSavedPerDay: count * 23 + 180,
      newslettersHandled: count * 8 + 1240,
    };
  },
});
