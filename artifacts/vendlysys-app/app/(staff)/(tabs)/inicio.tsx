import { Feather } from "@expo/vector-icons";
import CompanyLogo from "@/components/CompanyLogo";
import { PeriodPickerModal, DateRange } from "@/components/PeriodPickerModal";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { api } from "@/utils/api";

type DashResumo = {
  total_agendamentos: number;
  agendamentos_concluidos: number;
  agendamentos_cancelados: number;
  receita_total: number;
  receita_recebida: number;
  receita_pendente: number;
  despesas_total: number;
  lucro_liquido: number;
  novos_clientes: number;
  ticket_medio: number;
};

function fmt(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const MESES_PT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type Preset = "mes" | "mes_ant" | "3meses" | "ano" | "custom";

const PRESETS: { key: Preset; label: string; icon?: string }[] = [
  { key: "mes", label: "Este Mês" },
  { key: "mes_ant", label: "Mês Ant." },
  { key: "3meses", label: "3 Meses" },
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function getRange(p: Preset, custom?: DateRange): { inicio: string; fim: string; label: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (p) {
    case "mes":
      return { inicio: `${y}-${pad(m + 1)}-01`, fim: fmtDate(now), label: `${MESES_PT[m]}/${y}` };
    case "mes_ant": {
      const d0 = new Date(y, m - 1, 1);
      const dEnd = new Date(y, m, 0);
      return { inicio: fmtDate(d0), fim: fmtDate(dEnd), label: `${MESES_PT[dEnd.getMonth()]}/${dEnd.getFullYear()}` };
    }
    case "3meses": {
      const d0 = new Date(y, m - 2, 1);
      return { inicio: fmtDate(d0), fim: fmtDate(now), label: `${MESES_PT[d0.getMonth()]} – ${MESES_PT[m]}` };
    }
    case "ano":
      return { inicio: `${y}-01-01`, fim: fmtDate(now), label: `${y}` };
    case "custom":
      if (custom) return { inicio: custom.inicio, fim: custom.fim, label: `${custom.inicio.slice(0,7)} – ${custom.fim.slice(0,7)}` };
      return { inicio: `${y}-${pad(m + 1)}-01`, fim: fmtDate(now), label: "Personalizado" };
  }
}

export default function StaffInicioScreen() {
  const insets = useSafeAreaInsets();
  const { auth, logout } = useAuth();

  const token = auth.tipo === "staff" ? auth.token : null;
  const usuario = auth.tipo === "staff" ? auth.usuario : null;

  const now = new Date();
  const [preset, setPreset] = React.useState<Preset>("mes");
  const [customRange, setCustomRange] = React.useState<DateRange | undefined>();
  const [pickerVisible, setPickerVisible] = React.useState(false);
  const range = getRange(preset, customRange);

  const { data, isLoading, refetch, isRefetching } = useQuery<DashResumo>({
    queryKey: ["dashboard-resumo", range.inicio, range.fim],
    queryFn: () => api.get(`/dashboard/resumo?data_inicio=${range.inicio}&data_fim=${range.fim}`, token),
    enabled: !!token,
  });

  const todayStr = now.toISOString().split("T")[0];
  const { data: agHoje } = useQuery<any[]>({
    queryKey: ["agendamentos-hoje", todayStr],
    queryFn: () => api.get(`/agendamentos?data_inicio=${todayStr}&data_fim=${todayStr}`, token),
    enabled: !!token,
  });

  const diaSemana = now.toLocaleDateString("pt-BR", { weekday: "long" });
  const dataFormatada = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace("/login");
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const lucro = data?.lucro_liquido ?? 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Feather name="log-out" size={18} color={colors.light.mutedForeground} />
          </TouchableOpacity>
        </View>
        <CompanyLogo logoUrl={usuario?.empresa?.logo_url} nome={usuario?.empresa?.nome} size={72} />
        <Text style={styles.greeting}>Olá, {usuario?.nome?.split(" ")[0]}</Text>
        <Text style={styles.dateLabel}>{diaSemana}, {dataFormatada}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.light.golden} />
        }
      >
        {usuario?.empresa && (
          <View style={styles.empresaChip}>
            <Feather name="briefcase" size={13} color={colors.light.golden} />
            <Text style={styles.empresaText}>{usuario.empresa.nome}</Text>
          </View>
        )}

        <View style={styles.presetRow}>
          {PRESETS.map((p) => (
            <TouchableOpacity
              key={p.key}
              onPress={() => { Haptics.selectionAsync(); setPreset(p.key); }}
              style={[styles.presetChip, preset === p.key && styles.presetChipActive]}
              activeOpacity={0.75}
            >
              <Text style={[styles.presetText, preset === p.key && styles.presetTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            onPress={() => { Haptics.selectionAsync(); setPickerVisible(true); }}
            style={[styles.presetChip, styles.presetChipIcon, preset === "custom" && styles.presetChipActive]}
            activeOpacity={0.75}
          >
            <Feather name="calendar" size={15} color={preset === "custom" ? "#fff" : colors.light.mutedForeground} />
          </TouchableOpacity>
        </View>
        <Text style={styles.periodoLabel}>{range.label}</Text>

        <PeriodPickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          initialRange={{ inicio: range.inicio, fim: range.fim }}
          onConfirm={(r) => { setCustomRange(r); setPreset("custom"); }}
        />

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.light.golden} />
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Dashboard</Text>

            <View style={styles.statRow}>
              <StatCard
                icon="arrow-down-circle"
                label="Receita recebida"
                value={fmt(data?.receita_recebida ?? 0)}
                iconColor={colors.light.success}
                iconBg={colors.light.successLight}
              />
              <StatCard
                icon="arrow-up-circle"
                label="Saídas"
                value={fmt(data?.despesas_total ?? 0)}
                iconColor={colors.light.destructive}
                iconBg={colors.light.destructiveLight}
              />
            </View>

            <View style={styles.statRow}>
              <StatCard
                icon="trending-up"
                label="Lucro líquido"
                value={fmt(lucro)}
                iconColor={lucro >= 0 ? colors.light.success : colors.light.destructive}
                iconBg={lucro >= 0 ? colors.light.successLight : colors.light.destructiveLight}
                valueColor={lucro >= 0 ? colors.light.success : colors.light.destructive}
              />
              <StatCard
                icon="calendar"
                label="Hoje"
                value={String(agHoje?.length ?? 0)}
                unit="agendamentos"
              />
            </View>

            <View style={styles.statRow}>
              <StatCard
                icon="check-circle"
                label="Concluídos no mês"
                value={String(data?.agendamentos_concluidos ?? 0)}
                unit="atendimentos"
              />
              <StatCard
                icon="user-plus"
                label="Novos clientes"
                value={String(data?.novos_clientes ?? 0)}
                unit="este mês"
              />
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Ações rápidas</Text>
        <View style={styles.actionsGrid}>
          <ActionBtn icon="plus-circle" label="Novo agendamento" onPress={() => router.push("/(staff)/criar-agendamento")} highlight />
          <ActionBtn icon="calendar" label="Ver agenda" onPress={() => router.push("/(staff)/(tabs)/agenda")} />
          <ActionBtn icon="users" label="Clientes" onPress={() => router.push("/(staff)/(tabs)/clientes")} />
          <ActionBtn icon="scissors" label="Profissionais" onPress={() => router.push("/(staff)/profissionais")} />
          {usuario?.perfil === "admin" && (
            <ActionBtn icon="list" label="Serviços" onPress={() => router.push("/(staff)/servicos")} />
          )}
          {usuario?.perfil === "admin" && (
            <ActionBtn icon="users" label="Equipe" onPress={() => router.push("/(staff)/usuarios")} />
          )}
          {usuario?.perfil === "admin" && (
            <ActionBtn icon="user-plus" label="Novo usuário" onPress={() => router.push("/(staff)/criar-usuario")} />
          )}
        </View>

        {agHoje && agHoje.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Agenda de hoje</Text>
            {agHoje.slice(0, 4).map((ag: any) => (
              <AgendamentoPill key={ag.id} ag={ag} />
            ))}
            {agHoje.length > 4 && (
              <Pressable onPress={() => router.push("/(staff)/(tabs)/agenda")} style={({ pressed }) => [styles.verMais, pressed && { opacity: 0.7 }]}>
                <Text style={styles.verMaisText}>Ver todos ({agHoje.length})</Text>
                <Feather name="chevron-right" size={14} color={colors.light.golden} />
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  icon, label, value, unit, iconColor, iconBg, valueColor,
}: {
  icon: string; label: string; value: string; unit?: string;
  iconColor?: string; iconBg?: string; valueColor?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, iconBg ? { backgroundColor: iconBg } : {}]}>
        <Feather name={icon as any} size={16} color={iconColor ?? colors.light.golden} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : {}]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {unit && <Text style={styles.statUnit}>{unit}</Text>}
    </View>
  );
}

function ActionBtn({ icon, label, onPress, highlight }: { icon: string; label: string; onPress: () => void; highlight?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, highlight && styles.actionBtnHighlight, pressed && { opacity: 0.8 }]}>
      <View style={[styles.actionIcon, highlight && styles.actionIconHighlight]}>
        <Feather name={icon as any} size={20} color={highlight ? "#fff" : colors.light.golden} />
      </View>
      <Text style={[styles.actionLabel, highlight && styles.actionLabelHighlight]}>{label}</Text>
    </Pressable>
  );
}

const STATUS_COLORS: Record<string, string> = {
  agendado: colors.light.golden,
  confirmado: colors.light.success,
  concluido: colors.light.mutedForeground,
  cancelado: colors.light.destructive,
};

function AgendamentoPill({ ag }: { ag: any }) {
  return (
    <View style={styles.pill}>
      <View style={[styles.pillDot, { backgroundColor: STATUS_COLORS[ag.status] ?? colors.light.border }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.pillNome}>{ag.cliente_nome ?? "—"}</Text>
        <Text style={styles.pillInfo}>{ag.servico} · {ag.hora_inicio}</Text>
      </View>
      <Text style={styles.pillStatus}>{ag.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    marginBottom: 4,
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.light.secondary,
  },
  greeting: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    letterSpacing: -0.1,
  },
  dateLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textTransform: "capitalize",
  },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  empresaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.light.goldenLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  empresaText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.golden,
  },
  loading: { alignItems: "center", paddingVertical: 48 },
  statRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.light.card,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    marginTop: 8,
    marginBottom: 12,
  },
  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  actionBtn: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: colors.light.card,
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionBtnHighlight: {
    backgroundColor: colors.light.foreground,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconHighlight: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
    textAlign: "center",
  },
  actionLabelHighlight: {
    color: "#fff",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pillDot: { width: 10, height: 10, borderRadius: 5 },
  pillNome: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  pillInfo: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
  },
  pillStatus: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
    textTransform: "capitalize",
  },
  verMais: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
  },
  verMaisText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.golden,
  },
  presetRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 6,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.light.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.light.border,
  },
  presetChipIcon: {
    flex: 0,
    width: 40,
    paddingHorizontal: 0,
  },
  presetChipActive: {
    backgroundColor: colors.light.golden,
    borderColor: colors.light.golden,
  },
  presetText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.mutedForeground,
  },
  presetTextActive: {
    color: "#fff",
  },
  periodoLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textAlign: "center",
    marginBottom: 12,
  },
});
