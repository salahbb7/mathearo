import { NextRequest, NextResponse } from 'next/server';
import { getBucket } from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ key: string[] }> | { key: string[] } }
) {
    // Next.js 15: params is a promise
    const resolvedParams = await Promise.resolve(params);
    const key = resolvedParams.key.join('/');

    try {
        const bucket = await getBucket();
        
        let file;
        try {
            file = await bucket.get(key);
        } catch (err) {
            console.error('Error fetching file from R2:', err);
            return NextResponse.json({ error: 'Failed to access bucket' }, { status: 500 });
        }

        if (!file) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const headers = new Headers();
        file.writeHttpMetadata(headers);
        headers.set('etag', file.httpEtag);
        
        if (file.httpMetadata?.contentType) {
            headers.set('Content-Type', file.httpMetadata.contentType);
        }

        // Return the body directly as a stream
        return new NextResponse(file.body as any, {
            headers,
        });
    } catch (error) {
        console.error('Error in file route:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
