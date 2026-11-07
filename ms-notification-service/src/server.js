require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const rabbit = require('./rabbit');
const svc = require('./notificationService');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ service: 'notification', status: 'UP' }));
app.get('/notifications', (req, res) => res.json(svc.list()));

async function start() {
  await rabbit.connect();
  await rabbit.consume(rabbit.NOTIFICATION_QUEUE, svc.handleEvent);
  const port = process.env.PORT || 3002;
  app.listen(port, () => console.log(`[notification] REST na porta ${port}`));
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});