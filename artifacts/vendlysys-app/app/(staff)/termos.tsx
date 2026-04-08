import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/utils/api";

const TERMOS = `TERMOS DE USO E RESPONSABILIDADE — VENDLYSYS

Versão vigente: abril de 2026

Ao aceitar este Termo, o representante da empresa contratante declara ter lido, compreendido e concordado integralmente com as condições descritas abaixo.

1. OBJETO

O VendlySys é uma plataforma de gestão para salões, barbearias, clínicas e estabelecimentos afins, oferecida em modelo de assinatura mensal (SaaS). Disponibiliza funcionalidades de agenda, gestão de clientes, módulo financeiro, portal público e aplicativo mobile para a equipe.

2. PLANO E PREÇO

O plano mensal tem valor de R$ 50,00 (cinquenta reais), cobrado mensalmente via PIX. O acesso ao sistema é mantido enquanto a assinatura estiver ativa e em dia.

3. PERÍODO DE CARÊNCIA

A assinatura possui carência de 3 (três) meses a partir da data do primeiro pagamento confirmado. Durante esse período, não é possível solicitar o cancelamento nem reembolso das mensalidades já pagas.

Após o término da carência, o cancelamento pode ser solicitado a qualquer momento, com efeito imediato.

4. CANCELAMENTO

O cancelamento deve ser solicitado diretamente pela tela de Assinatura no aplicativo ou na plataforma web. Não há cobrança de multa fora do período de carência. Os dados da empresa ficam disponíveis por 30 dias após o cancelamento, sendo excluídos permanentemente após esse prazo.

5. REEMBOLSO

Não são realizados reembolsos de mensalidades já pagas, exceto nos casos previstos em lei (Código de Defesa do Consumidor).

6. RESPONSABILIDADES DO CONTRATANTE

O contratante é responsável por:
- Manter seus dados de acesso (e-mail e senha) em sigilo;
- Utilizar o sistema de forma legal e ética;
- Inserir informações verídicas no cadastro da empresa e dos clientes;
- Cumprir a legislação vigente, incluindo a LGPD (Lei Geral de Proteção de Dados), no tratamento dos dados de seus clientes.

7. RESPONSABILIDADES DO VENDLYSYS

O VendlySys se compromete a:
- Manter o sistema disponível com uptime mínimo de 99% ao mês;
- Proteger os dados armazenados com medidas de segurança adequadas;
- Notificar o contratante em caso de incidentes que afetem seus dados;
- Não compartilhar ou vender os dados do contratante a terceiros.

8. LIMITAÇÃO DE RESPONSABILIDADE

O VendlySys não se responsabiliza por perdas financeiras decorrentes de uso indevido da plataforma, falhas de conexão à internet ou decisões comerciais tomadas com base nas informações do sistema.

9. ALTERAÇÕES

O VendlySys pode alterar estes Termos a qualquer momento, notificando os usuários com antecedência mínima de 15 dias por e-mail ou aviso dentro do sistema.

10. FORO

Fica eleito o foro da comarca do contratante para dirimir eventuais conflitos decorrentes deste Termo.

Ao clicar em "Li e aceito os Termos", o contratante confirma ciência e concordância integral com as condições acima.`;

export default function TermosScreen() {
  const insets = useSafeAreaInsets();
  const { auth, updateStaffEmpresa } = useAuth();
  const token = auth.tipo === "staff" ? auth.token : null;
  const [aceitando, setAceitando] = useState(false);
  const [leuAoFinal, setLeuAoFinal] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const termosJaAceitos = !!(auth.tipo === "staff" && auth.usuario.empresa?.termos_aceitos_em);
  const dataAceite = termosJaAceitos && auth.tipo === "staff"
    ? new Date(auth.usuario.empresa!.termos_aceitos_em!).toLocaleDateString("pt-BR")
    : null;

  async function aceitar() {
    setAceitando(true);
    try {
      await api.post("/assinatura/aceitar-termos", {}, token);
      updateStaffEmpresa({ termos_aceitos_em: new Date().toISOString() });
      router.replace("/(staff)/(tabs)");
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Não foi possível registrar a aceitação.");
    } finally {
      setAceitando(false);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        {termosJaAceitos && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color={colors.light.foreground} />
          </TouchableOpacity>
        )}
        <Text style={styles.title}>Termos de Uso</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          if (termosJaAceitos) return;
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const chegouAoFinal = layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
          if (chegouAoFinal) setLeuAoFinal(true);
        }}
        scrollEventThrottle={200}
      >
        {termosJaAceitos ? (
          <View style={[styles.infoBox, { backgroundColor: "#f0fdf4", borderColor: "#86efac", borderWidth: 1 }]}>
            <Feather name="check-circle" size={15} color="#16a34a" />
            <Text style={[styles.infoText, { color: "#15803d" }]}>
              Você aceitou estes Termos em {dataAceite}. Aqui você pode relê-los a qualquer momento.
            </Text>
          </View>
        ) : (
          <View style={styles.infoBox}>
            <Feather name="info" size={15} color={colors.light.golden} />
            <Text style={styles.infoText}>
              Leia o documento completo antes de aceitar. Role até o final para habilitar o botão de aceite.
            </Text>
          </View>
        )}

        <Text style={styles.body}>{TERMOS}</Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {termosJaAceitos ? (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
          >
            <Feather name="x" size={18} color="#fff" />
            <Text style={styles.btnText}>Fechar</Text>
          </Pressable>
        ) : (
          <>
            {!leuAoFinal && (
              <Text style={styles.scrollHint}>Role até o final para aceitar</Text>
            )}
            <Pressable
              onPress={aceitar}
              disabled={!leuAoFinal || aceitando}
              style={({ pressed }) => [
                styles.btn,
                (!leuAoFinal || aceitando) && styles.btnDisabled,
                pressed && leuAoFinal && { opacity: 0.85 },
              ]}
            >
              {aceitando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="check-circle" size={18} color="#fff" />
                  <Text style={styles.btnText}>Li e aceito os Termos</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
    backgroundColor: "#fff",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
  },
  scroll: { padding: 20, gap: 16 },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: colors.light.goldenLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    lineHeight: 18,
  },
  body: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    lineHeight: 21,
    whiteSpace: "pre-line" as any,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: colors.light.border,
    padding: 16,
    gap: 8,
  },
  scrollHint: {
    textAlign: "center",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  btn: {
    backgroundColor: colors.light.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
});
