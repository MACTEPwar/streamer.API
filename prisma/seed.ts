import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client';
import { BCRYPT_SALT_ROUNDS } from '../src/auth/constants/password.constant';

async function main() {
  const login = process.env.SEED_ADMIN_LOGIN;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!login || !password) {
    console.error(
      'SEED_ADMIN_LOGIN и SEED_ADMIN_PASSWORD должны быть заданы в окружении для запуска сида.',
    );
    process.exit(1);
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });

  const existing = await prisma.user.findUnique({ where: { login } });

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { login },
    update: {},
    create: {
      login,
      passwordHash,
      role: 'ADMIN',
      profile: { create: {} },
      settings: { create: {} },
    },
  });

  console.log(
    existing
      ? `Администратор "${admin.login}" уже существует, пропускаю (id: ${admin.id}).`
      : `Создан администратор "${admin.login}" (id: ${admin.id}).`,
  );

  await prisma.$disconnect();
}

main();
