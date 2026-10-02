import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Webhook } from 'svix';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

type ClerkUserData = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  image_url?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: { id: string; email_address: string }[];
};

type ClerkEvent =
  | { type: 'user.created' | 'user.updated'; data: ClerkUserData }
  | { type: 'user.deleted'; data: { id?: string; deleted?: boolean } }
  | { type: string; data: unknown };

@Public() // Clerk can't send a bearer token; svix signature is the auth here
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  private readonly log = new Logger(ClerkWebhookController.name);

  constructor(private prisma: PrismaService) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('svix-id') id: string,
    @Headers('svix-timestamp') timestamp: string,
    @Headers('svix-signature') signature: string,
  ) {
    if (!req.rawBody) throw new BadRequestException('Missing raw body');
    if (!id || !timestamp || !signature) throw new BadRequestException('Missing svix headers');

    let event: ClerkEvent;
    try {
      event = new Webhook(process.env.CLERK_WEBHOOK_SECRET!).verify(req.rawBody.toString('utf8'), {
        'svix-id': id,
        'svix-timestamp': timestamp,
        'svix-signature': signature,
      }) as unknown as ClerkEvent;
    } catch {
      throw new BadRequestException('Invalid signature');
    }

    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await this.upsertUser(event.data as ClerkUserData);
        break;
      case 'user.deleted': {
        const clerkId = (event.data as { id?: string }).id;
        if (clerkId) await this.removeUser(clerkId);
        break;
      }
      default:
        break; // ignore events we don't subscribe to
    }
    return { received: true };
  }

  private async upsertUser(d: ClerkUserData) {
    const primary =
      d.email_addresses?.find((e) => e.id === d.primary_email_address_id) ?? d.email_addresses?.[0];
    const email = primary?.email_address ?? `${d.id}@unknown.local`;
    const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || 'New user';

    // Do not touch roles/activeRole here: those are set by the app, not Clerk.
    await this.prisma.user.upsert({
      where: { clerkId: d.id },
      update: { email, name, avatarUrl: d.image_url ?? null },
      create: { clerkId: d.id, email, name, avatarUrl: d.image_url ?? null },
    });
  }

  private async removeUser(clerkId: string) {
    try {
      await this.prisma.user.deleteMany({ where: { clerkId } });
    } catch (err) {
      // Users with contracts/payments hold restricting FKs. Don't fail the webhook (Clerk would retry forever).
      this.log.warn(`Could not delete user ${clerkId}: ${(err as Error).message}`);
    }
  }
}
