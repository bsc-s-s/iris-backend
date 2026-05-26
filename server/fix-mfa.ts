import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  await prisma.user.update({
    where: { email: 'brianburgoa@gmail.com' },
    data: { mfaSecret: 'c4719233a63fc82aa6e3d816a8fb1b85fbccb43b' },
  });
  console.log('DB updated - raw secret stored');
  const user = await prisma.user.findUnique({ where: { email: 'brianburgoa@gmail.com' }, select: { mfaSecret: true, mfaEnabled: true } });
  console.log(JSON.stringify(user));
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
