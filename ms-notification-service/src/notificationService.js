const sent = []; // histórico em memória

function buildText(event) {
  const pedido = event.description ? ` (${event.description})` : '';
  switch (event.type) {
    case 'PAYMENT_RECEIVED':
      return `Recebemos sua solicitação de pagamento ${event.paymentId}${pedido} no valor de R$ ${event.amount}. Status: ${event.status}.`;
    case 'PAYMENT_CONFIRMED':
      return `Seu pagamento ${event.paymentId}${pedido} foi confirmado com sucesso! Status: ${event.status}.`;
    default:
      throw new Error(`Tipo de evento desconhecido: ${event.type}`);
  }
}

async function handleEvent(event) {
  const text = buildText(event);

  // Simulação de envio (poderia ser e-mail, SMS, push...)
  console.log(`[notification] -> ${event.userEmail}: ${text}`);

  sent.push({
    paymentId: event.paymentId,
    userEmail: event.userEmail,
    type: event.type,
    message: text,
    sentAt: new Date().toISOString(),
  });
}

function list() {
  return sent;
}

module.exports = { handleEvent, list };