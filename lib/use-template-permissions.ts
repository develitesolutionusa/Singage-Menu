"use client";

import { useAuth } from "@clerk/nextjs";
import { useMemo } from "react";
import {
  permissionsForOrgRole,
  type TemplatePermission,
  type TemplatePermissionSet,
} from "@/lib/template-permissions";

export function useTemplatePermissions(): {
  ready: boolean;
  orgRole: string | null | undefined;
  permissions: TemplatePermissionSet;
  can: (permission: TemplatePermission) => boolean;
} {
  const { isLoaded, orgRole } = useAuth();

  const permissions = useMemo(
    () => permissionsForOrgRole(orgRole),
    [orgRole],
  );

  return {
    ready: isLoaded,
    orgRole,
    permissions,
    can: (permission) => permissions[permission],
  };
}
