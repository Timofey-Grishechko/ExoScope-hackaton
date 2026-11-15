import { memo } from 'react';
import { useSettings } from '../../hooks/useSettings';

const blob = (rgb: string, alpha: number) =>
  `radial-gradient(closest-side, rgba(${rgb}, ${alpha}) 0%, rgba(${rgb}, ${alpha * 0.45}) 45%, rgba(${rgb}, 0) 100%)`;

const DARK = [blob('37, 99, 235', 0.16), blob('5, 150, 105', 0.16), blob('79, 70, 229', 0.16)];
const LIGHT = [blob('191, 219, 254', 0.6), blob('167, 243, 208', 0.45), blob('199, 210, 254', 0.45)];

function AnimatedBackground({ enabled = true }: { enabled?: boolean }) {
  const { theme } = useSettings();

  if (!enabled) return null;

  const colors = theme === 'light' ? LIGHT : DARK;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <div
        className="absolute w-[80vw] h-[80vw] animate-blob"
        style={{ top: '-20%', left: '-20%', backgroundImage: colors[0], animationDelay: '0s' }}
      />
      <div
        className="absolute w-[70vw] h-[70vw] animate-blob"
        style={{ bottom: '-20%', right: '-15%', backgroundImage: colors[1], animationDelay: '2s' }}
      />
      <div
        className="absolute w-[55vw] h-[55vw] animate-blob"
        style={{ top: '30%', left: '25%', backgroundImage: colors[2], animationDelay: '4s' }}
      />
    </div>
  );
}

export default memo(AnimatedBackground);
