import { endTripTopic } from './endTrip';
import { startTopic } from './start';
import { startTripTopic } from './startTrip';
import { taskTopic } from './task';

export const driverTopics = [...startTopic, ...startTripTopic, ...taskTopic, ...endTripTopic];
