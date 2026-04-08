import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { api } from "@/utils/api";

type Agendamento = {
  id: number;
  servico: string;
  data: string;
  hora_inicio: string;
  hora_fim?: string;
  status: string;
  observacoes?: string;
  profissional_nome?: string | null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  agendado:         { label: "Agendado",      color: colors.light.warning,         bg: colors.light.warningLight,      icon: "clock" },
  confirmado:       { label: "Confirmado",    color: colors.light.success,         bg: colors.light.successLight,      icon: "check-circle" },
  concluido:        { label: "Concluído",     color: colors.light.mutedForeground, bg: colors.light.muted,             icon: "check" },
  cancelado:        { label: "Cancelado",     color: colors.light.destructive,     bg: colors.light.destructiveLight,  icon: "x-circle" },
  aguardando_sinal: { label: "Aguard. Sinal", color: "#c2410c",                    bg: "#fff7ed",                      icon: "alert-circle" },
};

function fmtDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "long" });
}

export default function ClienteInicioScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const qc = useQueryClient();
  const token = auth.tipo === "cliente" ? auth.token : null;
  const usuario = auth.tipo === "cliente" ? auth.usuario : null;

  const { data, isLoading, refetch, isRefetching } = useQuery<Agendamento[]>({
    queryKey: ["meus-agendamentos"],
    queryFn: () => api.get("/portal/meus-agendamentos", token),
    enabled: !!token,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.put(`/portal/agendamentos/${id}/cancelar`, {}, token),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["meus-agendamentos"] });
    },
    onError: (e: any) => Alert.alert("Erro", e.message),
  });

  function handleCancel(id: number) {
    Alert.alert("Cancelar agendamento", "Tem certeza que deseja cancelar?", [
      { text: "Não", style: "cancel" },
      { text: "Sim, cancelar", style: "destructive", onPress: () => cancelMutation.mutate(id) },
    ]);
  }

  const today = new Date().toISOString().split("T")[0];
  const upcoming = (data ?? []).filter((a) => a.data >= today && a.status !== "cancelado");
  const past = (data ?? []).filter((a) => a.data < today || a.status === "cancelado");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View>
          <Text style={styles.greeting}>Olá, {usuario?.nome?.split(" ")[0]} 👋</Text>
          {usuario?.empresa && (
            <Text style={styles.empresa}>{usuario.empresa.nome}</Text>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.light.golden} />
        </View>
      ) : (
        <FlatList
          data={[...upcoming, ...past]}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.light.golden} />
          }
          ListHeaderComponent={
            upcoming.length > 0 ? (
              <Text style={styles.sectionHeader}>Próximos</Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="calendar" size={48} color={colors.light.border} />
              <Text style={styles.emptyText}>Nenhum agendamento</Text>
              <Text style={styles.emptySub}>Use a aba "Agendar" para marcar um horário</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const sc = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.agendado;
            const isPast = item.data < today || item.status === "cancelado";
            const showPastHeader = isPast && (index === 0 || !past.includes(data![index - 1]));
            return (
              <>
                {showPastHeader && upcoming.length > 0 && (
                  <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Histórico</Text>
                )}
                <View style={[styles.card, isPast && styles.cardPast]}>
                  <View style={styles.cardDate}>
                    <Text style={styles.cardDateNum}>{item.data.slice(0, 10).split("-")[2]}</Text>
                    <Text style={styles.cardDateMon}>
                      {new Date(item.data.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}
                    </Text>
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardServico}>{item.servico}</Text>
                    <Text style={styles.cardHora}>
                      <Feather name="clock" size={12} color={colors.light.mutedForeground} /> {item.hora_inicio}{item.hora_fim ? ` – ${item.hora_fim}` : ""}
                    </Text>
                    {item.profissional_nome ? (
                      <Text style={styles.cardProf}>
                        ✂️ {item.profissional_nome}
                      </Text>
                    ) : null}
                    <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                      <Feather name={sc.icon as any} size={11} color={sc.color} />
                      <Text style={[styles.badgeText, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                  </View>
                  {(item.status === "agendado" || item.status === "confirmado") && (
                    <Pressable
                      onPress={() => handleCancel(item.id)}
                      style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name="x" size={16} color={colors.light.destructive} />
                    </Pressable>
                  )}
                </View>
              </>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  greeting: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.3,
  },
  empresa: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.golden,
    marginTop: 3,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 8 },
  sectionHeader: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  empty: { alignItems: "center", paddingVertical: 64, gap: 10, paddingHorizontal: 32 },
  emptyText: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textAlign: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: 18,
    padding: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPast: { opacity: 0.6 },
  cardDate: {
    width: 46,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDateNum: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: colors.light.golden,
    lineHeight: 24,
  },
  cardDateMon: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.light.golden,
    textTransform: "capitalize",
  },
  cardBody: { flex: 1, gap: 4 },
  cardServico: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  cardHora: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  cardProf: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  cancelBtn: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.light.destructiveLight,
  },
});
