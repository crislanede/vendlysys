import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { api } from "@/utils/api";

export type ProfissionalItem = {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  especialidade: string | null;
  ativo: boolean;
};

export default function ProfissionaisScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const qc = useQueryClient();
  const token = auth.tipo === "staff" ? auth.token : null;

  const { data, isLoading, refetch } = useQuery<ProfissionalItem[]>({
    queryKey: ["profissionais"],
    queryFn: () => api.get("/profissionais", token),
    enabled: !!token,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      api.put(`/profissionais/${id}`, { ativo }, token),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["profissionais"] });
    },
    onError: (e: any) => Alert.alert("Erro", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.del(`/profissionais/${id}`, token),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["profissionais"] });
    },
    onError: (e: any) => Alert.alert("Erro", e.message),
  });

  function confirmToggle(p: ProfissionalItem) {
    Alert.alert(
      p.ativo ? "Desativar profissional" : "Reativar profissional",
      `Deseja ${p.ativo ? "desativar" : "reativar"} ${p.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: p.ativo ? "Desativar" : "Reativar",
          style: p.ativo ? "destructive" : "default",
          onPress: () => toggleMutation.mutate({ id: p.id, ativo: !p.ativo }),
        },
      ]
    );
  }

  function confirmDelete(p: ProfissionalItem) {
    Alert.alert(
      "Remover profissional",
      `Remover ${p.nome}? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
      ]
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const isAdmin = auth.tipo === "staff" && auth.usuario?.perfil === "admin";

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Profissionais</Text>
        {isAdmin && (
          <TouchableOpacity
            onPress={() => router.push("/(staff)/criar-profissional")}
            style={styles.addBtn}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Novo</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.light.golden} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="scissors" size={40} color={colors.light.border} />
              <Text style={styles.emptyText}>Nenhum profissional cadastrado</Text>
              {isAdmin && (
                <TouchableOpacity
                  onPress={() => router.push("/(staff)/criar-profissional")}
                  style={styles.emptyBtn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyBtnText}>Cadastrar primeiro profissional</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const initials = item.nome
              .split(" ")
              .slice(0, 2)
              .map((p: string) => p[0])
              .join("")
              .toUpperCase();

            return (
              <View style={[styles.card, !item.ativo && styles.cardInativo]}>
                <View style={styles.cardLeft}>
                  <View style={[styles.avatar, !item.ativo && styles.avatarInativo]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.nome, !item.ativo && styles.nomeInativo]} numberOfLines={1}>
                      {item.nome}
                    </Text>
                    {item.especialidade && (
                      <Text style={styles.especialidade} numberOfLines={1}>
                        {item.especialidade}
                      </Text>
                    )}
                    <View style={styles.contactRow}>
                      {item.telefone && (
                        <View style={styles.contactChip}>
                          <Feather name="phone" size={11} color={colors.light.golden} />
                          <Text style={styles.contactText}>{item.telefone}</Text>
                        </View>
                      )}
                      {item.email && (
                        <View style={styles.contactChip}>
                          <Feather name="mail" size={11} color={colors.light.mutedForeground} />
                          <Text style={styles.contactText}>{item.email}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[
                      styles.statusBadge,
                      item.ativo ? styles.statusAtivo : styles.statusInativo
                    ]}>
                      <Text style={[
                        styles.statusText,
                        item.ativo ? { color: colors.light.success } : { color: colors.light.mutedForeground }
                      ]}>
                        {item.ativo ? "Ativo" : "Inativo"}
                      </Text>
                    </View>
                  </View>
                </View>

                {isAdmin && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => router.push({ pathname: "/(staff)/criar-profissional", params: { id: String(item.id), nome: item.nome, telefone: item.telefone ?? "", email: item.email ?? "", especialidade: item.especialidade ?? "", ativo: item.ativo ? "1" : "0" } })}
                      style={({ pressed }) => [styles.actionBtn, styles.actionEdit, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name="edit-2" size={15} color={colors.light.golden} />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmToggle(item)}
                      style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Feather
                        name={item.ativo ? "user-x" : "user-check"}
                        size={15}
                        color={item.ativo ? colors.light.warning : colors.light.success}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(item)}
                      style={({ pressed }) => [styles.actionBtn, styles.actionDelete, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name="trash-2" size={15} color={colors.light.destructive} />
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }}
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
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.light.secondary,
  },
  title: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.3,
    flex: 1,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.light.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },
  empty: { alignItems: "center", paddingVertical: 64, gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_500Medium", color: colors.light.mutedForeground },
  emptyBtn: {
    backgroundColor: colors.light.primary,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 4,
  },
  emptyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 18,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  cardInativo: { opacity: 0.6 },
  cardLeft: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarInativo: { backgroundColor: colors.light.muted },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold", color: colors.light.golden },
  nome: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.light.foreground },
  nomeInativo: { color: colors.light.mutedForeground },
  especialidade: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.golden,
    marginTop: 2,
  },
  contactRow: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.light.secondary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  contactText: { fontSize: 11, fontFamily: "Inter_400Regular", color: colors.light.mutedForeground },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6 },
  statusAtivo: { backgroundColor: colors.light.successLight },
  statusInativo: { backgroundColor: colors.light.muted },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 6, justifyContent: "flex-end" },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.light.warningLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionEdit: { backgroundColor: colors.light.goldenLight },
  actionDelete: { backgroundColor: colors.light.destructiveLight },
});
