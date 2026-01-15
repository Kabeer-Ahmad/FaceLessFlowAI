'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ProjectApi, SceneApi, ProjectSettings } from '@/types';
import { generateScene } from '@/actions/generateScene';
import { updateProjectSettings } from '@/actions/updateProjectSettings';
import { regenerateAudio } from '@/actions/regenerateAudio';
import { regenerateImage } from '@/actions/regenerateImage';
import { Player } from '@remotion/player';
import { MainComposition } from '@/remotion/MainComposition';
import { ChevronLeft, Play, LayoutList, Image as ImageIcon, Music, Type, AlertCircle, Sparkles, ChevronDown, Loader2, Wand2, Settings, RefreshCw, Download } from 'lucide-react';

export default function ProjectPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const supabase = createClient();

    const [project, setProject] = useState<ProjectApi | null>(null);
    const [scenes, setScenes] = useState<SceneApi[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [genProgress, setGenProgress] = useState(0);
    const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);
    const [showScript, setShowScript] = useState(false);
    const [regeneratingAudio, setRegeneratingAudio] = useState<string | null>(null);
    const [regeneratingImage, setRegeneratingImage] = useState<string | null>(null);
    const [rendering, setRendering] = useState(false);
    const playerRef = useRef<any>(null);

    // Load Project Data
    useEffect(() => {
        const loadProject = async () => {
            const { data: proj } = await supabase.from('projects').select('*').eq('id', projectId).single();
            if (proj) {
                setProject(proj);
                // Load existing scenes
                const { data: scns } = await supabase.from('scenes').select('*').eq('project_id', projectId).order('order_index');
                if (scns) setScenes(scns);
            } else {
                router.push('/');
            }
            setLoading(false);
        };
        loadProject();

        // Subscribe to realtime updates for scenes
        const channel = supabase.channel(`scenes-${projectId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'scenes', filter: `project_id=eq.${projectId}` },
                (payload) => {
                    console.log('Scene inserted:', payload.new);
                    setScenes(prev => {
                        const existing = prev.find(s => s.id === payload.new.id);
                        if (existing) return prev;
                        return [...prev, payload.new as SceneApi].sort((a, b) => a.order_index - b.order_index);
                    });
                })
            .on('postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'scenes', filter: `project_id=eq.${projectId}` },
                (payload) => {
                    console.log('Scene updated:', payload.new);
                    setScenes(prev => prev.map(s => s.id === payload.new.id ? payload.new as SceneApi : s));
                })
            .on('postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'scenes', filter: `project_id=eq.${projectId}` },
                (payload) => {
                    console.log('Scene deleted:', payload.old);
                    setScenes(prev => prev.filter(s => s.id !== payload.old.id));
                })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [projectId, router]);

    const handleGenerate = async () => {
        if (!project) return;
        setGenerating(true);
        setGenProgress(0);

        try {
            // 1. Split Script (Simple regex)
            const sentences = project.script.match(/[^.!?]+[.!?]+/g) || [project.script];

            // 2. Iterate and Generate
            for (let i = 0; i < sentences.length; i++) {
                const text = sentences[i].trim();
                if (!text) continue;

                // Skip if already generated
                if (scenes.find(s => s.order_index === i)) {
                    setGenProgress(((i + 1) / sentences.length) * 100);
                    continue;
                }

                // Call Server Action
                const result = await generateScene(projectId, i, text, project.settings);

                if (!result.success) {
                    alert(`Error generating scene ${i + 1}: ${result.error}`);
                    break;
                }

                setGenProgress(((i + 1) / sentences.length) * 100);
            }
        } catch (e) {
            console.error(e);
            alert("Generation failed");
        } finally {
            setGenerating(false);
        }
    };

    const handleUpdateSettings = async (newSettings: Partial<ProjectSettings>) => {
        if (!project) return;

        const result = await updateProjectSettings(projectId, newSettings);
        if (result.success && result.settings) {
            setProject({ ...project, settings: result.settings });
        } else {
            alert(`Failed to update settings: ${result.error}`);
        }
    };

    const handleRegenerateAudio = async (sceneId: string, text: string, sceneIndex: number) => {
        if (!project) return;
        setRegeneratingAudio(sceneId);
        try {
            const result = await regenerateAudio(sceneId, text, project.settings.audioVoice, projectId, sceneIndex);
            if (result.success) {
                // Reload scenes to get updated data
                const { data: scns } = await supabase.from('scenes').select('*').eq('project_id', projectId).order('order_index');
                if (scns) setScenes(scns);
            } else {
                alert(`Failed to regenerate audio: ${result.error}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setRegeneratingAudio(null);
        }
    };

    const handleRegenerateImage = async (sceneId: string, text: string, sceneIndex: number) => {
        if (!project) return;
        setRegeneratingImage(sceneId);
        try {
            const result = await regenerateImage(sceneId, text, project.settings.visualStyle, project.settings.imageModel, projectId, sceneIndex, project.settings.aspectRatio);
            if (result.success) {
                // Reload scenes
                const { data: scns } = await supabase.from('scenes').select('*').eq('project_id', projectId).order('order_index');
                if (scns) setScenes(scns);
            } else {
                alert(`Failed to regenerate image: ${result.error}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setRegeneratingImage(null);
        }
    };


    const handleExportVideo = async () => {
        if (!project) return;
        setRendering(true);
        try {
            // Call API route
            const response = await fetch(`/api/render/${projectId}`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Export failed');
            }

            // Get the video blob
            const blob = await response.blob();

            // Trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `video-${projectId.slice(0, 8)}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e: any) {
            alert(`Export error: ${e.message}`);
        } finally {
            setRendering(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-stone-500">Loading Workspace...</div>;
    if (!project) return null;

    return (
        <div className="min-h-screen bg-stone-950 text-stone-200 font-sans flex flex-col h-screen overflow-hidden">

            {/* HEADER */}
            <header className="bg-stone-950/95 backdrop-blur-sm border-b border-white/10 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/')} className="text-stone-400 hover:text-stone-200 transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold text-stone-200">Video Studio</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowScript(!showScript)}
                        className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                        <LayoutList size={16} />
                        {showScript ? 'Hide' : 'Show'} Script
                    </button>
                    <button
                        onClick={handleExportVideo}
                        disabled={rendering || scenes.filter(s => s.status === 'ready').length === 0}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                        {rendering ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Rendering...
                            </>
                        ) : (
                            <>
                                <Download size={16} />
                                Export Video
                            </>
                        )}
                    </button>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-mono border ${project.status === 'done' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                        project.status === 'generating' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
                            'bg-stone-800 border-stone-700 text-stone-500'
                        }`}>
                        {project.status.toUpperCase()}
                    </div>
                </div>
            </header>

            {/* Script Panel */}
            {showScript && (
                <div className="border-b border-white/5 bg-stone-900/30 p-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-500">Original Scripture</h3>
                        <span className="text-xs text-stone-500">{scenes.length} {scenes.length === 1 ? 'Scene' : 'Scenes'}</span>
                    </div>
                    <p className="text-stone-300 font-serif leading-relaxed opacity-80 max-w-4xl">{project.script}</p>
                </div>
            )}


            <div className="flex flex-1 overflow-hidden">

                {/* LEFT: Sidebar Scenes */}
                <div className="w-[350px] border-r border-white/5 bg-stone-900/30 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                            <LayoutList size={14} /> Storyboard ({scenes.length})
                        </span>
                        {generating && <span className="text-xs text-orange-500 animate-pulse">{Math.round(genProgress)}%</span>}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {scenes.length === 0 && !generating && (
                            <div className="text-center py-10 px-6">
                                <p className="text-stone-500 text-sm mb-4">No scenes generated yet.</p>
                                <button
                                    onClick={handleGenerate}
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold py-3 rounded-lg shadow-lg border-b-2 border-orange-800 transition-all active:translate-y-[1px] active:border-b-0"
                                >
                                    Generate Visuals
                                </button>
                            </div>
                        )}

                        {scenes.map((scene, idx) => (
                            <div key={scene.id} className={`bg-stone-900 border p-3 rounded-lg transition-all cursor-pointer ${expandedSceneId === scene.id ? 'border-orange-500/50' : 'border-white/5 hover:border-orange-500/30'}`}>
                                <div className="flex gap-3 items-start" onClick={() => setExpandedSceneId(expandedSceneId === scene.id ? null : scene.id)}>
                                    {/* Thumbnail */}
                                    <div className="w-16 h-16 bg-black rounded-md overflow-hidden flex-shrink-0 relative border border-white/5">
                                        {scene.image_url ? (
                                            <img src={scene.image_url} className="w-full h-full object-cover" alt={`Scene ${idx + 1}`} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-red-500 bg-red-500/10">
                                                <AlertCircle size={16} />
                                            </div>
                                        )}
                                        {!scene.audio_url && (
                                            <div className="absolute bottom-0 right-0 bg-red-500 p-0.5 rounded-tl">
                                                <Music size={8} className="text-white" />
                                            </div>
                                        )}
                                        <div className="absolute top-0 left-0 bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-mono">
                                            #{idx + 1}
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <p className="text-xs text-stone-300 line-clamp-2 font-medium leading-relaxed mb-1">
                                            "{scene.text}"
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-stone-600">
                                            {scene.audio_url && <Music size={10} className="text-green-500/50" />}
                                            {scene.prompt && <span className="truncate max-w-[100px]">{scene.visual_style || 'Zen'}</span>}
                                        </div>
                                    </div>
                                    <ChevronDown size={16} className={`text-stone-500 transition-transform ${expandedSceneId === scene.id ? 'rotate-180' : ''}`} />
                                </div>

                                {expandedSceneId === scene.id && (
                                    <div className="mt-3 pt-3 border-t border-white/5 text-xs space-y-2 animate-in fade-in slide-in-from-top-2">
                                        <div>
                                            <span className="font-semibold text-stone-400">Prompt:</span> <span className="text-stone-300">{scene.prompt || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-stone-400">Visual Style:</span> <span className="text-stone-300">{scene.visual_style || 'N/A'}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-stone-400">Duration:</span> <span className="text-stone-300">{scene.duration?.toFixed(1)}s</span>
                                        </div>

                                        {/* Audio Section */}
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-stone-400">Audio:</span>
                                            <button
                                                onClick={() => handleRegenerateAudio(scene.id, scene.text, scene.order_index)}
                                                disabled={regeneratingAudio === scene.id}
                                                className="flex items-center gap-1 px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {regeneratingAudio === scene.id ? (
                                                    <><Loader2 size={10} className="animate-spin" /> Regenerating...</>
                                                ) : (
                                                    <><RefreshCw size={10} /> Regenerate</>
                                                )}
                                            </button>
                                        </div>
                                        {scene.audio_url && (
                                            <div>
                                                <audio controls className="w-full h-8" src={scene.audio_url}>
                                                    Your browser does not support audio.
                                                </audio>
                                            </div>
                                        )}
                                        {!scene.audio_url && (
                                            <div className="flex items-center gap-1 text-red-500 text-[10px]">
                                                <AlertCircle size={10} /> Audio missing
                                            </div>
                                        )}

                                        {/* Image Section */}
                                        <div className="flex items-center justify-between pt-2">
                                            <span className="font-semibold text-stone-400">Image:</span>
                                            <button
                                                onClick={() => handleRegenerateImage(scene.id, scene.text, scene.order_index)}
                                                disabled={regeneratingImage === scene.id}
                                                className="flex items-center gap-1 px-2 py-1 bg-stone-800 hover:bg-stone-700 rounded text-[10px] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {regeneratingImage === scene.id ? (
                                                    <><Loader2 size={10} className="animate-spin" /> Regenerating...</>
                                                ) : (
                                                    <><RefreshCw size={10} /> Regenerate</>
                                                )}
                                            </button>
                                        </div>
                                        {!scene.image_url && (
                                            <div className="flex items-center gap-1 text-red-500 text-[10px]">
                                                <AlertCircle size={10} /> Image missing
                                            </div>
                                        )}

                                        {scene.status === 'error' && (
                                            <div className="flex items-center gap-1 text-red-500 pt-2">
                                                <AlertCircle size={12} /> Generation Failed
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {generating && (
                            <div className="p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg animate-pulse">
                                <div className="h-2 w-2/3 bg-orange-500/20 rounded mb-2"></div>
                                <div className="h-10 w-full bg-orange-500/10 rounded"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTER: Player */}
                <div className="flex-1 bg-black/40 flex flex-col">
                    <div className="bg-stone-900/95 border-b border-white/10 p-3 flex items-center gap-4 overflow-x-auto">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500 whitespace-nowrap">Caption Settings:</span>

                        {/* Caption Toggle - Improved Styling */}
                        <label className="relative inline-flex items-center gap-2 cursor-pointer group whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={project.settings.captions.enabled}
                                onChange={(e) => handleUpdateSettings({
                                    captions: { ...project.settings.captions, enabled: e.target.checked }
                                })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-stone-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                            <span className="text-xs text-stone-300">Show</span>
                        </label>

                        {/* Font */}
                        <select
                            value={project.settings.captions.font}
                            onChange={(e) => handleUpdateSettings({
                                captions: { ...project.settings.captions, font: e.target.value as any }
                            })}
                            className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1"
                            disabled={!project.settings.captions.enabled}
                        >
                            <option value="sans">Sans</option>
                            <option value="serif">Serif</option>
                            <option value="brush">Brush</option>
                        </select>

                        {/* Size */}
                        <select
                            value={project.settings.captions.fontSize || 'medium'}
                            onChange={(e) => handleUpdateSettings({
                                captions: { ...project.settings.captions, fontSize: e.target.value as any }
                            })}
                            className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1"
                            disabled={!project.settings.captions.enabled}
                        >
                            <option value="small">S</option>
                            <option value="medium">M</option>
                            <option value="large">L</option>
                            <option value="xlarge">XL</option>
                        </select>

                        {/* Position */}
                        <select
                            value={project.settings.captions.position}
                            onChange={(e) => handleUpdateSettings({
                                captions: { ...project.settings.captions, position: e.target.value as any }
                            })}
                            className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1"
                            disabled={!project.settings.captions.enabled}
                        >
                            <option value="top">Top</option>
                            <option value="center">Center</option>
                            <option value="mid-bottom">Mid-Bottom</option>
                            <option value="bottom">Bottom</option>
                        </select>

                        {/* Animation */}
                        <select
                            value={project.settings.captions.animation || 'typewriter'}
                            onChange={(e) => handleUpdateSettings({
                                captions: { ...project.settings.captions, animation: e.target.value as any }
                            })}
                            className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1"
                            disabled={!project.settings.captions.enabled}
                        >
                            <option value="none">None</option>
                            <option value="typewriter">Typewriter</option>
                            <option value="fade-in">Fade In</option>
                            <option value="slide-up">Slide Up</option>
                            <option value="bounce">Bounce</option>
                        </select>

                        {/* Stroke/Weight */}
                        <select
                            value={project.settings.captions.strokeWidth || 'medium'}
                            onChange={(e) => handleUpdateSettings({
                                captions: { ...project.settings.captions, strokeWidth: e.target.value as any }
                            })}
                            className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1"
                            disabled={!project.settings.captions.enabled}
                        >
                            <option value="thin">Thin</option>
                            <option value="medium">Medium</option>
                            <option value="thick">Thick</option>
                            <option value="bold">Bold</option>
                        </select>

                        {/* Divider */}
                        <div className="h-6 w-px bg-white/10"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-500 whitespace-nowrap">Transitions:</span>

                        {/* Transition Type */}
                        <select
                            value={project.settings.transitions.type}
                            onChange={(e) => handleUpdateSettings({
                                transitions: { ...project.settings.transitions, type: e.target.value as any }
                            })}
                            className="bg-stone-800 border border-stone-700 text-stone-200 text-xs rounded px-2 py-1"
                        >
                            <option value="none">None</option>
                            <option value="fadein">Fade In</option>
                            <option value="crossfade">Crossfade</option>
                            <option value="white_flash">White Flash</option>
                            <option value="camera_flash">Camera Flash</option>
                        </select>
                    </div>

                    <div className="flex-1 flex items-center justify-center p-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed opacity-100">
                        {scenes.length > 0 ? (
                            <div className={
                                project.settings.aspectRatio === '9:16'
                                    ? 'h-[75vh] aspect-[9/16] shadow-2xl rounded-xl overflow-hidden ring-1 ring-white/10 bg-black relative'
                                    : 'aspect-video w-full max-w-5xl shadow-2xl rounded-xl overflow-hidden ring-1 ring-white/10 bg-black relative group'
                            }>
                                <Player
                                    key={`player-${scenes.filter(s => s.status === 'ready').length}-${project.settings.aspectRatio}`}
                                    ref={playerRef}
                                    component={MainComposition}
                                    inputProps={{
                                        scenes: scenes.filter(s => s.status === 'ready'),
                                        settings: project.settings
                                    }}
                                    compositionWidth={project.settings.aspectRatio === '9:16' ? 1080 : 1920}
                                    compositionHeight={project.settings.aspectRatio === '9:16' ? 1920 : 1080}
                                    fps={30}
                                    durationInFrames={Math.ceil(scenes.filter(s => s.status === 'ready').reduce((sum, s) => sum + (s.duration || 5), 0) * 30) || 150}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                    }}
                                    controls
                                />
                            </div>
                        ) : (
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-stone-900 rounded-full flex items-center justify-center mx-auto border border-white/5 shadow-2xl animate-pulse">
                                    <Sparkles size={32} className="text-orange-500/50" />
                                </div>
                                <div>
                                    <h3 className="text-white text-lg font-medium">Ready to Visualize?</h3>
                                    <p className="text-stone-500 text-sm max-w-xs mx-auto mt-2">
                                        Your script is ready. Begin the incantation to generate scenes.
                                    </p>
                                </div>
                                <button
                                    onClick={handleGenerate}
                                    disabled={generating}
                                    className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-stone-200 transition-all flex items-center gap-2 mx-auto"
                                >
                                    {generating ? <Loader2 className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                                    {generating ? 'Weaving...' : 'Generate Scenes'}
                                </button>
                            </div>
                        )}

                        {/* Editor Action */}
                        {project.status === 'done' && (
                            <div className="absolute top-8 right-8 animate-in fade-in zoom-in duration-500">
                                <button className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-lg shadow-lg hover:shadow-orange-500/20 transition-all flex items-center gap-2">
                                    <Wand2 size={16} /> Enter Editor
                                </button>
                            </div>
                        )}
                    </div>
                    {/* Bottom Metadata/Controls if needed */}
                </div>
            </div>
        </div>
    );
}
