import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { api } from "@/utils/api";

type Servico = {
  id: number;
  nome: string;
  categoria?: string;
  duracao_minutos?: number;
  valor?: number;
  descricao?: string;
};

type Profissional = {
  id: number;
  nome: string;
  especialidade?: string;
};

const HORARIOS = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "13:00", "13:30", "14:00",
  "14:30", "15:00", "15:30", "16:00", "16:30", "17:00",
  "17:30", "18:00",
];

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function toYMD(d: Date) {
  return d.toISOString().split("T")[0];
}
function addMinutes(hora: string, min: number) {
  const [h, m] = hora.split(":").map(Number);
  const total = (h || 0) * 60 + (m || 0) + min;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

type Step = "servico" | "profissional" | "data" | "hora" | "confirmar";

export default function AgendarScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const qc = useQueryClient();
  const token = auth.tipo === "cliente" ? auth.token : null;
  const empresa = auth.tipo === "cliente" ? auth.usuario.empresa : null;

  const [step, setStep] = useState<Step>("servico");
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const [selectedProfissional, setSelectedProfissional] = useState<Profissional | null | "nenhum">(null);
  const [selectedDate, setSelectedDate] = useState(toYMD(addDays(new Date(), 1)));
  const [selectedHora, setSelectedHora] = useState<string | null>(null);

  const { data: servicos, isLoading } = useQuery<Servico[]>({
    queryKey: ["servicos", empresa?.slug],
    queryFn: () => api.get(`/portal/servicos/${empresa?.slug}`, null),
    enabled: !!empresa?.slug,
  });

  const { data: profissionais } = useQuery<Profissional[]>({
    queryKey: ["portal-profissionais", empresa?.slug],
    queryFn: () => api.get(`/portal/profissionais/${empresa?.slug}`, null),
    enabled: !!empresa?.slug,
  });

  const horaFim = selectedServico?.duracao_minutos && selectedHora
    ? addMinutes(selectedHora, selectedServico.duracao_minutos)
    : null;

  const profId = selectedProfissional && selectedProfissional !== "nenhum"
    ? selectedProfissional.id
    : null;

  const agendar = useMutation({
    mutationFn: () =>
      api.post("/portal/agendar", {
        servico: selectedServico?.nome,
        servico_id: selectedServico?.id,
        data: selectedDate,
        hora_inicio: selectedHora,
        hora_fim: horaFim,
        profissional_id: profId,
      }, token),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["meus-agendamentos"] });
      Alert.alert(
        "Agendado!",
        `Seu agendamento para ${selectedServico?.nome} foi realizado com sucesso.`,
        [{ text: "Ver agendamentos", onPress: () => { setStep("servico"); setSelectedServico(null); setSelectedProfissional(null); setSelectedHora(null); router.replace("/(cliente)/(tabs)/inicio"); } }]
      );
    },
    onError: (e: any) => Alert.alert("Não foi possível agendar", e.message || "Tente outro horário."),
  });

  const dates = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i + 1));
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const STEPS: Step[] = ["servico", "profissional", "data", "hora", "confirmar"];
  const stepIdx = STEPS.indexOf(step);

  const categories = [...new Set((servicos ?? []).map((s) => s.categoria).filter(Boolean))] as string[];
  const temProfissionais = (profissionais ?? []).length > 0;

  function goBack() {
    if (step === "profissional") setStep("servico");
    else if (step === "data") setStep(temProfissionais ? "profissional" : "servico");
    else setStep(STEPS[stepIdx - 1]);
  }

  function goToData() {
    setStep("data");
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>Agendar</Text>
        {step !== "servico" && (
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
          >
            <Feather name="arrow-left" size={20} color={colors.light.foreground} />
          </Pressable>
        )}
      </View>

      <View style={styles.progress}>
        {STEPS.map((s, i) => {
          if (s === "profissional" && !temProfissionais) return null;
          return (
            <View
              key={s}
              style={[styles.progressDot, i <= stepIdx && styles.progressDotActive, i < stepIdx && styles.progressDotDone]}
            />
          );
        })}
      </View>

      {step === "servico" && (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepLabel}>Escolha o serviço</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.light.golden} style={{ marginTop: 40 }} />
          ) : categories.length > 0 ? (
            categories.map((cat) => (
              <View key={cat}>
                <Text style={styles.catLabel}>{cat}</Text>
                {(servicos ?? []).filter((s) => s.categoria === cat).map((s) => (
                  <ServicoCard key={s.id} servico={s} onSelect={() => {
                    setSelectedServico(s);
                    Haptics.selectionAsync();
                    if (temProfissionais) setStep("profissional");
                    else setStep("data");
                  }} />
                ))}
              </View>
            ))
          ) : (
            (servicos ?? []).map((s) => (
              <ServicoCard key={s.id} servico={s} onSelect={() => {
                setSelectedServico(s);
                Haptics.selectionAsync();
                if (temProfissionais) setStep("profissional");
                else setStep("data");
              }} />
            ))
          )}
        </ScrollView>
      )}

      {step === "profissional" && (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepLabel}>Escolha a profissional</Text>
          <Text style={styles.stepSub}>Opcional — deixe em branco para qualquer profissional disponível</Text>

          <Pressable
            onPress={() => { setSelectedProfissional("nenhum"); Haptics.selectionAsync(); goToData(); }}
            style={({ pressed }) => [styles.profCard, styles.profCardNone, pressed && { opacity: 0.8 }]}
          >
            <View style={[styles.profAvatar, { backgroundColor: colors.light.border }]}>
              <Feather name="users" size={18} color={colors.light.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profNome}>Sem preferência</Text>
              <Text style={styles.profEsp}>Qualquer profissional disponível</Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.light.mutedForeground} />
          </Pressable>

          {(profissionais ?? []).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => { setSelectedProfissional(p); Haptics.selectionAsync(); goToData(); }}
              style={({ pressed }) => [styles.profCard, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.profAvatar, { backgroundColor: colors.light.goldenLight }]}>
                <Feather name="scissors" size={18} color={colors.light.golden} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profNome}>{p.nome}</Text>
                {p.especialidade ? <Text style={styles.profEsp}>{p.especialidade}</Text> : null}
              </View>
              <Feather name="chevron-right" size={18} color={colors.light.golden} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {step === "data" && (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepLabel}>Escolha a data</Text>
          <View style={styles.dateGrid}>
            {dates.map((d) => {
              const ymd = toYMD(d);
              const isSelected = ymd === selectedDate;
              const isSunday = d.getDay() === 0;
              if (isSunday) return null;
              return (
                <Pressable
                  key={ymd}
                  onPress={() => { setSelectedDate(ymd); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [styles.dateCell, isSelected && styles.dateCellActive, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.dateCellDay, isSelected && styles.dateCellActiveText]}>
                    {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                  </Text>
                  <Text style={[styles.dateCellNum, isSelected && styles.dateCellActiveText]}>{d.getDate()}</Text>
                  <Text style={[styles.dateCellMon, isSelected && styles.dateCellActiveSub]}>
                    {d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setStep("hora")}
            style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.nextBtnText}>Continuar</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      )}

      {step === "hora" && (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepLabel}>Escolha o horário</Text>
          <Text style={styles.stepSub}>
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </Text>
          <View style={styles.horaGrid}>
            {HORARIOS.map((h) => {
              const isSelected = h === selectedHora;
              return (
                <Pressable
                  key={h}
                  onPress={() => { setSelectedHora(h); Haptics.selectionAsync(); }}
                  style={({ pressed }) => [styles.horaCell, isSelected && styles.horaCellActive, pressed && { opacity: 0.8 }]}
                >
                  <Text style={[styles.horaCellText, isSelected && styles.horaCellActiveText]}>{h}</Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => { if (!selectedHora) { Alert.alert("Selecione um horário"); return; } setStep("confirmar"); }}
            style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.nextBtnText}>Continuar</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      )}

      {step === "confirmar" && (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepLabel}>Confirmar agendamento</Text>
          <View style={styles.confirmCard}>
            <Row icon="scissors" label="Serviço" value={selectedServico?.nome ?? ""} />
            {selectedProfissional && selectedProfissional !== "nenhum" && (
              <Row icon="user" label="Profissional" value={selectedProfissional.nome} />
            )}
            <Row icon="calendar" label="Data" value={new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} />
            <Row icon="clock" label="Horário" value={selectedHora ?? ""} />
            {selectedServico?.valor !== undefined && selectedServico.valor > 0 && (
              <Row icon="dollar-sign" label="Valor" value={selectedServico.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
            )}
            {selectedServico?.duracao_minutos && (
              <Row icon="activity" label="Duração" value={`${selectedServico.duracao_minutos} min`} />
            )}
          </View>
          <Pressable
            onPress={() => agendar.mutate()}
            disabled={agendar.isPending}
            style={({ pressed }) => [styles.nextBtn, pressed && { opacity: 0.85 }]}
          >
            {agendar.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={18} color="#fff" />
                <Text style={styles.nextBtnText}>Confirmar agendamento</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

function ServicoCard({ servico, onSelect }: { servico: Servico; onSelect: () => void }) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [styles.servicoCard, pressed && { opacity: 0.8 }]}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.servicoNome}>{servico.nome}</Text>
        {servico.descricao && (
          <Text style={styles.servicoDesc} numberOfLines={2}>{servico.descricao}</Text>
        )}
        <View style={styles.servicoMeta}>
          {servico.duracao_minutos && (
            <Text style={styles.servicoMetaText}>{servico.duracao_minutos} min</Text>
          )}
          {servico.valor !== undefined && servico.valor > 0 && (
            <Text style={styles.servicoValor}>
              {servico.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </Text>
          )}
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={colors.light.golden} />
    </Pressable>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.confirmRow}>
      <View style={styles.confirmIconWrap}>
        <Feather name={icon as any} size={14} color={colors.light.golden} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.confirmLabel}>{label}</Text>
        <Text style={styles.confirmValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.5,
    flex: 1,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.light.secondary,
  },
  progress: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressDot: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.light.border,
  },
  progressDotActive: { backgroundColor: colors.light.golden },
  progressDotDone: { backgroundColor: colors.light.golden },
  scroll: { paddingHorizontal: 20 },
  stepLabel: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    marginBottom: 4,
  },
  stepSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 20,
    textTransform: "capitalize",
  },
  catLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  servicoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  servicoNome: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  servicoDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 3,
  },
  servicoMeta: { flexDirection: "row", gap: 10, marginTop: 8, alignItems: "center" },
  servicoMetaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  servicoValor: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.golden,
  },
  profCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 14,
    borderWidth: 1.5,
    borderColor: colors.light.border,
  },
  profCardNone: {
    borderStyle: "dashed",
  },
  profAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  profNome: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  profEsp: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 24,
  },
  dateCell: {
    width: "22%",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.light.card,
    borderWidth: 1.5,
    borderColor: colors.light.border,
  },
  dateCellActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  dateCellDay: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textTransform: "capitalize",
  },
  dateCellNum: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  dateCellMon: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textTransform: "capitalize",
  },
  dateCellActiveText: { color: "#fff" },
  dateCellActiveSub: { color: "rgba(255,255,255,0.7)" },
  horaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 24,
  },
  horaCell: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.light.card,
    borderWidth: 1.5,
    borderColor: colors.light.border,
  },
  horaCellActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  horaCellText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  horaCellActiveText: { color: "#fff" },
  confirmCard: {
    backgroundColor: colors.light.card,
    borderRadius: 20,
    padding: 20,
    marginTop: 12,
    marginBottom: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  confirmRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  confirmIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  confirmValue: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    marginTop: 2,
    textTransform: "capitalize",
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: colors.light.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  nextBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
