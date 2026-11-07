# CompreFácil - Microsserviços de Pagamento e Notificação

Desafio de Desenvolvimento de Sistemas Distribuídos (SENAI).
Autora: Carolina Carvalho

Dois serviços Node.js independentes que se comunicam de forma assíncrona via RabbitMQ.

## Arquitetura

    Cliente --REST--> ms-payment-service --AMQP--> RabbitMQ --AMQP--> ms-notification-service
                            |
                        PostgreSQL

- **ms-payment-service** (porta 3001): recebe a transação via REST, grava no Postgres e publica eventos.
- **ms-notification-service** (porta 3002): consome a fila e notifica o usuário.
- **RabbitMQ**: filas `notification.queue` e `payment.process.queue`.

## Fluxo (assíncrono)

1. `POST /payments` salva a transação com status PENDING
2. O pagamento publica `PAYMENT_RECEIVED` em `notification.queue`
3. A notificação consome e envia o aviso de recebimento
4. O pagamento processa a transação e atualiza o status para SUCCESS
5. O pagamento publica `PAYMENT_CONFIRMED`
6. A notificação consome e envia o aviso de confirmação

## Pré-requisitos

- Node.js 20 ou superior
- Docker Desktop (com Docker Compose)

## Como executar

1. Infraestrutura (Postgres + RabbitMQ), na raiz do projeto:

        docker compose up -d

2. Serviço de pagamento (terminal 1):

        cd ms-payment-service
        Copy-Item .env.example .env
        npm install
        npm run dev

3. Serviço de notificação (terminal 2):

        cd ms-notification-service
        Copy-Item .env.example .env
        npm install
        npm run dev

Painel do RabbitMQ: http://localhost:15672 (usuário e senha: guest)

## Testando

PowerShell (terminal 3):

    $r = Invoke-RestMethod -Method Post -Uri http://localhost:3001/payments -ContentType "application/json" -Body '{"userEmail":"cliente@email.com","description":"Pedido 123","amount":199.90}'
    $r
    Invoke-RestMethod http://localhost:3001/payments/$($r.id)
    Invoke-RestMethod http://localhost:3002/notifications

Resultado esperado: resposta 202 com status PENDING; notificação de recebimento
imediata e, após cerca de 5 segundos, notificação de confirmação. O status passa a SUCCESS.

## Endpoints

| Serviço | Método | Rota |
|---|---|---|
| Pagamento (3001) | POST | /payments |
| Pagamento (3001) | GET | /payments e /payments/:id |
| Pagamento (3001) | GET | /health |
| Notificação (3002) | GET | /notifications |
| Notificação (3002) | GET | /health |

## Teste de independência

1. Pare o serviço de notificação (Ctrl + C).
2. Envie um pagamento: ele conclui normalmente (SUCCESS).
3. No painel do RabbitMQ, a fila `notification.queue` acumula as mensagens (Ready = 2).
4. Suba a notificação de novo: ela consome as mensagens pendentes e envia as notificações.