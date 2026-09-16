"use client";

import { OrganizationList, useOrganization } from "@clerk/nextjs";

export function OrgGate({ children }: { children: React.ReactNode }) {
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        Loading organization…
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-zinc-900">
            Choose an organization
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Signage Menu is multi-tenant. Create or select a Clerk Organization
            to continue — that org is your tenant boundary.
          </p>
        </div>
        <OrganizationList
          hidePersonal
          afterSelectOrganizationUrl="/overview"
          afterCreateOrganizationUrl="/overview"
        />
      </div>
    );
  }

  return <>{children}</>;
}
