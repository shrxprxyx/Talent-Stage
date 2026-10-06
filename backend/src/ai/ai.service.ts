import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ProposalScoreInput = {
  coverLetter: string;
  bidAmount: number;
  estimatedDays: number;
  budgetMin: number;
  budgetMax: number;
  projectSkills: string[];
  freelancerSkills: string[];
  completedCount: number;
  ratingAvg: number;
};

export type ProposalScore = {
  score: number;
  breakdown: { skillFit: number; clarity: number; pricing: number; track: number };
  summary: string;
};

export type MatchInput = {
  projectSkills: string[];
  budgetMax: number;
  freelancers: { id: string; skills: string[]; hourlyRate: number | null; ratingAvg: number; completedCount: number }[];
};

export type MatchOutput = { freelancerId: string; score: number; reasoning: string }[];

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const norm = (s: string) => s.trim().toLowerCase();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ratingToPct = (r: number) => (clamp(r, 0, 5) / 5) * 100;

/**
 * Every AI feature goes through this class. AI_PROVIDER=mock computes believable results
 * from the real data (no API calls). To go real later, add a gemini branch here;
 * nothing else in the app changes.
 */
@Injectable()
export class AiService {
  constructor(private config: ConfigService) {}

  private get provider(): string {
    return this.config.get<string>('AI_PROVIDER') ?? 'mock';
  }

  private async fakeThinking() {
    await sleep(Number(this.config.get('AI_MOCK_DELAY_MS') ?? 800));
  }

  async scoreProposal(i: ProposalScoreInput): Promise<ProposalScore> {
    if (this.provider !== 'mock') throw new ServiceUnavailableException('Real AI provider not wired yet');
    await this.fakeThinking();

    const need = i.projectSkills.map(norm);
    const have = new Set(i.freelancerSkills.map(norm));
    const matched = need.filter((s) => have.has(s)).length;
    const skillFit = need.length ? (matched / need.length) * 100 : 70;

    const words = i.coverLetter.trim().split(/\s+/).filter(Boolean).length;
    const clarity = clamp(25 + words * 0.9);

    let pricing: number;
    if (i.bidAmount > i.budgetMax) pricing = clamp(100 - ((i.bidAmount - i.budgetMax) / i.budgetMax) * 200, 20);
    else if (i.bidAmount < i.budgetMin) pricing = 80;
    else pricing = 100;

    const track = clamp(40 + i.completedCount * 8 + i.ratingAvg * 6);

    const round = (n: number) => Math.round(n);
    const score = round(skillFit * 0.4 + clarity * 0.2 + pricing * 0.25 + track * 0.15);

    const parts: string[] = [];
    parts.push(need.length ? `Matches ${matched} of ${need.length} required skills.` : 'No specific skills were required.');
    parts.push(words < 40 ? 'The cover letter is short; more detail would help.' : 'The cover letter is clear and detailed.');
    parts.push(
      i.bidAmount > i.budgetMax ? 'The bid is above the client budget.'
        : i.bidAmount < i.budgetMin ? 'The bid is below the stated budget.'
        : 'The bid fits the client budget.',
    );

    return {
      score,
      breakdown: { skillFit: round(skillFit), clarity: round(clarity), pricing: round(pricing), track: round(track) },
      summary: parts.join(' '),
    };
  }

  async matchFreelancers(i: MatchInput): Promise<MatchOutput> {
    if (this.provider !== 'mock') throw new ServiceUnavailableException('Real AI provider not wired yet');
    await this.fakeThinking();

    const need = i.projectSkills.map(norm);
    return i.freelancers
      .map((f) => {
        const have = new Set(f.skills.map(norm));
        const matched = need.filter((s) => have.has(s));
        const skillFit = need.length ? (matched.length / need.length) * 100 : 60;
        const quality = clamp(ratingToPct(f.ratingAvg) * 0.6 + Math.min(f.completedCount, 10) * 4);
        const score = Math.round(skillFit * 0.7 + quality * 0.3);
        const reasoning = need.length
          ? `Covers ${matched.length}/${need.length} required skills${matched.length ? ` (${matched.join(', ')})` : ''}. ` +
            `${f.completedCount} completed project${f.completedCount === 1 ? '' : 's'}, rated ${f.ratingAvg.toFixed(1)}/5.`
          : `General fit. ${f.completedCount} completed projects, rated ${f.ratingAvg.toFixed(1)}/5.`;
        return { freelancerId: f.id, score, reasoning };
      })
      .sort((a, b) => b.score - a.score);
  }
}