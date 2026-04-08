import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListClientes,
  useDeleteCliente,
  getListClientesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useCep, formatarCep, enderecoVazio, type EnderecoForm } from "@/hooks/use-cep";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getToken() { return localStorage.getItem("vendlysys_token"); }
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro" }));
    throw new Error(err.error || "Erro");
  }
  if (res.status === 204) return null;
  return res.json();
}

interface ClienteForm {
  nome: string;
  telefone: string;
  email: string;
  data_nascimento: string;
  observacoes: string;
  endereco: EnderecoForm;
}

const formVazio: ClienteForm = {
  nome: "",
  telefone: "",
  email: "",
  data_nascimento: "",
  observacoes: "",
  endereco: { ...enderecoVazio },
};

function formatarData(data: string | null | undefined) {
  if (!data) return "-";
  const partes = String(data).split("-");
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return data;
}

function enderecoResumido(c: any): string {
  if (c.logradouro) {
    const partes = [c.logradouro, c.numero && `nº ${c.numero}`, c.bairro, c.cidade].filter(Boolean);
    return partes.join(", ");
  }
  return c.endereco || "-";
}

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<number | null>(null);
  const [clienteExcluindo, setClienteExcluindo] = useState<number | null>(null);
  const [form, setForm] = useState<ClienteForm>(formVazio);
  const [salvando, setSalvando] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { empresa, isAdmin } = useAuth() as any;
  const [forcandoExcluir, setForcandoExcluir] = useState<{ id: number; totalAg: number; totalNaoConcluidos: number; totalConcluidos: number } | null>(null);
  const { buscarCep, buscandoCep, erroCep, setErroCep } = useCep();

  const corPrimaria = (empresa as any)?.cor_primaria || "#b8956f";
  const corSecundaria = (empresa as any)?.cor_secundaria || "#59463b";

  const { data: clientes, isLoading } = useListClientes(
    { search },
    { query: { enabled: true, queryKey: getListClientesQueryKey({ search }) } }
  );

  const excluirMutation = useDeleteCliente({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListClientesQueryKey({}) });
        setClienteExcluindo(null);
        toast({ title: "Cliente removido." });
      },
      onError: (err: any, variables: any) => {
        // ApiError exposes .status and .data (already parsed body)
        const status = err?.status ?? err?.response?.status;
        const body = err?.data ?? null;
        const msg = body?.error ?? err?.message ?? "Erro ao remover cliente.";
        const totalAg: number = body?.total_agendamentos ?? 0;

        // variables.id é o ID passado ao mutate() — não depende do estado (que já foi zerado)
        if (status === 409 && isAdmin && variables?.id) {
          setForcandoExcluir({
            id: variables.id,
            totalAg,
            totalNaoConcluidos: body?.total_nao_concluidos ?? totalAg,
            totalConcluidos: body?.total_concluidos ?? 0,
          });
          setClienteExcluindo(null);
        } else {
          toast({ title: msg, variant: "destructive" });
        }
      },
    },
  });

  function abrirNovo() {
    setForm(formVazio);
    setClienteEditando(null);
    setModalAberto(true);
  }

  async function handleForcarExcluir() {
    if (!forcandoExcluir) return;
    try {
      const token = getToken();
      const res = await fetch(`${BASE}/api/clientes/${forcandoExcluir.id}?force=true`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({ title: body.error || "Erro ao remover cliente.", variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: getListClientesQueryKey({}) });
        const msg = (forcandoExcluir?.totalConcluidos ?? 0) > 0
          ? "Cliente removido. Histórico financeiro preservado."
          : "Cliente e agendamentos removidos.";
        toast({ title: msg });
      }
    } catch {
      toast({ title: "Erro ao remover cliente.", variant: "destructive" });
    } finally {
      setForcandoExcluir(null);
    }
  }

  function abrirEdicao(cliente: any) {
    setForm({
      nome: cliente.nome || "",
      telefone: cliente.telefone || "",
      email: cliente.email || "",
      data_nascimento: cliente.data_nascimento || "",
      observacoes: cliente.observacoes || "",
      endereco: {
        cep: cliente.cep || "",
        logradouro: cliente.logradouro || "",
        numero: cliente.numero || "",
        complemento: cliente.complemento || "",
        bairro: cliente.bairro || "",
        cidade: cliente.cidade || "",
        estado: cliente.estado || "",
      },
    });
    setClienteEditando(cliente.id);
    setModalAberto(true);
  }

  function setEndereco(partial: Partial<EnderecoForm>) {
    setForm((f) => ({ ...f, endereco: { ...f.endereco, ...partial } }));
  }

  function handleCepChange(valor: string) {
    const formatado = formatarCep(valor);
    setEndereco({ cep: formatado });
    setErroCep("");
    if (valor.replace(/\D/g, "").length === 8) {
      buscarCep(valor, (end) => setEndereco(end));
    }
  }

  async function handleSalvar() {
    if (!form.nome.trim()) {
      toast({ title: "O nome é obrigatório.", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || undefined,
        email: form.email.trim() || undefined,
        data_nascimento: form.data_nascimento || undefined,
        observacoes: form.observacoes.trim() || undefined,
        cep: form.endereco.cep || undefined,
        logradouro: form.endereco.logradouro || undefined,
        numero: form.endereco.numero || undefined,
        complemento: form.endereco.complemento || undefined,
        bairro: form.endereco.bairro || undefined,
        cidade: form.endereco.cidade || undefined,
        estado: form.endereco.estado || undefined,
      };

      if (clienteEditando) {
        await apiFetch(`/api/clientes/${clienteEditando}`, { method: "PUT", body: JSON.stringify(payload) });
        toast({ title: "Cliente atualizado." });
      } else {
        await apiFetch("/api/clientes", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Cliente cadastrado." });
      }
      queryClient.invalidateQueries({ queryKey: getListClientesQueryKey({}) });
      setModalAberto(false);
      setClienteEditando(null);
    } catch (e: any) {
      toast({ title: e.message || "Erro ao salvar.", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <button
            type="button"
            onClick={abrirNovo}
            style={{
              background: "linear-gradient(135deg, #59463b, #2d241f)",
              color: "#fff", border: 0, borderRadius: 12,
              padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <Plus style={{ width: 16, height: 16 }} /> Novo Cliente
          </button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Base de Clientes</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar clientes..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Nascimento</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="text-right">Atendimentos</TableHead>
                    <TableHead className="text-right">Total Gasto</TableHead>
                    <TableHead className="text-right">Pontos</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes?.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.telefone || "-"}</TableCell>
                      <TableCell>{formatarData(cliente.data_nascimento)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{enderecoResumido(cliente)}</TableCell>
                      <TableCell className="text-right">{cliente.total_agendamentos || 0}</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          cliente.total_gasto || 0
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(cliente as any).pontos != null && (cliente as any).pontos > 0 ? (
                          <span style={{ background: "#fefce8", color: "#854d0e", borderRadius: 10, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>
                            ⭐ {(cliente as any).pontos}
                          </span>
                        ) : (
                          <span style={{ color: "#cbd5e1", fontSize: 12 }}>—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => abrirEdicao(cliente)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setClienteExcluindo(cliente.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {clientes?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum cliente encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalAberto} onOpenChange={(v) => { if (!v) { setModalAberto(false); setClienteEditando(null); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{clienteEditando ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Nome + Telefone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            {/* E-mail + Nascimento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={form.data_nascimento}
                  onChange={(e) => setForm((f) => ({ ...f, data_nascimento: e.target.value }))}
                />
              </div>
            </div>

            {/* Endereço por CEP */}
            <div
              style={{
                background: "#f9f6f2",
                border: "1px solid #e6d9cf",
                borderRadius: 14,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: "#8b735d", textTransform: "uppercase", letterSpacing: 0.8 }}>
                Endereço
              </p>

              {/* CEP */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label style={{ fontSize: 12 }}>CEP</Label>
                  <div style={{ position: "relative" }}>
                    <Input
                      value={form.endereco.cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {buscandoCep && (
                      <div style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: "#8b735d" }}>
                        Buscando...
                      </div>
                    )}
                  </div>
                  {erroCep && <p style={{ fontSize: 11, color: "#b91c1c", margin: 0 }}>{erroCep}</p>}
                </div>
                <div className="space-y-1 col-span-2">
                  <Label style={{ fontSize: 12 }}>Logradouro</Label>
                  <Input
                    value={form.endereco.logradouro}
                    onChange={(e) => setEndereco({ logradouro: e.target.value })}
                    placeholder="Rua, Avenida..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label style={{ fontSize: 12 }}>Número</Label>
                  <Input
                    value={form.endereco.numero}
                    onChange={(e) => setEndereco({ numero: e.target.value })}
                    placeholder="123"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label style={{ fontSize: 12 }}>Complemento</Label>
                  <Input
                    value={form.endereco.complemento}
                    onChange={(e) => setEndereco({ complemento: e.target.value })}
                    placeholder="Apto, Bloco..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label style={{ fontSize: 12 }}>Bairro</Label>
                  <Input
                    value={form.endereco.bairro}
                    onChange={(e) => setEndereco({ bairro: e.target.value })}
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-1">
                  <Label style={{ fontSize: 12 }}>UF</Label>
                  <Input
                    value={form.endereco.estado}
                    onChange={(e) => setEndereco({ estado: e.target.value })}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label style={{ fontSize: 12 }}>Cidade</Label>
                <Input
                  value={form.endereco.cidade}
                  onChange={(e) => setEndereco({ cidade: e.target.value })}
                  placeholder="Cidade"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                placeholder="Alergias, preferências, etc."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => { setModalAberto(false); setClienteEditando(null); }}
              style={{
                border: "1px solid #e6d9cf", background: "#f9f6f2", color: "#4f433a",
                borderRadius: 12, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14,
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={salvando}
              style={{
                background: `linear-gradient(135deg, ${corSecundaria}, ${corPrimaria})`,
                color: "#fff", border: 0, borderRadius: 12,
                padding: "11px 20px", fontWeight: 800, cursor: "pointer",
                fontSize: 14, opacity: salvando ? 0.7 : 1,
              }}
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clienteExcluindo !== null} onOpenChange={(v) => { if (!v) setClienteExcluindo(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cliente será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => clienteExcluindo && excluirMutation.mutate({ id: clienteExcluindo })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de remoção forçada — apenas admin */}
      <AlertDialog open={forcandoExcluir !== null} onOpenChange={(v) => { if (!v) setForcandoExcluir(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover cliente com agendamentos?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "#374151" }}>
                <span>Este cliente possui <strong>{forcandoExcluir?.totalAg}</strong> agendamento(s) vinculado(s).</span>
                {(forcandoExcluir?.totalConcluidos ?? 0) > 0 && (
                  <span style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "8px 12px", color: "#15803d" }}>
                    ✓ <strong>{forcandoExcluir?.totalConcluidos}</strong> concluído(s) serão <strong>preservados no histórico financeiro</strong>.
                  </span>
                )}
                {(forcandoExcluir?.totalNaoConcluidos ?? 0) > 0 && (
                  <span style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "8px 12px", color: "#dc2626" }}>
                    ✗ <strong>{forcandoExcluir?.totalNaoConcluidos}</strong> agendamento(s) pendente(s) serão <strong>removidos permanentemente</strong>.
                  </span>
                )}
                <span style={{ color: "#6b7280", fontSize: 13 }}>Esta ação não pode ser desfeita.</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleForcarExcluir}
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
