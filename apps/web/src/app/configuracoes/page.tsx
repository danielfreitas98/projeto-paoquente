import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ALL_MODULES,
  MODULE_ROUTES,
  getConfig,
  getPublicConfig,
  shouldUseMockData,
} from "@/lib/config";
import { isSupabaseConfigured, hasServiceRoleKey } from "@/lib/supabase/admin";
import { obterConfiguracaoNegocio } from "@/lib/supabase/queries/configuracao";
import { ImpressoraForm } from "@/components/configuracoes/impressora-form";

export const metadata = {
  title: "Configurações — SWM - CRM",
  description: "Configurações da aplicação e do negócio",
};

export const dynamic = "force-dynamic";

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge variant={ok ? "default" : "secondary"} className="gap-1">
      {ok ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {label}
    </Badge>
  );
}

function ConfigRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default async function ConfiguracoesPage() {
  const config = getConfig();
  const publicConfig = getPublicConfig();
  const negocio = await obterConfiguracaoNegocio();
  const supabaseOk = isSupabaseConfigured();
  const serviceRoleOk = hasServiceRoleKey();
  const mockAtivo = shouldUseMockData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-muted-foreground">
          Visão geral das opções ativas no ambiente atual. Alterações via{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>{" "}
          exigem reiniciar o servidor.
        </p>
      </div>

      {!supabaseOk && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            Supabase não configurado. Algumas configurações de negócio do banco
            não estarão disponíveis.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identidade</CardTitle>
            <CardDescription>Nome exibido no header e na home</CardDescription>
          </CardHeader>
          <CardContent>
            <ConfigRow label="Aplicação" value={publicConfig.app.nomeApp} />
            <ConfigRow label="Empresa" value={publicConfig.app.nomeEmpresa} />
            <ConfigRow
              label="Desenvolvedor"
              value={publicConfig.app.desenvolvedorNome}
            />
            <ConfigRow
              label="CNPJ"
              value={publicConfig.app.desenvolvedorCnpj}
            />
            <ConfigRow
              label="Contato"
              value={publicConfig.app.desenvolvedorContato}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precificação</CardTitle>
            <CardDescription>Parâmetros padrão da ficha técnica</CardDescription>
          </CardHeader>
          <CardContent>
            <ConfigRow
              label="CMV alvo padrão"
              value={`${publicConfig.app.cmvAlvoPadrao}%`}
            />
            <ConfigRow
              label="Tolerância amarela"
              value={`+${publicConfig.app.margemAmarelaPp} pp`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Módulos</CardTitle>
            <CardDescription>Feature flags ativas no ambiente</CardDescription>
          </CardHeader>
          <CardContent>
            {ALL_MODULES.map((module) => (
              <ConfigRow
                key={module}
                label={MODULE_ROUTES[module].label}
                value={
                  <StatusBadge
                    ok={publicConfig.features[module]}
                    label={publicConfig.features[module] ? "Ativo" : "Inativo"}
                  />
                }
              />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>PDV — Impressão</CardTitle>
            <CardDescription>
              Impressora deste computador e parâmetros do cupom fiscal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImpressoraForm />
            <ConfigRow
              label="Tamanho do papel"
              value={publicConfig.pdv.tamanhoPapelImpressao}
            />
            <ConfigRow
              label="Modo de impressão"
              value={
                publicConfig.pdv.modoImpressao === "agente"
                  ? "Agente local (silenciosa)"
                  : "Navegador (diálogo)"
              }
            />
            <ConfigRow
              label="URL do agente"
              value={
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  {publicConfig.pdv.printAgentUrl}
                </code>
              }
            />
            <ConfigRow
              label="Impressão automática"
              value={
                <StatusBadge
                  ok={publicConfig.pdv.imprimirCupomAutomatico}
                  label={
                    publicConfig.pdv.imprimirCupomAutomatico ? "Ativa" : "Manual"
                  }
                />
              }
            />
            <ConfigRow
              label="Mensagem do rodapé"
              value={publicConfig.pdv.mensagemRodapeCupom}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ambiente</CardTitle>
            <CardDescription>Status de conexão e desenvolvimento</CardDescription>
          </CardHeader>
          <CardContent>
            <ConfigRow label="NODE_ENV" value={config.env.nodeEnv} />
            <ConfigRow
              label="Supabase"
              value={<StatusBadge ok={supabaseOk} label={supabaseOk ? "Conectado" : "Ausente"} />}
            />
            <ConfigRow
              label="Service role"
              value={
                <StatusBadge
                  ok={serviceRoleOk}
                  label={serviceRoleOk ? "Configurada" : "Ausente"}
                />
              }
            />
            <ConfigRow
              label="Dados mock"
              value={
                <StatusBadge
                  ok={!mockAtivo}
                  label={mockAtivo ? "Ativo" : "Desativado"}
                />
              }
            />
            <ConfigRow
              label="Debug"
              value={config.env.debug ? "Ativo" : "Desativado"}
            />
          </CardContent>
        </Card>

        {negocio && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Negócio (banco de dados)</CardTitle>
              <CardDescription>
                Registro em{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  configuracao_negocio
                </code>
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-0 sm:grid-cols-2">
              <ConfigRow label="Nome da empresa" value={negocio.nome_empresa} />
              <ConfigRow
                label="Custos variáveis"
                value={`${negocio.percentual_variaveis}%`}
              />
              <ConfigRow
                label="Custos fixos"
                value={`${negocio.percentual_fixas}%`}
              />
              <ConfigRow label="Lucro desejado" value={`${negocio.percentual_lucro}%`} />
              <ConfigRow
                label="Taxa cartão débito"
                value={`${negocio.taxa_cartao_debito}%`}
              />
              <ConfigRow
                label="Taxa cartão crédito"
                value={`${negocio.taxa_cartao_credito}%`}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
