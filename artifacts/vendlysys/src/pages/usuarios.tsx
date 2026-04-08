import { useState } from "react";
import { Layout } from "@/components/layout";
import {
  useListUsuarios,
  useCreateUsuario,
  useUpdateUsuario,
  useResetSenhaUsuario,
  getListUsuariosQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UsuarioForm {
  nome: string;
  email: string;
  perfil: string;
  senha: string;
  ativo: boolean;
}

const formVazio: UsuarioForm = {
  nome: "",
  email: "",
  perfil: "agenda",
  senha: "",
  ativo: true,
};

export default function Usuarios() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [showSenha, setShowSenha] = useState(false);
  const [form, setForm] = useState<UsuarioForm>(formVazio);

  const { data: usuarios, isLoading } = useListUsuarios(
    { query: { enabled: true, queryKey: getListUsuariosQueryKey() } }
  );

  const criarMutation = useCreateUsuario({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsuariosQueryKey() });
        setModalAberto(false);
        toast({ title: "Usuário criado com sucesso." });
      },
      onError: () => {
        toast({ title: "Erro ao criar usuário.", variant: "destructive" });
      },
    },
  });

  const atualizarMutation = useUpdateUsuario();
  const resetSenhaMutation = useResetSenhaUsuario();

  function abrirNovo() {
    setForm(formVazio);
    setEditandoId(null);
    setShowSenha(false);
    setModalAberto(true);
  }

  function abrirEdicao(u: any) {
    setForm({
      nome: u.nome || "",
      email: u.email || "",
      perfil: u.perfil || "agenda",
      senha: "",
      ativo: u.ativo !== false,
    });
    setEditandoId(u.id);
    setShowSenha(false);
    setModalAberto(true);
  }

  async function handleSalvar() {
    if (!form.nome.trim() || !form.email.trim()) {
      toast({ title: "Nome e e-mail são obrigatórios.", variant: "destructive" });
      return;
    }

    if (editandoId) {
      try {
        await atualizarMutation.mutateAsync({
          id: editandoId,
          data: {
            nome: form.nome,
            email: form.email,
            perfil: form.perfil as any,
            ativo: form.ativo,
          } as any,
        });
        if (form.senha.trim()) {
          await resetSenhaMutation.mutateAsync({
            id: editandoId,
            data: { nova_senha: form.senha },
          });
        }
        queryClient.invalidateQueries({ queryKey: getListUsuariosQueryKey() });
        setModalAberto(false);
        setEditandoId(null);
        toast({ title: "Usuário atualizado com sucesso." });
      } catch {
        toast({ title: "Erro ao atualizar usuário.", variant: "destructive" });
      }
    } else {
      if (!form.senha.trim()) {
        toast({ title: "Informe a senha para o novo usuário.", variant: "destructive" });
        return;
      }
      criarMutation.mutate({
        data: {
          nome: form.nome,
          email: form.email,
          perfil: form.perfil as any,
          senha: form.senha,
          ativo: form.ativo,
        },
      });
    }
  }

  const isSalvando = criarMutation.isPending || atualizarMutation.isPending;

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
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
            <Plus style={{ width: 16, height: 16 }} /> Novo Usuário
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Equipe</CardTitle>
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
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios?.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.perfil === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {u.perfil === "admin" ? "Admin" : "Agenda"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {u.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(u)}
                          style={{ background: "none", border: "1px solid #e6d9cf", borderRadius: 8, padding: "5px 12px", cursor: "pointer", color: "#59463b", fontWeight: 600, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 5 }}
                        >
                          <Pencil style={{ width: 13, height: 13 }} /> Editar
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {usuarios?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum usuário encontrado.
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
            <DialogTitle>{editandoId ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
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
            <div className="space-y-2">
              <Label>E-mail *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="usuario@email.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select value={form.perfil} onValueChange={(v) => setForm(f => ({ ...f, perfil: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agenda">Agenda</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
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

            <div className="space-y-2">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Label>{editandoId ? "Nova Senha" : "Senha *"}</Label>
                {editandoId && (
                  <span style={{ fontSize: 11, color: "#8b735d" }}>Deixe em branco para não alterar</span>
                )}
              </div>
              <div style={{ position: "relative" }}>
                <Input
                  type={showSenha ? "text" : "password"}
                  value={form.senha}
                  onChange={(e) => setForm(f => ({ ...f, senha: e.target.value }))}
                  placeholder={editandoId ? "Nova senha (opcional)" : "Senha de acesso"}
                  style={{ paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(s => !s)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: 0, cursor: "pointer", color: "#8b735d", display: "flex", alignItems: "center" }}
                  tabIndex={-1}
                >
                  {showSenha
                    ? <EyeOff style={{ width: 16, height: 16 }} />
                    : <Eye style={{ width: 16, height: 16 }} />
                  }
                </button>
              </div>
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
    </Layout>
  );
}
