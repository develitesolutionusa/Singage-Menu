/**
 * Smart Template / Design Editor permissions.
 * Mapped from Clerk Organization roles (existing auth — no custom ACL tables).
 *
 * org:admin  → full template design + unlock + publish
 * org:member → view/use templates + edit content only
 */

export const TEMPLATE_PERMISSIONS = [
  "view_templates",
  "use_templates",
  "edit_content",
  "edit_design",
  "unlock_layout",
  "create_templates",
  "edit_templates",
  "delete_templates",
  "publish",
] as const;

export type TemplatePermission = (typeof TEMPLATE_PERMISSIONS)[number];

export type ClerkOrgRole = "org:admin" | "org:member" | string | null | undefined;

const MEMBER_PERMISSIONS: TemplatePermission[] = [
  "view_templates",
  "use_templates",
  "edit_content",
];

const ADMIN_PERMISSIONS: TemplatePermission[] = [
  ...MEMBER_PERMISSIONS,
  "edit_design",
  "unlock_layout",
  "create_templates",
  "edit_templates",
  "delete_templates",
  "publish",
];

export type TemplatePermissionSet = Record<TemplatePermission, boolean>;

export function permissionsForOrgRole(
  orgRole: ClerkOrgRole,
): TemplatePermissionSet {
  const list =
    orgRole === "org:admin" ? ADMIN_PERMISSIONS : MEMBER_PERMISSIONS;
  const set = {} as TemplatePermissionSet;
  for (const key of TEMPLATE_PERMISSIONS) {
    set[key] = list.includes(key);
  }
  return set;
}

export function hasTemplatePermission(
  orgRole: ClerkOrgRole,
  permission: TemplatePermission,
): boolean {
  return permissionsForOrgRole(orgRole)[permission];
}

export function permissionLabel(permission: TemplatePermission): string {
  switch (permission) {
    case "view_templates":
      return "View Templates";
    case "use_templates":
      return "Use Templates";
    case "edit_content":
      return "Edit Content";
    case "edit_design":
      return "Edit Design";
    case "unlock_layout":
      return "Unlock Layout";
    case "create_templates":
      return "Create Templates";
    case "edit_templates":
      return "Edit Templates";
    case "delete_templates":
      return "Delete Templates";
    case "publish":
      return "Publish";
    default:
      return permission;
  }
}
