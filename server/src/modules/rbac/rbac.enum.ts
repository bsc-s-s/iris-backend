export enum Role {
  SUPER_ADMIN = 'super_admin',
  PLATFORM_ADMIN = 'platform_admin',
  ORG_OWNER = 'org_owner',
  SECURITY_MANAGER = 'security_manager',
  ANALYST = 'analyst',
  AUDITOR = 'auditor',
  READ_ONLY = 'read_only',
}

export enum Permission {
  // Users
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_INVITE = 'user:invite',
  USER_SUSPEND = 'user:suspend',
  USER_MFA_RESET = 'user:mfa_reset',

  // Organizations
  ORG_CREATE = 'org:create',
  ORG_READ = 'org:read',
  ORG_UPDATE = 'org:update',
  ORG_DELETE = 'org:delete',
  ORG_BLOCK = 'org:block',

  // Assessments
  ASSESSMENT_CREATE = 'assessment:create',
  ASSESSMENT_READ = 'assessment:read',
  ASSESSMENT_UPDATE = 'assessment:update',
  ASSESSMENT_DELETE = 'assessment:delete',
  ASSESSMENT_ANALYZE = 'assessment:analyze',

  // AI & Intelligence
  AI_ANALYZE = 'ai:analyze',
  AI_ADVANCED = 'ai:advanced',
  AI_DOCUMENT_ANALYSIS = 'ai:document_analysis',
  AI_BEHAVIOR_ANALYSIS = 'ai:behavior_analysis',

  // Audit
  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',

  // Compliance
  COMPLIANCE_READ = 'compliance:read',
  COMPLIANCE_UPDATE = 'compliance:update',
  COMPLIANCE_AUDIT = 'compliance:audit',

  // Documents
  DOCUMENT_UPLOAD = 'document:upload',
  DOCUMENT_READ = 'document:read',
  DOCUMENT_DELETE = 'document:delete',

  // Security
  SECURITY_READ = 'security:read',
  SECURITY_UPDATE = 'security:update',
  SECURITY_EVENTS_READ = 'security:events:read',

  // Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',

  // Billing
  BILLING_READ = 'billing:read',
  BILLING_UPDATE = 'billing:update',

  // API Keys
  API_KEY_CREATE = 'api_key:create',
  API_KEY_READ = 'api_key:read',
  API_KEY_REVOKE = 'api_key:revoke',

