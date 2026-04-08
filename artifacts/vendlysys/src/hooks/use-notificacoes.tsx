import { useState, useEffect, useRef, useCallback } from "react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

function getStorageKey() {
  return `vendlysys_notif_seen_${hojeISO()}`;
}

function getSeenIds(): Set<number> {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch { return new Set(); }
}

function saveSeenIds(ids: Set<number>) {
  localStorage.setItem(getStorageKey(), JSON.stringify([...ids]));
}

function tocarSom() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.45);
  } catch {}
}

export interface NotificacaoAgendamento {
  id: number;
  servico: string;
  cliente_nome?: string;
  hora_inicio: string;
  data: string;
}

export function useNotificacoes() {
  const [novos, setNovos] = useState<NotificacaoAgendamento[]>([]);
  const inicializado = useRef(false);

  const verificar = useCallback(async (isFirst: boolean) => {
    const token = localStorage.getItem("vendlysys_token");
    if (!token) return;
    const hoje = hojeISO();
    try {
      const res = await fetch(`${BASE}/api/agendamentos?data_inicio=${hoje}&data_fim=${hoje}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const ags: NotificacaoAgendamento[] = await res.json();
      const visto = getSeenIds();

      if (isFirst) {
        saveSeenIds(new Set(ags.map((a) => a.id)));
        return;
      }

      const novosAgs = ags.filter((a) => !visto.has(a.id));
      if (novosAgs.length > 0) {
        saveSeenIds(new Set([...visto, ...novosAgs.map((a) => a.id)]));
        setNovos((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const reais = novosAgs.filter((a) => !existingIds.has(a.id));
          if (reais.length > 0) tocarSom();
          return [...prev, ...reais];
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (inicializado.current) return;
    inicializado.current = true;
    verificar(true);
    const timer = setInterval(() => verificar(false), 30000);
    return () => clearInterval(timer);
  }, [verificar]);

  function limpar() {
    setNovos([]);
  }

  return { novos, total: novos.length, limpar };
}
