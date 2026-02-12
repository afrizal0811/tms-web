import { routeTransactionTopic } from './routeTransaction';
import { routingTopic } from './routing';
import { startTopic } from './start';
import { taskTopic } from './task';

export const plannerTopics = [
  ...startTopic,
  ...taskTopic,
  ...routingTopic,
  ...routeTransactionTopic,
];
