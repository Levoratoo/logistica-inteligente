# Architecture

## Monorepo

PortFlow foi organizado como monorepo com duas aplicações independentes:

- `frontend`: interface Next.js
- `backend`: API NestJS

## Frontend

### Camadas

- `app/`: rotas do App Router
- `components/`: UI base, shell administrativo e formulários
- `services/`: comunicação com a API REST
- `types/`: contratos de dados usados pela interface
- `lib/`: autenticação fake, utilitários e formatadores

### Estratégia de UI

- layout administrativo com sidebar e topbar
- componentes em estilo shadcn/ui
- estado remoto gerenciado com TanStack Query
- páginas focadas em operação e não apenas CRUD

## Backend

### Módulos

- `containers`
- `ships`
- `carriers`
- `events`
- `dashboard`
- `simulations`
- `prisma`

### Padrões adotados

- DTOs com `class-validator`
- `ValidationPipe` global com `whitelist`
- paginação nas listagens
- filtros por query string
- tratamento de erros Prisma
- módulo Prisma global para acesso ao banco

## Banco de dados

PostgreSQL com Prisma como ORM, incluindo:

- relacionamentos entre navios e contêineres
- relacionamentos entre transportadoras e contêineres
- histórico de eventos por contêiner

## Fluxo operacional modelado

1. Navio previsto
2. Navio chega ao porto
3. Contêiner é descarregado
4. Carga entra em fiscalização
5. Carga é liberada
6. Transporte é iniciado
7. Entrega é concluída
