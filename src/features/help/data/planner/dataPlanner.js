import { startTopic } from "./start";
import {  taskTopic } from "./task";

export const plannerTopics = [
  ...startTopic,
  ...taskTopic,
];
