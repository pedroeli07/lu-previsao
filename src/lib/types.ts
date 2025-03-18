// Interfaces para tipagem
export interface TrainingHistory {
  epoch: number;
  loss: number;
  val_loss: number;
}

export interface PredictionParams {
  ano: number;
  mes: number;
  torneios: number;
  buy_in_medio: number;
}

export interface ModelMetrics {
  r2Score: number;
  meanError: number;
  accuracy: number;
}

export interface DataPoint {
  ano: number;
  mes: number;
  torneios: number;
  buy_in_medio: number;
  roi: number;
  pred?: number;
}

export interface DataSummary {
  torneios: {
    min: number;
    max: number;
    avg: number;
  };
  buy_in_medio: {
    min: number;
    max: number;
    avg: number;
  };
  roi: {
    min: number;
    max: number;
    avg: number;
  };
}

export interface ScatterDataPoint {
  real: number;
  predicted: number;
}

export interface TimeSeriesDataPoint {
  month: string;
  year: number;
  realROI: number;
  predictedROI?: number;
}

export interface ModelConfig {
  epochs: number;
  batchSize: number;
  learningRate: number;
  validationSplit: number;
}

export interface FuturePrediction {
  month: string;
  roi: number;
}

// Callbacks para os eventos de treinamento
export interface TrainingCallbacks {
  onProgress: (history: TrainingHistory[]) => void;
  onCompleted: (metrics: ModelMetrics) => void;
  onRealVsPredicted: (data: ScatterDataPoint[]) => void;
  onTimeSeriesPredictions: (data: TimeSeriesDataPoint[]) => void;
}
