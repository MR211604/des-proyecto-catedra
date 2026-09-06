import { prisma } from "../../db/prisma.js";
import { seedDefaultStages } from "./service.js";

const stages = await seedDefaultStages();
console.log(`Production stages ready: ${stages.length}`);
await prisma.$disconnect();
