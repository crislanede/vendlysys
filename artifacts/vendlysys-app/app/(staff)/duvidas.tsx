import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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

const FAQS: { q: string; a: string; icon: string }[] = [
  {
    icon: "calendar",
    q: "Como criar um novo agendamento?",
    a: "Na aba Agenda, toque no botao '+' no canto superior direito, ou use o atalho 'Novo agendamento' na tela inicial. Selecione o cliente, servico, data e horario e confirme.",
  },
  {
    icon: "user-plus",
    q: "Como cadastrar um novo cliente?",
    a: "Acesse a aba Agenda ou Inicio e use o atalho 'Novo cliente'. Preencha o nome, telefone e demais dados. O cliente ficara disponivel para agendamentos e para envio de lembretes via WhatsApp.",
  },
  {
    icon: "scissors",
    q: "Como cadastrar servicos?",
    a: "Em Configuracoes > Servicos, toque em 'Novo servico'. Defina nome, categoria, duracao, preco e se esta ativo. Servicos ativos aparecem na criacao de agendamentos.",
  },
  {
    icon: "users",
    q: "Qual a diferenca entre Usuario e Profissional?",
    a: "Usuario e quem acessa o sistema com e-mail e senha (ex: recepcionista, socio). Profissional e quem executa os atendimentos e pode nao ter acesso ao sistema — apenas aparece na agenda.",
  },
  {
    icon: "message-circle",
    q: "Como enviar lembretes de agendamento pelo WhatsApp?",
    a: "Na tela de Agendamentos, toque no icone verde do WhatsApp ao lado de qualquer agendamento. O app abrira o WhatsApp com uma mensagem pronta para o cliente, contendo data, horario e link do portal para confirmar ou reagendar.",
  },
  {
    icon: "credit-card",
    q: "Como configurar o pagamento PIX?",
    a: "Em Configuracoes, informe a chave PIX da empresa (CPF, CNPJ, telefone ou e-mail). A chave e exibida no portal publico dos clientes para pagamento de servicos.",
  },
  {
    icon: "dollar-sign",
    q: "O que e o fechamento do dia?",
    a: "O fechamento do dia e um resumo financeiro de todos os agendamentos concluidos no dia. Acesse em Financeiro para ver receitas, despesas e saldo do periodo.",
  },
  {
    icon: "link",
    q: "Para que serve o link do portal?",
    a: "O portal e uma pagina publica da sua empresa onde clientes podem ver os servicos, horarios e agendar online. Copie o link em Configuracoes e compartilhe nas redes sociais.",
  },
  {
    icon: "shield",
    q: "Qual a diferenca entre perfil Admin e Agenda?",
    a: "Admin tem acesso completo: configura a empresa, gerencia usuarios, financeiro e todas as funcoes. Perfil Agenda acessa apenas a agenda, clientes e servicos — ideal para recepcionistas.",
  },
  {
    icon: "smartphone",
    q: "Como receber notificacoes de novos agendamentos?",
    a: "Ao fazer login no app, autorize as notificacoes quando solicitado. A partir dai, sempre que um novo agendamento for criado (pelo app ou plataforma web), voce recebera uma notificacao automatica.",
  },
];

export default function DuvidasScreen() {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<number | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.light.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Feather name="arrow-left" size={20} color={colors.light.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Dúvidas frequentes</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <View style={styles.heroIcon}>
            <Feather name="help-circle" size={28} color={colors.light.golden} />
          </View>
          <Text style={styles.heroSubtitle}>
            Encontre respostas para as perguntas mais comuns sobre o VendlySys.
          </Text>
        </View>

        <View style={styles.list}>
          {FAQS.map((item, idx) => {
            const open = expanded === idx;
            return (
              <Pressable
                key={idx}
                onPress={() => setExpanded(open ? null : idx)}
                style={({ pressed }) => [styles.card, open && styles.cardOpen, pressed && { opacity: 0.92 }]}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.iconWrap, open && styles.iconWrapOpen]}>
                    <Feather name={item.icon as any} size={15} color={open ? "#fff" : colors.light.golden} />
                  </View>
                  <Text style={[styles.question, open && styles.questionOpen]} numberOfLines={open ? undefined : 2}>
                    {item.q}
                  </Text>
                  <Feather
                    name={open ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={open ? colors.light.golden : colors.light.mutedForeground}
                  />
                </View>
                {open && (
                  <Text style={styles.answer}>{item.a}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footerCard}>
          <Feather name="mail" size={18} color={colors.light.golden} />
          <View style={{ flex: 1 }}>
            <Text style={styles.footerTitle}>Ainda tem dúvidas?</Text>
            <Text style={styles.footerText}>Entre em contato com nosso suporte: suporte@vendlysys.com.br</Text>
          </View>
        </View>
      </ScrollView>
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
  },
  scroll: { paddingHorizontal: 20 },
  heroWrap: {
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
    paddingVertical: 8,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  list: { gap: 10 },
  card: {
    backgroundColor: colors.light.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardOpen: {
    borderColor: colors.light.golden + "44",
    backgroundColor: "#fefaf6",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconWrapOpen: {
    backgroundColor: colors.light.golden,
  },
  question: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    lineHeight: 20,
  },
  questionOpen: {
    color: colors.light.primary,
  },
  answer: {
    marginTop: 12,
    marginLeft: 44,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    lineHeight: 20,
  },
  footerCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginTop: 24,
    backgroundColor: colors.light.goldenLight,
    borderRadius: 16,
    padding: 16,
  },
  footerTitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
    marginBottom: 4,
  },
  footerText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    lineHeight: 18,
  },
});
