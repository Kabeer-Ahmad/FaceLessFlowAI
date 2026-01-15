import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const RENDERER_URL = 'https://kabeerahmad-facelessflow-renderer.hf.space';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const { projectId } = await params;
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify Ownership & Get Project Data
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*, user_id')
        .eq('id', projectId)
        .single();

    if (projectError || !project || project.user_id !== user.id) {
        return NextResponse.json({ error: 'Project not found or unauthorized' }, { status: 404 });
    }

    // 3. Get Scenes
    const { data: scenes, error: scenesError } = await supabase
        .from('scenes')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'ready')
        .order('order_index');

    if (scenesError || !scenes || scenes.length === 0) {
        return NextResponse.json({ error: 'No ready scenes found' }, { status: 400 });
    }

    try {
        console.log(`[Render API] Calling HuggingFace Space for project ${projectId}`);

        // Call HuggingFace Space renderer
        const response = await fetch(`${RENDERER_URL}/render`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                scenes,
                settings: project.settings
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Renderer failed: ${error}`);
        }

        console.log(`[Render API] Received video from HuggingFace Space`);

        // Get video buffer
        const videoBuffer = await response.arrayBuffer();

        // Return video file
        return new NextResponse(videoBuffer, {
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="video-${projectId.slice(0, 8)}.mp4"`,
            },
        });

    } catch (e: any) {
        console.error('[Render API] Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
