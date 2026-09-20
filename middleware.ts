import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/overview(.*)",
  "/library(.*)",
  "/templates(.*)",
  "/loops(.*)",
  "/campaigns(.*)",
  "/players(.*)",
  "/account(.*)",
  "/api/library(.*)",
  "/api/templates(.*)",
  "/api/loops(.*)",
  "/api/campaigns(.*)",
  "/api/players(.*)",
  "/api/overview(.*)",
  "/api/activity(.*)",
  "/api/announcements(.*)",
]);

const isPublicPlayerApi = createRouteMatcher([
  "/api/players/pair/init",
  "/api/players/(.*)/playback",
  "/api/players/(.*)/heartbeat",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicPlayerApi(req)) return;
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
