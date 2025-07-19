import axios from "axios";
import { APIEmbed } from "discord-api-types/v10";

/**
 * Send a Discord embed to a webhook logger channel
 * @param embed The embed to send
 */
export async function discordEmbed(embed: APIEmbed): Promise<void> {
	if (!process.env.WEBHOOK_URL) return;

	// faithful green by default
	embed.color ??= 7784773;

	return axios.post(process.env.WEBHOOK_URL, { embeds: [embed] });
}
