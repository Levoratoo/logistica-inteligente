# PortFlow

PortFlow e um sistema web de gestao logistica com foco em operacoes portuarias e transporte de conteineres. O projeto foi estruturado como portfolio profissional, com frontend e backend separados, arquitetura modular, dados plausiveis e uma experiencia visual proxima de um produto SaaS real.

## Visao geral

O sistema simula o fluxo operacional de importacao:

- previsao e chegada de navios
- descarga e permanencia de conteineres no porto
- fiscalizacao e liberacao alfandegaria
- expedicao rodoviaria
- rastreamento e entrega final

## Destaques atuais

- Dashboard logistico com KPIs, graficos e alertas operacionais
- CRUD completo de conteineres, navios e transportadoras
- Central de ocorrencias operacionais com triagem e resolucao
- Timeline por conteiner e tracking por codigo
- Simulation Center com automacao continua
- Demo autonoma no frontend com persistencia em `localStorage`
- Compatibilidade com build estatico para GitHub Pages
- Backend NestJS + Prisma preservado no monorepo para arquitetura profissional

## Modos de execucao do frontend

O frontend agora suporta dois modos:

- `demo`: padrao. O proprio navegador alimenta o sistema automaticamente, persiste o estado localmente e continua funcionando sem backend. Este e o modo recomendado para portfolio e GitHub Pages.
- `api`: o frontend consome a API NestJS real.

Configuracao em `frontend/.env`:

```env
NEXT_PUBLIC_RUNTIME_MODE=demo
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_BASE_PATH=
```

## Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui patterns
- TanStack Query
- Recharts

### Backend

- Node.js
- NestJS
- TypeScript
- Prisma
- PostgreSQL

### Infra e qualidade

- Docker + Docker Compose
- Seeds realistas
- ESLint
- Prettier
- `.env.example`

## Arquitetura

- `frontend/`: aplicacao Next.js com App Router, autenticacao fake, layout administrativo, services e runtime local autonomo para demo
- `backend/`: API NestJS modular com Prisma, DTOs, validacao global, paginacao, filtros e simulacoes operacionais
- `docs/`: documentacao complementar de arquitetura, entidades e API

## Estrutura de pastas

```text
.
|-- backend
|-- docs
|-- frontend
|-- docker-compose.yml
`-- README.md
```

## Como rodar localmente

### 1. Instale dependencias

Na raiz:

```powershell
npm install
```

No backend:

```powershell
Set-Location backend
npm install
npm run prisma:generate
npx prisma db push
npx prisma db seed
```

No frontend:

```powershell
Set-Location ..\frontend
npm install
```

### 2. Variaveis de ambiente

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

### 3. Desenvolvimento

Na raiz:

```powershell
npm run dev
```

Credenciais demo:

- Email: `ops@portflow.io`
- Senha: `portflow123`

## Rodando apenas a demo autonoma

Se o objetivo for portfolio/local demo, o backend nao e obrigatorio.

```powershell
Set-Location frontend
npm run dev
```

O frontend usa `NEXT_PUBLIC_RUNTIME_MODE=demo` por padrao e continua se alimentando sozinho no navegador.

## Build estatico para GitHub Pages

O frontend esta preparado para export estatico.

```powershell
Set-Location frontend
$env:STATIC_EXPORT="true"
$env:NEXT_PUBLIC_BASE_PATH="/NOME_DO_REPOSITORIO"
npm run build:static
```

Arquivos gerados:

- `frontend/out`

Observacoes:

- o modo recomendado para GitHub Pages e `NEXT_PUBLIC_RUNTIME_MODE=demo`
- o estado da operacao e persistido no navegador via `localStorage`
- a tela de detalhe do conteiner usa rota estatica com query string para evitar problemas de refresh em hospedagem estatica
- o workflow de deploy automatico esta em [deploy-pages.yml](./.github/workflows/deploy-pages.yml)

URL esperada do Pages deste repositorio:

- `https://levoratoo.github.io/logistica-inteligente/`

Se o primeiro deploy nao publicar automaticamente, habilite uma unica vez em:

1. `Settings`
2. `Pages`
3. `Build and deployment`
4. `Source: GitHub Actions`

Depois disso, cada push em `main` publica a nova versao automaticamente.

## Subindo com Docker

```powershell
docker compose up --build
```

Servicos:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000/api`
- PostgreSQL: `localhost:5432`

## Endpoints principais

- `GET /api/dashboard`
- `GET /api/containers`
- `GET /api/containers/:id`
- `GET /api/containers/tracking/:containerCode`
- `GET /api/ships`
- `GET /api/carriers`
- `GET /api/events`
- `GET /api/events/container/:containerId`
- `POST /api/simulations/ships/:shipId/arrival`
- `POST /api/simulations/containers/:containerId/customs-release`
- `POST /api/simulations/containers/:containerId/dispatch`
- `POST /api/simulations/containers/:containerId/delivery`

## Melhorias futuras

- autenticacao real com JWT e perfis de acesso
- testes automatizados de API e interface
- upload de documentos e comprovantes
- modulo de ocorrencias operacionais
- torre de controle com SLA e alertas configuraveis
- deploy publico completo com Vercel + Render/Railway

## Documentacao complementar

- [Architecture](./docs/architecture.md)
- [Entities](./docs/entities.md)
- [API Overview](./docs/api-overview.md)
