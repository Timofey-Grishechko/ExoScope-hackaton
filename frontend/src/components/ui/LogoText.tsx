export default function LogoText() {
  return (
    <h1 className="text-xl font-bold text-white tracking-tight flex items-center">
      Ex
      <span className="relative inline-flex items-center justify-center w-5 h-5 mx-1">
        <span
          className="planet-ring absolute w-6 h-2 border-2 border-white/90 rounded-[50%] z-0"
          style={{ transform: 'rotate(-25deg)' }}
        ></span>
        <span className="planet-dot absolute w-3.5 h-3.5 bg-white rounded-full z-10 shadow-[0_0_8px_rgba(255,255,255,0.8)]"></span>
      </span>
      Scope
    </h1>
  );
}