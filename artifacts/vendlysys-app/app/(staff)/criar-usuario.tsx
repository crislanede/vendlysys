import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
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

type Perfil = "admin" | "agenda";

export default function CriarUsuarioScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.tipo === "staff" ? auth.token : null;
  const qc = useQueryClient();

  const params = useLocalSearchParams<{
    id?: string;
    nome?: string;
    email?: string;
    telefone?: string;
    perfil?: string;
  }>();

  const isEdit = !!params.id;

  const [nome, setNome] = useState(params.nome ?? "");
  const [email, setEmail] = useState(params.email ?? "");
  const [telefone, setTelefone] = useState(params.telefone ?? "");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [perfil, setPerfil] = useState<Perfil>((params.perfil as Perfil) ?? "agenda");
  const [showSenha, setShowSenha] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const telefoneRef = useRef<TextInput>(null);
  const senhaRef = useRef<TextInput>(null);
  const confirmarRef = useRef<TextInput>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        perfil,
      };
      if (isEdit) {
        if (senha) body.senha = senha;
        return api.put(`/usuarios/${params.id}`, body, token);
      }
      body.email = email.trim().toLowerCase();
      body.senha = senha;
      return api.post("/usuarios", body, token);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["usuarios"] });
      Alert.alert(
        isEdit ? "Usuário atualizado!" : "Usuário criado!",
        `${nome.trim()} foi ${isEdit ? "atualizado" : "cadastrado"} com sucesso.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", e.message ?? "Não foi possível salvar o usuário.");
    },
  });

  function handleSubmit() {
    if (!nome.trim()) { Alert.alert("Preencha o nome."); return; }
    if (!isEdit && (!email.trim() || !email.includes("@"))) { Alert.alert("Informe um e-mail válido."); return; }
    if (!isEdit) {
      if (!senha || senha.length < 6) { Alert.alert("A senha deve ter pelo menos 6 caracteres."); return; }
      if (senha !== confirmarSenha) { Alert.alert("As senhas não coincidem."); return; }
    } else if (senha) {
      if (senha.length < 6) { Alert.alert("A nova senha deve ter pelo menos 6 caracteres."); return; }
      if (senha !== confirmarSenha) { Alert.alert("As senhas não coincidem."); return; }
    }
    mutation.mutate();
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? "Editar usuário" : "Novo usuário"}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Informações</Text>

          <View style={styles.card}>
            <Field
              icon="user"
              label="Nome completo"
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Maria Silva"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              autoCapitalize="words"
            />
            <Divider />
            {isEdit ? (
              <View style={styles.fieldRow}>
                <View style={styles.fieldIconWrap}>
                  <Feather name="mail" size={15} color={colors.light.golden} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>E-mail (não editável)</Text>
                  <Text style={[styles.fieldInput, { color: colors.light.mutedForeground }]}>{email || "—"}</Text>
                </View>
              </View>
            ) : (
              <Field
                ref={emailRef}
                icon="mail"
                label="E-mail de acesso"
                value={email}
                onChangeText={setEmail}
                placeholder="Ex: maria@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => telefoneRef.current?.focus()}
              />
            )}
            <Divider />
            <Field
              ref={telefoneRef}
              icon="phone"
              label="Telefone (opcional)"
              value={telefone}
              onChangeText={setTelefone}
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => senhaRef.current?.focus()}
            />
          </View>

          <Text style={styles.sectionLabel}>
            {isEdit ? "Nova senha (deixe em branco para não alterar)" : "Senha de acesso"}
          </Text>

          <View style={styles.card}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldIconWrap}>
                <Feather name="lock" size={15} color={colors.light.golden} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>
                  {isEdit ? "Nova senha (opcional)" : "Senha"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <TextInput
                    ref={senhaRef}
                    style={[styles.fieldInput, { flex: 1 }]}
                    value={senha}
                    onChangeText={setSenha}
                    placeholder={isEdit ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                    placeholderTextColor={colors.light.mutedForeground}
                    secureTextEntry={!showSenha}
                    returnKeyType="next"
                    onSubmitEditing={() => confirmarRef.current?.focus()}
                  />
                  <TouchableOpacity onPress={() => setShowSenha((v) => !v)} style={{ padding: 4 }}>
                    <Feather name={showSenha ? "eye-off" : "eye"} size={16} color={colors.light.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <Divider />
            <Field
              ref={confirmarRef}
              icon="check-circle"
              label={isEdit ? "Confirmar nova senha" : "Confirmar senha"}
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              placeholder="Repita a senha"
              secureTextEntry={!showSenha}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <Text style={styles.sectionLabel}>Perfil de acesso</Text>

          <View style={styles.perfilCard}>
            <PerfilOption
              value="agenda"
              selected={perfil === "agenda"}
              onSelect={() => setPerfil("agenda")}
              icon="calendar"
              label="Agenda"
              desc="Acessa agenda e clientes. Não gerencia configurações."
            />
            <Divider />
            <PerfilOption
              value="admin"
              selected={perfil === "admin"}
              onSelect={() => setPerfil("admin")}
              icon="shield"
              label="Administrador"
              desc="Acesso completo: financeiro, usuários e configurações."
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={mutation.isPending}
            style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
          >
            {mutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name={isEdit ? "save" : "user-plus"} size={18} color="#fff" />
                <Text style={styles.submitBtnText}>{isEdit ? "Salvar alterações" : "Criar usuário"}</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const Field = React.forwardRef<TextInput, {
  icon: string;
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
  secureTextEntry?: boolean;
}>(({ icon, label, value, onChangeText, placeholder, keyboardType, autoCapitalize, returnKeyType, onSubmitEditing, secureTextEntry }, ref) => (
  <View style={styles.fieldRow}>
    <View style={styles.fieldIconWrap}>
      <Feather name={icon as any} size={15} color={colors.light.golden} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        ref={ref}
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.light.mutedForeground}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? "none"}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        secureTextEntry={secureTextEntry}
      />
    </View>
  </View>
));

function Divider() {
  return <View style={styles.divider} />;
}

function PerfilOption({ value, selected, onSelect, icon, label, desc }: {
  value: string; selected: boolean; onSelect: () => void;
  icon: string; label: string; desc: string;
}) {
  return (
    <TouchableOpacity onPress={onSelect} style={styles.perfilRow} activeOpacity={0.8}>
      <View style={[styles.perfilIconWrap, selected && styles.perfilIconActive]}>
        <Feather name={icon as any} size={16} color={selected ? "#fff" : colors.light.golden} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.perfilLabel}>{label}</Text>
        <Text style={styles.perfilDesc}>{desc}</Text>
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.light.secondary,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.3,
  },
  scroll: { paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 20,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  perfilCard: {
    backgroundColor: colors.light.card,
    borderRadius: 20,
    padding: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 28,
  },
  fieldRow: {
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
    marginBottom: 4,
  },
  fieldInput: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.light.border,
    paddingBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.light.border,
    marginHorizontal: 16,
  },
  perfilRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  perfilIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  perfilIconActive: {
    backgroundColor: colors.light.primary,
  },
  perfilLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  perfilDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
    lineHeight: 16,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: colors.light.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.light.primary,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: colors.light.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
