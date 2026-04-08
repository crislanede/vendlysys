import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Layout } from "@/components/layout";
import {
  useListLancamentos,
  useMarcarPago,
  useUpdateLancamento,
  getListLancamentosQueryKey,
  useListDespesas,
  getListDespesasQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Pencil } from "lucide-react";

function formatDateBR(str?: string | null): string {
  if (!str) return "—";
  const d = new Date(str.slice(0, 10) + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

const FORMAS = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
];

const inputStyleFin: React.CSSProperties = {
  border: "1.5px solid #C5D4EE",
  borderRadius: 10,
  padding: "7px 12px",
  fontSize: 14,
  fontWeight: 600,
  color: "#1C3A6E",
  background: "#EEF3FF",
  cursor: "pointer",
  outline: "none",
};

function todayStr() { return new Date().toISOString().split("T")[0]; }
function firstOfMonthStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function Financeiro() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dataInicio, setDataInicio] = useState(firstOfMonthStr);
  const [dataFim, setDataFim] = useState(todayStr);

  const [modalPagar, setModalPagar] = useState<{ id: number; valor: number } | null>(null);
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [valorPago, setValorPago] = useState("");

  const [modalEditar, setModalEditar] = useState<{ id: number; forma: string; obs: string } | null>(null);
  const [editForma, setEditForma] = useState("dinheiro");
  const [editObs, setEditObs] = useState("");

  const periodoParams = { data_inicio: dataInicio, data_fim: dataFim };

  type ComissaoItem = {
    profissional_id: number;
    profissional_nome: string;
    comissao_percentual: number;
    total_servicos: number;
    total_recebido: number;
    valor_comissao: number;
    qtd_atendimentos: number;
  };
  const [comissoes, setComissoes] = useState<ComissaoItem[]>([]);
  const [totalComissoes, setTotalComissoes] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("vendlysys_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`/api/financeiro/comissoes?data_inicio=${dataInicio}&data_fim=${dataFim}`, { headers })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setComissoes(data.comissoes ?? []);
          setTotalComissoes(data.total_comissoes ?? 0);
        }
      })
      .catch(() => {});
  }, [dataInicio, dataFim]);

  const { data: lancamentos, isLoading } = useListLancamentos(
    periodoParams,
    { query: { enabled: true, queryKey: getListLancamentosQueryKey(periodoParams) } }
  );

  const { data: despesas } = useListDespesas(
    periodoParams,
    { query: { enabled: true, queryKey: getListDespesasQueryKey(periodoParams) } }
  );

  const marcarPagoMutation = useMarcarPago({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLancamentosQueryKey({}) });
        setModalPagar(null);
        toast({ title: "Pagamento registrado com sucesso." });
      },
      onError: () => {
        toast({ title: "Erro ao registrar pagamento.", variant: "destructive" });
      },
    },
  });

  const atualizarMutation = useUpdateLancamento({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListLancamentosQueryKey({}) });
        setModalEditar(null);
        toast({ title: "Lançamento atualizado." });
      },
      onError: () => {
        toast({ title: "Erro ao atualizar lançamento.", variant: "destructive" });
      },
    },
  });

  function exportarExcel() {
    if (!lancamentos || lancamentos.length === 0) return;
    const fmt = (v: number | null | undefined) =>
      v != null ? new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2 }).format(v) : "";
    const dados = lancamentos.map((l) => ({
      "Data": formatDateBR(l.data),
      "Cliente": l.cliente_nome ?? "",
      "Serviço": l.servico ?? "",
      "Profissional": l.profissional_nome ?? "",
      "Tipo": l.tipo ?? "",
      "Valor Cobrado": fmt(l.valor),
      "Valor Pago": fmt(l.valor_pago),
      "Status": l.status_pagamento === "pago" ? "Pago" : l.status_pagamento === "pendente" ? "Pendente" : "Cancelado",
      "Forma Pagamento": (l.forma_pagamento ?? "").replace(/_/g, " "),
      "Observações": l.observacoes ?? "",
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);
    ws["!cols"] = [
      { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 22 }, { wch: 12 },
      { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
    const dataHoje = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `lancamentos_${dataHoje}.xlsx`);
  }

  function abrirPagar(id: number, valor: number) {
    setModalPagar({ id, valor });
    setFormaPagamento("dinheiro");
    setValorPago(valor.toFixed(2).replace(".", ","));
  }

  function handlePagar() {
    if (!modalPagar) return;
    const vp = parseFloat(valorPago.replace(",", "."));
    if (isNaN(vp) || vp <= 0) {
      toast({ title: "Informe um valor válido.", variant: "destructive" });
      return;
    }
    marcarPagoMutation.mutate({
      id: modalPagar.id,
      data: { forma_pagamento: formaPagamento as any, valor_pago: vp },
    });
  }

  function abrirEditar(l: any) {
    setEditForma(l.forma_pagamento || "dinheiro");
    setEditObs(l.observacoes || "");
    setModalEditar({ id: l.id, forma: l.forma_pagamento || "dinheiro", obs: l.observacoes || "" });
  }

  function handleEditar() {
    if (!modalEditar) return;
    atualizarMutation.mutate({
      id: modalEditar.id,
      data: { forma_pagamento: editForma as any, observacoes: editObs },
    });
  }

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const totalCobrado = lancamentos?.reduce((a, c) => a + c.valor, 0) || 0;
  const totalRecebido = lancamentos?.filter(l => l.status_pagamento === "pago").reduce((a, c) => a + (c.valor_pago || 0), 0) || 0;
  const totalPendente = lancamentos?.filter(l => l.status_pagamento === "pendente").reduce((a, c) => a + c.valor, 0) || 0;
  const totalSaidas = despesas?.reduce((a, c) => a + Number(c.valor), 0) || 0;
  const totalSaidasPagas = despesas?.filter(d => d.pago).reduce((a, c) => a + Number(c.valor), 0) || 0;

  const LABEL_CATEGORIA: Record<string, string> = {
    aluguel: "Aluguel", produto: "Produto", funcionario: "Funcionário",
    marketing: "Marketing", equipamento: "Equipamento", outros: "Outros",
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "#6B80A0", fontWeight: 500 }}>Período:</span>
            <input
              type="date"
              value={dataInicio}
              max={dataFim}
              onChange={(e) => setDataInicio(e.target.value)}
              style={inputStyleFin}
            />
            <span style={{ fontSize: 13, color: "#6B80A0" }}>até</span>
            <input
              type="date"
              value={dataFim}
              min={dataInicio}
              max={todayStr()}
              onChange={(e) => setDataFim(e.target.value)}
              style={inputStyleFin}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cobrado (Entradas)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{fmt(totalCobrado)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{fmt(totalRecebido)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entradas Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{fmt(totalPendente)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Saídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{fmt(totalSaidas)}</div>
              <p className="text-xs text-muted-foreground mt-1">{fmt(totalSaidasPagas)} pagas</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Lançamentos</CardTitle>
            <button
              type="button"
              onClick={exportarExcel}
              disabled={!lancamentos || lancamentos.length === 0}
              title="Exportar lançamentos para Excel"
              style={{
                background: "#f0fdf4",
                color: "#15803d",
                border: "1.5px solid #86efac",
                borderRadius: 10,
                padding: "8px 16px",
                fontWeight: 700,
                cursor: !lancamentos || lancamentos.length === 0 ? "not-allowed" : "pointer",
                fontSize: 13,
                opacity: !lancamentos || lancamentos.length === 0 ? 0.5 : 1,
                whiteSpace: "nowrap",
              }}
            >
              ⬆ Exportar Excel
            </button>
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
                    <TableHead>Serviço</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Forma Pgto</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos?.map((l) => (
                    <TableRow key={l.id}>
                      <TableCell>{formatDateBR(l.data)}</TableCell>
                      <TableCell>{l.servico}</TableCell>
                      <TableCell>{l.cliente_nome || "-"}</TableCell>
                      <TableCell className="capitalize">{l.forma_pagamento?.replace("_", " ") || "-"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          l.status_pagamento === "pago" ? "bg-green-100 text-green-800" :
                          l.status_pagamento === "pendente" ? "bg-yellow-100 text-yellow-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {l.status_pagamento === "pago" ? "Pago" : l.status_pagamento === "pendente" ? "Pendente" : "Cancelado"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">{fmt(l.valor)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {l.status_pagamento === "pendente" && (
                            <button
                              type="button"
                              onClick={() => abrirPagar(l.id, l.valor)}
                              style={{ background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 8, padding: "5px 12px", fontWeight: 700, cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              <CheckCircle style={{ width: 13, height: 13 }} /> Pagar
                            </button>
                          )}
                          {l.status_pagamento === "pago" && (
                            <Button variant="ghost" size="icon" onClick={() => abrirEditar(l)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lancamentos?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhum lançamento encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {comissoes.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Comissões por Profissional</CardTitle>
              <span style={{ fontSize: 13, color: "#6B80A0", fontWeight: 500 }}>
                Total a pagar: <strong style={{ color: "#F47B1E" }}>{fmt(totalComissoes)}</strong>
              </span>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-center">Atendimentos</TableHead>
                    <TableHead className="text-right">Total Serviços</TableHead>
                    <TableHead className="text-right">Total Recebido</TableHead>
                    <TableHead className="text-center">Comissão %</TableHead>
                    <TableHead className="text-right">Valor Comissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comissoes.map((c) => (
                    <TableRow key={c.profissional_id}>
                      <TableCell className="font-medium">{c.profissional_nome}</TableCell>
                      <TableCell className="text-center">{c.qtd_atendimentos}</TableCell>
                      <TableCell className="text-right">{fmt(c.total_servicos)}</TableCell>
                      <TableCell className="text-right">{fmt(c.total_recebido)}</TableCell>
                      <TableCell className="text-center">
                        <span style={{
                          display: "inline-flex", alignItems: "center",
                          background: c.comissao_percentual > 0 ? "#EEF3FF" : "#f4f4f4",
                          color: c.comissao_percentual > 0 ? "#1C3A6E" : "#888",
                          borderRadius: 8, padding: "2px 10px", fontWeight: 700, fontSize: 13,
                        }}>
                          {c.comissao_percentual.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span style={{ fontWeight: 700, color: c.valor_comissao > 0 ? "#F47B1E" : "#888" }}>
                          {fmt(c.valor_comissao)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Saídas (Despesas)</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Forma Pgto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {despesas?.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{formatDateBR(d.data)}</TableCell>
                    <TableCell>{d.descricao}</TableCell>
                    <TableCell>{LABEL_CATEGORIA[d.categoria] ?? d.categoria}</TableCell>
                    <TableCell className="capitalize">{d.forma_pagamento?.replace("_", " ") || "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        d.pago ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {d.pago ? "Pago" : "Pendente"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">{fmt(Number(d.valor))}</TableCell>
                  </TableRow>
                ))}
                {(!despesas || despesas.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma despesa registrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalPagar !== null} onOpenChange={(v) => { if (!v) setModalPagar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor Recebido (R$)</Label>
              <Input
                value={valorPago}
                onChange={(e) => setValorPago(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>
          <DialogFooter style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={() => setModalPagar(null)} style={{ border: "1px solid #e6d9cf", background: "#f9f6f2", color: "#4f433a", borderRadius: 12, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              Cancelar
            </button>
            <button type="button" onClick={handlePagar} disabled={marcarPagoMutation.isPending} style={{ background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 12, padding: "11px 20px", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: marcarPagoMutation.isPending ? 0.7 : 1 }}>
              {marcarPagoMutation.isPending ? "Salvando..." : "Confirmar Pagamento"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalEditar !== null} onOpenChange={(v) => { if (!v) setModalEditar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={editForma} onValueChange={setEditForma}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={editObs} onChange={(e) => setEditObs(e.target.value)} placeholder="Observações..." />
            </div>
          </div>
          <DialogFooter style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" onClick={() => setModalEditar(null)} style={{ border: "1px solid #e6d9cf", background: "#f9f6f2", color: "#4f433a", borderRadius: 12, padding: "11px 20px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              Cancelar
            </button>
            <button type="button" onClick={handleEditar} disabled={atualizarMutation.isPending} style={{ background: "linear-gradient(135deg, #59463b, #2d241f)", color: "#fff", border: 0, borderRadius: 12, padding: "11px 20px", fontWeight: 800, cursor: "pointer", fontSize: 14, opacity: atualizarMutation.isPending ? 0.7 : 1 }}>
              {atualizarMutation.isPending ? "Salvando..." : "Salvar"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
