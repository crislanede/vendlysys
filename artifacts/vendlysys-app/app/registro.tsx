import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { api } from "@/utils/api";

/* ── VendlySys Brand Colors ── */
const NAVY   = "#1C3A6E";
const BLUE   = "#2B5BA5";
const ORANGE = "#F47B1E";
const BG     = "#EEF3FF";
const MUTED  = "#6B80A0";
const BORDER = "#C5D4EE";

export default function RegistroScreen() {
  const insets = useSafeAreaInsets();
  const { loginStaff } = useAuth();

  const [empresaNome, setEmpresaNome] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [senha, setSenha] = useState("");
  const [senhaConfirma, setSenhaConfirma] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegistro() {
    setError(null);
    if (!empresaNome.trim()) { setError("Informe o nome da empresa."); return; }
    if (!nome.trim()) { setError("Informe o seu nome."); return; }
    if (!email.trim() || !email.includes("@")) { setError("Informe um e-mail válido."); return; }
    if (!senha || senha.length < 6) { setError("Senha deve ter pelo menos 6 caracteres."); return; }
    if (senha !== senhaConfirma) { setError("As senhas não coincidem."); return; }

    setLoading(true);
    try {
      const data = await api.post("/auth/registro", {
        empresa_nome: empresaNome.trim(),
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        telefone: telefone.trim() || undefined,
        senha,
      }, null);

      await loginStaff(data.token, data.usuario);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(staff)/(tabs)/inicio");
    } catch (e: any) {
      setError(e.message ?? "Erro ao criar conta.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={20} color={NAVY} />
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.heroWrap}>
            <View style={styles.heroIcon}>
              <Feather name="briefcase" size={28} color={ORANGE} />
            </View>
            <Text style={styles.heroTitle}>Criar minha empresa</Text>
            <Text style={styles.heroSubtitle}>Configure sua conta em segundos e comece a gerenciar seu negócio.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <View style={styles.topBar} />
            <View style={styles.cardBody}>

              {/* Dados da empresa */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>🏢  DADOS DA EMPRESA</Text>
                <View style={styles.fieldWrap}>
                  <Feather name="briefcase" size={16} color={MUTED} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nome do salão / clínica / barbearia"
                    placeholderTextColor={MUTED}
                    value={empresaNome}
                    onChangeText={setEmpresaNome}
                  />
                </View>
              </View>

              {/* Seus dados */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>👤  SEUS DADOS (ADMINISTRADOR)</Text>

                <View style={styles.fieldWrap}>
                  <Feather name="user" size={16} color={MUTED} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome completo"
                    placeholderTextColor={MUTED}
                    value={nome}
                    onChangeText={setNome}
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <Feather name="mail" size={16} color={MUTED} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Seu e-mail (para acessar o sistema)"
                    placeholderTextColor={MUTED}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.fieldWrap}>
                  <Feather name="phone" size={16} color={MUTED} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Telefone (opcional)"
                    placeholderTextColor={MUTED}
                    value={telefone}
                    onChangeText={setTelefone}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.fieldWrap, { position: "relative" }]}>
                  <Feather name="lock" size={16} color={MUTED} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Senha (mínimo 6 caracteres)"
                    placeholderTextColor={MUTED}
                    value={senha}
                    onChangeText={setSenha}
                    secureTextEntry={!showSenha}
                  />
                  <TouchableOpacity onPress={() => setShowSenha((v) => !v)} style={styles.eyeBtn}>
                    <Feather name={showSenha ? "eye-off" : "eye"} size={16} color={MUTED} />
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldWrap}>
                  <Feather name="lock" size={16} color={MUTED} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmar senha"
                    placeholderTextColor={MUTED}
                    value={senhaConfirma}
                    onChangeText={setSenhaConfirma}
                    secureTextEntry={!showSenha}
                  />
                </View>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleRegistro}
                style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>✓ Criar minha empresa</Text>
                )}
              </Pressable>

              {/* Info */}
              <View style={styles.infoBox}>
                <Feather name="info" size={14} color={BLUE} />
                <Text style={styles.infoText}>
                  Você entrará como administrador e poderá cadastrar sua equipe, serviços e clientes logo após.{"\n"}Trial de 15 dias gratuito.
                </Text>
              </View>

              <Pressable onPress={() => router.back()} style={styles.loginLink}>
                <Text style={styles.loginLinkText}>
                  Já tem conta?  <Text style={{ color: BLUE, fontWeight: "700" }}>Fazer login</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  topRow: { marginBottom: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: NAVY,
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  heroWrap: { alignItems: "center", marginBottom: 28, gap: 10 },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#FFF4EA",
    borderWidth: 1.5,
    borderColor: `${ORANGE}50`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 24, fontWeight: "700", color: NAVY, letterSpacing: -0.4, textAlign: "center" },
  heroSubtitle: { fontSize: 14, color: MUTED, textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: "#DDE8FF",
  },
  topBar: { height: 4, backgroundColor: ORANGE },
  cardBody: { padding: 24, gap: 16 },
  section: { gap: 10 },
  sectionLabel: { fontSize: 10, fontWeight: "700", color: ORANGE, letterSpacing: 0.8, marginBottom: 2 },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFF",
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 4,
  },
  fieldIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: NAVY },
  eyeBtn: { padding: 4 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { flex: 1, fontSize: 13, color: "#dc2626" },
  btn: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: ORANGE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EEF3FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
  },
  infoText: { flex: 1, fontSize: 12, color: MUTED, lineHeight: 18 },
  loginLink: { alignItems: "center", paddingVertical: 8 },
  loginLinkText: { fontSize: 13, color: MUTED },
});
