import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Permissions ───────────────────────────────────────────
  const permissionDefs = [
    { name: 'tickets:read',   resource: 'tickets',   action: 'read' },
    { name: 'tickets:create', resource: 'tickets',   action: 'create' },
    { name: 'tickets:update', resource: 'tickets',   action: 'update' },
    { name: 'tickets:delete', resource: 'tickets',   action: 'delete' },
    { name: 'tickets:assign', resource: 'tickets',   action: 'assign' },
    { name: 'assets:read',    resource: 'assets',    action: 'read' },
    { name: 'assets:create',  resource: 'assets',    action: 'create' },
    { name: 'assets:update',  resource: 'assets',    action: 'update' },
    { name: 'assets:delete',  resource: 'assets',    action: 'delete' },
    { name: 'users:read',     resource: 'users',     action: 'read' },
    { name: 'users:create',   resource: 'users',     action: 'create' },
    { name: 'users:update',   resource: 'users',     action: 'update' },
    { name: 'users:delete',   resource: 'users',     action: 'delete' },
    { name: 'reports:read',   resource: 'reports',   action: 'read' },
    { name: 'kb:read',        resource: 'kb',        action: 'read' },
    { name: 'kb:create',      resource: 'kb',        action: 'create' },
    { name: 'kb:update',      resource: 'kb',        action: 'update' },
    { name: 'kb:delete',      resource: 'kb',        action: 'delete' },
    { name: 'audit:read',     resource: 'audit',     action: 'read' },
    { name: 'admin:access',   resource: 'admin',     action: 'access' },
    { name: 'automation:manage', resource: 'automation', action: 'manage' },
    { name: 'sla:manage',     resource: 'sla',       action: 'manage' },
  ];

  const permissions = await Promise.all(
    permissionDefs.map(p =>
      prisma.permission.upsert({
        where: { name: p.name },
        update: {},
        create: p,
      }),
    ),
  );
  console.log(`✅ ${permissions.length} permissions created`);

  // ── Roles ─────────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: { name: 'Admin', description: 'Full system access' },
  });

  const agentRole = await prisma.role.upsert({
    where: { name: 'Agent' },
    update: {},
    create: { name: 'Agent', description: 'IT support agent' },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: { name: 'Manager', description: 'Team manager with elevated access' },
  });

  const userRole = await prisma.role.upsert({
    where: { name: 'User' },
    update: {},
    create: { name: 'User', description: 'End user - self-service only' },
  });

  // Assign all permissions to Admin
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Assign agent permissions
  const agentPermNames = ['tickets:read', 'tickets:create', 'tickets:update', 'tickets:assign', 'assets:read', 'kb:read', 'kb:create', 'kb:update', 'users:read'];
  for (const pn of agentPermNames) {
    const perm = permissions.find(p => p.name === pn);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: agentRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: agentRole.id, permissionId: perm.id },
      });
    }
  }

  // Assign manager permissions
  const managerPermNames = ['tickets:read', 'tickets:create', 'tickets:update', 'tickets:assign', 'tickets:delete', 'assets:read', 'assets:create', 'assets:update', 'users:read', 'reports:read', 'kb:read', 'kb:create', 'kb:update', 'audit:read', 'sla:manage'];
  for (const pn of managerPermNames) {
    const perm = permissions.find(p => p.name === pn);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: managerRole.id, permissionId: perm.id },
      });
    }
  }

  // User permissions
  const userPermNames = ['tickets:read', 'tickets:create', 'kb:read'];
  for (const pn of userPermNames) {
    const perm = permissions.find(p => p.name === pn);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: userRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: userRole.id, permissionId: perm.id },
      });
    }
  }
  console.log('✅ Roles and permissions assigned');

  // ── Departments ───────────────────────────────────────────
  const depts = ['IT Support', 'HR', 'Finance', 'Engineering', 'Operations', 'Security'];
  const departments = await Promise.all(
    depts.map(name =>
      prisma.department.upsert({
        where: { name },
        update: {},
        create: { name },
      }),
    ),
  );
  console.log(`✅ ${departments.length} departments created`);
  const itDept = departments[0];

  // ── Users ─────────────────────────────────────────────────
  const adminPassword = await argon2.hash('Admin@1234');
  const agentPassword = await argon2.hash('Agent@1234');
  const userPassword  = await argon2.hash('User@1234');

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@itsm.local' },
    update: {},
    create: {
      email: 'admin@itsm.local',
      password: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      roleId: adminRole.id,
      departmentId: itDept.id,
    },
  });

  const agent1 = await prisma.user.upsert({
    where: { email: 'sarah.chen@itsm.local' },
    update: {},
    create: {
      email: 'sarah.chen@itsm.local',
      password: agentPassword,
      firstName: 'Sarah',
      lastName: 'Chen',
      roleId: agentRole.id,
      departmentId: itDept.id,
    },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: 'james.wright@itsm.local' },
    update: {},
    create: {
      email: 'james.wright@itsm.local',
      password: agentPassword,
      firstName: 'James',
      lastName: 'Wright',
      roleId: agentRole.id,
      departmentId: itDept.id,
    },
  });

  const manager1 = await prisma.user.upsert({
    where: { email: 'emily.johnson@itsm.local' },
    update: {},
    create: {
      email: 'emily.johnson@itsm.local',
      password: agentPassword,
      firstName: 'Emily',
      lastName: 'Johnson',
      roleId: managerRole.id,
      departmentId: itDept.id,
    },
  });

  const endUser1 = await prisma.user.upsert({
    where: { email: 'john.doe@itsm.local' },
    update: {},
    create: {
      email: 'john.doe@itsm.local',
      password: userPassword,
      firstName: 'John',
      lastName: 'Doe',
      roleId: userRole.id,
      departmentId: departments[1].id,
    },
  });

  const endUser2 = await prisma.user.upsert({
    where: { email: 'jane.smith@itsm.local' },
    update: {},
    create: {
      email: 'jane.smith@itsm.local',
      password: userPassword,
      firstName: 'Jane',
      lastName: 'Smith',
      roleId: userRole.id,
      departmentId: departments[2].id,
    },
  });
  console.log('✅ Users created');

  // ── SLA Policies ──────────────────────────────────────────
  const slaPolicies = await Promise.all([
    prisma.slaPolicy.upsert({
      where: { name: 'Critical SLA' },
      update: {},
      create: { name: 'Critical SLA', priority: 'CRITICAL', responseTimeHours: 1, resolutionTimeHours: 4 },
    }),
    prisma.slaPolicy.upsert({
      where: { name: 'High SLA' },
      update: {},
      create: { name: 'High SLA', priority: 'HIGH', responseTimeHours: 4, resolutionTimeHours: 8 },
    }),
    prisma.slaPolicy.upsert({
      where: { name: 'Medium SLA' },
      update: {},
      create: { name: 'Medium SLA', priority: 'MEDIUM', responseTimeHours: 8, resolutionTimeHours: 24 },
    }),
    prisma.slaPolicy.upsert({
      where: { name: 'Low SLA' },
      update: {},
      create: { name: 'Low SLA', priority: 'LOW', responseTimeHours: 24, resolutionTimeHours: 72 },
    }),
  ]);
  console.log(`✅ ${slaPolicies.length} SLA policies created`);

  // ── Tickets ───────────────────────────────────────────────
  const ticketData = [
    { ticketNumber: 'INC-0001', title: 'Laptop screen flickering intermittently', description: 'My laptop screen has been flickering for the past 2 days. It happens randomly and affects productivity.', type: 'INCIDENT', status: 'IN_PROGRESS', priority: 'HIGH', createdById: endUser1.id, assignedToId: agent1.id, departmentId: itDept.id, slaId: slaPolicies[1].id },
    { ticketNumber: 'INC-0002', title: 'Unable to access VPN', description: 'Getting authentication error when trying to connect to company VPN. Error code: AUTH_FAILED_001', type: 'INCIDENT', status: 'OPEN', priority: 'CRITICAL', createdById: endUser2.id, assignedToId: agent2.id, departmentId: itDept.id, slaId: slaPolicies[0].id },
    { ticketNumber: 'REQ-0003', title: 'Request for new software license - Adobe Creative Cloud', description: 'Need Adobe Creative Cloud license for the design team project starting next month.', type: 'REQUEST', status: 'PENDING', priority: 'MEDIUM', createdById: endUser1.id, departmentId: departments[3].id, slaId: slaPolicies[2].id },
    { ticketNumber: 'INC-0004', title: 'Email delivery failure to external domains', description: 'Emails sent to Gmail and Yahoo are bouncing back. This started after the server maintenance last night.', type: 'INCIDENT', status: 'RESOLVED', priority: 'HIGH', createdById: endUser2.id, assignedToId: agent1.id, departmentId: itDept.id, slaId: slaPolicies[1].id, resolvedAt: new Date(Date.now() - 86400000) },
    { ticketNumber: 'CHG-0005', title: 'Upgrade firewall firmware to v8.2', description: 'Planned upgrade of perimeter firewall firmware to address security vulnerabilities CVE-2024-xxxx.', type: 'CHANGE', status: 'IN_PROGRESS', priority: 'MEDIUM', createdById: adminUser.id, assignedToId: agent2.id, departmentId: itDept.id, slaId: slaPolicies[2].id },
    { ticketNumber: 'REQ-0006', title: 'New employee onboarding - David Park', description: 'Set up workstation, accounts, and access for new team member starting Monday.', type: 'REQUEST', status: 'OPEN', priority: 'MEDIUM', createdById: endUser1.id, assignedToId: agent1.id, departmentId: departments[1].id, slaId: slaPolicies[2].id },
    { ticketNumber: 'INC-0007', title: 'Printer offline on 3rd floor', description: 'HP LaserJet MFP on 3rd floor not responding. Shows offline in print queue.', type: 'INCIDENT', status: 'OPEN', priority: 'LOW', createdById: endUser2.id, departmentId: itDept.id, slaId: slaPolicies[3].id },
    { ticketNumber: 'INC-0008', title: 'Database server response time degraded', description: 'Production DB response times have increased from 50ms to 800ms. Affecting all applications.', type: 'INCIDENT', status: 'IN_PROGRESS', priority: 'CRITICAL', createdById: adminUser.id, assignedToId: agent2.id, departmentId: itDept.id, slaId: slaPolicies[0].id, slaBreached: true },
  ];

  for (const t of ticketData) {
    const dueAt = t.slaId
      ? new Date(Date.now() + (slaPolicies.find(s => s.id === t.slaId)?.resolutionTimeHours || 24) * 3600000)
      : undefined;

    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {},
      create: { ...t, dueAt },
    });
  }
  console.log(`✅ ${ticketData.length} tickets created`);

  // ── Ticket Comments ───────────────────────────────────────
  const tickets = await prisma.ticket.findMany({ take: 4 });
  if (tickets.length > 0) {
    await prisma.ticketComment.createMany({
      data: [
        { ticketId: tickets[0].id, userId: agent1.id, content: 'I have reproduced the issue on my end. It appears to be a GPU driver issue. Running diagnostics now.' },
        { ticketId: tickets[0].id, userId: endUser1.id, content: 'Thank you for looking into this. The flickering has gotten worse in the last hour.' },
        { ticketId: tickets[0].id, userId: agent1.id, content: 'Updated GPU drivers to latest version. Please restart and confirm if the issue persists.', isInternal: false },
        { ticketId: tickets[1].id, userId: agent2.id, content: 'Checking VPN server logs. MFA configuration may need reset.', isInternal: true },
        { ticketId: tickets[1].id, userId: agent2.id, content: 'Please try clearing your VPN client cache and re-entering your credentials.' },
      ],
    });
  }
  console.log('✅ Ticket comments created');

  // ── Assets ────────────────────────────────────────────────
  const assetData = [
    { assetTag: 'LT-001', name: 'Dell XPS 15', type: 'LAPTOP', status: 'ASSIGNED', manufacturer: 'Dell', model: 'XPS 15 9530', serialNumber: 'DXPS15-001-SN', location: 'New York HQ', ipAddress: '192.168.1.101', macAddress: '00:1A:2B:3C:4D:5E' },
    { assetTag: 'LT-002', name: 'MacBook Pro 14"', type: 'LAPTOP', status: 'ASSIGNED', manufacturer: 'Apple', model: 'MacBook Pro M3', serialNumber: 'MBP14-2024-SN2', location: 'New York HQ', ipAddress: '192.168.1.102' },
    { assetTag: 'LT-003', name: 'ThinkPad X1 Carbon', type: 'LAPTOP', status: 'AVAILABLE', manufacturer: 'Lenovo', model: 'X1 Carbon Gen 11', serialNumber: 'TP-X1-003-SN', location: 'IT Storage' },
    { assetTag: 'SV-001', name: 'Primary Database Server', type: 'SERVER', status: 'ASSIGNED', manufacturer: 'Dell', model: 'PowerEdge R750', serialNumber: 'PE-R750-001', location: 'Data Center Rack A1', ipAddress: '10.0.0.10' },
    { assetTag: 'SV-002', name: 'Application Server', type: 'SERVER', status: 'ASSIGNED', manufacturer: 'HPE', model: 'ProLiant DL380', serialNumber: 'HPE-DL380-002', location: 'Data Center Rack A2', ipAddress: '10.0.0.11' },
    { assetTag: 'SW-001', name: 'Microsoft Office 365 - Business', type: 'SOFTWARE', status: 'AVAILABLE', manufacturer: 'Microsoft', model: 'Office 365', serialNumber: 'O365-ENT-001' },
    { assetTag: 'PR-001', name: 'HP LaserJet MFP M428', type: 'PRINTER', status: 'IN_REPAIR', manufacturer: 'HP', model: 'LaserJet MFP M428fdn', serialNumber: 'HP-MFP-3FL-001', location: '3rd Floor - East Wing', ipAddress: '192.168.1.200' },
    { assetTag: 'NW-001', name: 'Cisco Catalyst 9300 Switch', type: 'NETWORK', status: 'ASSIGNED', manufacturer: 'Cisco', model: 'Catalyst 9300L', serialNumber: 'CSC-9300-001', location: 'Data Center', ipAddress: '10.0.0.1', macAddress: 'AA:BB:CC:DD:EE:01' },
  ];

  for (const a of assetData) {
    await prisma.asset.upsert({
      where: { assetTag: a.assetTag },
      update: {},
      create: { ...a, purchaseDate: new Date('2023-01-15'), warrantyEnd: new Date('2026-01-15') },
    });
  }
  console.log(`✅ ${assetData.length} assets created`);

  // ── Asset Assignments ─────────────────────────────────────
  const laptop1 = await prisma.asset.findFirst({ where: { assetTag: 'LT-001' } });
  const laptop2 = await prisma.asset.findFirst({ where: { assetTag: 'LT-002' } });
  if (laptop1 && laptop2) {
    await prisma.assetAssignment.createMany({
      data: [
        { assetId: laptop1.id, userId: endUser1.id, notes: 'Primary work laptop' },
        { assetId: laptop2.id, userId: endUser2.id, notes: 'Primary work laptop' },
      ],
    });
  }
  console.log('✅ Asset assignments created');

  // ── Automation Rules ──────────────────────────────────────
  await prisma.automationRule.createMany({
    data: [
      {
        name: 'Auto-assign Critical Tickets to L2',
        description: 'When a Critical ticket is created, assign to senior agent and notify manager',
        isActive: true,
        trigger: JSON.stringify({ event: 'ticket.created' }),
        conditions: JSON.stringify([{ field: 'priority', operator: 'equals', value: 'CRITICAL' }]),
        actions: JSON.stringify([
          { type: 'assign', params: { userId: agent2.id } },
          { type: 'notify', params: { channel: 'in_app', message: 'Critical ticket requires immediate attention' } },
        ]),
      },
      {
        name: 'Escalate unassigned tickets after 2 hours',
        description: 'Notify manager if high priority ticket is not assigned within 2 hours',
        isActive: true,
        trigger: JSON.stringify({ event: 'ticket.sla_warning' }),
        conditions: JSON.stringify([
          { field: 'priority', operator: 'in', value: ['HIGH', 'CRITICAL'] },
          { field: 'assignedToId', operator: 'is_null', value: null },
        ]),
        actions: JSON.stringify([
          { type: 'notify', params: { userId: manager1.id, channel: 'in_app', message: 'Unassigned high priority ticket needs attention' } },
        ]),
      },
      {
        name: 'Auto-close resolved tickets after 48 hours',
        description: 'Automatically close tickets that have been in Resolved status for 48 hours',
        isActive: true,
        trigger: JSON.stringify({ event: 'ticket.resolved' }),
        conditions: JSON.stringify([]),
        actions: JSON.stringify([
          { type: 'update_status', params: { status: 'CLOSED', delay_hours: 48 } },
          { type: 'notify', params: { channel: 'in_app', message: 'Your ticket has been automatically closed. Please reopen if the issue persists.' } },
        ]),
      },
    ],
  });
  console.log('✅ Automation rules created');

  // ── Knowledge Base Articles ───────────────────────────────
  await prisma.kbArticle.createMany({
    data: [
      {
        title: 'How to Reset Your Password',
        content: `# How to Reset Your Password\n\n## Step 1: Go to the Login Page\nNavigate to the company SSO portal.\n\n## Step 2: Click "Forgot Password"\nEnter your work email address.\n\n## Step 3: Check Your Email\nYou will receive a password reset link valid for 24 hours.\n\n## Step 4: Create New Password\nPassword must be at least 12 characters, including uppercase, lowercase, number, and symbol.\n\n## Still having issues?\nContact IT Support at ext. 4357 or submit a ticket.`,
        category: 'Account Management',
        tags: JSON.stringify(['password', 'login', 'account', 'sso']),
        authorId: adminUser.id,
        isPublished: true,
        viewCount: 342,
      },
      {
        title: 'VPN Setup Guide - Windows & Mac',
        content: `# VPN Setup Guide\n\n## Windows Setup\n1. Download Cisco AnyConnect from the software portal\n2. Install with default settings\n3. Enter server address: vpn.company.com\n4. Login with your AD credentials + MFA\n\n## Mac Setup\n1. Download from Self-Service portal\n2. Follow installation wizard\n3. Enter server: vpn.company.com\n4. Authenticate with credentials\n\n## Troubleshooting\n- Ensure no other VPN clients are running\n- Check if MFA app is synced\n- Restart VPN client if timeout errors occur`,
        category: 'Network',
        tags: JSON.stringify(['vpn', 'remote', 'cisco', 'connectivity']),
        authorId: agent1.id,
        isPublished: true,
        viewCount: 891,
      },
      {
        title: 'Laptop Hardware Troubleshooting Guide',
        content: `# Laptop Troubleshooting\n\n## Screen Issues\n- **Flickering**: Update GPU drivers via Device Manager\n- **Dead pixels**: Submit hardware replacement request\n- **External monitor not detected**: Check display adapters\n\n## Performance Issues\n- Run Disk Cleanup and Defragmentation\n- Check startup programs\n- Verify RAM usage in Task Manager\n\n## Battery Issues\n- Calibrate battery: drain to 5%, then charge to 100%\n- If battery drains in <2 hours, request battery replacement`,
        category: 'Hardware',
        tags: JSON.stringify(['laptop', 'hardware', 'screen', 'battery', 'performance']),
        authorId: agent2.id,
        isPublished: true,
        viewCount: 456,
      },
      {
        title: 'Software Request Process',
        content: `# How to Request New Software\n\n## Approved Software List\nCheck the software catalog in the IT portal first.\n\n## Requesting New Software\n1. Submit a Service Request ticket\n2. Include: Software name, version, business justification\n3. Get manager approval (for licenses >$500)\n4. IT Security review (2-3 business days)\n5. Procurement and deployment\n\n## Typical Timelines\n- Standard requests: 5-7 business days\n- Urgent requests: 1-2 business days (requires director approval)\n- Enterprise licensing: 2-4 weeks`,
        category: 'Software',
        tags: JSON.stringify(['software', 'request', 'license', 'procurement']),
        authorId: adminUser.id,
        isPublished: true,
        viewCount: 213,
      },
    ],
  });
  console.log('✅ Knowledge base articles created');

  // ── Notifications ─────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: agent1.id, title: 'New ticket assigned', message: 'Ticket INC-0001 has been assigned to you', type: 'TICKET_ASSIGNED', metadata: JSON.stringify({ ticketId: tickets[0]?.id }) },
      { userId: agent2.id, title: 'Critical ticket created', message: 'A critical incident INC-0002 requires immediate attention', type: 'TICKET_CREATED' },
      { userId: manager1.id, title: 'SLA Breach Alert', message: 'Ticket INC-0008 has breached SLA - Database server critical', type: 'SLA_BREACH' },
      { userId: endUser1.id, title: 'Ticket update', message: 'Agent Sarah Chen commented on your ticket INC-0001', type: 'TICKET_UPDATED' },
    ],
  });
  console.log('✅ Notifications created');

  // ── System Settings ───────────────────────────────────────
  await prisma.systemSetting.createMany({
    data: [
      { key: 'company_name', value: JSON.stringify('Acme Corporation') },
      { key: 'ticket_prefix_incident', value: JSON.stringify('INC') },
      { key: 'ticket_prefix_request', value: JSON.stringify('REQ') },
      { key: 'ticket_prefix_change', value: JSON.stringify('CHG') },
      { key: 'sla_business_hours_start', value: JSON.stringify(9) },
      { key: 'sla_business_hours_end', value: JSON.stringify(18) },
      { key: 'sla_weekend_excluded', value: JSON.stringify(true) },
      { key: 'auto_close_resolved_hours', value: JSON.stringify(48) },
      { key: 'max_file_upload_mb', value: JSON.stringify(25) },
    ],
  });
  console.log('✅ System settings created');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('  Admin:   admin@itsm.local    / Admin@1234');
  console.log('  Manager: emily.johnson@itsm.local / Agent@1234');
  console.log('  Agent:   sarah.chen@itsm.local    / Agent@1234');
  console.log('  User:    john.doe@itsm.local      / User@1234');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
