import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { createClient } from '@/utils/supabase/server';

// Optional: Increase maxDuration if deployed on Vercel Pro (e.g., to 5 minutes)
// export const maxDuration = 300; 

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { projectId, channel, title, description, tags, privacyStatus, publishAt } = body;

        if (!projectId || !channel) {
            return NextResponse.json({ error: 'Missing projectId or channel' }, { status: 400 });
        }

        // 1. Verify User
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Project & Video URL
        const { data: project } = await supabase.from('projects').select('*').eq('id', projectId).single();
        if (!project || !project.video_url) {
            return NextResponse.json({ error: 'Video not found or rendering incomplete' }, { status: 404 });
        }

        // 3. Load Credentials based on channel
        let clientId, clientSecret, refreshToken;
        if (channel === 'www') {
            clientId = process.env.YOUTUBE_WWW_CLIENT_ID;
            clientSecret = process.env.YOUTUBE_WWW_CLIENT_SECRET;
            refreshToken = process.env.YOUTUBE_WWW_REFRESH_TOKEN;
        } else if (channel === 'james') {
            clientId = process.env.YOUTUBE_JAMES_CLIENT_ID;
            clientSecret = process.env.YOUTUBE_JAMES_CLIENT_SECRET;
            refreshToken = process.env.YOUTUBE_JAMES_REFRESH_TOKEN;
        } else {
            return NextResponse.json({ error: 'Invalid channel selection' }, { status: 400 });
        }

        if (!clientId || !clientSecret || !refreshToken) {
            return NextResponse.json({ error: 'YouTube credentials not configured in environment' }, { status: 500 });
        }

        // 4. Initialize OAuth2 Client
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:3000');
        oauth2Client.setCredentials({ refresh_token: refreshToken });

        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

        // 5. Fetch Video Stream
        console.log(`[YouTube API] Fetching video from ${project.video_url}...`);
        const videoRes = await fetch(project.video_url);
        if (!videoRes.ok || !videoRes.body) {
            return NextResponse.json({ error: 'Failed to stream the completed video from storage' }, { status: 500 });
        }

        // Next.js runtime provides Web ReadableStream. googleapis expects a Node.js Readable stream.
        // We convert the Web stream into a Node stream safely.
        const videoStream = Readable.fromWeb(videoRes.body as any);

        console.log(`[YouTube API] Starting upload to channel: ${channel}`);
        
        // Setup API Status Object
        const finalStatus: any = {
            privacyStatus: privacyStatus === 'schedule' ? 'private' : (privacyStatus || 'private'),
            selfDeclaredMadeForKids: false,
        };
        
        if (privacyStatus === 'schedule' && publishAt) {
            // YouTube API requires ISO 8601 string containing timezone offset
            finalStatus.publishAt = new Date(publishAt).toISOString();
        }

        // 6. Upload Pipeline
        const uploadRes = await youtube.videos.insert({
            part: ['snippet', 'status'],
            requestBody: {
                snippet: {
                    title: title || project.script.substring(0, 50) + "...",
                    description: description || 'Generated and uploaded automatically via AI Platform',
                    tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
                    categoryId: '22', // People & Blogs
                },
                status: finalStatus,
            },
            media: {
                body: videoStream,
            },
        });

        const videoId = uploadRes.data.id;
        console.log(`[YouTube API] Upload Complete! Video ID: ${videoId}`);

        return NextResponse.json({
            success: true,
            videoId: videoId,
            url: `https://youtu.be/${videoId}`,
            channel: channel
        });

    } catch (error: any) {
        console.error('[YouTube API] Expected Error:', error);
        
        // Extract inner googleapis error message if present
        const googleError = error.errors && error.errors[0] ? error.errors[0].message : null;
        const msg = googleError || error.message || 'Unknown upload error occurred';
        
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
