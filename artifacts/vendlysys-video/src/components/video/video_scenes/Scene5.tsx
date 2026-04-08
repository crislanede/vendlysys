import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions, easings } from '@/lib/video';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-light)]"
      {...sceneTransitions.morphExpand}
    >
      <div className="absolute inset-0 overflow-hidden">
        <motion.div 
          className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/barbershop_2.jpg)`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          animate={{ scale: [1.1, 1], filter: ['blur(10px)', 'blur(0px)'] }}
          transition={{ duration: 4, ease: easings.easeOut.ease }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-light)] via-[var(--color-bg-light)]/80 to-[var(--color-bg-light)]/20" />
      </div>

      <motion.div 
        className="relative z-10 flex flex-col items-center"
      >
        <motion.div
          className="flex items-center gap-6 mb-8"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 50 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <div className="w-24 h-24 bg-[var(--color-primary)] rounded-3xl flex items-center justify-center shadow-2xl shadow-[var(--color-primary)]/30">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
              <path d="M12 3v6"/>
            </svg>
          </div>
          <span className="text-[5vw] font-black text-[var(--color-primary)] tracking-tight font-display">
            VendlySys
          </span>
        </motion.div>

        <motion.div
          className="text-center overflow-hidden h-[4vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.h2 
            className="text-[2.5vw] font-medium text-[var(--color-text-secondary)]"
            initial={{ y: "100%" }}
            animate={phase >= 2 ? { y: 0 } : { y: "100%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Sistema PDV Moderno e Eficiente
          </motion.h2>
        </motion.div>

        <motion.div 
          className="mt-16 bg-[var(--color-accent)] text-white px-12 py-5 rounded-full text-2xl font-bold flex items-center gap-4 shadow-xl shadow-[var(--color-accent)]/30"
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          Teste Grátis Agora
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </motion.div>

      </motion.div>
    </motion.div>
  );
}
