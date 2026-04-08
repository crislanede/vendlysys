import { Feather } from "@expo/vector-icons";
import CompanyLogo from "@/components/CompanyLogo";
import { PeriodPickerModal, DateRange } from "@/components/PeriodPickerModal";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { api } from "@/utils/api";

type Lancamento = {
  id: number;
  tipo: "receita" | "despesa";
  descricao?: string;
  valor: number;
  status_pagamento: "pendente" | "pago" | "cancelado";
  forma_pagamento?: string;
  data_vencimento?: string;
  data_pagamento?: string;
  cliente_nome?: string;
  profissional_nome?: string;
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Filtro = "todos" | "receita" | "despesa" | "pendente";

const FORMA_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Crédito",
  cartao_debito: "Débito",
  transferencia: "Transferência",
};

const MESES_FIN_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

type Preset = "mes" | "mes_ant" | "3meses" | "ano" | "custom";

const PRESETS_FIN: { key: Preset; label: string }[] = [
  { key: "mes", label: "Este Mês" },
  { key: "mes_ant", label: "Mês Ant." },
  { key: "3meses", label: "3 Meses" },
];

function padFin(n: number) { return String(n).padStart(2, "0"); }
function fmtFin(d: Date) { return `${d.getFullYear()}-${padFin(d.getMonth() + 1)}-${padFin(d.getDate())}`; }

function getFinRange(p: Preset, custom?: DateRange): { inicio: string; fim: string; label: string } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  switch (p) {
    case "mes":
      return { inicio: `${y}-${padFin(m + 1)}-01`, fim: fmtFin(now), label: `${MESES_FIN_SHORT[m]}/${y}` };
    case "mes_ant": {
      const d0 = new Date(y, m - 1, 1);
      const dEnd = new Date(y, m, 0);
      return { inicio: fmtFin(d0), fim: fmtFin(dEnd), label: `${MESES_FIN_SHORT[dEnd.getMonth()]}/${dEnd.getFullYear()}` };
    }
    case "3meses": {
      const d0 = new Date(y, m - 2, 1);
      return { inicio: fmtFin(d0), fim: fmtFin(now), label: `${MESES_FIN_SHORT[d0.getMonth()]} – ${MESES_FIN_SHORT[m]}` };
    }
    case "ano":
      return { inicio: `${y}-01-01`, fim: fmtFin(now), label: `${y}` };
    case "custom":
      if (custom) return { inicio: custom.inicio, fim: custom.fim, label: `${custom.inicio.slice(0,7)} – ${custom.fim.slice(0,7)}` };
      return { inicio: `${y}-${padFin(m + 1)}-01`, fim: fmtFin(now), label: "Personalizado" };
  }
}

