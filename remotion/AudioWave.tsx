import React from 'react';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { useCurrentFrame, useVideoConfig } from 'remotion';

type Props = {
    audioUrl: string;
    style?: string; // Kept for prop compatibility
    position: 'bottom' | 'center' | 'top' | 'mid-bottom';
    color: string;
};

export const AudioWave: React.FC<Props> = ({ audioUrl, position, color }) => {
    const frame = useCurrentFrame();
    const { fps, height } = useVideoConfig();
    const audioData = useAudioData(audioUrl);

    if (!audioData) {
        return null;
    }

    // High resolution sampling
    const visualizationValues = visualizeAudio({
        fps,
        frame,
        audioData,
        numberOfSamples: 512,
        smoothing: true,
    });

    // 1. Spatial Smoothing (Moving Average)
    const smoothPoly = (data: number[]) => {
        return data.map((val, i, arr) => {
            const prev = arr[i - 1] ?? val;
            const next = arr[i + 1] ?? val;
            const prev2 = arr[i - 2] ?? prev;
            const next2 = arr[i + 2] ?? next;
            return (prev2 + prev + val + next + next2) / 5;
        });
    };

    const smoothedData = smoothPoly(visualizationValues);

    // 2. Logarithmic Scale with Noise Gate
    const getVisualValue = (val: number) => {
        if (val < 0.015) return 0;
        return Math.min(1, Math.log10(1 + val * 80) / 2.2);
    };

    const frequencyData = smoothedData;

    // Position Logic
    const bottomOffset = position === 'bottom' ? 80 :
        position === 'mid-bottom' ? height * 0.25 :
            position === 'center' ? height * 0.5 :
                height - 100; // top

    const containerStyle: React.CSSProperties = {
        position: 'absolute',
        bottom: position === 'top' ? undefined : bottomOffset,
        top: position === 'top' ? 100 : undefined,
        left: '5%',
        width: '90%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    };

    // WAVE STYLE ONLY
    // Mirrored wave with high detail
    const relevantFreqs = frequencyData.slice(0, 100);

    return (
        <div style={containerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', width: '100%', justifyContent: 'center' }}>
                {relevantFreqs.map((v: number, i: number) => {
                    const amplified = getVisualValue(v);
                    const h = Math.max(3, 50 + (amplified * 200));

                    return (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                maxWidth: '6px',
                                height: `${h}px`,
                                backgroundColor: color,
                                borderRadius: '3px',
                                opacity: 0.85,
                                transform: `scaleY(${i % 2 === 0 ? 1 : -0.7})`,
                                transition: 'height 0.1s ease-out',
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};
