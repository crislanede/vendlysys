import { Feather } from "@expo/vector-icons";
import CompanyLogo from "@/components/CompanyLogo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { api } from "@/utils/api";

type Agendamento = {
  id: number;
  cliente_nome: string;
  cliente_telefone?: string;
  profissional_nome?: string;
  servico: string;
  data: string;
  hora_inicio: string;
  hora_fim?: string;
  valor?: number;
  status: "agendado" | "confirmado" | "concluido" | "cancelado";
  observacoes?: string;
};

function formatarTelefoneWA(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10) return "55" + digits;
  return digits;
}

function mensagemWhatsApp(ag: Agendamento, slug: string): string {
  const dataFormatada = ag.data
    ? new Date(ag.data.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR")
    : "";
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  const portalUrl = `https://${domain}/vendlysys/portal/${slug}`;
  return (
    `Ola ${ag.cliente_nome || ""}! Lembramos que voce tem um horario de ${ag.servico} agendado para ${dataFormatada} as ${ag.hora_inicio}.\n\n` +
    `Para confirmar, reagendar ou cancelar, acesse o link abaixo:\n${portalUrl}\n\n` +
    `Qualquer duvida, e so chamar!`
  );
}

function abrirWhatsApp(ag: Agendamento, slug: string) {
  if (!ag.cliente_telefone) {
    Alert.alert("Sem telefone", "Este cliente não tem telefone cadastrado.");
    return;
  }
  const numero = formatarTelefoneWA(ag.cliente_telefone);
  const msg = encodeURIComponent(mensagemWhatsApp(ag, slug));
  Linking.openURL(`https://wa.me/${numero}?text=${msg}`);
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  agendado:         { label: "Agendado",       color: colors.light.warning,         bg: colors.light.warningLight },
  confirmado:       { label: "Confirmado",     color: colors.light.success,         bg: colors.light.successLight },
  concluido:        { label: "Concluído",      color: colors.light.mutedForeground, bg: colors.light.muted },
  cancelado:        { label: "Cancelado",      color: colors.light.destructive,     bg: colors.light.destructiveLight },
  aguardando_sinal: { label: "Aguard. Sinal",  color: "#c2410c",                    bg: "#fff7ed" },
};

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function toYMD(d: Date) {
  return d.toISOString().split("T")[0];
}

type ViewMode = "list" | "timeline";

const HOUR_HEIGHT = 60;
const DAY_START = 8;
const DAY_END = 20;

function toMinutesFromDay(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h - DAY_START) * 60 + m;
}

