import { startTopic } from './start';
import { taskTopic } from './task';
import { routingTopic } from './routing';
export const plannerTopics = [...startTopic, ...taskTopic, ...routingTopic];