export default function FinanceiroScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const usuario = auth.tipo === "staff" ? auth.usuario : null;
  const qc = useQueryClient();
  const token = auth.tipo === "staff" ? auth.token : null;

  const [preset, setPreset] = useState<Preset>("mes");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const finRange = getFinRange(preset, customRange);
  const { inicio, fim } = finRange;

  const { data, isLoading, refetch } = useQuery<Lancamento[]>({
    queryKey: ["lancamentos", inicio, fim, filtro],
    queryFn: () => {
      let url = `/financeiro?data_inicio=${inicio}&data_fim=${fim}`;
      if (filtro === "receita" || filtro === "despesa") url += `&tipo=${filtro}`;
      if (filtro === "pendente") url += `&status_pagamento=pendente`;
      return api.get(url, token);
    },
    enabled: !!token,
  });

  const pagarMutation = useMutation({
    mutationFn: ({ id, forma }: { id: number; forma: string }) =>
      api.post(`/financeiro/${id}/pagar`, { forma_pagamento: forma }, token),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["lancamentos"] });
    },
    onError: (e: any) => Alert.alert("Erro", e.message),
  });

  function handlePagar(id: number) {
    Alert.alert("Marcar como pago", "Selecione a forma de pagamento:", [
      { text: "Dinheiro", onPress: () => pagarMutation.mutate({ id, forma: "dinheiro" }) },
      { text: "PIX", onPress: () => pagarMutation.mutate({ id, forma: "pix" }) },
      { text: "Cartão Crédito", onPress: () => pagarMutation.mutate({ id, forma: "cartao_credito" }) },
      { text: "Cartão Débito", onPress: () => pagarMutation.mutate({ id, forma: "cartao_debito" }) },
      { text: "Cancelar", style: "cancel" },
    ]);
  }

  const lista = data ?? [];
  const totalReceitas = lista.filter((l) => l.tipo === "receita" && l.status_pagamento === "pago").reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesas = lista.filter((l) => l.tipo === "despesa" && l.status_pagamento === "pago").reduce((s, l) => s + Number(l.valor), 0);
  const pendentes = lista.filter((l) => l.status_pagamento === "pendente").reduce((s, l) => s + Number(l.valor), 0);
  const saldo = totalReceitas - totalDespesas;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "receita", label: "Receitas" },
    { key: "despesa", label: "Despesas" },
    { key: "pendente", label: "Pendentes" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <CompanyLogo logoUrl={usuario?.empresa?.logo_url} nome={usuario?.empresa?.nome} size={72} />
        <Text style={styles.title}>Financeiro</Text>

        <View style={styles.presetRow}>
          {PRESETS_FIN.map((p) => (
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
        <Text style={styles.periodoLabel}>{finRange.label}</Text>

        <PeriodPickerModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          initialRange={{ inicio, fim }}
          onConfirm={(r) => { setCustomRange(r); setPreset("custom"); }}
        />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.light.golden} />
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(item) => String(item.id)}
          onRefresh={refetch}
          refreshing={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          ListHeaderComponent={
            <>
              <View style={styles.summaryRow}>
                <SummaryCard label="Receitas" value={totalReceitas} color={colors.light.success} bg={colors.light.successLight} icon="arrow-down-circle" />
                <SummaryCard label="Despesas" value={totalDespesas} color={colors.light.destructive} bg={colors.light.destructiveLight} icon="arrow-up-circle" />
              </View>
              <View style={styles.summaryRow}>
                <SummaryCard
                  label="Saldo"
                  value={saldo}
                  color={saldo >= 0 ? colors.light.success : colors.light.destructive}
                  bg={saldo >= 0 ? colors.light.successLight : colors.light.destructiveLight}
                  icon="trending-up"
                  full
                />
                <SummaryCard label="A receber" value={pendentes} color={colors.light.warning} bg={colors.light.warningLight} icon="clock" />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtroBar}>
                {FILTROS.map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFiltro(f.key)}
                    style={[styles.filtroChip, filtro === f.key && styles.filtroChipActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filtroText, filtro === f.key && styles.filtroTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="dollar-sign" size={40} color={colors.light.border} />
              <Text style={styles.emptyText}>Nenhum lançamento</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isReceita = item.tipo === "receita";
            const isPago = item.status_pagamento === "pago";
            const isPendente = item.status_pagamento === "pendente";
            return (
              <View style={styles.card}>
                <View style={[styles.tipoBar, { backgroundColor: isReceita ? colors.light.successLight : colors.light.destructiveLight }]}>
                  <Feather
                    name={isReceita ? "arrow-down-circle" : "arrow-up-circle"}
                    size={14}
                    color={isReceita ? colors.light.success : colors.light.destructive}
                  />
                  <Text style={[styles.tipoText, { color: isReceita ? colors.light.success : colors.light.destructive }]}>
                    {isReceita ? "Receita" : "Despesa"}
                  </Text>
                  {item.forma_pagamento && (
                    <Text style={styles.formaText}>{FORMA_LABELS[item.forma_pagamento] ?? item.forma_pagamento}</Text>
                  )}
                </View>

                <View style={styles.cardBody}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.descricao}>{item.descricao ?? item.cliente_nome ?? "—"}</Text>
                    {item.cliente_nome && item.descricao && (
                      <Text style={styles.clienteNome}>{item.cliente_nome}</Text>
                    )}
                    {item.profissional_nome && (
                      <Text style={styles.profNome}>{item.profissional_nome}</Text>
                    )}
                    {item.data_vencimento && (
                      <Text style={styles.dataText}>
                        <Feather name="calendar" size={11} color={colors.light.mutedForeground} />{" "}
                        {new Date(item.data_vencimento.slice(0, 10) + "T12:00").toLocaleDateString("pt-BR")}
                      </Text>
                    )}
                  </View>
                  <View style={styles.valorCol}>
                    <Text style={[styles.valor, { color: isReceita ? colors.light.success : colors.light.destructive }]}>
                      {fmt(Number(item.valor))}
                    </Text>
                    <View style={[
                      styles.statusBadge,
                      isPago ? styles.statusPago : isPendente ? styles.statusPendente : styles.statusCancelado
                    ]}>
                      <Text style={[
                        styles.statusText,
                        isPago ? { color: colors.light.success } : isPendente ? { color: colors.light.warning } : { color: colors.light.mutedForeground }
                      ]}>
                        {isPago ? "Pago" : isPendente ? "Pendente" : "Cancelado"}
                      </Text>
                    </View>
                  </View>
                </View>

                {isPendente && isReceita && (
                  <Pressable
                    onPress={() => handlePagar(item.id)}
                    style={({ pressed }) => [styles.pagarBtn, pressed && { opacity: 0.8 }]}
                  >
                    <Feather name="check-circle" size={14} color={colors.light.success} />
                    <Text style={styles.pagarText}>Marcar como pago</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

function SummaryCard({ label, value, color, bg, icon, full }: {
  label: string; value: number; color: string; bg: string; icon: string; full?: boolean;
}) {
  return (
    <View style={[styles.summaryCard, full && { flex: 1.5 }]}>
      <View style={[styles.summaryIcon, { backgroundColor: bg }]}>
        <Feather name={icon as any} size={14} color={color} />
      </View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {fmt(value)}
      </Text>
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
    gap: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.5,
  },
  presetRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    width: "100%",
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
    marginTop: 4,
    marginBottom: 2,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.light.card,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  filtroBar: { paddingBottom: 14, gap: 8 },
  filtroChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.light.card,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  filtroChipActive: {
    backgroundColor: colors.light.primary,
    borderColor: colors.light.primary,
  },
  filtroText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  filtroTextActive: { color: "#fff" },
  empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  tipoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tipoText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  formaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginLeft: "auto",
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingTop: 10,
    gap: 10,
  },
  descricao: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  clienteNome: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
  },
  profNome: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.light.golden,
    marginTop: 2,
  },
  dataText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 4,
  },
  valorCol: { alignItems: "flex-end", gap: 6 },
  valor: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusPago: { backgroundColor: colors.light.successLight },
  statusPendente: { backgroundColor: colors.light.warningLight },
  statusCancelado: { backgroundColor: colors.light.muted },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  pagarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.light.successLight,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 12,
  },
  pagarText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.success,
  },
});
