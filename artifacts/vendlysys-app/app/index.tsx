import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import colors from "@/constants/colors";

export default function Index() {
  const { auth, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.light.background }}>
        <ActivityIndicator color={colors.light.golden} />
      </View>
    );
  }

  if (auth.tipo === "staff") return <Redirect href="/(staff)/(tabs)/inicio" />;
  if (auth.tipo === "cliente") return <Redirect href="/(cliente)/(tabs)/inicio" />;
  return <Redirect href="/login" />;
}