export default function AgendaScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const qc = useQueryClient();
  const token = auth.tipo === "staff" ? auth.token : null;
  const usuario = auth.tipo === "staff" ? auth.usuario : null;

  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [busca, setBusca] = useState("");

  const dates = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i - 1));

  const { data, isLoading, refetch } = useQuery<Agendamento[]>({
    queryKey: ["agendamentos", selectedDate],
    queryFn: () => api.get(`/agendamentos?data_inicio=${selectedDate}&data_fim=${selectedDate}`, token),
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/agendamentos/${id}`, { status }, token),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      qc.invalidateQueries({ queryKey: ["agendamentos-hoje"] });
    },
  });

  function confirmAction(id: number, status: string, label: string) {
    Alert.alert(label, `Confirmar ação "${label}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        style: status === "cancelado" ? "destructive" : "default",
        onPress: () => updateMutation.mutate({ id, status }),
      },
    ]);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => setViewMode(v => v === "list" ? "timeline" : "list")}
            style={({ pressed }) => [styles.toggleBtn, pressed && { opacity: 0.8 }]}
          >
            <Feather name={viewMode === "list" ? "clock" : "list"} size={17} color={colors.light.golden} />
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: "/(staff)/criar-agendamento", params: { data: selectedDate } })}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>
        <CompanyLogo logoUrl={usuario?.empresa?.logo_url} nome={usuario?.empresa?.nome} size={72} />
        <Text style={styles.title}>Agenda</Text>
      </View>

      <View style={styles.dateBar}>
        <FlatList
          horizontal
          data={dates}
          keyExtractor={(d) => toYMD(d)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          renderItem={({ item: d }) => {
            const ymd = toYMD(d);
            const isSelected = ymd === selectedDate;
            const isToday = ymd === toYMD(new Date());
            return (
              <TouchableOpacity
                onPress={() => setSelectedDate(ymd)}
                style={[styles.dateChip, isSelected && styles.dateChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>
                  {d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                </Text>
                <Text style={[styles.dateNum, isSelected && styles.dateNumActive]}>{d.getDate()}</Text>
                {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.searchBar}>
        <Feather name="search" size={15} color={colors.light.mutedForeground} />
        <TextInput
          style={styles.searchInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar cliente ou serviço..."
          placeholderTextColor={colors.light.mutedForeground}
          clearButtonMode="while-editing"
          autoCapitalize="words"
          returnKeyType="search"
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => setBusca("")} activeOpacity={0.7}>
            <Feather name="x" size={15} color={colors.light.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.light.golden} />
        </View>
      ) : viewMode === "timeline" ? (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
          <View style={styles.timelineContainer}>
            {Array.from({ length: DAY_END - DAY_START }, (_, i) => (
              <View key={i} style={styles.hourRow}>
                <Text style={styles.hourLabel}>{String(DAY_START + i).padStart(2, "0")}:00</Text>
                <View style={styles.hourLine} />
              </View>
            ))}
            {(data ?? []).filter(ag => {
              if (!ag.hora_inicio) return false;
              if (!busca.trim()) return true;
              const q = busca.trim().toLowerCase();
              return ag.cliente_nome.toLowerCase().includes(q) || ag.servico.toLowerCase().includes(q);
            }).map((ag) => {
              const sc = STATUS_CONFIG[ag.status] ?? STATUS_CONFIG.agendado;
              const topMin = toMinutesFromDay(ag.hora_inicio);
              const durationMin = ag.hora_fim
                ? toMinutesFromDay(ag.hora_fim) - topMin
                : 60;
              const top = (topMin / 60) * HOUR_HEIGHT;
              const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 32);
              return (
                <View
                  key={ag.id}
                  style={[styles.timelineBlock, {
                    top,
                    height,
                    borderLeftColor: sc.color,
                    backgroundColor: sc.bg,
                  }]}
                >
                  <Text style={[styles.timelineNome, { color: sc.color }]} numberOfLines={1}>{ag.cliente_nome}</Text>
                  <Text style={styles.timelineServico} numberOfLines={1}>{ag.servico}</Text>
                  {height > 44 && (
                    <Text style={styles.timelineHora}>{ag.hora_inicio}{ag.hora_fim ? ` – ${ag.hora_fim}` : ""}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={(data ?? []).filter(ag => {
            if (!busca.trim()) return true;
            const q = busca.trim().toLowerCase();
            return ag.cliente_nome.toLowerCase().includes(q) || ag.servico.toLowerCase().includes(q);
          })}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color={colors.light.border} />
              <Text style={styles.emptyText}>Nenhum agendamento</Text>
              <Text style={styles.emptySubtext}>para esta data</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.agendado;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardNome}>{item.cliente_nome}</Text>
                    <Text style={styles.cardServico}>{item.servico}</Text>
                    {item.profissional_nome && (
                      <Text style={styles.cardProfissional}>{item.profissional_nome}</Text>
                    )}
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.cardHora}>{item.hora_inicio}</Text>
                    {item.hora_fim && (
                      <Text style={styles.cardHoraFim}>até {item.hora_fim}</Text>
                    )}
                    {item.valor !== undefined && item.valor > 0 && (
                      <Text style={styles.cardValor}>
                        {item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </Text>
                    )}
                  </View>
                </View>

                <View style={styles.cardBottom}>
                  <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.badgeText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                  <Pressable
                    onPress={() => abrirWhatsApp(item, usuario?.empresa?.slug || "")}
                    style={({ pressed }) => [{
                      backgroundColor: item.cliente_telefone ? "#25d366" : "#e5e7eb",
                      borderRadius: 8,
                      padding: 7,
                      opacity: pressed ? 0.75 : 1,
                      alignItems: "center",
                      justifyContent: "center",
                    }]}
                  >
                    <Feather name="message-circle" size={15} color={item.cliente_telefone ? "#fff" : "#9ca3af"} />
                  </Pressable>
                  {item.status === "agendado" && (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => confirmAction(item.id, "confirmado", "Confirmar")}
                        style={({ pressed }) => [styles.actionBtn, styles.actionConfirm, pressed && { opacity: 0.75 }]}
                      >
                        <Feather name="check" size={13} color={colors.light.success} />
                        <Text style={[styles.actionBtnText, { color: colors.light.success }]}>Confirmar</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => confirmAction(item.id, "cancelado", "Cancelar")}
                        style={({ pressed }) => [styles.actionBtn, styles.actionCancel, pressed && { opacity: 0.75 }]}
                      >
                        <Feather name="x" size={13} color={colors.light.destructive} />
                        <Text style={[styles.actionBtnText, { color: colors.light.destructive }]}>Cancelar</Text>
                      </Pressable>
                    </View>
                  )}
                  {item.status === "confirmado" && (
                    <Pressable
                      onPress={() => confirmAction(item.id, "concluido", "Concluir")}
                      style={({ pressed }) => [styles.actionBtn, styles.actionConfirm, pressed && { opacity: 0.75 }]}
                    >
                      <Feather name="check-circle" size={13} color={colors.light.success} />
                      <Text style={[styles.actionBtnText, { color: colors.light.success }]}>Concluir</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    marginBottom: 2,
    gap: 8,
  },
  toggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.light.card,
    borderWidth: 1.5,
    borderColor: colors.light.golden,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.light.golden,
    alignItems: "center",
    justifyContent: "center",
  },
  timelineContainer: {
    position: "relative",
    marginHorizontal: 20,
    marginTop: 4,
  },
  hourRow: {
    height: HOUR_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 4,
  },
  hourLabel: {
    width: 44,
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  hourLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.light.border,
    marginTop: 7,
  },
  timelineBlock: {
    position: "absolute",
    left: 54,
    right: 0,
    borderRadius: 10,
    borderLeftWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  timelineNome: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  timelineServico: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 1,
  },
  timelineHora: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.5,
  },
  dateBar: { paddingBottom: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 11 : 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
  },
  dateChip: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.light.card,
    borderWidth: 1.5,
    borderColor: "transparent",
    minWidth: 52,
  },
  dateChipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  dateDay: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
    textTransform: "capitalize",
  },
  dateDayActive: { color: "rgba(255,255,255,0.75)" },
  dateNum: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    marginTop: 2,
  },
  dateNumActive: { color: "#fff" },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.light.golden, marginTop: 4 },
  todayDotActive: { backgroundColor: "rgba(255,255,255,0.7)" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },
  empty: { alignItems: "center", paddingVertical: 64, gap: 8 },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  cardLeft: { flex: 1 },
  cardNome: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  cardServico: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 3,
  },
  cardProfissional: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.golden,
    marginTop: 2,
  },
  cardRight: { alignItems: "flex-end" },
  cardHora: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.3,
  },
  cardHoraFim: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  cardValor: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.golden,
    marginTop: 4,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    paddingTop: 10,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  actions: { flexDirection: "row", gap: 6, marginLeft: "auto" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  actionConfirm: { backgroundColor: colors.light.successLight },
  actionCancel: { backgroundColor: colors.light.destructiveLight },
  actionBtnText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
