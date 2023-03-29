import { DiscordEmbed } from 'src/types';

// Tricks to import fetch in a Node.js environment
const importDynamic = new Function('modulePath', 'return import(modulePath)');
const fetch = async (...args: any[]) => {
  const module = await importDynamic('node-fetch');
  return module.default(...args);
};

export enum DiscordEmbedColors {
  BLURPLE = 0x5865f2,
  GREEN = 0x57f287,
  YELLOW = 0xfee75c,
  RED = 0xed4245,
  FUCHSIA = 0xee459e,
  WHITE = 0xffffff,
  BLACK = 0x23272a,
}

export interface DiscordWebhookQuery {
  /** The message to send. */
  message?: string;
  /** Keep the message on top of each sent webhooks if there is more than one message to be sent */
  keepMessageOnAllWebhooks?: boolean | true;
  /** The embeds to send if the length exceeds 10, it will be split into multiple webhooks. */
  embeds?: DiscordEmbed[];
  /** The webhook URL to send the message to. If not specified, it will use the DISCORD_WEBHOOK_URL environment variable. */
  webhookUrl?: string;
}

/**
 * Send a Discord Webhook with a message and/or embeds to the specified webhook URL.
 * @param {DiscordWebhookQuery} query The query object.
 */
export default async (query: DiscordWebhookQuery) => {
  const webhookUrl = query.webhookUrl ?? process.env.DISCORD_WEBHOOK_URL;

  const embeds = query.embeds ?? [];
  const maxEmbedsPerWebhook = 10;
  const chunk = <T>(arr: T[], chunkSize: number): T[][] => {
    const result = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  };

  const embedsGroups = embeds.length > maxEmbedsPerWebhook ? chunk(embeds, maxEmbedsPerWebhook) : [embeds];

  for (const embedsGroup of embedsGroups) {
    const webhook = {
      content:
        (query.keepMessageOnAllWebhooks === true && embedsGroups.length > 1) || embedsGroup.length === 1
          ? query.message
          : undefined,
      username: 'Faithful API V3',
      avatar_url: 'https://database.faithfulpack.net/images/branding/logos/with%20background/512/plain_logo.png',
      embeds: embedsGroup,
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhook),
    });
  }
};
