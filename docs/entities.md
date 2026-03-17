# Entities

## Container

Representa a unidade logística principal do sistema.

Campos principais:

- `id`
- `containerCode`
- `type`
- `weight`
- `cargoDescription`
- `clientName`
- `origin`
- `destination`
- `status`
- `shipId`
- `carrierId`
- datas operacionais (`bookingDate`, `eta`, `portEntryAt`, `customsReleasedAt`, `transportStartedAt`, `deliveredAt`)
- `sealNumber`
- `notes`

Relacionamentos:

- pertence opcionalmente a um `Ship`
- pertence opcionalmente a um `Carrier`
- possui vários `EventLog`

## Ship

Representa uma escala marítima vinculada à operação.

Campos principais:

- `id`
- `name`
- `company`
- `eta`
- `etd`
- `actualArrivalAt`
- `origin`
- `destination`
- `status`
- `expectedContainers`

Relacionamentos:

- possui vários `Container`

## Carrier

Representa o parceiro rodoviário responsável pelo transporte terrestre.

Campos principais:

- `id`
- `name`
- `cnpj`
- `driverName`
- `truckPlate`
- `phone`
- `email`
- `status`

Relacionamentos:

- possui vários `Container`

## EventLog

Representa o histórico operacional de um contêiner.

Campos principais:

- `id`
- `containerId`
- `type`
- `title`
- `description`
- `location`
- `occurredAt`
- `metadata`

Relacionamentos:

- pertence a um `Container`
