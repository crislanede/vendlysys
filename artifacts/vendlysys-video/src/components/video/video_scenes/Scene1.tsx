import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions, easings } from '@/lib/video';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 1100),
      setTimeout(() => setPhase(4), 1700),
      setTimeout(() => setPhase(5), 2300),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-between bg-[var(--color-primary)] overflow-hidden"
      {...sceneTransitions.zoomThrough}
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          src={`${import.meta.env.BASE_URL}videos/bg-waves.mp4`}
          autoPlay loop muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary)]/80 to-[var(--color-primary)]/30" />
      </div>

      {/* Left: text */}
      <div className="relative z-10 w-[48%] pl-20 flex flex-col">
        <motion.div
          className="flex items-center gap-4 mb-10"
          initial={{ opacity: 0, x: -40 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 0.7, ease: easings.easeOut.ease }}
        >
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center shadow-xl shadow-[var(--color-accent)]/40">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z"/>
              <path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9"/>
              <path d="M12 3v6"/>
            </svg>
          </div>
          <span className="text-white font-black text-3xl tracking-tight">VendlySys</span>
        </motion.div>

        <motion.h1
          className="text-[5.5vw] font-black text-white leading-[1.05] font-display tracking-tight"
          initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
          animate={phase >= 2 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 40, filter: 'blur(8px)' }}
          transition={{ duration: 0.8, ease: easings.easeOut.ease }}
        >
          Seu salão,<br />
          <span className="text-[var(--color-accent)]">organizado.</span>
        </motion.h1>

        <motion.p
          className="text-white/70 text-[1.6vw] mt-6 max-w-lg leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.7, ease: easings.easeOut.ease }}
        >
          Sistema completo para salões, barbearias e clínicas. Agenda, clientes, financeiro e app mobile em um só lugar.
        </motion.p>

        <motion.div
          className="flex gap-4 mt-10"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6 }}
        >
          {['📅 Agenda inteligente', '💰 Controle financeiro', '📱 App mobile'].map((item, i) => (
            <motion.div
              key={i}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-white text-sm font-medium"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
              transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
            >
              {item}
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-10 h-1 rounded-full bg-[var(--color-teal)]"
          initial={{ width: 0 }}
          animate={phase >= 5 ? { width: '16vw' } : { width: 0 }}
          transition={{ duration: 0.9, ease: easings.easeInOut.ease }}
        />
      </div>

      {/* Right: real login screenshot in browser frame */}
      <motion.div
        className="relative z-10 w-[46%] pr-14"
        initial={{ opacity: 0, x: 80, rotateY: -15, transformPerspective: 1200 }}
        animate={phase >= 2 ? { opacity: 1, x: 0, rotateY: 0 } : { opacity: 0, x: 80, rotateY: -15 }}
        transition={{ duration: 1.1, type: 'spring', bounce: 0.2 }}
      >
        {/* Browser chrome */}
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10">
          {/* Browser top bar */}
          <div className="bg-[#1e1e2e] px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 bg-[#2a2a3e] rounded-md px-3 py-1.5 flex items-center gap-2">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span className="text-[#6b7280] text-xs font-mono">sistema-finalizador.replit.app</span>
            </div>
          </div>
          {/* Real screenshot */}
          <img
            src={`${import.meta.env.BASE_URL}screen-login.jpg`}
            alt="VendlySys - Tela de Login"
            className="w-full block"
            style={{ maxHeight: '72vh', objectFit: 'cover', objectPosition: 'top' }}
          />
        </div>

        {/* Floating badge */}
        <motion.div
          className="absolute -bottom-4 -left-6 bg-white rounded-2xl px-5 py-3 shadow-xl flex items-center gap-3"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={phase >= 4 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="w-9 h-9 rounded-xl bg-[var(--color-teal)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium">Sistema online</div>
            <div className="text-sm font-bold text-[var(--color-primary)]">Acesso seguro 🔒</div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
