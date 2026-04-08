import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
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
import colors from "@/constants/colors";
import { api } from "@/utils/api";

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { auth, logout, setClienteData } = useAuth();
  const token = auth.tipo === "cliente" ? auth.token : null;
  const usuario = auth.tipo === "cliente" ? auth.usuario : null;

  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");

  function isoToPartes(iso?: string | null): [string, string, string] {
    if (!iso) return ["", "", ""];
    const parts = iso.split("T")[0].split("-");
    if (parts.length === 3) return [parts[2], parts[1], parts[0]];
    return ["", "", ""];
  }
  const nascPartes = isoToPartes(usuario?.data_nascimento);
  const [diaNasc, setDiaNasc] = useState(nascPartes[0]);
  const [mesNasc, setMesNasc] = useState(nascPartes[1]);
  const [anoNasc, setAnoNasc] = useState(nascPartes[2]);

  const diaNascRef = useRef<TextInput>(null);
  const mesNascRef = useRef<TextInput>(null);
  const anoNascRef = useRef<TextInput>(null);

  function partesToIso(dia: string, mes: string, ano: string): string | null {
    if (dia.length === 2 && mes.length === 2 && ano.length === 4) {
      return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
    }
    return null;
  }

  const updateMutation = useMutation({
    mutationFn: () =>
      api.put("/portal/meu-perfil", {
        nome: nome.trim() || undefined,
        email: email.trim() || undefined,
        data_nascimento: partesToIso(diaNasc, mesNasc, anoNasc),
      }, token),
    onSuccess: (data) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setClienteData({
        nome: data.nome,
        email: data.email,
        data_nascimento: data.data_nascimento,
      });
      setEditing(false);
    },
    onError: (e: any) => Alert.alert("Erro", e.message),
  });

  async function handleLogout() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
    router.replace("/login");
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const initials = (usuario?.nome ?? "")
    .split(" ")
    .slice(0, 2)
    .map((p: string) => p[0])
    .join("")
    .toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={styles.title}>Perfil</Text>
        <TouchableOpacity
          onPress={() => setEditing((v) => !v)}
          style={styles.editBtn}
          activeOpacity={0.8}
        >
          <Feather name={editing ? "x" : "edit-2"} size={16} color={colors.light.golden} />
          <Text style={styles.editBtnText}>{editing ? "Cancelar" : "Editar"}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.userName}>{usuario?.nome}</Text>
            {usuario?.empresa && (
              <View style={styles.empresaChip}>
                <Feather name="briefcase" size={12} color={colors.light.golden} />
                <Text style={styles.empresaText}>{usuario.empresa.nome}</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Field
              icon="user"
              label="Nome"
              value={editing ? nome : (usuario?.nome ?? "—")}
              editable={editing}
              onChangeText={setNome}
            />
            <Divider />
            <Field
              icon="phone"
              label="Telefone"
              value={usuario?.telefone ?? "—"}
              editable={false}
            />
            <Divider />
            <Field
              icon="mail"
              label="E-mail"
              value={editing ? email : (usuario?.email ?? "—")}
              editable={editing}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Divider />
            {editing ? (
              <View style={styles.fieldWrap}>
                <View style={styles.fieldLabelRow}>
                  <Feather name="gift" size={14} color={colors.light.mutedForeground} />
                  <Text style={styles.fieldLabel}>Data de nascimento</Text>
                </View>
                <View style={styles.dateRow}>
                  <TextInput
                    ref={diaNascRef}
                    style={styles.dateInput}
                    value={diaNasc}
                    onChangeText={(t) => {
                      const v = t.replace(/\D/g, "").slice(0, 2);
                      setDiaNasc(v);
                      if (v.length === 2) mesNascRef.current?.focus();
                    }}
                    placeholder="DD"
                    placeholderTextColor={colors.light.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.dateSep}>/</Text>
                  <TextInput
                    ref={mesNascRef}
                    style={styles.dateInput}
                    value={mesNasc}
                    onChangeText={(t) => {
                      const v = t.replace(/\D/g, "").slice(0, 2);
                      setMesNasc(v);
                      if (v.length === 2) anoNascRef.current?.focus();
                    }}
                    placeholder="MM"
                    placeholderTextColor={colors.light.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                  <Text style={styles.dateSep}>/</Text>
                  <TextInput
                    ref={anoNascRef}
                    style={[styles.dateInput, { width: 70 }]}
                    value={anoNasc}
                    onChangeText={(t) => setAnoNasc(t.replace(/\D/g, "").slice(0, 4))}
                    placeholder="AAAA"
                    placeholderTextColor={colors.light.mutedForeground}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
              </View>
            ) : (
              <Field
                icon="gift"
                label="Data de nascimento"
                value={(() => {
                  const p = isoToPartes(usuario?.data_nascimento);
                  return p[0] ? `${p[0]}/${p[1]}/${p[2]}` : "—";
                })()}
                editable={false}
              />
            )}
          </View>

          {editing && (
            <Pressable
              onPress={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
              style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }]}
            >
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>
                {updateMutation.isPending ? "Salvando..." : "Salvar alterações"}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
          >
            <Feather name="log-out" size={16} color={colors.light.destructive} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({
  icon, label, value, editable, onChangeText, keyboardType, placeholder,
}: {
  icon: string;
  label: string;
  value: string;
  editable: boolean;
  onChangeText?: (t: string) => void;
  keyboardType?: any;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldIconWrap}>
        <Feather name={icon as any} size={15} color={colors.light.golden} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {editable ? (
          <TextInput
            style={styles.fieldInput}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            placeholder={placeholder}
            placeholderTextColor={colors.light.mutedForeground}
            autoCapitalize="none"
          />
        ) : (
          <Text style={styles.fieldValue}>{value}</Text>
        )}
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.5,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.light.goldenLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  editBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.golden,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  avatarWrap: { alignItems: "center", marginBottom: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.golden,
  },
  userName: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.3,
  },
  empresaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    backgroundColor: colors.light.goldenLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  empresaText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: colors.light.golden,
  },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 20,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  field: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 14,
  },
  fieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginBottom: 3,
  },
  fieldValue: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  fieldInput: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light.golden,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginHorizontal: 16,
  },
  fieldWrap: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  dateInput: {
    width: 48,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light.golden,
    paddingBottom: 4,
    textAlign: "center",
  },
  dateSep: {
    fontSize: 18,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginHorizontal: 6,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.light.destructiveLight,
    borderRadius: 16,
    paddingVertical: 14,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: colors.light.destructive,
  },
});
