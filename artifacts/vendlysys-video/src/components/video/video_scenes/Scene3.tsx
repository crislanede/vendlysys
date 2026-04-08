import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions, easings } from '@/lib/video';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1400),
      setTimeout(() => setPhase(5), 2000),
      setTimeout(() => setPhase(6), 2500),
      setTimeout(() => setPhase(7), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--color-bg-dark)] px-20 py-20"
      {...sceneTransitions.wipe}
    >
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute w-[80vw] h-[80vw] rounded-full opacity-20 blur-[100px] left-[-20%] top-[-20%]"
          style={{ background: 'radial-gradient(circle, var(--color-teal), transparent)' }}
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[60vw] h-[60vw] rounded-full opacity-10 blur-[80px] right-[-10%] bottom-[-10%]"
          style={{ background: 'radial-gradient(circle, var(--color-secondary), transparent)' }}
          animate={{ scale: [1, 1.3, 1], y: [0, -50, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
      </div>

      <div className="relative z-10 w-full flex items-center justify-between mb-16">
        <div className="w-[45%]">
          <motion.div
            className="flex items-center gap-4 mb-6"
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ duration: 0.6, ease: easings.easeOut.ease }}
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--color-teal)]/20 flex items-center justify-center text-[var(--color-teal)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <span className="text-[var(--color-teal)] font-bold text-xl uppercase tracking-wider">Gestão Financeira</span>
          </motion.div>
          
          <motion.h2 
            className="text-[4vw] font-bold text-white font-display leading-tight"
            initial={{ opacity: 0, y: 40 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
            transition={{ duration: 0.8, ease: easings.easeOut.ease }}
          >
            Controle total do<br/>seu faturamento.
          </motion.h2>
        </div>

        <motion.div 
          className="w-[45%] h-full flex flex-col justify-end"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-3xl p-10">
            <div className="text-white/60 text-lg mb-2">Faturamento Mensal</div>
            <div className="flex items-baseline gap-4 mb-8">
              <div className="text-5xl font-bold text-white font-mono">R$ 48.590</div>
              <div className="text-[var(--color-success)] text-xl font-bold flex items-center gap-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                12.5%
              </div>
            </div>

            <div className="h-48 flex items-end gap-3 w-full">
              {[40, 55, 30, 45, 70, 60, 90, 85].map((height, i) => (
                <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group">
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--color-teal)] to-[var(--color-secondary)] rounded-t-lg"
                    initial={{ height: 0 }}
                    animate={phase >= 4 + (i*0.2) ? { height: `${height}%` } : { height: 0 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      
      <div className="relative z-10 w-full flex gap-8">
        {[
          { label: 'Lucro Líquido', value: 'R$ 15.240', icon: 'M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
          { label: 'Ticket Médio', value: 'R$ 125', icon: 'M2 10h20 M14 22v-4a2 2 0 0 0-2-2H8 M22 10l-4-4-4 4' },
          { label: 'Serviços Realizados', value: '388', icon: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-white/5 backdrop-blur-md border border-white/5 rounded-2xl p-6 flex items-center gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6, delay: i * 0.1, ease: easings.easeOut.ease }}
          >
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {stat.icon.split(' ').map((d, j) => <path key={j} d={d}/>)}
              </svg>
            </div>
            <div>
              <div className="text-white/60 text-sm mb-1">{stat.label}</div>
              <div className="text-white font-bold text-2xl">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
