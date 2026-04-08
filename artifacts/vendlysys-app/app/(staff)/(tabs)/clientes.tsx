import { Feather } from "@expo/vector-icons";
import CompanyLogo from "@/components/CompanyLogo";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";
import { api } from "@/utils/api";

type Cliente = {
  id: number;
  nome: string;
  telefone?: string;
  email?: string;
  data_nascimento?: string;
  total_agendamentos?: number;
  total_gasto?: number;
};

function isBirthdayToday(dataNasc?: string | null): boolean {
  if (!dataNasc) return false;
  const today = new Date();
  const [, m, d] = dataNasc.split("-");
  return parseInt(m) === today.getMonth() + 1 && parseInt(d) === today.getDate();
}

export default function ClientesScreen() {
  const insets = useSafeAreaInsets();
  const { auth } = useAuth();
  const token = auth.tipo === "staff" ? auth.token : null;
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery<Cliente[]>({
    queryKey: ["clientes", search],
    queryFn: () => api.get(`/clientes${search ? `?search=${encodeURIComponent(search)}` : ""}`, token),
    enabled: !!token,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.headerTopRow}>
          <Pressable
            onPress={() => router.push("/(staff)/criar-cliente")}
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>
        <CompanyLogo logoUrl={auth.tipo === "staff" ? auth.usuario?.empresa?.logo_url : null} nome={auth.tipo === "staff" ? auth.usuario?.empresa?.nome : null} size={72} />
        <Text style={styles.title}>Clientes</Text>
        <View style={styles.searchBar}>
          <Feather name="search" size={16} color={colors.light.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou telefone..."
            placeholderTextColor={colors.light.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Feather
              name="x"
              size={16}
              color={colors.light.mutedForeground}
              onPress={() => setSearch("")}
            />
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.light.golden} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={40} color={colors.light.border} />
              <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
            </View>
          }
          renderItem={({ item }) => {
            const birthday = isBirthdayToday(item.data_nascimento);
            const initials = item.nome
              .split(" ")
              .slice(0, 2)
              .map((p: string) => p[0])
              .join("")
              .toUpperCase();

            return (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}
                onPress={() => router.push({
                  pathname: "/(staff)/criar-cliente",
                  params: {
                    id: String(item.id),
                    nome: item.nome ?? "",
                    telefone: item.telefone ?? "",
                    email: item.email ?? "",
                    data_nascimento: item.data_nascimento ?? "",
                    cep: item.cep ?? "",
                    logradouro: item.logradouro ?? "",
                    numero: item.numero ?? "",
                    complemento: item.complemento ?? "",
                    bairro: item.bairro ?? "",
                    cidade: item.cidade ?? "",
                    estado: item.estado ?? "",
                    observacoes: item.observacoes ?? "",
                  },
                })}
              >
                <View style={[styles.avatar, birthday && styles.avatarBirthday]}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.nome}>{item.nome}</Text>
                    {birthday && (
                      <Text style={styles.birthdayBadge}>🎂 Aniversário!</Text>
                    )}
                  </View>
                  {item.telefone && (
                    <Text style={styles.info}>
                      <Feather name="phone" size={11} color={colors.light.mutedForeground} /> {item.telefone}
                    </Text>
                  )}
                  {item.email && (
                    <Text style={styles.info} numberOfLines={1}>
                      <Feather name="mail" size={11} color={colors.light.mutedForeground} /> {item.email}
                    </Text>
                  )}
                  <View style={styles.statsRow}>
                    {item.total_agendamentos !== undefined && (
                      <Text style={styles.stat}>{item.total_agendamentos} agendamento{item.total_agendamentos !== 1 ? "s" : ""}</Text>
                    )}
                    {item.total_gasto !== undefined && item.total_gasto > 0 && (
                      <Text style={styles.stat}>
                        {item.total_gasto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} gastos
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
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
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
    marginBottom: 2,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.5,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.light.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.light.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 4,
    borderWidth: 1,
    borderColor: colors.light.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
  },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  empty: { alignItems: "center", paddingVertical: 64, gap: 10 },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: colors.light.mutedForeground,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.light.card,
    borderRadius: 16,
    padding: 14,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBirthday: {
    backgroundColor: "#fef9c3",
  },
  avatarText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: colors.light.golden,
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  nome: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  birthdayBadge: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "#854d0e",
    backgroundColor: "#fef9c3",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  info: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 3,
  },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  stat: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.light.golden,
    backgroundColor: colors.light.goldenLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
});
