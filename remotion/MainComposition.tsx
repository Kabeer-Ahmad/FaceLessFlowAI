import { AbsoluteFill, Sequence, Series } from 'remotion';
import { z } from 'zod';
import { Scene } from './Scene';
import { ProjectSettings, SceneApi } from '../types';

export const MainCompositionSchema = z.object({
    scenes: z.array(z.any()), // refined type below
    settings: z.any()
});

type Props = {
    scenes: SceneApi[];
    settings: ProjectSettings;
}

export const MainComposition: React.FC<Props> = ({ scenes, settings }) => {
    if (!scenes || scenes.length === 0) {
        return (
            <AbsoluteFill className="bg-black flex items-center justify-center">
                <h1 className="text-white text-4xl">Waiting for scenes...</h1>
            </AbsoluteFill>
        )
    }

    return (
        <AbsoluteFill className="bg-black">
            <Series>
                {scenes.map((scene) => {
                    const durationInSeconds = scene.duration || 5;
                    const durationInFrames = Math.ceil(durationInSeconds * 30);

                    return (
                        <Series.Sequence key={scene.id} durationInFrames={durationInFrames}>
                            <Scene scene={scene} settings={settings} />
                        </Series.Sequence>
                    )
                })}
            </Series>
        </AbsoluteFill>
    );
};
