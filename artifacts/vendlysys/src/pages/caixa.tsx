import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Layout } from "@/components/layout";
import { useGetFechamentoCaixa, getGetFechamentoCaixaQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function Caixa() {
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: caixa, isLoading } = useGetFechamentoCaixa(
    { data_inicio: dataInicio, data_fim: dataFim },
    { query: { enabled: !!dataInicio && !!dataFim, queryKey: getGetFechamentoCaixaQueryKey({ data_inicio: dataInicio, data_fim: dataFim }) } }
  );

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">Fechamento de Caixa</h1>

        <div className="flex gap-4 items-center">
          <Input 
            type="date" 
            value={dataInicio} 
            onChange={(e) => setDataInicio(e.target.value)} 
            className="w-auto"
          />
          <span>até</span>
          <Input 
            type="date" 
            value={dataFim} 
            onChange={(e) => setDataFim(e.target.value)} 
            className="w-auto"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : caixa ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo do Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${caixa.saldo_periodo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixa.saldo_periodo)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recebido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixa.total_recebido)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixa.total_despesas)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(caixa.ticket_medio)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{caixa.qtd_atendimentos} atendimentos</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {caixa.por_forma_pagamento.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="capitalize font-medium">{item.forma.replace('_', ' ')}</div>
                      <div className="flex gap-4">
                        <span className="text-muted-foreground">{item.quantidade}x</span>
                        <span className="font-semibold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}</span>
                      </div>
                    </div>
                  ))}
                  {caixa.por_forma_pagamento.length === 0 && (
                    <div className="text-muted-foreground text-center py-4">Sem dados para o período</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
