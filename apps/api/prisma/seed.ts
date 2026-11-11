import { CardStatus, PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/common/crypto/password';

const prisma = new PrismaClient();

/** Local demo only — login uses email (auth API), displayName is Test_user. */
const DEMO = {
  email: 'test_user@example.com',
  displayName: 'Test_user',
  password: '12345678',
  cardSlug: 'test-user',
  cardDisplayName: 'Test User',
  jobTitle: 'Product Manager',
  companyName: 'MyQRCards Demo',
  summary: 'Демо-визитка для локальной разработки.',
  phone: '+79990001122',
  cardEmail: 'test_user@example.com',
  websiteUrl: 'https://example.com',
} as const;

async function main() {
  let user = await prisma.user.findUnique({ where: { email: DEMO.email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO.email,
        displayName: DEMO.displayName,
        passwordHash: await hashPassword(DEMO.password),
      },
    });
    console.log(`[seed] created user ${DEMO.email}`);
  } else {
    console.log(`[seed] user already exists: ${DEMO.email}`);
  }

  const existingCard = await prisma.card.findUnique({
    where: { slug: DEMO.cardSlug },
  });

  if (!existingCard) {
    await prisma.card.create({
      data: {
        userId: user.id,
        displayName: DEMO.cardDisplayName,
        jobTitle: DEMO.jobTitle,
        companyName: DEMO.companyName,
        summary: DEMO.summary,
        phone: DEMO.phone,
        email: DEMO.cardEmail,
        showEmail: true,
        websiteUrl: DEMO.websiteUrl,
        slug: DEMO.cardSlug,
        status: CardStatus.published,
        links: {
          create: [
            {
              label: 'Telegram',
              url: 'https://t.me/example',
              position: 0,
            },
            {
              label: 'LinkedIn',
              url: 'https://www.linkedin.com/',
              position: 1,
            },
          ],
        },
      },
    });
    console.log(`[seed] created published card /u/${DEMO.cardSlug}`);
  } else {
    console.log(`[seed] card already exists: /u/${DEMO.cardSlug}`);
  }

  console.log('[seed] ready');
  console.log(`[seed] login email: ${DEMO.email}`);
  console.log(`[seed] display name: ${DEMO.displayName}`);
  console.log(`[seed] password: ${DEMO.password}`);
  console.log(`[seed] public page: /u/${DEMO.cardSlug}`);
}

main()
  .catch((error) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
