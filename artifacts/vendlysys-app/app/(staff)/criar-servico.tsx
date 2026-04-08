import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/utils/api";

const CATEGORIAS = ["Geral", "Cabelo", "Barba", "Estética", "Unhas", "Massagem", "Sobrancelha", "Coloração", "Tratamento", "Outros"];

export default function CriarServicoScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const qc = useQueryClient();
  const token = auth.tipo === "staff" ? auth.token : null;
  const params = useLocalSearchParams<{
    id?: string;
    nome?: string;
    categoria?: string;
    descricao?: string;
    duracao_minutos?: string;
    valor?: string;
    preco_promocional?: string;
    preco_descricao?: string;
    ativo?: string;
  }>();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isEdit = !!params.id;

  const [nome, setNome] = useState(params.nome ?? "");
  const [categoria, setCategoria] = useState(params.categoria ?? "Geral");
  const [descricao, setDescricao] = useState(params.descricao ?? "");
  const [duracaoMin, setDuracaoMin] = useState(params.duracao_minutos ?? "60");
  const [valor, setValor] = useState(params.valor ? String(Number(params.valor).toFixed(2)) : "");
  const [precoPromo, setPrecoPromo] = useState(params.preco_promocional ? String(Number(params.preco_promocional).toFixed(2)) : "");
  const [precoDescricao, setPrecoDescricao] = useState(params.preco_descricao ?? "");
  const [ativo, setAtivo] = useState(params.ativo !== "false");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!nome.trim()) {
      Alert.alert("Atenção", "O nome do serviço é obrigatório.");
      return;
    }
    const valorNum = parseFloat(valor.replace(",", "."));
    if (isNaN(valorNum) || valorNum < 0) {
      Alert.alert("Atenção", "Informe um valor válido para o serviço.");
      return;
    }
    const duracaoNum = parseInt(duracaoMin, 10);
    if (isNaN(duracaoNum) || duracaoNum <= 0) {
      Alert.alert("Atenção", "Informe uma duração válida em minutos.");
      return;
    }
    const promoNum = precoPromo ? parseFloat(precoPromo.replace(",", ".")) : null;

    setSalvando(true);
    try {
      const body = {
        nome: nome.trim(),
        categoria,
        descricao: descricao.trim() || undefined,
        duracao_minutos: duracaoNum,
        valor: valorNum,
        preco_promocional: promoNum,
        preco_descricao: precoDescricao.trim() || undefined,
        ativo,
      };
      if (isEdit) {
        await api.put(`/servicos/${params.id}`, body, token);
      } else {
        await api.post("/servicos", body, token);
      }
      qc.invalidateQueries({ queryKey: ["servicos"] });
      router.back();
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Não foi possível salvar o serviço.");
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
        <Text style={styles.title}>{isEdit ? "Editar Serviço" : "Novo Serviço"}</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Field label="Nome do serviço *">
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Corte masculino"
              placeholderTextColor={colors.light.mutedForeground}
            />
          </Field>

          <Field label="Categoria">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categorias}>
              {CATEGORIAS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategoria(c)}
                  style={[styles.catChip, categoria === c && styles.catChipSelected]}
                >
                  <Text style={[styles.catChipText, categoria === c && styles.catChipTextSelected]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Field>

          <Field label="Descrição">
            <TextInput
              style={[styles.input, styles.textarea]}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Descreva o serviço (opcional)"
              placeholderTextColor={colors.light.mutedForeground}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </Field>

          <Field label="Duração (minutos) *">
            <TextInput
              style={styles.input}
              value={duracaoMin}
              onChangeText={setDuracaoMin}
              placeholder="60"
              placeholderTextColor={colors.light.mutedForeground}
              keyboardType="number-pad"
            />
          </Field>

          <Field label="Valor (R$) *">
            <TextInput
              style={styles.input}
              value={valor}
              onChangeText={setValor}
              placeholder="0,00"
              placeholderTextColor={colors.light.mutedForeground}
              keyboardType="decimal-pad"
            />
          </Field>

          <Field label="Preço promocional (R$)">
            <TextInput
              style={styles.input}
              value={precoPromo}
              onChangeText={setPrecoPromo}
              placeholder="Deixe vazio se não houver"
              placeholderTextColor={colors.light.mutedForeground}
              keyboardType="decimal-pad"
            />
          </Field>

          <Field label="Descrição do preço">
            <TextInput
              style={styles.input}
              value={precoDescricao}
              onChangeText={setPrecoDescricao}
              placeholder="Ex: à partir de, ou por sessão"
              placeholderTextColor={colors.light.mutedForeground}
            />
          </Field>

          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Serviço ativo</Text>
              <Text style={styles.switchSubLabel}>Aparece no portal do cliente</Text>
            </View>
            <Switch
              value={ativo}
              onValueChange={setAtivo}
              trackColor={{ false: colors.light.border, true: colors.light.golden }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <Pressable
          onPress={salvar}
          disabled={salvando}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }, salvando && { opacity: 0.6 }]}
        >
          <Text style={styles.btnText}>{salvando ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar serviço"}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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
  scroll: { paddingHorizontal: 20, paddingTop: 4, gap: 16 },
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
  fieldLabel: {
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
  categorias: { gap: 8, paddingVertical: 2 },
  catChip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.light.background,
    borderWidth: 1,
    borderColor: colors.light.border,
  },
  catChipSelected: {
    backgroundColor: colors.light.golden,
    borderColor: colors.light.golden,
  },
  catChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  catChipTextSelected: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
  },
  switchSubLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
  },
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
