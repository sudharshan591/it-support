// ─── Auth ──────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  role: { id: string; name: string };
  department?: { id: string; name: string } | null;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: Partial<User> | null;
}

// ─── Tickets ───────────────────────────────────────────────
export type TicketType   = 'INCIDENT' | 'REQUEST' | 'CHANGE';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'CLOSED';
export type Priority     = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  type: TicketType;
  status: TicketStatus;
  priority: Priority;
  slaBreached: boolean;
  dueAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  assignedTo?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'> | null;
  department?: { id: string; name: string } | null;
  slaPolicy?: SlaPolicy | null;
  tags: { tag: string }[];
  comments?: Comment[];
  attachments?: Attachment[];
  _count?: { comments: number; attachments: number };
}

export interface Comment {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

// ─── Assets ────────────────────────────────────────────────
export type AssetType   = 'LAPTOP' | 'DESKTOP' | 'SERVER' | 'NETWORK' | 'PHONE' | 'PRINTER' | 'SOFTWARE' | 'OTHER';
export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'IN_REPAIR' | 'RETIRED' | 'DISPOSED';

export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  warrantyEnd?: string;
  location?: string;
  ipAddress?: string;
  macAddress?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  assignments?: AssetAssignment[];
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  assignedAt: string;
  returnedAt?: string;
  notes?: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
}

// ─── SLA ───────────────────────────────────────────────────
export interface SlaPolicy {
  id: string;
  name: string;
  priority: Priority;
  responseTimeHours: number;
  resolutionTimeHours: number;
  isActive: boolean;
}

// ─── Automation ────────────────────────────────────────────
export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: { event: string };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  executedCount: number;
  lastExecutedAt?: string;
  createdAt: string;
}

export interface AutomationCondition {
  field: string;
  operator: string;
  value: any;
}

export interface AutomationAction {
  type: string;
  params: Record<string, any>;
}

// ─── Notifications ─────────────────────────────────────────
export type NotificationType = 'TICKET_CREATED' | 'TICKET_ASSIGNED' | 'TICKET_UPDATED' | 'TICKET_RESOLVED' | 'SLA_BREACH' | 'ASSET_ASSIGNED' | 'SYSTEM';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

// ─── KB ────────────────────────────────────────────────────
export interface KbArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  author: Pick<User, 'id' | 'firstName' | 'lastName'>;
}

// ─── Pagination ────────────────────────────────────────────
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// ─── Audit ─────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
}
