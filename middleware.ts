import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/overview(.*)",
  "/library(.*)",
  "/loops(.*)",
  "/campaigns(.*)",
  "/players(.*)",
  "/account(.*)",
  "/api/library(.*)",
  "/api/loops(.*)",
  "/api/campaigns(.*)",
  "/api/players(.*)",
  "/api/overview(.*)",
  "/api/activity(.*)",
  "/api/announcements(.*)",
]);

const isPublicPairInit = createRouteMatcher(["/api/players/pair/init"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicPairInit(req)) return;
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
