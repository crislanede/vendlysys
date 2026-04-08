import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateEmpresa } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Upload, X, QrCode, Instagram, MessageCircle, Clock } from "lucide-react";

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function Configuracoes() {
  const { empresa, usuario } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [corPrimaria, setCorPrimaria] = useState("#7C3AED");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoNomeArquivo, setLogoNomeArquivo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [horarioFuncionamento, setHorarioFuncionamento] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [mpAccessToken, setMpAccessToken] = useState("");
  const [percentualSinal, setPercentualSinal] = useState("");
  const [pontosPorReal, setPontosPorReal] = useState("");
  const [pontosParaDesconto, setPontosParaDesconto] = useState("");
  const [pontosValorDesconto, setPontosValorDesconto] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

  useEffect(() => {
    if (empresa) {
      setNome(empresa.nome || "");
      setTelefone(empresa.telefone || "");
      setEndereco(empresa.endereco || "");
      setCorPrimaria(empresa.cor_primaria || "#7C3AED");
      setLogoUrl(empresa.logo_url || "");
      setDescricao((empresa as any).descricao || "");
      setHorarioFuncionamento((empresa as any).horario_funcionamento || "");
      setInstagram((empresa as any).instagram || "");
      setWhatsapp((empresa as any).whatsapp || "");
      setChavePix((empresa as any).chave_pix || "");
      setMpAccessToken((empresa as any).mp_access_token || "");
      setPercentualSinal((empresa as any).percentual_sinal ? String((empresa as any).percentual_sinal) : "");
      setPontosPorReal((empresa as any).pontos_por_real ? String((empresa as any).pontos_por_real) : "");
      setPontosParaDesconto((empresa as any).pontos_para_desconto ? String((empresa as any).pontos_para_desconto) : "");
      setPontosValorDesconto((empresa as any).pontos_valor_desconto ? String((empresa as any).pontos_valor_desconto) : "");
    }
  }, [empresa]);

  const atualizarMutation = useUpdateEmpresa({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries();
        if (data.cor_primaria) {
          const hsl = hexToHsl(data.cor_primaria);
          if (hsl) {
            document.documentElement.style.setProperty("--primary", hsl);
            document.documentElement.style.setProperty("--ring", hsl);
          }
        }
        toast({ title: "Configurações salvas com sucesso." });
      },
      onError: () => {
        toast({ title: "Erro ao salvar configurações.", variant: "destructive" });
      },
    },
  });

  function handleArquivoLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande. Use uma imagem de até 2 MB.", variant: "destructive" });
      return;
    }
    setLogoNomeArquivo(arquivo.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const resultado = ev.target?.result as string;
      setLogoUrl(resultado);
    };
    reader.readAsDataURL(arquivo);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function limparLogo() {
    setLogoUrl("");
    setLogoNomeArquivo("");
  }

  function handleSalvar() {
    if (!empresa?.id) return;
    atualizarMutation.mutate({
      id: empresa.id,
      data: {
        nome: nome || undefined,
        telefone: telefone || undefined,
        endereco: endereco || undefined,
        cor_primaria: corPrimaria || undefined,
        logo_url: logoUrl || undefined,
        ...({ chave_pix: chavePix, mp_access_token: mpAccessToken || null, descricao: descricao || null, horario_funcionamento: horarioFuncionamento || null, instagram: instagram || null, whatsapp: whatsapp || null, percentual_sinal: percentualSinal ? parseFloat(percentualSinal.replace(",", ".")) || null : null, pontos_por_real: pontosPorReal ? parseFloat(pontosPorReal.replace(",", ".")) || 0 : 0, pontos_para_desconto: pontosParaDesconto ? parseInt(pontosParaDesconto) || 100 : 100, pontos_valor_desconto: pontosValorDesconto ? parseFloat(pontosValorDesconto.replace(",", ".")) || 10 : 10 } as any),
      } as any,
    });
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>

        <Card>
          <CardHeader>
            <CardTitle>Link do Portal do Cliente</CardTitle>
            <CardDescription>Compartilhe este link com seus clientes para que eles possam agendar, reagendar e cancelar horários sozinhos.</CardDescription>
          </CardHeader>
          <CardContent>
            {empresa?.slug ? (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}${import.meta.env.BASE_URL}portal/${empresa.slug}`}
                  className="font-mono text-sm bg-muted"
                />
                <button
                  type="button"
                  title="Copiar link"
                  onClick={() => { navigator.clipboard.writeText(`${window.location.origin}${import.meta.env.BASE_URL}portal/${empresa.slug}`); toast({ title: "Link copiado!" }); }}
                  style={{ border: "1px solid #e6d9cf", background: "#f9f6f2", color: "#4f433a", borderRadius: 8, width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <Copy style={{ width: 15, height: 15 }} />
                </button>
                <button
                  type="button"
                  title="Abrir portal"
                  onClick={() => window.open(`${import.meta.env.BASE_URL}portal/${empresa.slug}`, "_blank")}
                  style={{ border: "1px solid #e6d9cf", background: "#f9f6f2", color: "#4f433a", borderRadius: 8, width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <ExternalLink style={{ width: 15, height: 15 }} />
                </button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Salve os dados da empresa para gerar o link.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Estabelecimento</CardTitle>
            <CardDescription>Gerencie as informações públicas do seu negócio.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Estabelecimento</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço Completo</Label>
              <Input id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade - Estado" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição do Estabelecimento</Label>
              <textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva seu negócio, especialidades, diferenciais..."
                rows={3}
                style={{ width: "100%", borderRadius: 8, border: "1px solid #e2e8f0", padding: "8px 12px", fontSize: 14, resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
            <div className="space-y-2">
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Clock style={{ width: 14, height: 14, color: "#b8956f" }} />
                <Label htmlFor="horario">Horário de Funcionamento</Label>
              </div>
              <Input id="horario" value={horarioFuncionamento} onChange={(e) => setHorarioFuncionamento(e.target.value)} placeholder="Seg-Sex: 9h-18h | Sáb: 9h-14h | Dom: fechado" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Instagram style={{ width: 14, height: 14, color: "#b8956f" }} />
                  <Label htmlFor="instagram">Instagram</Label>
                </div>
                <Input id="instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@seunegocio" />
              </div>
              <div className="space-y-2">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MessageCircle style={{ width: 14, height: 14, color: "#b8956f" }} />
                  <Label htmlFor="whatsapp">WhatsApp (para contato)</Label>
                </div>
                <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSalvar}
                disabled={atualizarMutation.isPending}
                style={{ background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 12, padding: "11px 24px", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: atualizarMutation.isPending ? 0.7 : 1 }}
              >
                {atualizarMutation.isPending ? "Salvando..." : "Salvar Dados"}
              </button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identidade Visual</CardTitle>
            <CardDescription>Personalize o logo e a cor principal do sistema para a sua marca.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Logo da Empresa</Label>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                style={{ display: "none" }}
                onChange={handleArquivoLogo}
              />
              <div className="flex items-start gap-4">
                {/* Preview */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 80, height: 80, borderRadius: 16, border: "1px solid #e6d9cf", background: "#f9f6f2", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <span style={{ fontSize: 28, fontWeight: 800, color: "#b8956f" }}>{nome?.charAt(0) || "V"}</span>
                    )}
                  </div>
                  {logoUrl && (
                    <button
                      type="button"
                      title="Remover logo"
                      onClick={limparLogo}
                      style={{ position: "absolute", top: -6, right: -6, background: "#b91c1c", color: "#fff", border: 0, borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                    >
                      <X style={{ width: 11, height: 11 }} />
                    </button>
                  )}
                </div>

                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1.5px dashed #b8956f", background: "#fdf9f5", color: "#59463b", borderRadius: 10, padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 14, width: "100%", justifyContent: "center" }}
                  >
                    <Upload style={{ width: 16, height: 16 }} />
                    {logoNomeArquivo ? logoNomeArquivo : "Enviar imagem do computador"}
                  </button>
                  <p style={{ fontSize: 11, color: "#8b735d", margin: 0 }}>PNG, JPG, SVG ou WebP · máximo 2 MB</p>

                  {/* OR divider + URL input */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 1, background: "#e6d9cf" }} />
                    <span style={{ fontSize: 11, color: "#8b735d", fontWeight: 600 }}>ou cole uma URL</span>
                    <div style={{ flex: 1, height: 1, background: "#e6d9cf" }} />
                  </div>
                  <Input
                    id="logo_url"
                    value={logoUrl.startsWith("data:") ? "" : logoUrl}
                    onChange={(e) => { setLogoUrl(e.target.value); setLogoNomeArquivo(""); }}
                    placeholder="https://suaempresa.com/logo.png"
                    style={{ fontSize: 13 }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Cor Principal</Label>
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-xl border shrink-0 cursor-pointer relative overflow-hidden"
                  style={{ backgroundColor: corPrimaria }}
                >
                  <input
                    type="color"
                    value={corPrimaria}
                    onChange={(e) => setCorPrimaria(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    title="Escolha uma cor"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor="cor_hex">Código Hexadecimal</Label>
                  <Input
                    id="cor_hex"
                    value={corPrimaria}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCorPrimaria(v.startsWith("#") ? v : "#" + v);
                    }}
                    placeholder="#7C3AED"
                    maxLength={7}
                  />
                  <p className="text-xs text-muted-foreground">Clique no quadrado colorido para abrir o seletor de cor.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {["#7C3AED", "#2563EB", "#DC2626", "#16A34A", "#D97706", "#DB2777", "#0891B2", "#374151"].map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ backgroundColor: cor, borderColor: corPrimaria === cor ? "currentColor" : "transparent" }}
                    onClick={() => setCorPrimaria(cor)}
                    title={cor}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSalvar}
                disabled={atualizarMutation.isPending}
                style={{ background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 12, padding: "11px 24px", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: atualizarMutation.isPending ? 0.7 : 1 }}
              >
                {atualizarMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* PIX / Pagamento */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <QrCode style={{ width: 20, height: 20, color: "#b8956f" }} />
              <div>
                <CardTitle>Pagamento PIX</CardTitle>
                <CardDescription>Configure sua chave PIX para receber pagamentos diretamente pelo sistema.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="percentual_sinal">Percentual do sinal (%)</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Input
                  id="percentual_sinal"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={percentualSinal}
                  onChange={(e) => setPercentualSinal(e.target.value)}
                  placeholder="Ex: 20 (para cobrar 20% do valor do serviço)"
                  style={{ maxWidth: 200 }}
                />
                <span className="text-sm text-muted-foreground font-semibold">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Percentual cobrado como sinal no ato do agendamento pelo portal. O sistema calcula automaticamente sobre o valor do serviço escolhido.
                Ex: serviço de R$100 com 20% de sinal → cliente paga R$20 via PIX para confirmar o horário. Deixe em branco para não exigir sinal.
              </p>
              {percentualSinal && !isNaN(parseFloat(percentualSinal)) && parseFloat(percentualSinal) > 0 && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#1e40af" }}>
                  💡 Com {percentualSinal}% de sinal: serviço de R$50 → sinal de R${(50 * parseFloat(percentualSinal) / 100).toFixed(2)} • serviço de R$100 → sinal de R${(100 * parseFloat(percentualSinal) / 100).toFixed(2)}
                </div>
              )}
              {percentualSinal && !isNaN(parseFloat(percentualSinal)) && parseFloat(percentualSinal) > 0 && !chavePix && !mpAccessToken && (
                <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#c2410c", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <span>
                    <strong>Método de pagamento não configurado!</strong> O sinal está habilitado, mas sem a <strong>Chave PIX</strong> ou o <strong>Token do Mercado Pago</strong> preenchidos abaixo, o sistema <strong>não cobrará sinal dos clientes</strong>.
                    Configure pelo menos um método de pagamento para ativar a cobrança de sinal.
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="chave_pix">Chave PIX (manual)</Label>
              <Input
                id="chave_pix"
                value={chavePix}
                onChange={(e) => setChavePix(e.target.value)}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              />
              <p className="text-xs text-muted-foreground">
                Aceito: CPF (000.000.000-00), CNPJ, e-mail, celular (+5511999999999) ou chave aleatória.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mp_access_token">Token Mercado Pago (Access Token)</Label>
              <Input
                id="mp_access_token"
                type="password"
                value={mpAccessToken}
                onChange={(e) => setMpAccessToken(e.target.value)}
                placeholder="APP_USR-xxxx... ou TEST-xxxx..."
              />
              <p className="text-xs text-muted-foreground">
                Necessário para cobrar via QR Code PIX ou cartão. Obtenha em <strong>mercadopago.com.br → Credenciais</strong>. Os pagamentos vão direto para a sua conta MP — a plataforma não interfere.
              </p>
            </div>
            {chavePix && (
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#15803d", fontWeight: 600 }}>
                ✓ Chave configurada — aparecerá no QR Code PIX ao cobrar um cliente.
              </div>
            )}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSalvar}
                disabled={atualizarMutation.isPending}
                style={{ background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 12, padding: "11px 24px", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: atualizarMutation.isPending ? 0.7 : 1 }}
              >
                {atualizarMutation.isPending ? "Salvando..." : "Salvar PIX"}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Programa de Fidelidade */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <div>
                <CardTitle>Programa de Fidelidade</CardTitle>
                <CardDescription>Recompense clientes fiéis com pontos a cada atendimento concluído.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div className="space-y-2">
                <Label htmlFor="pontos_por_real">Pontos por R$1 gasto</Label>
                <Input
                  id="pontos_por_real"
                  type="number"
                  min="0"
                  step="0.5"
                  value={pontosPorReal}
                  onChange={(e) => setPontosPorReal(e.target.value)}
                  placeholder="Ex: 1"
                />
                <p className="text-xs text-muted-foreground">0 = fidelidade desativada</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pontos_para_desconto">Pontos para desconto</Label>
                <Input
                  id="pontos_para_desconto"
                  type="number"
                  min="1"
                  step="1"
                  value={pontosParaDesconto}
                  onChange={(e) => setPontosParaDesconto(e.target.value)}
                  placeholder="Ex: 100"
                />
                <p className="text-xs text-muted-foreground">Qtd de pontos necessária</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pontos_valor_desconto">Valor do desconto (R$)</Label>
                <Input
                  id="pontos_valor_desconto"
                  type="number"
                  min="0"
                  step="1"
                  value={pontosValorDesconto}
                  onChange={(e) => setPontosValorDesconto(e.target.value)}
                  placeholder="Ex: 10"
                />
                <p className="text-xs text-muted-foreground">Desconto em R$</p>
              </div>
            </div>
            {pontosPorReal && parseFloat(pontosPorReal) > 0 && pontosParaDesconto && pontosValorDesconto && (
              <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#854d0e" }}>
                ⭐ Cliente ganha <strong>{pontosPorReal} ponto{parseFloat(pontosPorReal) !== 1 ? "s" : ""} por R$1</strong> — a cada <strong>{pontosParaDesconto} pontos</strong> acumulados recebe <strong>R${parseFloat(pontosValorDesconto).toFixed(2)} de desconto</strong>.
                Exemplo: serviço de R$100 → {Math.floor(100 * parseFloat(pontosPorReal))} pontos ganhos.
              </div>
            )}
            {(!pontosPorReal || parseFloat(pontosPorReal) === 0) && (
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#94a3b8" }}>
                ℹ️ Programa desativado. Preencha <strong>Pontos por R$1</strong> com um valor maior que zero para ativar.
              </div>
            )}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSalvar}
                disabled={atualizarMutation.isPending}
                style={{ background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 12, padding: "11px 24px", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: atualizarMutation.isPending ? 0.7 : 1 }}
              >
                {atualizarMutation.isPending ? "Salvando..." : "Salvar Fidelidade"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
