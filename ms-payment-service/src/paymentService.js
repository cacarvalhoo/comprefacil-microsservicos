const crypto = require('crypto');
const { pool } = require('./db');
const rabbit = require('./rabbit');

async function createPayment({ userEmail, description, amount }) {
  const id = crypto.randomUUID();

  // I - salva com status pendente
  const { rows } = await pool.query(
    `INSERT INTO payments (id, user_email, description, amount, status)
     VALUES ($1, $2, $3, $4, 'PENDING') RETURNING *`,
    [id, userEmail, description, amount]
  );
  const payment = rows[0];

  // II - avisa a notificação sobre o recebimento
  rabbit.publish(rabbit.NOTIFICATION_QUEUE, {
    type: 'PAYMENT_RECEIVED',
    paymentId: payment.id,
    userEmail: payment.user_email,
    description: payment.description,
    amount: payment.amount,
    status: payment.status,
  });

  // pede o processamento assíncrono (IV acontece no consumer)
  rabbit.publish(rabbit.PROCESS_QUEUE, {
    type: 'PROCESS_PAYMENT',
    paymentId: payment.id,
  });

  return payment;
}

// IV e V - confirma a transação e avisa a notificação
async function processPayment({ paymentId }) {
  console.log(`[payment] processando ${paymentId}...`);
  await new Promise((r) =>
    setTimeout(r, Number(process.env.PROCESSING_DELAY_MS) || 5000)
  );

  const { rows } = await pool.query(
    `UPDATE payments SET status = 'SUCCESS', updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [paymentId]
  );
  if (!rows.length) throw new Error('Pagamento não encontrado');
  const payment = rows[0];

  rabbit.publish(rabbit.NOTIFICATION_QUEUE, {
    type: 'PAYMENT_CONFIRMED',
    paymentId: payment.id,
    userEmail: payment.user_email,
    description: payment.description,
    amount: payment.amount,
    status: payment.status,
  });
}

async function getPayment(id) {
  const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [id]);
  return rows[0];
}

async function listPayments() {
  const { rows } = await pool.query('SELECT * FROM payments ORDER BY created_at DESC');
  return rows;
}

module.exports = { createPayment, processPayment, getPayment, listPayments };