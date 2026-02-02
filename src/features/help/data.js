// File: src/features/help/data.js

import { plannerTopics } from './data/planner/dataPlanner';
import { driverTopics } from './data/driver/dataDriver';
import { faqTopics } from './dataFaq';

// Gabungkan semua topik menjadi satu array utama
export const helpTopics = [...plannerTopics, ...driverTopics, ...faqTopics];
