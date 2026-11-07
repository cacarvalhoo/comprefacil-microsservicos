const amqp = require('amqplib');

const NOTIFICATION_QUEUE = 'notification.queue';
const PROCESS_QUEUE = 'payment.process.queue';

let channel;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      const conn = await amqp.connect(process.env.RABBITMQ_URL);
      channel = await conn.createChannel();
      await channel.assertQueue(NOTIFICATION_QUEUE, { durable: true });
      await channel.assertQueue(PROCESS_QUEUE, { durable: true });
      console.log('[rabbit] conectado');
      return;
    } catch (err) {
      console.log(`[rabbit] tentativa ${i}/${retries} falhou, tentando de novo...`);
      await sleep(3000);
    }
  }
  throw new Error('Não foi possível conectar ao RabbitMQ');
}

function publish(queue, message) {
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
  console.log(`[rabbit] publicado em ${queue}:`, message.type);
}

async function consume(queue, handler) {
  channel.prefetch(1);
  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      await handler(JSON.parse(msg.content.toString()));
      channel.ack(msg);
    } catch (err) {
      console.error('[rabbit] erro ao processar mensagem:', err.message);
      channel.nack(msg, false, false);
    }
  });
}

module.exports = { connect, publish, consume, NOTIFICATION_QUEUE, PROCESS_QUEUE };