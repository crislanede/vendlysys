import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
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
const TEAL   = "#0BA5A0";
const BG     = "#EEF3FF";
const MUTED  = "#6B80A0";
const BORDER = "#C5D4EE";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { loginStaff } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffSenha, setStaffSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);

  const senhaRef = useRef<TextInput>(null);

  async function handleLogin() {
    if (!staffEmail.trim() || !staffSenha.trim()) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email: staffEmail.trim(), senha: staffSenha }, null);
      await loginStaff(data.token, data.usuario);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(staff)/(tabs)/inicio");
    } catch (e: any) {
      setError(e.message ?? "Erro ao fazer login.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: BG }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image
              source={require("../assets/images/vendlysys-logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>Sistema PDV Moderno e Eficiente</Text>
          </View>

          {/* Card de login */}
          <View style={styles.card}>
            {/* Colored top bar */}
            <View style={styles.topBar} />

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Acesso do profissional</Text>

              <View style={styles.fieldWrap}>
                <Feather name="mail" size={16} color={MUTED} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="E-mail"
                  placeholderTextColor={MUTED}
                  value={staffEmail}
                  onChangeText={setStaffEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                  onSubmitEditing={() => senhaRef.current?.focus()}
                  testID="email-input"
                />
              </View>

              <View style={styles.fieldWrap}>
                <Feather name="lock" size={16} color={MUTED} style={styles.fieldIcon} />
                <TextInput
                  ref={senhaRef}
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Senha"
                  placeholderTextColor={MUTED}
                  value={staffSenha}
                  onChangeText={setStaffSenha}
                  secureTextEntry={!showSenha}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  testID="senha-input"
                />
                <TouchableOpacity onPress={() => setShowSenha((v) => !v)} style={styles.eyeBtn}>
                  <Feather name={showSenha ? "eye-off" : "eye"} size={16} color={MUTED} />
                </TouchableOpacity>
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={14} color="#dc2626" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={handleLogin}
                style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.85 }]}
                disabled={loading}
                testID="login-btn"
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.loginBtnText}>Entrar</Text>
                )}
              </Pressable>
            </View>
          </View>

          {/* Info para clientes */}
          <View style={styles.clienteInfo}>
            <Feather name="smartphone" size={15} color={TEAL} />
            <Text style={styles.clienteInfoText}>
              Cliente? Acesse seu portal pelo link enviado via WhatsApp ao ser cadastrado.
            </Text>
          </View>

          {/* Criar empresa */}
          <Pressable
            onPress={() => router.push("/registro")}
            style={({ pressed }) => [styles.criarBtn, pressed && { opacity: 0.7 }]}
          >
            <Feather name="plus-circle" size={15} color={ORANGE} />
            <Text style={styles.criarBtnText}>Criar minha empresa</Text>
          </Pressable>

          <Text style={styles.footer}>VendlySys © {new Date().getFullYear()}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  logoWrap: { alignItems: "center", marginBottom: 36 },
  logoImg: { width: 260, height: 90, marginBottom: 6 },
  tagline: { fontSize: 13, color: MUTED },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: NAVY,
    shadowOpacity: 0.10,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#DDE8FF",
  },
  topBar: {
    height: 4,
    backgroundColor: BLUE,
  },
  cardBody: { padding: 24, gap: 14 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: NAVY, marginBottom: 4 },
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
  loginBtn: {
    backgroundColor: BLUE,
    backgroundImage: undefined,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: NAVY,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    background: `linear-gradient(135deg, ${BLUE}, ${NAVY})`,
  } as any,
  loginBtnText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  clienteInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#F0FFFE",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${TEAL}40`,
    padding: 14,
    marginBottom: 12,
  },
  clienteInfoText: { flex: 1, fontSize: 13, color: NAVY, lineHeight: 19 },
  criarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: ORANGE,
    backgroundColor: "#FFF4EA",
    marginBottom: 32,
  },
  criarBtnText: { fontSize: 15, fontWeight: "600", color: ORANGE },
  footer: { textAlign: "center", fontSize: 12, color: MUTED, marginTop: 8 },
});
