import { Feather } from "@expo/vector-icons";
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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import colors from "@/constants/colors";
import { api } from "@/utils/api";

function formatarCep(valor: string): string {
  const nums = valor.replace(/\D/g, "").slice(0, 8);
  if (nums.length > 5) return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  return nums;
}

function isoToPartes(iso?: string): [string, string, string] {
  if (!iso) return ["", "", ""];
  const parts = iso.split("T")[0].split("-");
  if (parts.length === 3) return [parts[2], parts[1], parts[0]]; // [dia, mes, ano]
  return ["", "", ""];
}

function partesToIso(dia: string, mes: string, ano: string): string | undefined {
  if (dia.length === 2 && mes.length === 2 && ano.length === 4) {
    return `${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  return undefined;
}

export default function CriarClienteScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.tipo === "staff" ? auth.token : null;
  const qc = useQueryClient();

  const params = useLocalSearchParams<{
    id?: string;
    nome?: string;
    telefone?: string;
    email?: string;
    data_nascimento?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    observacoes?: string;
  }>();

  const isEdit = !!params.id;

  const [nome, setNome] = useState(params.nome ?? "");
  const [telefone, setTelefone] = useState(params.telefone ?? "");
  const [email, setEmail] = useState(params.email ?? "");
  const [nascPartes] = useState(() => isoToPartes(params.data_nascimento));
  const [diaNasc, setDiaNasc] = useState(nascPartes[0]);
  const [mesNasc, setMesNasc] = useState(nascPartes[1]);
  const [anoNasc, setAnoNasc] = useState(nascPartes[2]);
  const [obs, setObs] = useState(params.observacoes ?? "");

  const [cep, setCep] = useState(params.cep ? formatarCep(params.cep) : "");
  const [logradouro, setLogradouro] = useState(params.logradouro ?? "");
  const [numero, setNumero] = useState(params.numero ?? "");
  const [complemento, setComplemento] = useState(params.complemento ?? "");
  const [bairro, setBairro] = useState(params.bairro ?? "");
  const [cidade, setCidade] = useState(params.cidade ?? "");
  const [estado, setEstado] = useState(params.estado ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState("");

  const [salvando, setSalvando] = useState(false);

  const telefoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const diaNascRef = useRef<TextInput>(null);
  const mesNascRef = useRef<TextInput>(null);
  const anoNascRef = useRef<TextInput>(null);
  const cepRef = useRef<TextInput>(null);
  const numeroRef = useRef<TextInput>(null);
  const complementoRef = useRef<TextInput>(null);
  const obsRef = useRef<TextInput>(null);

  async function buscarCep(valor: string) {
    const apenasNumeros = valor.replace(/\D/g, "");
    if (apenasNumeros.length !== 8) return;
    setBuscandoCep(true);
    setErroCep("");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${apenasNumeros}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErroCep("CEP não encontrado.");
        return;
      }
      setLogradouro(data.logradouro || "");
      setComplemento(data.complemento || "");
      setBairro(data.bairro || "");
      setCidade(data.localidade || "");
      setEstado(data.uf || "");
      setTimeout(() => numeroRef.current?.focus(), 100);
    } catch {
      setErroCep("Erro ao buscar CEP. Verifique sua conexão.");
    } finally {
      setBuscandoCep(false);
    }
  }

  async function salvar() {
    if (!nome.trim()) {
      Alert.alert("Campo obrigatório", "O nome do cliente é obrigatório.");
      return;
    }
    setSalvando(true);
    try {
      const body: Record<string, unknown> = {
        nome: nome.trim(),
        telefone: telefone.trim() || undefined,
        email: email.trim() || undefined,
        cep: cep.replace(/\D/g, "") || undefined,
        logradouro: logradouro.trim() || undefined,
        numero: numero.trim() || undefined,
        complemento: complemento.trim() || undefined,
        bairro: bairro.trim() || undefined,
        cidade: cidade.trim() || undefined,
        estado: estado.trim() || undefined,
        observacoes: obs.trim() || undefined,
      };
      const iso = partesToIso(diaNasc, mesNasc, anoNasc);
      if (iso) body.data_nascimento = iso;

      if (isEdit) {
        await api.put(`/clientes/${params.id}`, body, token);
      } else {
        await api.post("/clientes", body, token);
      }
      await qc.invalidateQueries({ queryKey: ["clientes"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e.message ?? "Não foi possível salvar o cliente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.light.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Feather name="arrow-left" size={22} color={colors.light.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>{isEdit ? "Editar cliente" : "Novo cliente"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Dados pessoais */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dados do cliente</Text>

          <Field label="Nome *" icon="user">
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome completo"
              placeholderTextColor={colors.light.mutedForeground}
              returnKeyType="next"
              onSubmitEditing={() => telefoneRef.current?.focus()}
              autoCapitalize="words"
            />
          </Field>

          <Field label="Telefone / WhatsApp" icon="phone">
            <TextInput
              ref={telefoneRef}
              style={styles.input}
              value={telefone}
              onChangeText={setTelefone}
              placeholder="(11) 99999-9999"
              placeholderTextColor={colors.light.mutedForeground}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
            />
          </Field>

          <Field label="E-mail" icon="mail">
            <TextInput
              ref={emailRef}
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemplo.com"
              placeholderTextColor={colors.light.mutedForeground}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => diaNascRef.current?.focus()}
            />
          </Field>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Data de nascimento</Text>
            <View style={[styles.inputRow, { gap: 0 }]}>
              <Feather name="calendar" size={15} color={colors.light.mutedForeground} style={{ marginRight: 10 }} />
              <TextInput
                ref={diaNascRef}
                style={[styles.input, styles.dateBox]}
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
                style={[styles.input, styles.dateBox]}
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
                style={[styles.input, styles.dateBox, { flex: 1 }]}
                value={anoNasc}
                onChangeText={(t) => setAnoNasc(t.replace(/\D/g, "").slice(0, 4))}
                placeholder="AAAA"
                placeholderTextColor={colors.light.mutedForeground}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="next"
                onSubmitEditing={() => cepRef.current?.focus()}
              />
            </View>
          </View>
        </View>

        {/* Endereço */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Endereço</Text>

          <Field label="CEP" icon="map-pin" loading={buscandoCep}>
            <TextInput
              ref={cepRef}
              style={styles.input}
              value={cep}
              onChangeText={(t) => {
                const formatted = formatarCep(t);
                setCep(formatted);
                setErroCep("");
                buscarCep(formatted);
              }}
              placeholder="00000-000"
              placeholderTextColor={colors.light.mutedForeground}
              keyboardType="numeric"
              maxLength={9}
              returnKeyType="next"
              onSubmitEditing={() => numeroRef.current?.focus()}
            />
          </Field>
          {erroCep ? <Text style={styles.erroCep}>{erroCep}</Text> : null}

          <Field label="Logradouro" icon="home">
            <TextInput
              style={styles.input}
              value={logradouro}
              onChangeText={setLogradouro}
              placeholder="Rua, Avenida..."
              placeholderTextColor={colors.light.mutedForeground}
              returnKeyType="next"
              onSubmitEditing={() => numeroRef.current?.focus()}
            />
          </Field>

          <View style={styles.row}>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.label}>Número</Text>
              <View style={styles.inputRow}>
                <TextInput
                  ref={numeroRef}
                  style={styles.input}
                  value={numero}
                  onChangeText={setNumero}
                  placeholder="166"
                  placeholderTextColor={colors.light.mutedForeground}
                  keyboardType="numeric"
                  returnKeyType="next"
                  onSubmitEditing={() => complementoRef.current?.focus()}
                />
              </View>
            </View>
            <View style={[styles.fieldWrap, { flex: 1.8 }]}>
              <Text style={styles.label}>Complemento</Text>
              <View style={styles.inputRow}>
                <TextInput
                  ref={complementoRef}
                  style={styles.input}
                  value={complemento}
                  onChangeText={setComplemento}
                  placeholder="Apto, Bloco..."
                  placeholderTextColor={colors.light.mutedForeground}
                  returnKeyType="next"
                />
              </View>
            </View>
          </View>

          <Field label="Bairro" icon="layers">
            <TextInput
              style={styles.input}
              value={bairro}
              onChangeText={setBairro}
              placeholder="Bairro"
              placeholderTextColor={colors.light.mutedForeground}
              returnKeyType="next"
            />
          </Field>

          <View style={styles.row}>
            <View style={[styles.fieldWrap, { flex: 1 }]}>
              <Text style={styles.label}>UF</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={estado}
                  onChangeText={(t) => setEstado(t.toUpperCase().slice(0, 2))}
                  placeholder="SP"
                  placeholderTextColor={colors.light.mutedForeground}
                  autoCapitalize="characters"
                  maxLength={2}
                  returnKeyType="next"
                />
              </View>
            </View>
            <View style={[styles.fieldWrap, { flex: 3 }]}>
              <Text style={styles.label}>Cidade</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={cidade}
                  onChangeText={setCidade}
                  placeholder="São Paulo"
                  placeholderTextColor={colors.light.mutedForeground}
                  returnKeyType="next"
                  onSubmitEditing={() => obsRef.current?.focus()}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Observações */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Observações</Text>
          <View style={[styles.inputRow, styles.textareaRow]}>
            <TextInput
              ref={obsRef}
              style={[styles.input, styles.textarea]}
              value={obs}
              onChangeText={setObs}
              placeholder="Alergias, preferências, observações gerais..."
              placeholderTextColor={colors.light.mutedForeground}
              multiline
              numberOfLines={3}
              returnKeyType="done"
            />
          </View>
        </View>

        <Pressable
          onPress={salvar}
          disabled={salvando}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85 }, salvando && { opacity: 0.6 }]}
        >
          {salvando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{isEdit ? "Salvar alterações" : "Cadastrar cliente"}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  icon,
  loading,
  children,
}: {
  label: string;
  icon: string;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {loading ? (
          <ActivityIndicator size="small" color={colors.light.golden} />
        ) : (
          <Feather name={icon as any} size={15} color={colors.light.mutedForeground} />
        )}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    backgroundColor: colors.light.background,
  },
  backBtn: { width: 40, height: 40, alignItems: "flex-start", justifyContent: "center" },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  scroll: { padding: 20, gap: 16 },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  fieldWrap: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 4,
  },
  textareaRow: {
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
  },
  dateBox: {
    flex: 0,
    width: 44,
    textAlign: "center",
  },
  dateSep: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginHorizontal: 4,
  },
  textarea: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  erroCep: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#e53e3e",
    marginTop: -8,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 4,
    shadowColor: colors.light.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
