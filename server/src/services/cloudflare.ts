import { getSetting, setSetting } from '../db';

const CF_API = 'https://api.cloudflare.com/client/v4';

function getToken(): string {
  return getSetting('cloudflare_token') || '';
}

function getZoneId(): string {
  return getSetting('cloudflare_zone_id') || '';
}

export function setCloudflareConfig(token: string, zoneId: string) {
  setSetting('cloudflare_token', token);
  setSetting('cloudflare_zone_id', zoneId);
}

export function getCloudflareConfig() {
  return {
    token: getToken(),
    zoneId: getZoneId()
  };
}

async function cfFetch(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error('Cloudflare token not configured');

  const res = await fetch(`${CF_API}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.errors?.[0]?.message || 'Cloudflare API error');
  }
  return data;
}

export async function listDnsRecords() {
  const zoneId = getZoneId();
  if (!zoneId) throw new Error('Cloudflare zone ID not configured');

  const data = await cfFetch(`/zones/${zoneId}/dns_records?per_page=100`);
  return data.result.map((r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    content: r.content,
    proxied: r.proxied,
    ttl: r.ttl
  }));
}

export async function createDnsRecord(name: string, content: string, type = 'A', proxied = true) {
  const zoneId = getZoneId();
  if (!zoneId) throw new Error('Cloudflare zone ID not configured');

  const data = await cfFetch(`/zones/${zoneId}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({ type, name, content, proxied, ttl: 1 })
  });
  return data.result;
}

export async function updateDnsRecord(recordId: string, updates: { name?: string; content?: string; type?: string; proxied?: boolean }) {
  const zoneId = getZoneId();
  if (!zoneId) throw new Error('Cloudflare zone ID not configured');

  const data = await cfFetch(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  return data.result;
}

export async function deleteDnsRecord(recordId: string) {
  const zoneId = getZoneId();
  if (!zoneId) throw new Error('Cloudflare zone ID not configured');

  await cfFetch(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: 'DELETE'
  });
}
