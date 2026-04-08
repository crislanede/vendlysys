import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function PushRegistrar() {
  const { auth } = useAuth();
  const token = auth.tipo === "staff" ? auth.token : null;
  usePushNotifications(token);
  return null;
}

export default function StaffLayout() {
  const { auth, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    if (auth.tipo !== "staff") return;

    const termosAceitos = !!auth.usuario.empresa?.termos_aceitos_em;
    const naTelaDeTermos = segments.includes("termos");

    if (!termosAceitos && !naTelaDeTermos) {
      router.replace("/(staff)/termos");
    }
  }, [auth, loading, segments]);

  return (
    <>
      <PushRegistrar />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="criar-usuario" />
        <Stack.Screen name="usuarios" />
        <Stack.Screen name="profissionais" />
        <Stack.Screen name="criar-profissional" />
        <Stack.Screen name="servicos" />
        <Stack.Screen name="criar-servico" />
        <Stack.Screen name="criar-agendamento" />
        <Stack.Screen name="criar-cliente" />
        <Stack.Screen name="duvidas" />
        <Stack.Screen name="assinatura" />
        <Stack.Screen name="termos" options={{ gestureEnabled: false }} />
      </Stack>
    </>
  );
}
