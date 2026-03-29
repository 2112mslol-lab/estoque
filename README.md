# 🪟 Calixto Glass - Sistema de Gerenciamento de Produção

Sistema completo de gestão de produção para a fábrica de decorações em vidro sob encomenda **Calixto Glass**.

## 🚀 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| Banco de Dados | PostgreSQL 16 |
| ORM | Prisma |
| Tempo Real | Socket.io (WebSocket) |
| Containerização | Docker (PostgreSQL) |

## 📦 Estrutura do Projeto

```
ordem/
├── backend/                    # API Node.js + Express
│   ├── prisma/
│   │   ├── schema.prisma       # Definição do banco
│   │   └── seed.ts             # Dados iniciais
│   ├── src/
│   │   ├── index.ts            # Servidor principal
│   │   ├── lib/
│   │   │   └── prisma.ts       # Cliente Prisma singleton
│   │   ├── routes/
│   │   │   ├── clients.ts      # CRUD de clientes
│   │   │   ├── orders.ts       # CRUD de pedidos
│   │   │   ├── production.ts   # Kanban + etapas
│   │   │   ├── stock.ts        # Estoque + movimentações
│   │   │   ├── alerts.ts       # Alertas
│   │   │   ├── dashboard.ts    # Analytics
│   │   │   └── configs.ts      # Configurações
│   │   ├── services/
│   │   │   └── alertScheduler.ts # Agendador de alertas
│   │   └── websocket/
│   │       └── socket.ts       # Socket.io
│   ├── .env                    # Variáveis de ambiente
│   └── package.json
│
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx   # Dashboard principal
│   │   │   ├── OrdersPage.tsx      # Gestão de pedidos
│   │   │   ├── KanbanPage.tsx      # Kanban de produção
│   │   │   ├── StockPage.tsx       # Controle de estoque
│   │   │   ├── AlertsPage.tsx      # Central de alertas
│   │   │   └── ClientsPage.tsx     # Gestão de clientes
│   │   ├── hooks/
│   │   │   └── useSocket.ts        # Hook para WebSocket
│   │   ├── services/
│   │   │   ├── api.ts              # Cliente Axios
│   │   │   └── socket.ts           # Socket.io client
│   │   ├── types/
│   │   │   └── index.ts            # Tipos TypeScript
│   │   ├── App.tsx                 # Layout + roteamento
│   │   └── index.css               # Design system completo
│   └── package.json
│
└── docker-compose.yml          # PostgreSQL + pgAdmin
```

## ⚡ Como Rodar

### Pré-requisitos
- Node.js 18+
- Docker Desktop (para o banco)

### 1. Iniciar o banco de dados
```bash
docker-compose up -d
```

### 2. Configurar e iniciar o Backend

```bash
cd backend

# Instalar dependências
npm install

# Gerar o Prisma Client
npm run prisma:generate

# Criar as tabelas no banco
npm run prisma:migrate

# Popular com dados iniciais (clientes, materiais, config)
npm run prisma:seed

# Iniciar o servidor
npm run dev
```

> API disponível em: http://localhost:3001

### 3. Iniciar o Frontend

Em um novo terminal:
```bash
cd frontend

# Instalar dependências
npm install

# Iniciar o Vite
npm run dev
```

> Sistema disponível em: http://localhost:5173

## 🎯 Funcionalidades

### 📋 Pedidos
- Criar pedidos com cliente, produto, personalização e prazo
- **Geração automática** das 5 etapas de produção ao criar pedido
- Status: Pendente → Em Produção → Finalizado → Entregue
- Barra de progresso visual por pedido
- Identificação visual de pedidos atrasados

### 🏭 Linha de Produção (Kanban)
- 5 colunas fixas: ✂️ Corte → 🔥 Modelagem → ❄️ Resfriamento → ✨ Acabamento → 📦 Embalagem
- Cards draggable com @dnd-kit
- Indicadores de atraso em tempo real
- Contagem de itens e alertas por coluna

### ⏱️ Controle de Tempo
- Tempo estimado configurável por etapa
- Registro automático de início e fim
- Cálculo de atraso em tempo real (minutos)
- Indicador visual de gargalo

### 📊 Dashboard
- Cards de status (total, em produção, atrasados, estoque crítico)
- Gráfico de tempo médio por etapa (Recharts)
- Gráfico de pedidos por status
- Lista de pedidos atrasados e próximos do prazo

### 📦 Estoque
- Cadastro de matéria-prima com unidade e fornecedor
- Movimentações (entrada, saída, ajuste)
- Alerta automático de estoque baixo
- Valor total em estoque

### 🔔 Alertas
- Gerados automaticamente pelo scheduler (a cada 5 min):
  - Pedidos atrasados
  - Pedidos próximos do prazo (< 2 dias)
  - Etapas em atraso
  - Estoque abaixo do mínimo
- Severidade: INFO / WARNING / CRITICAL
- Marcar como lido individualmente ou em massa

### 🌐 Tempo Real (WebSocket)
- Pedidos atualizados em todas as abas abertas
- Alertas aparecem instantaneamente
- Indicator de connexão no topo

## 🗄️ Banco de Dados (pgAdmin)

Acesse: http://localhost:5050  
- E-mail: `admin@calixto.com`  
- Senha: `admin123`

## 📡 API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/dashboard | Dados do painel |
| GET/POST | /api/orders | Listagem e criação de pedidos |
| PUT/DELETE | /api/orders/:id | Editar/excluir pedido |
| GET | /api/production/kanban | Dados do Kanban |
| PUT | /api/production/steps/:id | Atualizar etapa |
| GET/POST | /api/stock/materials | Materiais |
| POST | /api/stock/movements | Registrar movimentação |
| GET | /api/alerts | Alertas |
| PUT | /api/alerts/read-all | Marcar todos como lido |
| GET/POST | /api/clients | Clientes |
