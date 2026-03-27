import type { Organization, User, UserOrganization, MikrotikDevice,
  Category, Domain, Industry, AuditLog, OrgRole, DeviceStatus, PlanType } from '@prisma/client'

export type { Organization, User, UserOrganization, MikrotikDevice,
  Category, Domain, Industry, AuditLog, OrgRole, DeviceStatus, PlanType }

export type OrganizationWithCounts = Organization & {
  industry: Industry | null
  _count: { devices: number; users: number; domains: number; categories: number }
}

export type UserWithOrgs = User & {
  organizations: (UserOrganization & {
    org: Pick<Organization, 'id' | 'name' | 'slug' | 'logo'>
  })[]
}

export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

declare module 'next-auth' {
  interface Session {
    user: { id: string; email: string; name: string; role: string }
  }
}
