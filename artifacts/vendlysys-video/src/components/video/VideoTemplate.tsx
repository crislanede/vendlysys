// Video Template - Replace ReplitLoadingScene with your scenes

import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  hook: 3000,
  agendamentos: 5000,
  financeiro: 5000,
  clientes: 5000,
  fechamento: 5000
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({
    durations: SCENE_DURATIONS,
  });

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ backgroundColor: 'var(--color-bg-light)' }}
    >
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="hook" />}
        {currentScene === 1 && <Scene2 key="agendamentos" />}
        {currentScene === 2 && <Scene3 key="financeiro" />}
        {currentScene === 3 && <Scene4 key="clientes" />}
        {currentScene === 4 && <Scene5 key="fechamento" />}
      </AnimatePresence>
    </div>
  );
}
