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

type Usuario = {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  perfil: "admin" | "agenda";
  ativo: boolean;
};

export default function UsuariosScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const qc = useQueryClient();
  const token = auth.tipo === "staff" ? auth.token : null;
  const meId = auth.tipo === "staff" ? auth.usuario.id : null;

  const { data, isLoading, refetch } = useQuery<Usuario[]>({
    queryKey: ["usuarios"],
    queryFn: () => api.get("/usuarios", token),
    enabled: !!token,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      api.put(`/usuarios/${id}`, { ativo }, token),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: any) => Alert.alert("Erro", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.del(`/usuarios/${id}`, token),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      qc.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e: any) => Alert.alert("Erro", e.message),
  });

  function confirmToggle(u: Usuario) {
    Alert.alert(
      u.ativo ? "Desativar profissional" : "Reativar profissional",
      `Deseja ${u.ativo ? "desativar" : "reativar"} ${u.nome}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: u.ativo ? "Desativar" : "Reativar",
          style: u.ativo ? "destructive" : "default",
          onPress: () => toggleMutation.mutate({ id: u.id, ativo: !u.ativo }),
        },
      ]
    );
  }

  function confirmDelete(u: Usuario) {
    Alert.alert(
      "Remover profissional",
      `Tem certeza que deseja remover ${u.nome}? Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Remover", style: "destructive", onPress: () => deleteMutation.mutate(u.id) },
      ]
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Equipe</Text>
        <TouchableOpacity
          onPress={() => router.push("/(staff)/criar-usuario")}
          style={styles.addBtn}
          activeOpacity={0.8}
        >
          <Feather name="user-plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Novo</Text>
        </TouchableOpacity>
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
              <Feather name="users" size={40} color={colors.light.border} />
              <Text style={styles.emptyText}>Nenhum profissional cadastrado</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isMe = item.id === meId;
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
                    <View style={styles.nameRow}>
                      <Text style={[styles.nome, !item.ativo && styles.nomeInativo]} numberOfLines={1}>
                        {item.nome}
                      </Text>
                      {isMe && (
                        <View style={styles.euChip}>
                          <Text style={styles.euText}>Você</Text>
                        </View>
                      )}
                    </View>
                    {item.telefone ? (
                      <Text style={styles.email} numberOfLines={1}>{item.telefone}</Text>
                    ) : null}
                    <View style={styles.badgeRow}>
                      <View style={[styles.perfilBadge, item.perfil === "admin" && styles.perfilBadgeAdmin]}>
                        <Feather
                          name={item.perfil === "admin" ? "shield" : "calendar"}
                          size={10}
                          color={item.perfil === "admin" ? colors.light.golden : colors.light.mutedForeground}
                        />
                        <Text style={[styles.perfilText, item.perfil === "admin" && styles.perfilTextAdmin]}>
                          {item.perfil === "admin" ? "Admin" : "Profissional"}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, item.ativo ? styles.statusAtivo : styles.statusInativo]}>
                        <Text style={[styles.statusText, item.ativo ? { color: colors.light.success } : { color: colors.light.mutedForeground }]}>
                          {item.ativo ? "Ativo" : "Inativo"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.actions}>
                  <Pressable
                    onPress={() => router.push({
                      pathname: "/(staff)/criar-usuario",
                      params: {
                        id: String(item.id),
                        nome: item.nome,
                        email: item.email ?? "",
                        telefone: item.telefone ?? "",
                        perfil: item.perfil,
                      }
                    })}
                    style={({ pressed }) => [styles.actionBtn, styles.actionEdit, pressed && { opacity: 0.7 }]}
                  >
                    <Feather name="edit-2" size={15} color={colors.light.golden} />
                  </Pressable>
                  {!isMe && (
                    <>
                      <Pressable
                        onPress={() => confirmToggle(item)}
                        style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
                      >
                        <Feather
                          name={item.ativo ? "user-x" : "user-check"}
                          size={16}
                          color={item.ativo ? colors.light.warning : colors.light.success}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDelete(item)}
                        style={({ pressed }) => [styles.actionBtn, styles.actionDelete, pressed && { opacity: 0.7 }]}
                      >
                        <Feather name="trash-2" size={16} color={colors.light.destructive} />
                      </Pressable>
                    </>
                  )}
                </View>
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
  addBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 4, gap: 8 },
  empty: { alignItems: "center", paddingVertical: 64, gap: 10 },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
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
  cardLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInativo: { backgroundColor: colors.light.muted },
  avatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: colors.light.golden,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  nome: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  nomeInativo: { color: colors.light.mutedForeground },
  euChip: {
    backgroundColor: colors.light.goldenLight,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  euText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.golden,
  },
  email: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
  },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  perfilBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.light.muted,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  perfilBadgeAdmin: { backgroundColor: colors.light.goldenLight },
  perfilText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  perfilTextAdmin: { color: colors.light.golden },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusAtivo: { backgroundColor: colors.light.successLight },
  statusInativo: { backgroundColor: colors.light.muted },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.light.warningLight,
    alignItems: "center",
    justifyContent: "center",
  },
  actionEdit: { backgroundColor: colors.light.goldenLight },
  actionDelete: { backgroundColor: colors.light.destructiveLight },
});