  // Webhooks
  WEBHOOK_CREATE = 'webhook:create',
  WEBHOOK_READ = 'webhook:read',
  WEBHOOK_UPDATE = 'webhook:update',
  WEBHOOK_DELETE = 'webhook:delete',
}

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.SUPER_ADMIN]: 100,
  [Role.PLATFORM_ADMIN]: 80,
  [Role.ORG_OWNER]: 60,
  [Role.SECURITY_MANAGER]: 40,
  [Role.ANALYST]: 20,
  [Role.AUDITOR]: 15,
  [Role.READ_ONLY]: 10,
};

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission),

  [Role.PLATFORM_ADMIN]: [
    Permission.USER_CREATE, Permission.USER_READ, Permission.USER_UPDATE, Permission.USER_DELETE,
    Permission.USER_INVITE, Permission.USER_SUSPEND, Permission.USER_MFA_RESET,
    Permission.ORG_READ, Permission.ORG_UPDATE,
    Permission.ASSESSMENT_CREATE, Permission.ASSESSMENT_READ, Permission.ASSESSMENT_UPDATE, Permission.ASSESSMENT_DELETE, Permission.ASSESSMENT_ANALYZE,
    Permission.AI_ANALYZE, Permission.AI_ADVANCED, Permission.AI_DOCUMENT_ANALYSIS, Permission.AI_BEHAVIOR_ANALYSIS,
    Permission.AUDIT_READ, Permission.AUDIT_EXPORT,
    Permission.COMPLIANCE_READ, Permission.COMPLIANCE_UPDATE, Permission.COMPLIANCE_AUDIT,
    Permission.DOCUMENT_UPLOAD, Permission.DOCUMENT_READ, Permission.DOCUMENT_DELETE,
    Permission.SECURITY_READ, Permission.SECURITY_UPDATE, Permission.SECURITY_EVENTS_READ,
    Permission.SETTINGS_READ, Permission.SETTINGS_UPDATE,
    Permission.BILLING_READ, Permission.BILLING_UPDATE,
    Permission.API_KEY_CREATE, Permission.API_KEY_READ, Permission.API_KEY_REVOKE,
    Permission.WEBHOOK_CREATE, Permission.WEBHOOK_READ, Permission.WEBHOOK_UPDATE, Permission.WEBHOOK_DELETE,
  ],

  [Role.ORG_OWNER]: [
    Permission.USER_CREATE, Permission.USER_READ, Permission.USER_UPDATE, Permission.USER_INVITE, Permission.USER_SUSPEND,
    Permission.ORG_READ, Permission.ORG_UPDATE,
    Permission.ASSESSMENT_CREATE, Permission.ASSESSMENT_READ, Permission.ASSESSMENT_UPDATE, Permission.ASSESSMENT_DELETE, Permission.ASSESSMENT_ANALYZE,
    Permission.AI_ANALYZE, Permission.AI_ADVANCED, Permission.AI_DOCUMENT_ANALYSIS, Permission.AI_BEHAVIOR_ANALYSIS,
    Permission.AUDIT_READ, Permission.AUDIT_EXPORT,
    Permission.COMPLIANCE_READ, Permission.COMPLIANCE_UPDATE, Permission.COMPLIANCE_AUDIT,
    Permission.DOCUMENT_UPLOAD, Permission.DOCUMENT_READ, Permission.DOCUMENT_DELETE,
    Permission.SECURITY_READ, Permission.SECURITY_UPDATE, Permission.SECURITY_EVENTS_READ,
    Permission.SETTINGS_READ, Permission.SETTINGS_UPDATE,
    Permission.BILLING_READ,
    Permission.API_KEY_CREATE, Permission.API_KEY_READ, Permission.API_KEY_REVOKE,
    Permission.WEBHOOK_CREATE, Permission.WEBHOOK_READ, Permission.WEBHOOK_UPDATE, Permission.WEBHOOK_DELETE,
  ],

  [Role.SECURITY_MANAGER]: [
    Permission.USER_READ,
    Permission.ORG_READ,
    Permission.ASSESSMENT_CREATE, Permission.ASSESSMENT_READ, Permission.ASSESSMENT_UPDATE, Permission.ASSESSMENT_ANALYZE,
    Permission.AI_ANALYZE, Permission.AI_ADVANCED, Permission.AI_DOCUMENT_ANALYSIS, Permission.AI_BEHAVIOR_ANALYSIS,
    Permission.AUDIT_READ,
    Permission.COMPLIANCE_READ, Permission.COMPLIANCE_UPDATE,
    Permission.DOCUMENT_UPLOAD, Permission.DOCUMENT_READ,
    Permission.SECURITY_READ, Permission.SECURITY_UPDATE, Permission.SECURITY_EVENTS_READ,
    Permission.SETTINGS_READ,
  ],

  [Role.ANALYST]: [
    Permission.USER_READ,
    Permission.ORG_READ,
    Permission.ASSESSMENT_CREATE, Permission.ASSESSMENT_READ, Permission.ASSESSMENT_UPDATE, Permission.ASSESSMENT_ANALYZE,
    Permission.AI_ANALYZE, Permission.AI_DOCUMENT_ANALYSIS,
    Permission.DOCUMENT_UPLOAD, Permission.DOCUMENT_READ,
    Permission.COMPLIANCE_READ,
    Permission.SECURITY_READ,
  ],

  [Role.AUDITOR]: [
    Permission.USER_READ,
    Permission.ORG_READ,
    Permission.ASSESSMENT_READ,
    Permission.AUDIT_READ, Permission.AUDIT_EXPORT,
    Permission.COMPLIANCE_READ, Permission.COMPLIANCE_AUDIT,
    Permission.DOCUMENT_READ,
    Permission.SECURITY_READ, Permission.SECURITY_EVENTS_READ,
  ],

  [Role.READ_ONLY]: [
    Permission.USER_READ,
    Permission.ORG_READ,
    Permission.ASSESSMENT_READ,
    Permission.COMPLIANCE_READ,
    Permission.DOCUMENT_READ,
    Permission.SECURITY_READ,
  ],
};
