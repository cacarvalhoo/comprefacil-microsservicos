require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const db = require('./db');
const rabbit = require('./rabbit');
const svc = require('./paymentService');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'payment', status: 'UP' }));

app.post('/payments', async (req, res) => {
  const { userEmail, description, amount } = req.body;
  if (!userEmail || !amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'userEmail e amount (>0) são obrigatórios' });
  }
  try {
    const payment = await svc.createPayment({ userEmail, description, amount });
    res.status(202).json(payment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

app.get('/payments', async (req, res) => res.json(await svc.listPayments()));

app.get('/payments/:id', async (req, res) => {
  const payment = await svc.getPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Não encontrado' });
  res.json(payment);
});

async function start() {
  await db.init();
  await rabbit.connect();
  await rabbit.consume(rabbit.PROCESS_QUEUE, svc.processPayment);
  const port = process.env.PORT || 3001;
  app.listen(port, () => console.log(`[payment] REST na porta ${port}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});