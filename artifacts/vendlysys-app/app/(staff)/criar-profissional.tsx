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

export default function CriarProfissionalScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.tipo === "staff" ? auth.token : null;
  const qc = useQueryClient();

  const params = useLocalSearchParams<{
    id?: string;
    nome?: string;
    telefone?: string;
    email?: string;
    especialidade?: string;
    ativo?: string;
  }>();

  const isEdit = !!params.id;

  const [nome, setNome] = useState(params.nome ?? "");
  const [telefone, setTelefone] = useState(params.telefone ?? "");
  const [email, setEmail] = useState(params.email ?? "");
  const [especialidade, setEspecialidade] = useState(params.especialidade ?? "");

  const telefoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const espRef = useRef<TextInput>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        especialidade: especialidade.trim() || undefined,
      };
      if (isEdit) return api.put(`/profissionais/${params.id}`, body, token);
      return api.post("/profissionais", body, token);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["profissionais"] });
      Alert.alert(
        isEdit ? "Profissional atualizado!" : "Profissional cadastrado!",
        `${nome.trim()} foi ${isEdit ? "atualizado" : "cadastrado"} com sucesso.`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    },
    onError: (e: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Erro", e.message ?? "Não foi possível salvar.");
    },
  });

  function handleSubmit() {
    if (!nome.trim()) { Alert.alert("Informe o nome do profissional."); return; }
    mutation.mutate();
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? "Editar profissional" : "Novo profissional"}</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.hint}>
            Profissionais são quem atende os clientes. Não precisam ter acesso ao sistema.
          </Text>

          <Text style={styles.sectionLabel}>Dados do profissional</Text>
          <View style={styles.card}>
            <Field
              icon="user"
              label="Nome completo *"
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Ana Costa"
              returnKeyType="next"
              onSubmitEditing={() => espRef.current?.focus()}
              autoCapitalize="words"
            />
            <Divider />
            <Field
              ref={espRef}
              icon="scissors"
              label="Especialidade (opcional)"
              value={especialidade}
              onChangeText={setEspecialidade}
              placeholder="Ex: Colorista, Cabeleireira, Esteticista"
              returnKeyType="next"
              onSubmitEditing={() => telefoneRef.current?.focus()}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.sectionLabel}>Contato</Text>
          <View style={styles.card}>
            <Field
              ref={telefoneRef}
              icon="phone"
              label="Telefone (opcional)"
              value={telefone}
              onChangeText={setTelefone}
              placeholder="(11) 99999-9999"
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <Divider />
            <Field
              ref={emailRef}
              icon="mail"
              label="E-mail (opcional)"
              value={email}
              onChangeText={setEmail}
              placeholder="profissional@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
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
                <Text style={styles.submitBtnText}>
                  {isEdit ? "Salvar alterações" : "Cadastrar profissional"}
                </Text>
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
}>(({ icon, label, value, onChangeText, placeholder, keyboardType, autoCapitalize, returnKeyType, onSubmitEditing }, ref) => (
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
      />
    </View>
  </View>
));

function Divider() {
  return <View style={styles.divider} />;
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
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    backgroundColor: colors.light.goldenLight,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
    lineHeight: 18,
  },
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
    marginBottom: 4,
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
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 28,
    shadowColor: colors.light.primary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
