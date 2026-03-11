import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as any).DB as D1Database;
}
