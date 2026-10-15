import { routeTransactionTopic } from './data/routeTransaction';
import { routingTopic } from './data/routing';
import { startTopic } from './data/start';
import { taskTopic } from './data/task';

export const helpTopics = [...startTopic, ...taskTopic, ...routingTopic, ...routeTransactionTopic];
