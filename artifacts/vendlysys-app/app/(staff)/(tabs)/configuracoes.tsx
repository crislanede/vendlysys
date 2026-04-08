import { Feather } from "@expo/vector-icons";
import CompanyLogo from "@/components/CompanyLogo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/utils/api";

type EmpresaFull = {
  id: number;
  nome: string;
  slug: string;
  telefone?: string | null;
  endereco?: string | null;
  cor_primaria?: string | null;
  logo_url?: string | null;
  chave_pix?: string | null;
  mensagem_lembrete?: string | null;
  mp_access_token?: string | null;
  portal_url?: string | null;
  download_url?: string | null;
};

const CORES_PRESET = [
  "#7C3AED", "#2563EB", "#DC2626", "#16A34A",
  "#D97706", "#DB2777", "#0891B2", "#374151",
];

export default function ConfiguracoesScreen() {
  const insets = useSafeAreaInsets();
  const { auth, updateStaffEmpresa } = useAuth();
  const qc = useQueryClient();
  const token = auth.tipo === "staff" ? auth.token : null;
  const usuario = auth.tipo === "staff" ? auth.usuario : null;
  const isAdmin = usuario?.perfil === "admin";
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: empresa, isLoading } = useQuery<EmpresaFull>({
    queryKey: ["empresa-full", usuario?.empresa_id],
    queryFn: () => api.get(`/empresas/${usuario!.empresa_id}`, token),
    enabled: !!token && !!usuario?.empresa_id,
  });

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#7C3AED");
  const [logoUrl, setLogoUrl] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [mpAccessToken, setMpAccessToken] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [pickingLogo, setPickingLogo] = useState(false);

  useEffect(() => {
    if (empresa) {
      setNome(empresa.nome || "");
      setTelefone(empresa.telefone || "");
      setEndereco(empresa.endereco || "");
      setCorPrimaria(empresa.cor_primaria || "#7C3AED");
      setLogoUrl(empresa.logo_url || "");
      setChavePix(empresa.chave_pix || "");
      setMpAccessToken(empresa.mp_access_token || "");
    }
  }, [empresa]);

  const portalUrl = empresa?.portal_url ?? null;
  const downloadUrl = empresa?.download_url ?? null;

  async function salvarEmpresa() {
    if (!empresa?.id) return;
    setSalvando(true);
    try {
      await api.put(`/empresas/${empresa.id}`, {
        nome: nome || undefined,
        telefone: telefone || undefined,
        endereco: endereco || undefined,
        cor_primaria: corPrimaria || undefined,
        logo_url: logoUrl || undefined,
        chave_pix: chavePix || undefined,
        mp_access_token: mpAccessToken || null,
      }, token);
      updateStaffEmpresa({
        logo_url: logoUrl || null,
        nome: nome || empresa.nome,
        cor_primaria: corPrimaria || null,
      });
      qc.invalidateQueries({ queryKey: ["empresa-full"] });
      Alert.alert("Sucesso", "Configurações salvas com sucesso!");
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as configurações.");
    } finally {
      setSalvando(false);
    }
  }

  async function pickLogo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão necessária", "Permita o acesso à galeria para escolher o logo.");
      return;
    }
    setPickingLogo(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
        base64: true,
      });
      if (!result.canceled && result.assets[0].base64) {
        const mime = result.assets[0].mimeType ?? "image/jpeg";
        setLogoUrl(`data:${mime};base64,${result.assets[0].base64}`);
      }
    } catch {
      Alert.alert("Erro", "Não foi possível carregar a imagem.");
    } finally {
      setPickingLogo(false);
    }
  }

  if (isLoading) {
    return (
      <View style={[styles.root, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.light.golden} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <CompanyLogo logoUrl={empresa?.logo_url} nome={empresa?.nome} size={72} />
        <Text style={styles.title}>Configurações</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Link do Portal */}
        <Section icon="smartphone" title="Link de Acesso do Cliente" subtitle="Envie este link para seus clientes via WhatsApp ou redes sociais.">
          {downloadUrl ? (
            <>
              <View style={styles.linkTypeRow}>
                <Feather name="download" size={13} color={colors.light.golden} />
                <Text style={styles.linkTypeLabel}>Link do aplicativo (recomendado)</Text>
              </View>
              <View style={styles.portalRow}>
                <Text style={styles.portalUrl} numberOfLines={1}>{downloadUrl}</Text>
                <Pressable
                  onPress={async () => { await Clipboard.setStringAsync(downloadUrl); Alert.alert("Copiado!", "Link do app copiado!"); }}
                  style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
                >
                  <Feather name="copy" size={16} color={colors.light.golden} />
                </Pressable>
              </View>
              {portalUrl ? (
                <>
                  <View style={styles.linkTypeRow}>
                    <Feather name="globe" size={13} color={colors.light.mutedForeground} />
                    <Text style={[styles.linkTypeLabel, { color: colors.light.mutedForeground }]}>Portal web (alternativo)</Text>
                  </View>
                  <View style={styles.portalRow}>
                    <Text style={[styles.portalUrl, { fontSize: 11, color: colors.light.mutedForeground }]} numberOfLines={1}>{portalUrl}</Text>
                    <Pressable
                      onPress={async () => { await Clipboard.setStringAsync(portalUrl); Alert.alert("Copiado!", "Link do portal copiado."); }}
                      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
                    >
                      <Feather name="copy" size={14} color={colors.light.mutedForeground} />
                    </Pressable>
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <Text style={styles.hint}>Salve os dados para gerar o link.</Text>
          )}
        </Section>

        {/* Dados do estabelecimento */}
        {isAdmin && (
          <Section icon="briefcase" title="Dados do Estabelecimento" subtitle="Informações públicas do seu negócio.">
            <Field label="Nome do estabelecimento">
              <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome do salão" placeholderTextColor={colors.light.mutedForeground} />
            </Field>
            <Field label="Telefone">
              <TextInput style={styles.input} value={telefone} onChangeText={setTelefone} placeholder="(11) 99999-9999" placeholderTextColor={colors.light.mutedForeground} keyboardType="phone-pad" />
            </Field>
            <Field label="Endereço completo">
              <TextInput style={styles.input} value={endereco} onChangeText={setEndereco} placeholder="Rua, número, bairro, cidade" placeholderTextColor={colors.light.mutedForeground} />
            </Field>
          </Section>
        )}

        {/* Identidade Visual */}
        {isAdmin && (
          <Section icon="image" title="Identidade Visual" subtitle="Logo e cor principal do sistema.">
            <Text style={styles.fieldLabel}>Logo da empresa</Text>
            <View style={styles.logoPickerRow}>
              <TouchableOpacity
                onPress={pickLogo}
                disabled={pickingLogo}
                style={styles.logoPreviewBtn}
                activeOpacity={0.75}
              >
                {logoUrl ? (
                  <Image
                    source={{ uri: logoUrl }}
                    style={styles.logoPreviewImg}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Feather name="image" size={28} color={colors.light.mutedForeground} />
                    <Text style={styles.logoPlaceholderText}>Sem logo</Text>
                  </View>
                )}
                <View style={styles.logoPickerOverlay}>
                  {pickingLogo ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Feather name="camera" size={16} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.logoHintWrap}>
                <Text style={styles.logoHint}>
                  Toque na imagem para escolher um logo da sua galeria.
                </Text>
                {logoUrl ? (
                  <TouchableOpacity
                    onPress={() => setLogoUrl("")}
                    style={styles.logoRemoverBtn}
                  >
                    <Feather name="trash-2" size={13} color={colors.light.destructive} />
                    <Text style={styles.logoRemoverText}>Remover logo</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            <Field label="Cor Principal (hex)">
              <TextInput
                style={styles.input}
                value={corPrimaria}
                onChangeText={(v) => setCorPrimaria(v.startsWith("#") ? v : "#" + v)}
                placeholder="#7C3AED"
                placeholderTextColor={colors.light.mutedForeground}
                autoCapitalize="none"
                maxLength={7}
              />
            </Field>
            <Text style={styles.fieldLabel}>Cores rápidas</Text>
            <View style={styles.coresRow}>
              {CORES_PRESET.map((cor) => (
                <Pressable
                  key={cor}
                  onPress={() => setCorPrimaria(cor)}
                  style={[
                    styles.corChip,
                    { backgroundColor: cor },
                    corPrimaria === cor && styles.corChipSelecionada,
                  ]}
                />
              ))}
            </View>
          </Section>
        )}

        {/* Salvar dados + identidade */}
        {isAdmin && (
          <Pressable
            onPress={salvarEmpresa}
            disabled={salvando}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }, salvando && { opacity: 0.6 }]}
          >
            <Text style={styles.btnText}>{salvando ? "Salvando..." : "Salvar configurações"}</Text>
          </Pressable>
        )}

        {/* Serviços atalho */}
        <Section icon="scissors" title="Catálogo de Serviços" subtitle="Gerencie os serviços oferecidos pelo estabelecimento.">
          <Pressable
            onPress={() => router.push("/(staff)/servicos")}
            style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.linkBtnText}>Gerenciar serviços</Text>
            <Feather name="chevron-right" size={16} color={colors.light.golden} />
          </Pressable>
        </Section>

        {/* PIX */}
        {isAdmin && (
          <Section icon="credit-card" title="Pagamento PIX" subtitle="Configure sua chave PIX e o Mercado Pago para receber pagamentos.">
            <Field label="Chave PIX (manual)">
              <TextInput
                style={styles.input}
                value={chavePix}
                onChangeText={setChavePix}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                placeholderTextColor={colors.light.mutedForeground}
                autoCapitalize="none"
              />
            </Field>
            <Field label="Token Mercado Pago (Access Token)">
              <TextInput
                style={styles.input}
                value={mpAccessToken}
                onChangeText={setMpAccessToken}
                placeholder="APP_USR-xxxx... ou TEST-xxxx..."
                placeholderTextColor={colors.light.mutedForeground}
                autoCapitalize="none"
                secureTextEntry
              />
            </Field>
            <Text style={{ fontSize: 11, color: colors.light.mutedForeground, marginBottom: 8 }}>
              Necessário para cobrar via QR Code PIX. Obtenha em mercadopago.com.br → Credenciais. Pagamentos vão direto para sua conta MP.
            </Text>
            {chavePix ? (
              <View style={styles.successBadge}>
                <Feather name="check-circle" size={14} color="#16a34a" />
                <Text style={styles.successText}>Chave PIX configurada.</Text>
              </View>
            ) : null}
            {mpAccessToken ? (
              <View style={styles.successBadge}>
                <Feather name="check-circle" size={14} color="#16a34a" />
                <Text style={styles.successText}>Token MP configurado — pagamentos via QR Code ativados.</Text>
              </View>
            ) : null}
            <Pressable
              onPress={salvarEmpresa}
              disabled={salvando}
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }, salvando && { opacity: 0.6 }]}
            >
              <Text style={styles.btnText}>{salvando ? "Salvando..." : "Salvar PIX"}</Text>
            </Pressable>
          </Section>
        )}

        {/* Equipe */}
        {isAdmin && (
          <Section icon="users" title="Equipe" subtitle="Gerencie usuários e profissionais do sistema.">
            <Pressable onPress={() => router.push("/(staff)/usuarios")} style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.linkBtnText}>Gerenciar usuários</Text>
              <Feather name="chevron-right" size={16} color={colors.light.golden} />
            </Pressable>
            <View style={styles.separator} />
            <Pressable onPress={() => router.push("/(staff)/profissionais")} style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.linkBtnText}>Gerenciar profissionais</Text>
              <Feather name="chevron-right" size={16} color={colors.light.golden} />
            </Pressable>
          </Section>
        )}

        {/* Assinatura */}
        {isAdmin && (
          <Section icon="credit-card" title="Assinatura" subtitle="Gerencie seu plano e pagamentos mensais.">
            <Pressable onPress={() => router.push("/(staff)/assinatura")} style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}>
              <Text style={styles.linkBtnText}>Ver minha assinatura</Text>
              <Feather name="chevron-right" size={16} color={colors.light.golden} />
            </Pressable>
          </Section>
        )}

        {/* Dúvidas */}
        <Section icon="help-circle" title="Dúvidas" subtitle="Perguntas frequentes e ajuda sobre o sistema.">
          <Pressable onPress={() => router.push("/(staff)/duvidas")} style={({ pressed }) => [styles.linkBtn, pressed && { opacity: 0.7 }]}>
            <Text style={styles.linkBtnText}>Ver perguntas frequentes</Text>
            <Feather name="chevron-right" size={16} color={colors.light.golden} />
          </Pressable>
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIconWrap}>
          <Feather name={icon as any} size={16} color={colors.light.golden} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    letterSpacing: -0.5,
  },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  section: {
    backgroundColor: colors.light.card,
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  sectionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.foreground,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    marginTop: 2,
    lineHeight: 17,
  },
  sectionBody: { padding: 16, gap: 12 },
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
  textarea: {
    backgroundColor: colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    padding: 12,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    minHeight: 180,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: colors.light.foreground,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  btnOutlineText: {
    color: colors.light.mutedForeground,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  linkBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: colors.light.golden,
  },
  linkTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    marginTop: 4,
  },
  linkTypeLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.golden,
  },
  portalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.light.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  portalUrl: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.light.goldenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  coresRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  corChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  corChipSelecionada: {
    borderColor: colors.light.foreground,
    transform: [{ scale: 1.1 }],
  },
  logoPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  logoPreviewBtn: {
    width: 88,
    height: 88,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.light.border,
    backgroundColor: colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  logoPreviewImg: {
    width: 88,
    height: 88,
    borderRadius: 14,
  },
  logoPlaceholder: {
    alignItems: "center",
    gap: 4,
  },
  logoPlaceholderText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
  },
  logoPickerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoHintWrap: {
    flex: 1,
    gap: 10,
  },
  logoHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    lineHeight: 19,
  },
  logoRemoverBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  logoRemoverText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: colors.light.destructive,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 10,
  },
  successText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: "#15803d",
  },
  waBadge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  waBadgeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
  rowInputBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  waBtn: {
    backgroundColor: "#25d366",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  waBtnText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  instrucoes: {
    backgroundColor: colors.light.background,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  instrucoesTitulo: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: colors.light.foreground,
    marginBottom: 4,
  },
  instrucaoItem: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    lineHeight: 18,
  },
  variaveisRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  varChip: {
    backgroundColor: colors.light.goldenLight,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  varChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: colors.light.golden,
    fontVariant: ["tabular-nums"],
  },
  msgBtns: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  separator: {
    height: 1,
    backgroundColor: colors.light.border,
    marginVertical: 4,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: colors.light.mutedForeground,
    lineHeight: 17,
  },
});
