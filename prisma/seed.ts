// Prisma Seed Script - GHOSTCLAW
// Phase 3C: Database Seed

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create initial agents
  const agents = await prisma.agent.createMany({
    data: [
      {
        name: 'Planner Agent',
        role: 'planner',
        capabilities: JSON.stringify(['architect', 'plan']),
        status: 'idle',
      },
      {
        name: 'Builder Agent', 
        role: 'builder',
        capabilities: JSON.stringify(['code', 'test']),
        status: 'idle',
      },
      {
        name: 'Reviewer Agent',
        role: 'reviewer', 
        capabilities: JSON.stringify(['review', 'security']),
        status: 'idle',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Created agents:', agents.count);

  // Create initial tasks
  const tasks = await prisma.taskQueue.createMany({
    data: [
      { taskType: 'prisma_migrate', description: 'Generate Prisma client', priority: 50, status: 'completed' },
      { taskType: 'api_routes', description: 'Create agent endpoints', priority: 100, status: 'in_progress' },
      { taskType: 'ui_components', description: 'Build GhostClaw UI', priority: 75, status: 'pending' },
    ],
    skipDuplicates: true,
  });

  console.log('Created tasks:', tasks.count);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());