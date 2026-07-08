// AITradeMinds — Training module barrel.
export { trainingRepository } from "./repository";
export { datasetBuilder, FEATURE_VERSION } from "./dataset-builder";
export { trainingManager, MODEL_KEYS, type ModelKey } from "./trainer";
export { learningEngine, type TradeOutcome } from "./learning-engine";
export { bootstrapTraining } from "./bootstrap";
export { trainLogistic, evaluate, predict } from "./model";
