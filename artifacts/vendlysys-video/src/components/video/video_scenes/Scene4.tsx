import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions, easings } from '@/lib/video';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1800),
      setTimeout(() => setPhase(5), 4000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-center bg-[var(--color-primary)] overflow-hidden"
      {...sceneTransitions.clipPolygon}
    >
      <div className="absolute inset-0">
        <motion.div 
          className="absolute w-[150vw] h-[150vw] rounded-full border border-white/5 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, ease: easings.easeOut.ease }}
        />
        <motion.div 
          className="absolute w-[100vw] h-[100vw] rounded-full border border-white/10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, delay: 0.2, ease: easings.easeOut.ease }}
        />
        <motion.div 
          className="absolute w-[50vw] h-[50vw] rounded-full border border-white/15 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--color-secondary)]/20 mix-blend-screen"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2, delay: 0.4, ease: easings.easeOut.ease }}
        />
        <img
          src={`${import.meta.env.BASE_URL}images/barbershop_1.jpg`}
          alt="Barbershop"
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
      </div>

      <div className="relative z-10 w-full px-20 flex justify-between items-center h-full">
        <div className="w-[45%] h-full flex flex-col justify-center">
          <motion.div
            className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl relative"
            initial={{ opacity: 0, x: -50, rotateY: -20, transformPerspective: 1000 }}
            animate={phase >= 2 ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: -50, rotateY: -20 }}
            transition={{ duration: 1, type: 'spring', bounce: 0.2 }}
          >
            <div className="absolute -top-6 -right-6 w-12 h-12 bg-[var(--color-accent)] rounded-full border-4 border-white flex items-center justify-center text-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            
            <div className="flex gap-6 items-center mb-8">
              <div className="w-20 h-20 bg-gray-100 rounded-full overflow-hidden border-2 border-white shadow-md">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--color-primary)] mb-1">Roberto Almeida</div>
                <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full inline-block">Cliente VIP</div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-[var(--color-bg-light)] rounded-2xl">
                <div className="flex items-center gap-3 text-gray-600 font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
                  Última visita
                </div>
                <div className="font-bold text-[var(--color-primary)]">Há 15 dias</div>
              </div>
              <div className="flex justify-between items-center p-4 bg-[var(--color-bg-light)] rounded-2xl">
                <div className="flex items-center gap-3 text-gray-600 font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6"/></svg>
                  Total gasto
                </div>
                <div className="font-bold text-[var(--color-primary)]">R$ 1.450</div>
              </div>
              <div className="flex justify-between items-center p-4 bg-[var(--color-bg-light)] rounded-2xl">
                <div className="flex items-center gap-3 text-gray-600 font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                  Ticket Médio
                </div>
                <div className="font-bold text-[var(--color-primary)]">R$ 145</div>
              </div>
            </div>
            
            <motion.div 
              className="mt-8 p-4 bg-gradient-to-r from-[var(--color-accent)] to-[#FFA96A] rounded-2xl text-white font-bold flex justify-between items-center shadow-lg shadow-[var(--color-accent)]/30"
              initial={{ opacity: 0, y: 20 }}
              animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6 }}
            >
              <span>Agendar Retorno via WhatsApp</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </motion.div>
          </motion.div>
        </div>

        <div className="w-[50%]">
          <motion.h2 
            className="text-[5vw] font-bold text-white font-display leading-tight"
            initial={{ opacity: 0, x: 50 }}
            animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ duration: 0.8, ease: easings.easeOut.ease }}
          >
            Conheça seus
            <br/>
            <span className="text-[var(--color-teal)]">clientes.</span>
          </motion.h2>
          
          <motion.p
            className="text-[1.8vw] text-white/80 mt-6 max-w-xl"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.8, ease: easings.easeOut.ease }}
          >
            Histórico completo, preferências e campanhas de fidelização direcionadas.
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
}
