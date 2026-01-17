'use server';

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from '@supabase/supabase-js';

// Init admin client for Storage deletion (policies might block normal user delete depending on setup, safer to use admin for clean wipe)
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function deleteProject(projectId: string) {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: 'Unauthorized' };
    }

    // 2. Verify Ownership
    const { data: project } = await supabase
        .from('projects')
        .select('user_id')
        .eq('id', projectId)
        .single();

    if (!project || project.user_id !== user.id) {
        return { success: false, error: 'Project not found or unauthorized' };
    }

    try {
        console.log(`Starting deletion for project: ${projectId}`);

        // Helper function to recursively list all files in a specific bucket
        const listAllFiles = async (bucket: string, path: string): Promise<string[]> => {
            const files: string[] = [];
            const { data, error } = await supabaseAdmin.storage.from(bucket).list(path);

            if (error) {
                // If bucket doesn't exist or other error, just log and return empty to continue flow
                console.error(`Error listing ${path} in ${bucket} (might be empty/missing):`, error.message);
                return files;
            }

            if (data) {
                for (const item of data) {
                    const fullPath = path ? `${path}/${item.name}` : item.name;

                    if (item.id) { // It's a file
                        files.push(fullPath);
                    } else { // It might be a folder, try to list it
                        const subFiles = await listAllFiles(bucket, fullPath);
                        files.push(...subFiles);
                    }
                }
            }

            return files;
        };

        // Generic delete helper
        const deleteFromBucket = async (bucket: string, path: string) => {
            console.log(`Scanning bucket '${bucket}' for path: ${path}`);
            const filesToDelete = await listAllFiles(bucket, path);

            console.log(`Found ${filesToDelete.length} files to delete in '${bucket}':`, filesToDelete);

            if (filesToDelete.length > 0) {
                // Delete files in batches (Supabase has a limit)
                const batchSize = 100;
                for (let i = 0; i < filesToDelete.length; i += batchSize) {
                    const batch = filesToDelete.slice(i, i + batchSize);
                    const { error: deleteError } = await supabaseAdmin
                        .storage
                        .from(bucket)
                        .remove(batch);

                    if (deleteError) {
                        console.error(`Error deleting batch from ${bucket}:`, deleteError);
                    } else {
                        console.log(`Deleted ${batch.length} files from ${bucket}`);
                    }
                }
            } else {
                console.log(`No files found in '${bucket}' folder '${path}'`);
            }
        };

        // 3. Delete from ASSETS bucket (images, audio)
        await deleteFromBucket('assets', projectId);

        // 4. Delete from PROJECTS bucket (rendered videos)
        // Renderer stores video as: {projectId}/video-{timestamp}.mp4
        await deleteFromBucket('projects', projectId);

        // 5. Delete Project Record (Cascade should remove scenes)
        // Using admin client to bypass any potential RLS issues with delete policy
        const { error: deleteError } = await supabaseAdmin
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (deleteError) {
            console.error("DB Delete Error:", deleteError);
            throw deleteError;
        }

        return { success: true };

    } catch (e: any) {
        console.error("Delete Project Failed:", e);
        return { success: false, error: e.message };
    }
}
