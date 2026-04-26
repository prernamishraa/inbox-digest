import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Runs every hour; sendScheduledDigests checks IST time and dispatches to matching users
crons.interval("send scheduled digests", { hours: 1 }, internal.email.sendScheduledDigests);

export default crons;
