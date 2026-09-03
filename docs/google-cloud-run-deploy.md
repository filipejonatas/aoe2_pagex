# Deploy do backend no Google Cloud Run

O backend roda no Cloud Run como um container Node.js e continua usando o PostgreSQL do Supabase.

## Configuracao escolhida

- Regiao padrao: `southamerica-east1` (Sao Paulo)
- Cobranca baseada em requisicoes, com CPU limitada durante ociosidade
- 1 vCPU e 512 MiB de memoria
- Minimo de 0 e maximo de 1 instancia
- Concorrencia de 40 requisicoes por instancia
- Health check em `/api/v1/health`
- Segredos armazenados no Secret Manager

Com zero instancias minimas, o servico escala para zero. A primeira requisicao depois de um periodo ocioso pode ter latencia adicional.

## Pre-requisitos

1. Crie ou selecione um projeto no Google Cloud e vincule uma conta de faturamento.
2. Instale o [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
3. Autentique a CLI:

   ```powershell
   gcloud auth login
   gcloud auth application-default login
   ```

4. Crie `backend/.env` a partir de `backend/.env.example` e preencha os valores reais.

O script nunca envia o arquivo `.env` como parte do contexto Docker. Apenas `DATABASE_URL`, `DIRECT_URL` e `JWT_SECRET` sao enviados ao Secret Manager.

## Publicar

Execute na raiz do repositorio:

```powershell
.\scripts\deploy-cloud-run.ps1 `
  -ProjectId 'SEU_PROJECT_ID' `
  -FrontendUrl 'https://URL-DO-FRONTEND'
```

O primeiro deploy ativa as APIs necessarias, cria novas versoes dos segredos, constroi a imagem e publica o servico. Os deploys seguintes atualizam os mesmos recursos.

Para escolher outra regiao ou nome de servico:

```powershell
.\scripts\deploy-cloud-run.ps1 `
  -ProjectId 'SEU_PROJECT_ID' `
  -FrontendUrl 'https://URL-DO-FRONTEND' `
  -Region 'us-central1' `
  -Service 'aoe2-pagex-api'
```

## Verificar

O script imprime as URLs ao terminar. A verificacao manual pode ser feita com:

```powershell
$url = gcloud run services describe aoe2-pagex-api `
  --region southamerica-east1 `
  --format 'value(status.url)'

Invoke-RestMethod "$url/api/v1/health"
```

A resposta esperada contem `status: ok` e `service: aoe-league-api`.

## Controle de custos

- Mantenha `min-instances=0` para evitar instancia ociosa faturavel.
- `max-instances=1` limita a escalada acidental, mas nao e um teto financeiro absoluto.
- Configure um Orcamento e alertas no Cloud Billing.
- O Artifact Registry oferece uma franquia pequena. Exclua imagens antigas periodicamente.
- O trafego entre Cloud Run e Supabase pode gerar custo de saida dependendo das regioes e do volume.

Orcamentos do Google Cloud enviam alertas; eles nao interrompem automaticamente os recursos quando o limite e atingido.
