
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

export type PexelsVideoResult = {
    url: string;
    attribution: string;
    duration: number;
    videoId: number;
};

export async function searchPexelsVideo(query: string, orientation: 'landscape' | 'portrait'): Promise<PexelsVideoResult | null> {
    if (!PEXELS_API_KEY) {
        console.error("Missing PEXELS_API_KEY");
        return null;
    }

    try {
        const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=5&size=medium`;

        const response = await fetch(url, {
            headers: {
                Authorization: PEXELS_API_KEY
            }
        });

        if (!response.ok) {
            console.error(`Pexels API Error: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (!data.videos || data.videos.length === 0) {
            console.warn(`No Pexels videos found for query: ${query}`);
            return null;
        }

        // Pick a random video from the top 5 to vary it up a bit, or just the first best match.
        // Let's pick the first one for relevance, or maybe random? User said "use 1 stock video".
        // Let's stick to index 0 for best relevance usually.
        const video = data.videos[0];

        // Find the best video file (prefer HD)
        // Pexels returns 'video_files' array with different qualities.
        // We want 'hd' with largest width/height fitting our orientation.
        // Sort files by width descending.
        const bestFile = video.video_files
            .sort((a: any, b: any) => (b.width * b.height) - (a.width * a.height))
            .find((f: any) => f.quality === 'hd' || f.quality === 'sd');

        if (!bestFile) return null;

        return {
            url: bestFile.link,
            attribution: `Video by ${video.user.name} on Pexels`,
            duration: video.duration,
            videoId: video.id
        };

    } catch (e) {
        console.error("Pexels Search Exception:", e);
        return null;
    }
}
