import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
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
import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/utils/api";

type Cliente = { id: number; nome: string; telefone?: string };
type Servico = { id: number; nome: string; duracao_minutos: number; valor: number };
type Profissional = { id: number; nome: string };

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function addMinutes(hora: string, min: number) {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + min;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
}

export default function CriarAgendamentoScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const qc = useQueryClient();
  const token = auth.tipo === "staff" ? auth.token : null;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const params = useLocalSearchParams<{ data?: string; hora?: string }>();

  const [clienteId, setClienteId] = useState<number | null>(null);
  const [clienteNome, setClienteNome] = useState("");
  const [clienteBusca, setClienteBusca] = useState("");
  const [mostrarClientes, setMostrarClientes] = useState(false);

  const [servico, setServico] = useState("");
  const [duracaoMin, setDuracaoMin] = useState(60);

  const [data, setData] = useState(params.data ?? toDateStr(new Date()));
  const [horaInicio, setHoraInicio] = useState(params.hora ?? "09:00");
  const [horaFim, setHoraFim] = useState(() => addMinutes(params.hora ?? "09:00", 60));
  const [valor, setValor] = useState("");
  const [profissionalId, setProfissionalId] = useState<number | null>(null);
  const [profissionalNome, setProfissionalNome] = useState("");
  const [mostrarProfissionais, setMostrarProfissionais] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [status, setStatus] = useState<"agendado" | "confirmado">("agendado");
  const [salvando, setSalvando] = useState(false);

  const { data: clientes } = useQuery<Cliente[]>({
    queryKey: ["clientes"],
    queryFn: () => api.get("/clientes", token),
    enabled: !!token,
  });

  const { data: servicos } = useQuery<Servico[]>({
    queryKey: ["servicos"],
    queryFn: () => api.get("/servicos?ativo=true", token),
    enabled: !!token,
  });

  const { data: profissionais } = useQuery<Profissional[]>({
    queryKey: ["profissionais"],
    queryFn: () => api.get("/profissionais", token),
    enabled: !!token,
  });

  const clientesFiltrados = (clientes ?? []).filter((c) =>
    c.nome.toLowerCase().includes(clienteBusca.toLowerCase()) ||
    (c.telefone ?? "").includes(clienteBusca)
  );

  function selecionarServico(s: Servico) {
    setServico(s.nome);
    setDuracaoMin(s.duracao_minutos);
    setHoraFim(addMinutes(horaInicio, s.duracao_minutos));
    if (!valor) setValor(s.valor.toFixed(2));
  }

  function onHoraInicioChange(v: string) {
    setHoraInicio(v);
    setHoraFim(addMinutes(v, duracaoMin));
  }

  async function salvar() {
    if (!servico.trim()) { Alert.alert("Atenção", "Informe o serviço."); return; }
    if (!data) { Alert.alert("Atenção", "Informe a data."); return; }
    if (!horaInicio) { Alert.alert("Atenção", "Informe o horário de início."); return; }

    setSalvando(true);
    try {
      const body: Record<string, any> = {
        servico: servico.trim(),
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim || undefined,
        status,
      };
      if (clienteId) body.cliente_id = clienteId;
      if (profissionalId) body.profissional_id = profissionalId;
      if (valor) body.valor = parseFloat(valor.replace(",", "."));
      if (observacoes.trim()) body.observacoes = observacoes.trim();

      await api.post("/agendamentos", body, token);
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Não foi possível criar o agendamento.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>
        <Text style={styles.title}>Novo Agendamento</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Cliente */}
          <View style={styles.field}>
            <Text style={styles.label}>Cliente</Text>
            <Pressable
              onPress={() => setMostrarClientes((v) => !v)}
              style={styles.selectBtn}
            >
              <Feather name="user" size={15} color={colors.light.mutedForeground} />
              <Text style={[styles.selectText, clienteNome && styles.selectTextFilled]}>
                {clienteNome || "Selecionar cliente (opcional)"}
              </Text>
              <Feather name={mostrarClientes ? "chevron-up" : "chevron-down"} size={16} color={colors.light.mutedForeground} />
            </Pressable>
            {mostrarClientes && (
              <View style={styles.dropdown}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar cliente..."
                  placeholderTextColor={colors.light.mutedForeground}
                  value={clienteBusca}
                  onChangeText={setClienteBusca}
                  autoFocus
                />
                <Pressable
                  onPress={() => { setClienteId(null); setClienteNome(""); setMostrarClientes(false); setClienteBusca(""); }}
                  style={[styles.dropdownItem, styles.dropdownItemFirst]}
                >
                  <Text style={styles.dropdownItemText}>— Sem cliente</Text>
                </Pressable>
                {clientesFiltrados.slice(0, 8).map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => { setClienteId(c.id); setClienteNome(c.nome); setMostrarClientes(false); setClienteBusca(""); }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{c.nome}</Text>
                    {c.telefone && <Text style={styles.dropdownItemSub}>{c.telefone}</Text>}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Serviço */}
          <View style={styles.field}>
            <Text style={styles.label}>Serviço *</Text>
            <TextInput
              style={styles.input}
              value={servico}
              onChangeText={setServico}
              placeholder="Digite ou selecione abaixo"
              placeholderTextColor={colors.light.mutedForeground}
            />
            {servicos && servicos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {servicos.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => selecionarServico(s)}
                    style={[styles.chip, servico === s.nome && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, servico === s.nome && styles.chipTextSelected]}>{s.nome}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Data */}
          <View style={styles.field}>
            <Text style={styles.label}>Data *</Text>
            <TextInput
              style={styles.input}
              value={data}
              onChangeText={setData}
              placeholder="AAAA-MM-DD"
              placeholderTextColor={colors.light.mutedForeground}
              keyboardType="numbers-and-punctuation"
            />
          </View>

          {/* Horários */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Início *</Text>
              <TextInput
                style={styles.input}
                value={horaInicio}
                onChangeText={onHoraInicioChange}
                placeholder="09:00"
                placeholderTextColor={colors.light.mutedForeground}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Fim</Text>
              <TextInput
                style={styles.input}
                value={horaFim}
                onChangeText={setHoraFim}
                placeholder="10:00"
                placeholderTextColor={colors.light.mutedForeground}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          {/* Valor */}
          <View style={styles.field}>
            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput
              style={styles.input}
              value={valor}
              onChangeText={setValor}
              placeholder="0,00"
              placeholderTextColor={colors.light.mutedForeground}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Profissional */}
          {profissionais && profissionais.length > 0 && (
            <View style={styles.field}>
              <Text style={styles.label}>Profissional</Text>
              <Pressable
                onPress={() => setMostrarProfissionais((v) => !v)}
                style={styles.selectBtn}
              >
                <Feather name="scissors" size={15} color={colors.light.mutedForeground} />
                <Text style={[styles.selectText, profissionalNome && styles.selectTextFilled]}>
                  {profissionalNome || "Selecionar profissional (opcional)"}
                </Text>
                <Feather name={mostrarProfissionais ? "chevron-up" : "chevron-down"} size={16} color={colors.light.mutedForeground} />
              </Pressable>
              {mostrarProfissionais && (
                <View style={styles.dropdown}>
                  <Pressable
                    onPress={() => { setProfissionalId(null); setProfissionalNome(""); setMostrarProfissionais(false); }}
                    style={[styles.dropdownItem, styles.dropdownItemFirst]}
                  >
                    <Text style={styles.dropdownItemText}>— Sem profissional</Text>
                  </Pressable>
                  {profissionais.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => { setProfissionalId(p.id); setProfissionalNome(p.nome); setMostrarProfissionais(false); }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>{p.nome}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Status */}
          <View style={styles.field}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {(["agendado", "confirmado"] as const).map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setStatus(s)}
                  style={[styles.statusChip, status === s && styles.statusChipSelected]}
                >
                  <Text style={[styles.statusChipText, status === s && styles.statusChipTextSelected]}>
                    {s === "agendado" ? "Agendado" : "Confirmado"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Observações */}
          <View style={styles.field}>
            <Text style={styles.label}>Observações</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={observacoes}
              onChangeText={setObservacoes}
              placeholder="Alguma observação ou detalhe..."
              placeholderTextColor={colors.light.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        </View>

        <Pressable
          onPress={salvar}
          disabled={salvando}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }, salvando && { opacity: 0.6 }]}
        >
          <Text style={styles.btnText}>{salvando ? "Salvando..." : "Criar agendamento"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.light.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.3,
  },
  scroll: { paddingHorizontal: 20, gap: 16 },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 20,
    padding: 16,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  field: { gap: 6 },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  input: {
    backgroundColor: colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
  },
  textarea: { minHeight: 72, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 12,
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  selectTextFilled: { color: colors.light.foreground },
  dropdown: {
    backgroundColor: colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    overflow: "hidden",
    maxHeight: 220,
  },
  dropdownItemFirst: { borderBottomWidth: 1, borderBottomColor: colors.light.border },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
  },
  dropdownItemSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
  },
  searchInput: {
    padding: 12,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  chips: { gap: 8, paddingVertical: 2 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  chipSelected: { backgroundColor: colors.light.golden, borderColor: colors.light.golden },
  chipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  chipTextSelected: { color: "#fff" },
  statusRow: { flexDirection: "row", gap: 10 },
  statusChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  statusChipSelected: { backgroundColor: colors.light.foreground, borderColor: colors.light.foreground },
  statusChipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  statusChipTextSelected: { color: "#fff" },
  btn: {
    backgroundColor: colors.light.foreground,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
