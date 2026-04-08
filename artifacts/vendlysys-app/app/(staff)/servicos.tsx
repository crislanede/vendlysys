import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/utils/api";

type Servico = {
  id: number;
  nome: string;
  categoria: string;
  descricao?: string | null;
  duracao_minutos: number;
  valor: number;
  preco_promocional?: number | null;
  preco_descricao?: string | null;
  ativo: boolean;
};

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDuracao(min: number) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function ServicosScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const qc = useQueryClient();
  const token = auth.tipo === "staff" ? auth.token : null;
  const isAdmin = auth.tipo === "staff" && auth.usuario.perfil === "admin";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, refetch, isRefetching } = useQuery<Servico[]>({
    queryKey: ["servicos"],
    queryFn: () => api.get("/servicos", token),
    enabled: !!token,
  });

  async function toggleAtivo(item: Servico) {
    const acao = item.ativo ? "desativar" : "ativar";
    Alert.alert(
      `${item.ativo ? "Desativar" : "Ativar"} serviço`,
      `Deseja ${acao} "${item.nome}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: item.ativo ? "Desativar" : "Ativar",
          style: item.ativo ? "destructive" : "default",
          onPress: async () => {
            try {
              await api.put(`/servicos/${item.id}`, { ativo: !item.ativo }, token);
              qc.invalidateQueries({ queryKey: ["servicos"] });
            } catch {
              Alert.alert("Erro", "Não foi possível alterar o status do serviço.");
            }
          },
        },
      ]
    );
  }

  async function excluir(item: Servico) {
    Alert.alert(
      "Excluir serviço",
      `Tem certeza que deseja excluir "${item.nome}"? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await api.del(`/servicos/${item.id}`, token);
              qc.invalidateQueries({ queryKey: ["servicos"] });
            } catch {
              Alert.alert("Erro", "Não foi possível excluir o serviço.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </Pressable>
        <Text style={styles.title}>Serviços</Text>
        {isAdmin && (
          <Pressable
            onPress={() => router.push("/(staff)/criar-servico")}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.light.golden} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 30 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="scissors" size={40} color={colors.light.border} />
              <Text style={styles.emptyText}>Nenhum serviço cadastrado</Text>
              {isAdmin && (
                <Pressable onPress={() => router.push("/(staff)/criar-servico")} style={({ pressed }) => [styles.emptyBtn, pressed && { opacity: 0.7 }]}>
                  <Text style={styles.emptyBtnText}>Adicionar serviço</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, !item.ativo && styles.cardInativo]}>
              <View style={styles.cardTop}>
                <View style={styles.cardLeft}>
                  <View style={styles.categoriaChip}>
                    <Text style={styles.categoriaText}>{item.categoria}</Text>
                  </View>
                  <Text style={styles.nome}>{item.nome}</Text>
                  {item.descricao ? <Text style={styles.descricao} numberOfLines={2}>{item.descricao}</Text> : null}
                </View>

                {isAdmin && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => router.push({ pathname: "/(staff)/criar-servico", params: { id: String(item.id), nome: item.nome, categoria: item.categoria, descricao: item.descricao ?? "", duracao_minutos: String(item.duracao_minutos), valor: String(item.valor), preco_promocional: item.preco_promocional != null ? String(item.preco_promocional) : "", preco_descricao: item.preco_descricao ?? "", ativo: item.ativo ? "true" : "false" } })}
                      style={({ pressed }) => [styles.actionBtn, styles.actionEdit, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name="edit-2" size={15} color={colors.light.golden} />
                    </Pressable>
                    <Pressable
                      onPress={() => toggleAtivo(item)}
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name={item.ativo ? "eye-off" : "eye"} size={15} color={item.ativo ? colors.light.mutedForeground : colors.light.success} />
                    </Pressable>
                    <Pressable
                      onPress={() => excluir(item)}
                      style={({ pressed }) => [styles.actionBtn, styles.actionDelete, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name="trash-2" size={15} color={colors.light.destructive} />
                    </Pressable>
                  </View>
                )}
              </View>

              <View style={styles.cardBottom}>
                <View style={styles.infoChip}>
                  <Feather name="clock" size={12} color={colors.light.mutedForeground} />
                  <Text style={styles.infoText}>{fmtDuracao(item.duracao_minutos)}</Text>
                </View>
                <View style={styles.precoGroup}>
                  {item.preco_promocional != null && item.preco_promocional > 0 ? (
                    <>
                      <Text style={styles.precoOriginal}>{fmt(item.valor)}</Text>
                      <Text style={styles.precoPromo}>{fmt(item.preco_promocional)}</Text>
                    </>
                  ) : (
                    <Text style={styles.preco}>{fmt(item.valor)}</Text>
                  )}
                </View>
                {!item.ativo && (
                  <View style={styles.inativoBadge}>
                    <Text style={styles.inativoText}>Inativo</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}
    </View>
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.light.card,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.3,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.light.golden,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
  emptyBtn: { marginTop: 8, backgroundColor: colors.light.golden, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 12,
  },
  cardInativo: { opacity: 0.6 },
  cardTop: { flexDirection: "row", gap: 12 },
  cardLeft: { flex: 1, gap: 4 },
  categoriaChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.light.goldenLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoriaText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: colors.light.golden },
  nome: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  descricao: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground, lineHeight: 17 },
  actions: { flexDirection: "column", gap: 6 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.light.background,
    alignItems: "center",
    justifyContent: "center",
  },
  actionEdit: { backgroundColor: colors.light.goldenLight },
  actionDelete: { backgroundColor: "#fff0f0" },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoChip: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
  precoGroup: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 8 },
  preco: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.light.foreground },
  precoOriginal: { fontSize: 12, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground, textDecorationLine: "line-through" },
  precoPromo: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.light.success },
  inativoBadge: { backgroundColor: "#fee2e2", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  inativoText: { fontSize: 11, fontFamily: "Inter_500Medium", color: colors.light.destructive },
});
