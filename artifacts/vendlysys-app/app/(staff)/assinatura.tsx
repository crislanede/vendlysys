import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/utils/api";
import colors from "@/constants/colors";
import CompanyLogo from "@/components/CompanyLogo";

interface AssinaturaStatus {
  plano_status: string;
  plano_expira_em: string | null;
  plano_inicio_em: string | null;
  termos_aceitos_em: string | null;
  carencia_fim: string | null;
  em_carencia: boolean;
  ultima_assinatura: {
    id: number;
    status: string;
    payment_id: string | null;
    qr_code: string | null;
    qr_code_text: string | null;
    competencia: string | null;
    pago_em: string | null;
    valor: string;
  } | null;
}

interface PixData {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  valor: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: "clock" | "check-circle" | "alert-circle" | "star" }> = {
  trial: { label: "Trial — 15 dias grátis", color: colors.light.golden, icon: "clock" },
  ativo: { label: "Ativo", color: "#22c55e", icon: "check-circle" },
  inativo: { label: "Inativo", color: "#ef4444", icon: "alert-circle" },
  vitalicio: { label: "Vitalício ✦", color: colors.light.golden, icon: "star" },
};

const BENEFICIOS = [
  "Agenda e agendamentos ilimitados",
  "Gestão de clientes completa",
  "Módulo financeiro",
  "Lembretes via WhatsApp (manual)",
  "App mobile para equipe",
  "Suporte prioritário",
];

