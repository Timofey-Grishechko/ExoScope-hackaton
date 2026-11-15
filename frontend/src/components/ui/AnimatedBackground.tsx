import { useSettings } from '../../hooks/useSettings';

export default function AnimatedBackground({ enabled = true }: { enabled?: boolean }) {
  const { theme } = useSettings();

  if (!enabled) return null;


  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Пятно 1 (Синее/Голубое) */}
      <div 
        className={`absolute w-[60vw] h-[60vw] rounded-full blur-[100px] animate-blob ${
          isLight ? 'bg-blue-200/40' : 'bg-blue-600/10'
        }`}
        style={{
          top: '-10%',
          left: '-10%',
          animationDelay: '0s',
        }}
      />
      
      {/* Пятно 2 (Изумрудное/Зеленое) */}
      <div 
        className={`absolute w-[50vw] h-[50vw] rounded-full blur-[100px] animate-blob ${
          isLight ? 'bg-emerald-200/30' : 'bg-emerald-600/10'
        }`}
        style={{
          bottom: '-10%',
          right: '-5%',
          animationDelay: '2s',
        }}
      />

      {/* Пятно 3 (Фиолетовое/Индиго) */}
      <div 
        className={`absolute w-[40vw] h-[40vw] rounded-full blur-[100px] animate-blob ${
          isLight ? 'bg-indigo-200/30' : 'bg-indigo-600/10'
        }`}
        style={{
          top: '40%',
          left: '30%',
          animationDelay: '4s',
        }}
      />
    </div>
  );
}