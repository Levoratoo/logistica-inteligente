# API Overview

Base URL local:

```text
http://localhost:4000/api
```

## Health

- `GET /health`

## Dashboard

- `GET /dashboard`
  - retorna KPIs, distribuição por status, movimentação diária, volume por cliente, navios previstos, atrasos e eventos recentes

## Containers

- `GET /containers`
  - paginação por `page` e `pageSize`
  - filtros por `search`, `status`, `origin`, `destination`, `shipId`, `carrierId`
- `GET /containers/:id`
- `GET /containers/tracking/:containerCode`
- `POST /containers`
- `PATCH /containers/:id`
- `DELETE /containers/:id`

## Ships

- `GET /ships`
  - paginação por `page` e `pageSize`
  - filtros por `search`, `status`, `origin`, `destination`
- `GET /ships/:id`
- `POST /ships`
- `PATCH /ships/:id`
- `DELETE /ships/:id`

## Carriers

- `GET /carriers`
  - paginação por `page` e `pageSize`
  - filtros por `search`, `status`
- `GET /carriers/:id`
- `POST /carriers`
- `PATCH /carriers/:id`
- `DELETE /carriers/:id`

## Events

- `GET /events`
  - filtros por `type`, `containerId`
- `GET /events/container/:containerId`

## Simulations

- `POST /simulations/ships/:shipId/arrival`
- `POST /simulations/containers/:containerId/customs-release`
- `POST /simulations/containers/:containerId/dispatch`
- `POST /simulations/containers/:containerId/delivery`
