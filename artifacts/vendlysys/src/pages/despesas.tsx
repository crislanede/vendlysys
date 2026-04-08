import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListDespesas,
  useCreateDespesa,
  useUpdateDespesa,
  useDeleteDespesa,
  getListDespesasQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIAS = [
  { value: "aluguel", label: "Aluguel" },
  { value: "produto", label: "Produto" },
  { value: "funcionario", label: "Funcionário" },
  { value: "marketing", label: "Marketing" },
  { value: "equipamento", label: "Equipamento" },
  { value: "outros", label: "Outro" },
];

interface DespesaForm {
  descricao: string;
  valor: string;
  data: string;
  categoria: string;
  pago: boolean;
  observacoes: string;
}

const formVazio: DespesaForm = {
  descricao: "",
  valor: "",
  data: new Date().toISOString().split("T")[0],
  categoria: "outros",
  pago: false,
  observacoes: "",
};

export default function Despesas() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [excluindoId, setExcluindoId] = useState<number | null>(null);
  const [form, setForm] = useState<DespesaForm>(formVazio);

  const { data: despesas, isLoading } = useListDespesas(
    {},
    { query: { enabled: true, queryKey: getListDespesasQueryKey({}) } }
  );

  function mensagemErro(err: any, fallback: string): string {
    try {
      const msg = err?.response?.data?.error || err?.message || "";
      if (!msg) return fallback;
      const parsed = JSON.parse(msg);
      if (Array.isArray(parsed) && parsed[0]?.message) {
        const campo = parsed[0]?.path?.[0];
        const campos: Record<string, string> = {
          descricao: "Descrição",
          valor: "Valor",
          data: "Data",
          categoria: "Categoria",
        };
        return `Campo inválido: ${campos[campo] ?? campo} — ${parsed[0].message}`;
      }
      return msg || fallback;
    } catch {
      return fallback;
    }
  }

  const criarMutation = useCreateDespesa({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDespesasQueryKey({}) });
        setModalAberto(false);
        toast({ title: "Despesa cadastrada." });
      },
      onError: (err: any) => {
        toast({ title: mensagemErro(err, "Erro ao cadastrar despesa."), variant: "destructive" });
      },
    },
  });

  const atualizarMutation = useUpdateDespesa({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDespesasQueryKey({}) });
        setModalAberto(false);
        setEditandoId(null);
        toast({ title: "Despesa atualizada." });
      },
      onError: (err: any) => {
        toast({ title: mensagemErro(err, "Erro ao atualizar despesa."), variant: "destructive" });
      },
    },
  });

  const excluirMutation = useDeleteDespesa({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDespesasQueryKey({}) });
        setExcluindoId(null);
        toast({ title: "Despesa removida." });
      },
      onError: () => {
        toast({ title: "Erro ao remover despesa.", variant: "destructive" });
      },
    },
  });

  function abrirNova() {
    setForm(formVazio);
    setEditandoId(null);
    setModalAberto(true);
  }

  function abrirEdicao(d: any) {
    setForm({
      descricao: d.descricao || "",
      valor: String(d.valor || ""),
      data: d.data || new Date().toISOString().split("T")[0],
      categoria: d.categoria || "outro",
      pago: d.pago || false,
      observacoes: d.observacoes || "",
    });
    setEditandoId(d.id);
    setModalAberto(true);
  }

  function handleSalvar() {
    const valor = parseFloat(form.valor.replace(",", "."));
    if (!form.descricao.trim()) {
      toast({ title: "Informe a descrição.", variant: "destructive" });
      return;
    }
    if (isNaN(valor) || valor <= 0) {
      toast({ title: "Informe um valor válido.", variant: "destructive" });
      return;
    }

    const payload: any = {
      descricao: form.descricao,
      valor,
      data: form.data,
      categoria: form.categoria as any,
      pago: form.pago,
    };
    if (form.observacoes) payload.observacoes = form.observacoes;

    if (editandoId) {
      atualizarMutation.mutate({ id: editandoId, data: payload });
    } else {
      criarMutation.mutate({ data: payload });
    }
  }

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const totalMes = despesas?.reduce((a, d) => a + d.valor, 0) || 0;
  const isSalvando = criarMutation.isPending || atualizarMutation.isPending;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Despesas</h1>
          <button
            type="button"
            onClick={abrirNova}
            style={{
              background: "linear-gradient(135deg, #59463b, #2d241f)",
              color: "#fff", border: 0, borderRadius: 12,
              padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <Plus style={{ width: 16, height: 16 }} /> Nova Despesa
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{fmt(totalMes)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pagas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {fmt(despesas?.filter(d => d.pago).reduce((a, d) => a + d.valor, 0) || 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {fmt(despesas?.filter(d => !d.pago).reduce((a, d) => a + d.valor, 0) || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Despesas</CardTitle>
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
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesas?.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.data}</TableCell>
                      <TableCell>{d.descricao}</TableCell>
                      <TableCell className="capitalize">
                        {CATEGORIAS.find(c => c.value === d.categoria)?.label || d.categoria}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          d.pago ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {d.pago ? "Pago" : "Pendente"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-red-600 font-medium">-{fmt(d.valor)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => abrirEdicao(d)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setExcluindoId(d.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {despesas?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma despesa encontrada.
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
            <DialogTitle>{editandoId ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Aluguel do espaço"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  value={form.valor}
                  onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.pago ? "pago" : "pendente"}
                  onValueChange={(v) => setForm(f => ({ ...f, pago: v === "pago" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={form.observacoes}
                onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
          </div>
          <DialogFooter style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => { setModalAberto(false); setEditandoId(null); }}
              style={{ border: "1px solid #e6d9cf", background: "#f9f6f2", color: "#4f433a", borderRadius: 12, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={isSalvando}
              style={{ background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 12, padding: "11px 20px", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: isSalvando ? 0.7 : 1 }}
            >
              {isSalvando ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={excluindoId !== null} onOpenChange={(v) => { if (!v) setExcluindoId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover despesa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => excluindoId && excluirMutation.mutate({ id: excluindoId })}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
