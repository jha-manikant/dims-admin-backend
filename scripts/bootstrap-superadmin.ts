/**
 * Bootstrap the first SuperAdmin so there's somebody with grant authority.
 *
 * Usage:
 *   npm run bootstrap:superadmin -- you@datagainservices.com
 *
 * Pre-conditions:
 *   - DB schema applied (`npm run db:migrate:raw`).
 *   - The target user has signed in via Google at least once
 *     (only required after Phase 2 is in place — Phase 0 / 1 alone won't
 *     have an /auth/google/callback endpoint yet).
 *
 * The script does NOT create users out of thin air — it only attaches the
 * SuperAdmin role to a user that already exists. This avoids the GoogleId-
 * placeholder hack and keeps a single source of truth (auth flow) for user
 * creation.
 */
import { PrismaClient } from '@prisma/client';

const SUPERADMIN_ROLE_NAME = 'SuperAdmin';

async function main(): Promise<void> {
  const rawEmail = process.argv[2];
  if (!rawEmail) {
    console.error('Usage: npm run bootstrap:superadmin -- <email>');
    process.exit(1);
  }
  const email = rawEmail.trim().toLowerCase();

  const prisma = new PrismaClient();
  try {
    const user = await prisma.dIMSAdminUser.findFirst({
      where: { email, deletedAt: null },
    });
    if (!user) {
      console.error(
        `No DIMSAdminUser found for "${email}".\n` +
          `Have them sign in via Google once, then re-run this script.`,
      );
      process.exit(2);
    }

    const role = await prisma.dIMSAdminRole.findFirst({
      where: { name: SUPERADMIN_ROLE_NAME, deletedAt: null },
    });
    if (!role) {
      console.error(`Role "${SUPERADMIN_ROLE_NAME}" not found. Did the migration seed roles?`);
      process.exit(3);
    }

    const existing = await prisma.dIMSAdminUserRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
    });
    if (existing) {
      console.log(`User ${email} already has the SuperAdmin role. Nothing to do.`);
      return;
    }

    await prisma.dIMSAdminUserRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
        // Self-grant — there's nobody else to credit.
        assignedBy: user.id,
      },
    });
    console.log(`Granted SuperAdmin to ${email} (user id ${user.id}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
