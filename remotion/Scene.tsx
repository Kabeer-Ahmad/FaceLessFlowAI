import { AbsoluteFill, Img, OffthreadVideo, useCurrentFrame, useVideoConfig, interpolate, Easing, Audio, staticFile } from 'remotion';
import { SceneApi, ProjectSettings } from '../types';
import { AudioWave } from './AudioWave';
import { Heading } from './Heading';

type Props = {
    scene: SceneApi;
    settings: ProjectSettings;
};

export const Scene: React.FC<Props> = ({ scene, settings }) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // Find the matched heading text (if any)
    const matchedHeading = settings.headingsEnabled && settings.headings?.find(heading => {
        const sceneText = scene.text.toLowerCase().trim();
        const headingText = heading.toLowerCase().trim();

        // Match if either contains the other, or if they're the same
        return sceneText.includes(headingText) ||
            headingText.includes(sceneText) ||
            sceneText === headingText;
    });

    let d = scene.duration || 5;
    if (d > 300) { d = d / 1000; }

    const durationFrames = Math.ceil(d * fps);

    // Transition duration (in frames) - 0.5 seconds for better visibility
    const transitionDuration = fps * 0.5;

    // Calculate transition opacity/effects
    const getTransitionStyle = () => {
        if (frame >= transitionDuration) return {};

        let transitionType = settings.transitions.type;

        // "Multi" logic: Randomly select a transition based on scene index
        if (transitionType === 'multi') {
            const types = ['fadein', 'crossfade', 'white_flash', 'camera_flash', 'slide_up', 'slide_down', 'slide_left', 'slide_right'];
            // Use order_index to deterministically pick a transition so it doesn't jitter on re-renders
            const index = (scene.order_index || 0) % types.length;
            transitionType = types[index] as any;
        }

        const progress = frame / transitionDuration;

        switch (transitionType) {
            case 'fadein':
                return { opacity: interpolate(frame, [0, transitionDuration], [0, 1]) };

            case 'crossfade':
                return { opacity: interpolate(frame, [0, transitionDuration], [0, 1]) };

            case 'white_flash':
                const whiteFlash = interpolate(frame, [0, transitionDuration * 0.5, transitionDuration], [1, 0, 0], { extrapolateRight: 'clamp' });
                return {
                    opacity: 1,
                    filter: `brightness(${1 + whiteFlash * 3})`
                };

            case 'camera_flash':
                const cameraBright = interpolate(frame, [0, transitionDuration * 0.3, transitionDuration], [2, 1, 1], { extrapolateRight: 'clamp' });
                return {
                    filter: `brightness(${cameraBright}) contrast(${interpolate(frame, [0, transitionDuration], [1.5, 1])})`
                };

            // Slide Transitions
            case 'slide_left': // Moves in from right to left
                const slideLeft = interpolate(frame, [0, transitionDuration], [100, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.ease) });
                return { transform: `translateX(${slideLeft}%)` };

            case 'slide_right': // Moves in from left to right
                const slideRight = interpolate(frame, [0, transitionDuration], [-100, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.ease) });
                return { transform: `translateX(${slideRight}%)` };

            case 'slide_up': // Moves in from bottom to top
                const slideUp = interpolate(frame, [0, transitionDuration], [100, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.ease) });
                return { transform: `translateY(${slideUp}%)` };

            case 'slide_down': // Moves in from top to bottom
                const slideDown = interpolate(frame, [0, transitionDuration], [-100, 0], { extrapolateRight: 'clamp', easing: Easing.out(Easing.ease) });
                return { transform: `translateY(${slideDown}%)` };

            case 'none':
            default:
                return {};
        }
    };

    // Camera Movement Logic
    const movements = settings.cameraMovements || ['zoom_in'];
    const movementType = movements[scene.order_index % movements.length];

    let scale = 1;
    let translateX = 0;
    let translateY = 0;

    switch (movementType) {
        case 'zoom_in':
            scale = interpolate(frame, [0, durationFrames], [1, 1.15], { easing: Easing.bezier(0.25, 1, 0.5, 1) });
            break;
        case 'zoom_out':
            scale = interpolate(frame, [0, durationFrames], [1.15, 1], { easing: Easing.bezier(0.25, 1, 0.5, 1) });
            break;
        case 'pan_left':
            scale = 1.15;
            translateX = interpolate(frame, [0, durationFrames], [0, -40]);
            break;
        case 'pan_right':
            scale = 1.15;
            translateX = interpolate(frame, [0, durationFrames], [-40, 0]);
            break;
        case 'pan_up':
            scale = 1.15;
            translateY = interpolate(frame, [0, durationFrames], [0, -40]);
            break;
        case 'pan_down':
            scale = 1.15;
            translateY = interpolate(frame, [0, durationFrames], [-40, 0]);
            break;
        case 'static':
        default:
            scale = 1;
            break;
    }

    const isGraphicSplit = settings.templateMode === 'graphic_split';

    if (isGraphicSplit) {
        const titleStyle = {
            fontFamily: '"Anton", sans-serif',
            fontSize: settings.topTitle?.fontSize === '3xl' ? '7rem' :
                      settings.topTitle?.fontSize === '2xl' ? '6rem' :
                      settings.topTitle?.fontSize === 'xlarge' ? '5rem' :
                      settings.topTitle?.fontSize === 'large' ? '4rem' :
                      settings.topTitle?.fontSize === 'medium' ? '3rem' : '2rem',
            color: settings.topTitle?.color || '#ffffff',
            fontWeight: settings.topTitle?.isBold ? 'bold' : 'normal',
            textAlign: 'center' as const,
            marginTop: '1%', // Minimal space from top
            textTransform: 'uppercase' as const,
            width: '100%',
            position: 'absolute' as const,
            WebkitTextStroke: '3px black', // Force stroke permanently for graphic split
            top: 0,
            zIndex: 10
        };

        return (
            <AbsoluteFill style={{ overflow: 'hidden', ...getTransitionStyle() }}>
                {/* Background */}
                <Img src={staticFile('tmp2_back.png')} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }} />
                
                {/* Top Title */}
                {settings.topTitle && (
                    <div style={titleStyle}>{settings.topTitle.text}</div>
                )}

                {/* Left Graphics */}
                <AbsoluteFill style={{ width: '50%', right: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '10%' }}>
                    {scene.image_url && (
                        <div style={{
                            width: '85%',
                            aspectRatio: '16/9',
                            border: '8px solid black',
                            borderRadius: '32px',
                            overflow: 'hidden',
                            flexShrink: 0,
                        }}>
                            <Img
                                src={scene.image_url}
                                style={{ width: '100%', height: '100%', objectFit: 'cover',
                                    transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`
                                }}
                            />
                        </div>
                    )}
                </AbsoluteFill>

                {/* Right Captions Container - centered in the remaining space below heading */}
                <AbsoluteFill style={{ left: '50%', width: '50%', top: '15%', height: '85%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Audio */}
                    {scene.audio_url && (
                        <Audio src={scene.audio_url} volume={1} startFrom={0} />
                    )}

                    {/* Captions */}
                    {(() => {
                        // For Graphic Split, force classic normal captions with slide_up animation, centered, bold, medium
                        const finalSettings = {
                            ...settings,
                            captions: {
                                ...settings.captions,
                                enabled: true,
                                style: 'classic' as any,
                                animation: 'slide-up' as any,
                                position: 'center' as any,
                                strokeWidth: 'bold' as any, // Bold font weight via strokeWidth hack
                                fontSize: 'medium' as any,
                            }
                        };
                        
                        const { ClassicCaptions } = require('./captions/ClassicCaptions');
                        return <ClassicCaptions text={scene.text} durationInSeconds={d} settings={finalSettings} />;
                    })()}
                </AbsoluteFill>
            </AbsoluteFill>
        );
    }

    const isPastelCard = settings.templateMode === 'pastel_card';

    if (isPastelCard) {
        // Typewriter progress calculation
        const totalChars = scene.text.length;
        const durationFrames2 = Math.ceil(d * fps);
        const typewriterDuration = durationFrames2 * 0.8;
        const visibleChars = Math.floor(
            interpolate(frame, [0, typewriterDuration], [0, totalChars], { extrapolateRight: 'clamp' })
        );
        const visibleText = scene.text.slice(0, visibleChars);

        // Font family mapping for pastel card captions
        const pastelFontFamily = (() => {
            switch (settings.captions.font) {
                case 'lilita':       return '"Lilita One", cursive';
                case 'montserrat':   return '"Montserrat", sans-serif';
                case 'league':       return '"League Spartan", sans-serif';
                case 'poppins':      return '"Poppins", sans-serif';
                case 'helvetica':    return 'Helvetica, Arial, sans-serif';
                case 'sans':         return 'system-ui, sans-serif';
                default:             return '"Anton", sans-serif'; // 'brush' slot re-used for Anton
            }
        })();

        const hasDualImages = !!(scene.image_url && scene.image_url_2);
        const cardBorderStyle = { border: '6px solid #1a1a1a', borderRadius: '32px', overflow: 'hidden' as const, boxShadow: '0 12px 36px rgba(0,0,0,0.18)' };

        return (
            <AbsoluteFill style={{ overflow: 'hidden', ...getTransitionStyle() }}>
                {/* Background: template_3 pastel gradient */}
                <Img
                    src={staticFile('template_3.png')}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }}
                />

                {/* Audio */}
                {scene.audio_url && (
                    <Audio src={scene.audio_url} volume={1} startFrom={0} />
                )}

                {/* Image area — top 3% to 62% */}
                {hasDualImages ? (
                    /* Dual side-by-side image cards */
                    <div style={{ position: 'absolute', top: '3%', left: '3%', right: '3%', height: '59%', display: 'flex', gap: '2.5%' }}>
                        <div style={{ flex: 1, ...cardBorderStyle }}>
                            <Img src={scene.image_url!} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)` }} />
                        </div>
                        <div style={{ flex: 1, ...cardBorderStyle }}>
                            <Img src={scene.image_url_2!} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)` }} />
                        </div>
                    </div>
                ) : scene.image_url ? (
                    /* Single image card */
                    <div style={{ position: 'absolute', top: '3%', left: '4%', right: '4%', height: '59%', ...cardBorderStyle }}>
                        <Img
                            src={scene.image_url}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)` }}
                        />
                    </div>
                ) : null}

                {/* Captions — bottom area, typewriter, frosted white pill, selected font */}
                <div style={{ position: 'absolute', bottom: '4%', left: '4%', right: '4%', top: '66%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2%' }}>
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(12px)', borderRadius: '28px', padding: '3% 5%', width: '100%', maxHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                        <span style={{
                            fontFamily: pastelFontFamily,
                            fontWeight: settings.captions.font === 'montserrat' ? 700 : undefined,
                            fontSize: (() => {
                                // Steps: each step is ~4px at 1080p (≈3pt)
                                const base = height * 0.042; // ~45px at 1080p
                                switch (settings.captions.fontSize) {
                                    case 'small':  return `${Math.round(base - 4)}px`;  // ~41px
                                    case 'medium': return `${Math.round(base)}px`;       // ~45px (default)
                                    case 'large':  return `${Math.round(base + 4)}px`;   // ~49px
                                    case 'xlarge': return `${Math.round(base + 8)}px`;   // ~53px
                                    case '2xl':    return `${Math.round(base + 12)}px`;  // ~57px
                                    case '3xl':    return `${Math.round(base + 16)}px`;  // ~61px
                                    default:       return `${Math.round(base)}px`;
                                }
                            })(),
                            color: '#111111',
                            textAlign: 'center',
                            lineHeight: 1.35,
                            display: 'block',
                            letterSpacing: '0.02em',
                        }}>
                            {visibleText}
                        </span>
                    </div>
                </div>
            </AbsoluteFill>
        );
    }

    return (
        <AbsoluteFill style={{ overflow: 'hidden', ...getTransitionStyle() }}>
            {/* Background Image with Ken Burns */}
            {scene.image_url ? (
                <>
                    {/* First Image */}
                    <AbsoluteFill style={{
                        transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
                        opacity: scene.image_url_2 ? interpolate(
                            frame,
                            [0, durationFrames * 0.45, durationFrames * 0.55],
                            [1, 1, 0],
                            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                        ) : 1
                    }}>
                        {(scene.media_type === 'video' || scene.image_url.includes('.mp4')) ? (
                            <OffthreadVideo
                                src={scene.image_url}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                muted={true}
                            />
                        ) : (
                            <Img
                                src={scene.image_url}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        )}
                    </AbsoluteFill>

                    {/* Second Image (if exists) - for Long Sentence Break */}
                    {scene.image_url_2 && (
                        <AbsoluteFill style={{
                            transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
                            opacity: interpolate(
                                frame,
                                [0, durationFrames * 0.45, durationFrames * 0.55],
                                [0, 0, 1],
                                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                            )
                        }}>
                            <Img
                                src={scene.image_url_2}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        </AbsoluteFill>
                    )}
                </>
            ) : (
                <AbsoluteFill className="bg-gray-900 flex items-center justify-center">
                    <span className="text-white">Generating Image...</span>
                </AbsoluteFill>
            )}

            {/* Audio */}
            {scene.audio_url && (
                <Audio
                    src={scene.audio_url}
                    volume={1}
                    startFrom={0}
                />
            )}

            {/* Audio Wave Visualization */}
            {settings.audioWave?.enabled && scene.audio_url && (
                <AudioWave
                    audioUrl={scene.audio_url}
                    style={settings.audioWave.style}
                    position={settings.audioWave.position}
                    color={settings.audioWave.color}
                />
            )}

            {/* Conditional: Show Heading or Captions */}
            {matchedHeading ? (
                <Heading text={matchedHeading} />
            ) : (
                settings.captions.enabled && (() => {
                    const captionStyle = settings.captions.style || 'classic';

                    // Import statements are at the top, so we check style here
                    if (captionStyle === 'word_pop') {
                        const { WordByWordPop } = require('./captions/WordByWordPop');
                        return <WordByWordPop text={scene.text} durationInSeconds={d} />;
                    } else if (captionStyle === 'karaoke') {
                        const { KaraokeHighlight } = require('./captions/KaraokeHighlight');
                        return <KaraokeHighlight text={scene.text} durationInSeconds={d} color={settings.captions.color} />;
                    } else if (captionStyle === 'mrbeast') {
                        const { MrBeastStyle } = require('./captions/MrBeastStyle');
                        return <MrBeastStyle text={scene.text} durationInSeconds={d} />;
                    } else if (captionStyle === 'dark_psychology') {
                        const { DarkPsyStyle } = require('./captions/DarkPsyStyle');
                        return <DarkPsyStyle text={scene.text} durationInSeconds={d} />;
                    } else {
                        // Classic caption rendering with 2-line limit
                        const { ClassicCaptions } = require('./captions/ClassicCaptions');
                        return <ClassicCaptions text={scene.text} durationInSeconds={d} settings={settings} />;
                    }
                })()
            )}
        </AbsoluteFill>
    );
};
