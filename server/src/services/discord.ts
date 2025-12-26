import { getSetting } from '../db';

export async function sendDiscordNotification(title: string, description: string, color: number = 0x00ff00) {
  const webhookUrl = getSetting('discord_webhook');
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title,
          description,
          color,
          timestamp: new Date().toISOString()
        }]
      })
    });
  } catch (err) {
    console.error('Discord notification failed:', err);
  }
}

export async function notifyDeploySuccess(appName: string, domain: string) {
  await sendDiscordNotification(
    '✅ Deployment Successful',
    `**${appName}** deployed successfully!\n🌐 https://${domain}`,
    0x00ff00
  );
}

export async function notifyDeployFailed(appName: string, error: string) {
  await sendDiscordNotification(
    '❌ Deployment Failed',
    `**${appName}** deployment failed.\n\`\`\`${error.substring(0, 500)}\`\`\``,
    0xff0000
  );
}

export async function notifyContainerCrashed(containerName: string) {
  await sendDiscordNotification(
    '⚠️ Container Crashed',
    `Container **${containerName}** has stopped unexpectedly.`,
    0xff9900
  );
}

export async function notifyAppUpdated(appName: string) {
  await sendDiscordNotification(
    '🔄 App Updated',
    `**${appName}** was updated via GitHub webhook.`,
    0x0099ff
  );
}
