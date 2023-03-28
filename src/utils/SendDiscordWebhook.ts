import { DiscordEmbed } from 'src/types';

const importDynamic = new Function('modulePath', 'return import(modulePath)');
const fetch = async (...args: any[]) => {
  const module = await importDynamic('node-fetch');
  return module.default(...args);
};

export async function SendDiscordWebhook(message = '', embeds: DiscordEmbed[] = undefined) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  const webhook = {
    content: message,
    username: 'Faithful API V3',
    avatar_url: 'https://database.faithfulpack.net/images/branding/logos/with%20background/512/plain_logo.png',
    embeds,
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(webhook),
  });
}
