import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  waitlist: defineTable({
    email: v.string(),
    joinedAt: v.number(),
  }).index("by_email", ["email"]),

  users: defineTable({
    substackUsername: v.string(),
    categories: v.array(v.string()),
    about: v.string(),
    createdAt: v.number(),
    gmailAddress: v.optional(v.string()),
    deliveryTime: v.optional(v.string()),
    trialStartedAt: v.optional(v.number()),
    isPaid: v.optional(v.boolean()),
    razorpaySubscriptionId: v.optional(v.string()),
  })
    .index("by_substackUsername", ["substackUsername"])
    .index("by_deliveryTime", ["deliveryTime"]),

  subscriptions: defineTable({
    userId: v.id("users"),
    newsletterName: v.string(),
    authorName: v.string(),
    publicationUrl: v.string(),
    subscriberCount: v.optional(v.number()),
  }).index("by_userId", ["userId"]),
});
