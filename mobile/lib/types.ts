export type Role = 'FREELANCER' | 'CLIENT';
export type ProjectStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type ProposalStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export type Me = { id: string; name: string; email: string; avatarUrl: string | null; roles: Role[]; activeRole: Role | null };
export type Skill = { id: string; name: string; slug: string; category: string };

// Prisma Decimals arrive as strings
export type Project = {
  id: string; clientId: string; title: string; description: string;
  budgetMin: string; budgetMax: string; deadline: string | null; status: ProjectStatus; createdAt: string;
  skills: { skill: Skill }[];
  client: { id: string; companyName: string | null; ratingAvg: number; ratingCount: number; user: { id: string; name: string; avatarUrl: string | null } };
  _count: { proposals: number };
};
export type Page<T> = { items: T[]; total: number; page: number; limit: number };

export type Proposal = {
  id: string; projectId: string; freelancerId: string; coverLetter: string; bidAmount: string; estimatedDays: number;
  status: ProposalStatus; createdAt: string;
  aiScore: number | null;
  aiBreakdown: { skillFit: number; clarity: number; pricing: number; track: number } | null;
  aiSummary: string | null;
  freelancer: { id: string; headline: string | null; hourlyRate: string | null; ratingAvg: number; ratingCount: number; completedCount: number; user: { name: string; avatarUrl: string | null } };
  project: { id: string; title: string; status: ProjectStatus; clientId: string; client: { companyName: string | null; user: { name: string } } };
};

export type PortfolioItem = { id: string; title: string; description: string | null; link: string | null; createdAt: string };
export type FreelancerProfile = {
  id: string; headline: string | null; bio: string | null; hourlyRate: string | null; location: string | null;
  ratingAvg: number; ratingCount: number; completedCount: number;
  skills: { skill: Skill; yearsExp: number }[]; portfolio: PortfolioItem[];
};
