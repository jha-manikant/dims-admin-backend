export interface PermissionRef {
  id: string;
  permissionKey: string;
  category: string | null;
}

export interface RoleDetail {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: PermissionRef[];
}

export interface RoleListItem {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isActive: boolean;
  permissionCount: number;
  userCount: number;
}
