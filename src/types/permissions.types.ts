export interface PermissionItem {
  id: string;
  permissionKey: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
}

export interface PermissionDetail {
  id: string;
  permissionKey: string;
  category: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roleCount: number;
}
