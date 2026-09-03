// who came up with these type names
import { RESTPostAPIWebhookWithTokenJSONBody as WebhookMessage } from "discord-api-types/v10";
import axios from "axios";

/**
 * Send a notification message to a Discord webhook
 * @param message Message object to send
 */
export default async function sendDiscordNotification(message: WebhookMessage) {
	if (!process.env.WEBHOOK_URL) return;
	return axios.post(process.env.WEBHOOK_URL, message).catch(() => {});
}
