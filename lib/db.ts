import { getCloudflareContext } from '@opennextjs/cloudflare';

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as any).DB as D1Database;
}

export async function getBucket(): Promise<R2Bucket> {
  const { env } = await getCloudflareContext({ async: true });
  return (env as any).BUCKET as R2Bucket;
}
