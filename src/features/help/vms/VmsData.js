import { startTopic } from './data/start';
import { liveViewTopic } from './data/liveView';
import { costManagementTopic } from './data/costManagement';
import { serviceTopic } from './data/service';
import { driverScore } from './data/driverScore';
import { reportTopic } from './data/report';

export const helpTopics = [
  ...startTopic,
  ...liveViewTopic,
  ...costManagementTopic,
  ...serviceTopic,
  ...driverScore,
  ...reportTopic,
];
