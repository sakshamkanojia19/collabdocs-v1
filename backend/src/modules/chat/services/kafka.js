const { Kafka, logLevel } = require('kafkajs');

let kafkaInstance;
let producerInstance;

const getKafka = (logger) => {
  if (kafkaInstance) {
    return kafkaInstance;
  }

  const brokers = (process.env.KAFKA_BROKERS || '').split(',').map((broker) => broker.trim()).filter(Boolean);
  if (brokers.length === 0) {
    throw new Error('KAFKA_BROKERS environment variable is not defined for chat-service');
  }

  kafkaInstance = new Kafka({
    clientId: 'collabdocs-chat-service',
    brokers,
    logLevel: logLevel.WARN
  });

  if (logger) {
    logger.info(`Chat service Kafka client initialised with brokers: ${brokers.join(', ')}`);
  }

  return kafkaInstance;
};

const getProducer = async (logger) => {
  if (producerInstance) {
    return producerInstance;
  }

  const kafka = getKafka(logger);
  producerInstance = kafka.producer();
  await producerInstance.connect();
  logger?.info('Chat service Kafka producer connected');
  return producerInstance;
};

const publishChatEvent = async (topic, payload, logger) => {
  try {
    const producer = await getProducer(logger);
    await producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify({
            ...payload,
            emittedAt: new Date().toISOString()
          })
        }
      ]
    });
  } catch (error) {
    logger?.error('Failed to publish chat event', { topic, error });
  }
};

const disconnectKafka = async (logger) => {
  if (producerInstance) {
    await producerInstance.disconnect();
    logger?.info('Chat service Kafka producer disconnected');
    producerInstance = null;
  }
};

module.exports = {
  publishChatEvent,
  disconnectKafka
};
