// File: src/features/help/data.js

import { helpTopics as tmsTopics } from './tms/data';
import { helpTopics as vmsTopics } from './vms/data';

export const helpTopicsBySystem = {
  tms: tmsTopics,
  vms: vmsTopics,
};

export const getHelpTopics = (system = 'tms') => {
  return helpTopicsBySystem[system?.toLowerCase()] || tmsTopics;
};

export { tmsTopics, vmsTopics };
export const helpTopics = tmsTopics;
