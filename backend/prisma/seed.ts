import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const skills: Record<string, string[]> = {
  Development: ['React Native', 'React', 'TypeScript', 'Node.js', 'NestJS', 'Python', 'PostgreSQL', 'Docker', 'Flutter', 'Swift', 'Kotlin'],
  Design: ['Figma', 'UI Design', 'UX Research', 'Branding', 'Illustration', 'Motion Design'],
  'Data & AI': ['Machine Learning', 'Data Analysis', 'Prompt Engineering', 'Computer Vision', 'SQL'],
  Writing: ['Copywriting', 'Technical Writing', 'Translation', 'Content Strategy'],
  Marketing: ['SEO', 'Social Media', 'Email Marketing', 'Video Editing'],
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/\./g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const day = 24 * 60 * 60 * 1000;

const challenges = [
  {
    title: 'Redesign a checkout flow',
    description: 'Submit a short write-up of how you would reduce drop-off in a 4-step mobile checkout.',
    startsAt: new Date(Date.now() - 2 * day),
    endsAt: new Date(Date.now() + 12 * day),
    status: 'ACTIVE' as const,
    maxPoints: 100,
  },
  {
    title: 'Optimize a slow SQL query',
    description: 'Given a described schema and a slow report query, explain the indexes and rewrites you would apply.',
    startsAt: new Date(Date.now() + 7 * day),
    endsAt: new Date(Date.now() + 21 * day),
    status: 'UPCOMING' as const,
    maxPoints: 100,
  },
  {
    title: 'Write launch copy for a fintech app',
    description: 'Write a landing-page hero, subhead, and three feature blurbs for a peer-to-peer payments app.',
    startsAt: new Date(Date.now() - 30 * day),
    endsAt: new Date(Date.now() - 16 * day),
    status: 'CLOSED' as const,
    maxPoints: 100,
  },
];

async function main() {
  let skillCount = 0;
  for (const [category, names] of Object.entries(skills)) {
    for (const name of names) {
      await prisma.skill.upsert({
        where: { slug: slugify(name) },
        update: { name, category },
        create: { name, slug: slugify(name), category },
      });
      skillCount++;
    }
  }

  // Challenge has no natural unique key, so match on title to keep the seed re-runnable.
  for (const c of challenges) {
    const existing = await prisma.challenge.findFirst({ where: { title: c.title } });
    if (!existing) await prisma.challenge.create({ data: c });
  }

  console.log(`Seeded ${skillCount} skills and ${challenges.length} challenges`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
