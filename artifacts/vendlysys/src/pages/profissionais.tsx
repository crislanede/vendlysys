import { useState } from "react";
import { Layout } from "@/components/layout";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function getToken() { return localStorage.getItem("vendlysys_token"); }
async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erro" }));
    throw new Error(err.error || "Erro na requisição");
  }
  return res.json();
}

interface Profissional {
  id: number;
  nome: string;
  telefone: string | null;
  email: string | null;
  especialidade: string | null;
  ativo: boolean;
  comissao_percentual: number;
}

interface ProfForm {
  nome: string;
  telefone: string;
  email: string;
  especialidade: string;
  ativo: boolean;
  comissao_percentual: string;
}

const formVazio: ProfForm = {
  nome: "",
  telefone: "",
  email: "",
  especialidade: "",
  ativo: true,
  comissao_percentual: "0",
};

export default function Profissionais() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<ProfForm>(formVazio);

  const { data: profissionais = [], isLoading } = useQuery<Profissional[]>({
    queryKey: ["profissionais"],
    queryFn: () => apiFetch("/api/profissionais"),
  });

  const criarMutation = useMutation({
    mutationFn: (data: any) => apiFetch("/api/profissionais", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profissionais"] });
      setModalAberto(false);
      toast({ title: "Profissional cadastrado." });
    },
    onError: (e: any) => toast({ title: e.message || "Erro ao cadastrar.", variant: "destructive" }),
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiFetch(`/api/profissionais/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profissionais"] });
      setModalAberto(false);
      setEditandoId(null);
      toast({ title: "Profissional atualizado." });
    },
    onError: (e: any) => toast({ title: e.message || "Erro ao atualizar.", variant: "destructive" }),
  });

  function abrirNovo() {
    setForm(formVazio);
    setEditandoId(null);
    setModalAberto(true);
  }

  function abrirEdicao(p: Profissional) {
    setForm({
      nome: p.nome || "",
      telefone: p.telefone || "",
      email: p.email || "",
      especialidade: p.especialidade || "",
      ativo: p.ativo,
      comissao_percentual: String(p.comissao_percentual ?? 0),
    });
    setEditandoId(p.id);
    setModalAberto(true);
  }

  function handleSalvar() {
    if (!form.nome.trim()) {
      toast({ title: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    const pct = parseFloat(form.comissao_percentual.replace(",", "."));
    const data = {
      nome: form.nome,
      telefone: form.telefone || undefined,
      email: form.email || undefined,
      especialidade: form.especialidade || undefined,
      ativo: form.ativo,
      comissao_percentual: isNaN(pct) ? 0 : Math.min(100, Math.max(0, pct)),
    };
    if (editandoId) {
      atualizarMutation.mutate({ id: editandoId, data });
    } else {
      criarMutation.mutate(data);
    }
  }

  const isSalvando = criarMutation.isPending || atualizarMutation.isPending;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Profissionais</h1>
          <button
            type="button"
            onClick={abrirNovo}
            style={{
              background: "linear-gradient(135deg, #1C3A6E, #2B5BA5)",
              color: "#fff", border: 0, borderRadius: 12,
              padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <Plus style={{ width: 16, height: 16 }} /> Novo Profissional
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipe de Profissionais</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Especialidade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profissionais.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.especialidade || "—"}</TableCell>
                      <TableCell>{p.telefone || "—"}</TableCell>
                      <TableCell>
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          background: Number(p.comissao_percentual) > 0 ? "#EEF3FF" : "#f4f4f4",
                          color: Number(p.comissao_percentual) > 0 ? "#1C3A6E" : "#888",
                          borderRadius: 8, padding: "2px 10px", fontWeight: 700, fontSize: 13,
                        }}>
                          {Number(p.comissao_percentual ?? 0).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          p.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {p.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(p)}
                          style={{ background: "none", border: "1px solid #dce4f0", borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: "#1C3A6E", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}
                        >
                          <Pencil style={{ width: 13, height: 13 }} /> Editar
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {profissionais.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum profissional cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalAberto} onOpenChange={(v) => { if (!v) { setModalAberto(false); setEditandoId(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Especialidade</Label>
                <Input
                  value={form.especialidade}
                  onChange={(e) => setForm(f => ({ ...f, especialidade: e.target.value }))}
                  placeholder="Ex: Cabelos, Estética..."
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="profissional@email.com (opcional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Comissão (%)</Label>
                <div style={{ position: "relative" }}>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={form.comissao_percentual}
                    onChange={(e) => setForm(f => ({ ...f, comissao_percentual: e.target.value }))}
                    placeholder="0"
                    style={{ paddingRight: 32 }}
                  />
                  <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#6B80A0", fontWeight: 700, fontSize: 14, pointerEvents: "none" }}>%</span>
                </div>
                <p style={{ fontSize: 11, color: "#6B80A0", margin: 0 }}>Sobre o valor recebido</p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.ativo ? "ativo" : "inativo"}
                  onValueChange={(v) => setForm(f => ({ ...f, ativo: v === "ativo" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => { setModalAberto(false); setEditandoId(null); }}
              style={{ border: "1px solid #dce4f0", background: "#f0f4ff", color: "#1C3A6E", borderRadius: 12, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={isSalvando}
              style={{ background: "linear-gradient(135deg, #1C3A6E, #2B5BA5)", color: "#fff", border: 0, borderRadius: 12, padding: "11px 20px", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: isSalvando ? 0.7 : 1 }}
            >
              {isSalvando ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
