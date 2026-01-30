// File: src/features/help/data.js

import { plannerTopics } from './dataPlanner';
import { driverTopics } from './dataDriver';
import { faqTopics } from './dataFaq';

// Gabungkan semua topik menjadi satu array utama
export const helpTopics = [...plannerTopics, ...driverTopics, ...faqTopics];
