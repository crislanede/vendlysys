import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { elementAnimations, sceneTransitions, easings } from '@/lib/video';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1400),
      setTimeout(() => setPhase(5), 1800),
      setTimeout(() => setPhase(6), 2200),
      setTimeout(() => setPhase(7), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const appointments = [
    { time: '09:00', client: 'Ana Silva', service: 'Corte Feminino', duration: '60 min', top: '10%' },
    { time: '10:30', client: 'Carlos Costa', service: 'Barba e Cabelo', duration: '45 min', top: '35%' },
    { time: '14:00', client: 'Julia Mendes', service: 'Coloração', duration: '120 min', top: '60%' },
  ];

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between bg-[var(--color-bg-light)] px-24"
      {...sceneTransitions.slideLeft}
    >
      <div className="absolute inset-0">
        <motion.div 
          className="absolute right-0 top-0 bottom-0 w-[40%] bg-[var(--color-primary)]"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 1, ease: easings.easeOut.ease }}
        />
        <motion.div 
          className="absolute -right-[20%] -top-[20%] w-[60%] aspect-square rounded-full border-[100px] border-[var(--color-secondary)]/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative z-10 w-[50%]">
        <motion.h2 
          className="text-[4vw] font-bold text-[var(--color-primary)] font-display leading-tight"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          Agendamentos
          <br/>
          <span className="text-[var(--color-accent)]">simplificados.</span>
        </motion.h2>
        
        <motion.p
          className="text-[1.5vw] text-[var(--color-text-secondary)] mt-6 max-w-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          Uma agenda inteligente que trabalha por você. Reduza faltas com lembretes automáticos via WhatsApp.
        </motion.p>
      </div>

      <div className="relative z-10 w-[45%] h-[70vh] rounded-3xl bg-white shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
        <motion.div 
          className="h-20 bg-[var(--color-bg-light)] border-b border-gray-100 flex items-center px-8 justify-between"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        >
          <div className="text-xl font-bold text-[var(--color-primary)]">Hoje, 15 de Outubro</div>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
        </motion.div>
        
        <div className="flex-1 relative p-8">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gray-100" />
          
          {appointments.map((apt, i) => (
            <motion.div
              key={i}
              className="absolute left-8 right-8 bg-[var(--color-bg-light)] rounded-2xl p-4 border border-[var(--color-secondary)]/10 flex items-center justify-between"
              style={{ top: apt.top }}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={phase >= 4 + i ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div className="flex items-center gap-6">
                <div className="font-mono text-lg font-medium text-[var(--color-secondary)] w-16 text-right">
                  {apt.time}
                </div>
                <div className="w-1 h-12 bg-[var(--color-accent)] rounded-full" />
                <div>
                  <div className="text-xl font-bold text-[var(--color-text-primary)]">{apt.client}</div>
                  <div className="text-[var(--color-text-secondary)]">{apt.service}</div>
                </div>
              </div>
              <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-medium text-[var(--color-text-muted)] border border-gray-100">
                {apt.duration}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