export default function AssinaturaScreen() {
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const token = auth.tipo === "staff" ? auth.token : null;

  const [status, setStatus] = useState<AssinaturaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPix, setLoadingPix] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [pix, setPix] = useState<PixData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.get("/assinatura", token);
      setStatus(data);
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  async function gerarPix() {
    setLoadingPix(true);
    setPix(null);
    try {
      const data = await api.post("/assinatura/criar-pix", {}, token);
      setPix(data);
      startPolling(data.payment_id);
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Não foi possível gerar o PIX.");
    } finally {
      setLoadingPix(false);
    }
  }

  function startPolling(paymentId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      setChecking(true);
      try {
        const data = await api.get(`/assinatura/verificar/${paymentId}`, token);
        if (data.status === "approved") {
          clearInterval(pollRef.current!);
          setPix(null);
          Alert.alert("Pago!", "Pagamento confirmado. Seu plano está ativo!");
          fetchStatus();
        }
      } catch {
        /* keep polling */
      } finally {
        setChecking(false);
      }
    }, 5000);
  }

  async function copyPix() {
    if (!pix?.qr_code) return;
    await Clipboard.setStringAsync(pix.qr_code);
    Alert.alert("Copiado!", "Código PIX copiado para a área de transferência.");
  }

  function confirmarCancelamento() {
    if (status?.em_carencia && status?.carencia_fim) {
      const fim = new Date(status.carencia_fim).toLocaleDateString("pt-BR");
      Alert.alert(
        "Cancelamento bloqueado",
        `Você está no período de carência de 3 meses. O cancelamento só é possível após ${fim}.`,
        [{ text: "Entendido" }]
      );
      return;
    }

    Alert.alert(
      "Cancelar assinatura",
      "Tem certeza que deseja cancelar? O acesso ao sistema será encerrado imediatamente e os dados serão excluídos em 30 dias.",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, cancelar",
          style: "destructive",
          onPress: cancelarConta,
        },
      ]
    );
  }

  async function cancelarConta() {
    setCancelando(true);
    try {
      const result = await api.post("/assinatura/cancelar", {}, token);
      Alert.alert("Assinatura cancelada", result?.mensagem ?? "Sua assinatura foi cancelada.", [
        { text: "OK", onPress: () => fetchStatus() },
      ]);
    } catch (err: any) {
      Alert.alert("Erro", err?.mensagem ?? err?.message ?? "Não foi possível cancelar.");
    } finally {
      setCancelando(false);
    }
  }

  const statusCfg = status
    ? STATUS_CONFIG[status.plano_status] ?? STATUS_CONFIG.trial
    : null;

  const termosAceitos = !!status?.termos_aceitos_em;
  const isVitalicio = status?.plano_status === "vitalicio";
  const podeAssinar = !isVitalicio;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Feather name="arrow-left" size={22} color={colors.light.primary} />
          </Pressable>
        </View>
        <CompanyLogo size={72} />
        <Text style={styles.headerTitle}>Assinatura</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.light.golden} size="large" />
          </View>
        ) : (
          <>
            {/* Status Card */}
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <Feather name={statusCfg!.icon} size={20} color={statusCfg!.color} />
                <Text style={[styles.statusLabel, { color: statusCfg!.color }]}>
                  Plano {statusCfg!.label}
                </Text>
              </View>
              {status?.plano_expira_em && (
                <Text style={styles.expiry}>
                  Válido até: {new Date(status.plano_expira_em).toLocaleDateString("pt-BR")}
                </Text>
              )}
              {status?.plano_status === "trial" && (
                <Text style={styles.hint}>
                  {status.plano_expira_em
                    ? `Trial grátis até ${new Date(status.plano_expira_em).toLocaleDateString("pt-BR")}. Assine para continuar após essa data.`
                    : "Você está no período de avaliação. Assine para manter o acesso completo."}
                </Text>
              )}
              {status?.plano_status === "vitalicio" && (
                <Text style={styles.hint}>
                  Sua conta tem acesso vitalício ao sistema — sem cobranças.
                </Text>
              )}
              {status?.plano_status === "inativo" && (
                <Text style={[styles.hint, { color: "#ef4444" }]}>
                  Sua assinatura expirou. Renove para continuar usando o sistema.
                </Text>
              )}
            </View>

            {/* Carência Info */}
            {status?.plano_inicio_em && !isVitalicio && (
              <View style={[styles.card, { backgroundColor: status.em_carencia ? "#fffbeb" : "#f0fdf4" }]}>
                <View style={styles.statusRow}>
                  <Feather
                    name={status.em_carencia ? "lock" : "unlock"}
                    size={16}
                    color={status.em_carencia ? "#d97706" : "#16a34a"}
                  />
                  <Text style={[styles.carenciaLabel, { color: status.em_carencia ? "#d97706" : "#16a34a" }]}>
                    {status.em_carencia ? "Em período de carência" : "Carência encerrada"}
                  </Text>
                </View>
                <Text style={styles.carenciaText}>
                  {status.em_carencia
                    ? `Cancelamento disponível após ${new Date(status.carencia_fim!).toLocaleDateString("pt-BR")} (carência de 3 meses).`
                    : "O período de carência de 3 meses foi cumprido. Você pode cancelar a qualquer momento."}
                </Text>
              </View>
            )}

            {/* Termos de Uso */}
            {!termosAceitos && podeAssinar && (
              <View style={[styles.card, { borderWidth: 1.5, borderColor: colors.light.golden }]}>
                <View style={styles.statusRow}>
                  <Feather name="file-text" size={16} color={colors.light.golden} />
                  <Text style={[styles.statusLabel, { color: colors.light.primary, fontSize: 14 }]}>
                    Termos de Uso não aceitos
                  </Text>
                </View>
                <Text style={[styles.expiry, { marginTop: 6, marginBottom: 14 }]}>
                  Leia e aceite os Termos de Uso antes de assinar. O documento inclui informações sobre carência, cancelamento e responsabilidades.
                </Text>
                <Pressable
                  onPress={() => router.push("/(staff)/termos")}
                  style={({ pressed }) => [styles.termsBtn, pressed && { opacity: 0.8 }]}
                >
                  <Feather name="file-text" size={16} color="#fff" />
                  <Text style={styles.termsBtnText}>Ler e aceitar os Termos</Text>
                </Pressable>
              </View>
            )}

            {termosAceitos && (
              <View style={styles.termosOkRow}>
                <Feather name="check-circle" size={14} color="#16a34a" />
                <Text style={styles.termosOkText}>
                  Termos aceitos em {new Date(status!.termos_aceitos_em!).toLocaleDateString("pt-BR")}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(staff)/termos")}
                  style={{ marginLeft: "auto" }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 12, color: "#b8956f", fontFamily: "Inter_600SemiBold" }}>
                    Ver Termos
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Plano Card */}
            <View style={styles.planCard}>
              <Text style={styles.planLabel}>Plano Mensal</Text>
              <Text style={styles.planPrice}>
                R$ 50<Text style={styles.planPriceSub}>/mês</Text>
              </Text>
              <View style={styles.divider} />
              {BENEFICIOS.map((b) => (
                <View key={b} style={styles.beneficioRow}>
                  <Feather name="check-circle" size={14} color={colors.light.golden} />
                  <Text style={styles.beneficioText}>{b}</Text>
                </View>
              ))}
            </View>

            {/* PIX Section */}
            {podeAssinar && termosAceitos && (
              !pix ? (
                <Pressable
                  onPress={gerarPix}
                  disabled={loadingPix}
                  style={({ pressed }) => [
                    styles.pixBtn,
                    pressed && { opacity: 0.8 },
                    loadingPix && { opacity: 0.6 },
                  ]}
                >
                  {loadingPix ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Feather name="credit-card" size={18} color="#fff" />
                      <Text style={styles.pixBtnText}>Pagar com PIX — R$ 50,00</Text>
                    </>
                  )}
                </Pressable>
              ) : (
                <View style={styles.card}>
                  <Text style={styles.qrTitle}>Escaneie o QR Code ou copie o código</Text>
                  {pix.qr_code_base64 ? (
                    <View style={styles.qrContainer}>
                      <Image
                        source={{ uri: `data:image/png;base64,${pix.qr_code_base64}` }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                  ) : null}
                  {pix.qr_code ? (
                    <View style={styles.pixCodeBox}>
                      <Text style={styles.pixCode} numberOfLines={3}>{pix.qr_code}</Text>
                    </View>
                  ) : null}
                  <View style={styles.pixActions}>
                    <Pressable
                      onPress={copyPix}
                      style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.8 }]}
                    >
                      <Feather name="copy" size={15} color="#fff" />
                      <Text style={styles.copyBtnText}>Copiar código</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { setPix(null); if (pollRef.current) clearInterval(pollRef.current); }}
                      style={({ pressed }) => [styles.cancelPixBtn, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.cancelPixBtnText}>Cancelar</Text>
                    </Pressable>
                  </View>
                  <View style={styles.waitRow}>
                    <Feather name="refresh-cw" size={13} color="#aaa" />
                    <Text style={styles.waitText}>
                      {checking ? "Verificando pagamento..." : "Aguardando confirmação do PIX..."}
                    </Text>
                  </View>
                </View>
              )
            )}

            {/* Cancelar Conta */}
            {!isVitalicio && status?.plano_status !== "inativo" && (
              <View style={styles.cancelContaBox}>
                <Text style={styles.cancelContaTitle}>Cancelar assinatura</Text>
                <Text style={styles.cancelContaDesc}>
                  {status?.em_carencia && status?.carencia_fim
                    ? `Você está em carência de 3 meses. O cancelamento estará disponível após ${new Date(status.carencia_fim).toLocaleDateString("pt-BR")}.`
                    : "Você pode cancelar sua assinatura a qualquer momento. O acesso é encerrado imediatamente e os dados ficam disponíveis por 30 dias."}
                </Text>
                <Pressable
                  onPress={confirmarCancelamento}
                  disabled={cancelando || !!status?.em_carencia}
                  style={({ pressed }) => [
                    styles.cancelContaBtn,
                    (cancelando || status?.em_carencia) && styles.cancelContaBtnDisabled,
                    pressed && !status?.em_carencia && { opacity: 0.8 },
                  ]}
                >
                  {cancelando ? (
                    <ActivityIndicator color="#ef4444" size="small" />
                  ) : (
                    <>
                      <Feather name="x-circle" size={15} color={status?.em_carencia ? "#ccc" : "#ef4444"} />
                      <Text style={[styles.cancelContaBtnText, status?.em_carencia && { color: "#ccc" }]}>
                        {status?.em_carencia ? "Cancelamento bloqueado (carência)" : "Cancelar assinatura"}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light.background },
  header: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    backgroundColor: "#fff",
  },
  headerTopRow: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "flex-start",
    paddingTop: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.light.primary,
    marginTop: 6,
    marginBottom: 4,
  },
  scroll: { padding: 20, gap: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  statusLabel: { fontSize: 17, fontWeight: "700" },
  expiry: { color: "#666", fontSize: 13 },
  hint: { color: colors.light.golden, fontSize: 13, marginTop: 6 },
  carenciaLabel: { fontSize: 14, fontWeight: "700" },
  carenciaText: { fontSize: 13, color: "#555", marginTop: 2 },
  termsBtn: {
    backgroundColor: colors.light.primary,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  termsBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  termosOkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  termosOkText: { fontSize: 12, color: "#16a34a" },
  planCard: { backgroundColor: colors.light.primary, borderRadius: 16, padding: 20 },
  planLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 4 },
  planPrice: { color: colors.light.golden, fontSize: 40, fontWeight: "800" },
  planPriceSub: { fontSize: 18, fontWeight: "400", color: "rgba(255,255,255,0.7)" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 14 },
  beneficioRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  beneficioText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  pixBtn: {
    backgroundColor: colors.light.golden,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  pixBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  qrTitle: { fontWeight: "600", color: colors.light.primary, marginBottom: 14, fontSize: 15 },
  qrContainer: { alignItems: "center", marginBottom: 16 },
  qrImage: { width: 200, height: 200, borderRadius: 8 },
  pixCodeBox: { backgroundColor: colors.light.background, borderRadius: 8, padding: 10, marginBottom: 14 },
  pixCode: { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", color: "#444" },
  pixActions: { flexDirection: "row", gap: 10, marginBottom: 12 },
  copyBtn: {
    flex: 1,
    backgroundColor: colors.light.golden,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  copyBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  cancelPixBtn: { paddingHorizontal: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
  cancelPixBtnText: { color: "#666", fontSize: 14 },
  waitRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  waitText: { color: "#aaa", fontSize: 12 },
  cancelContaBox: {
    borderWidth: 1,
    borderColor: "#fca5a5",
    backgroundColor: "#fff5f5",
    borderRadius: 16,
    padding: 20,
    gap: 10,
  },
  cancelContaTitle: { fontSize: 15, fontWeight: "700", color: "#dc2626" },
  cancelContaDesc: { fontSize: 13, color: "#555", lineHeight: 19 },
  cancelContaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  cancelContaBtnDisabled: { borderColor: "#ddd" },
  cancelContaBtnText: { fontSize: 14, fontWeight: "600", color: "#ef4444" },
});
