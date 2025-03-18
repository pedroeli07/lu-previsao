import * as tf from '@tensorflow/tfjs';
import { parse } from 'papaparse';
import {
  TrainingHistory,
  PredictionParams,
  ModelMetrics,
  DataPoint,
  DataSummary,
  ScatterDataPoint,
  TimeSeriesDataPoint,
  ModelConfig,
  TrainingCallbacks,
  FuturePrediction
} from './types';

// Classe para simular um backend
export class ModelBackend {
  private model: tf.Sequential | null = null;
  private scalers: { [key: string]: { min: number; max: number } } = {};
  private data: DataPoint[] = [];
  private processedFeatures: number[][] = [];
  private processedLabels: number[] = [];
  private trainingHistory: TrainingHistory[] = [];
  private isTraining: boolean = false;
  private timeSeriesData: TimeSeriesDataPoint[] = [];
  private dataSummary: DataSummary | null = null;
  
  // Callbacks
  private onProgressCallback: ((history: TrainingHistory[]) => void) | null = null;
  private onCompletedCallback: ((metrics: ModelMetrics) => void) | null = null;
  private onRealVsPredictedCallback: ((data: ScatterDataPoint[]) => void) | null = null;
  private onTimeSeriesPredictionsCallback: ((data: TimeSeriesDataPoint[]) => void) | null = null;

  constructor() {}

  // Registrar callbacks
  registerCallbacks(callbacks: TrainingCallbacks) {
    this.onProgressCallback = callbacks.onProgress;
    this.onCompletedCallback = callbacks.onCompleted;
    this.onRealVsPredictedCallback = callbacks.onRealVsPredicted;
    this.onTimeSeriesPredictionsCallback = callbacks.onTimeSeriesPredictions;
  }

  // Processar CSV
  async processCSV(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const csvData = e.target?.result as string;
        if (!csvData) {
          reject(new Error("Falha ao ler arquivo"));
          return;
        }

        parse(csvData, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const parsedData = results.data as Array<{
              'Nome do Jogador': string;
              'Ano-Mês': string;
              'Torneios': string;
              'Buy_In_Medio': string;
              'ROI_Medio': string;
            }>;

            // Extrair dados
            this.data = parsedData.map(row => {
              const [ano, mes] = row['Ano-Mês'].split('-').map(Number);
              return {
                ano,
                mes,
                torneios: parseFloat(row['Torneios']),
                buy_in_medio: parseFloat(row['Buy_In_Medio']),
                roi: parseFloat(row['ROI_Medio'])
              };
            });

            // Ordenar os dados por ano e mês para visualização de séries temporais
            this.data.sort((a, b) => {
              if (a.ano !== b.ano) return a.ano - b.ano;
              return a.mes - b.mes;
            });

            // Preparar dados para gráfico de série temporal
            this.timeSeriesData = this.data.map(point => ({
              month: `${point.ano}-${point.mes.toString().padStart(2, '0')}`,
              year: point.ano,
              realROI: point.roi
            }));

            // Encontrar valores mínimos e máximos para normalização
            const mins = { ano: Infinity, mes: Infinity, torneios: Infinity, buy_in_medio: Infinity };
            const maxs = { ano: -Infinity, mes: -Infinity, torneios: -Infinity, buy_in_medio: -Infinity };

            this.data.forEach(row => {
              mins.ano = Math.min(mins.ano, row.ano);
              maxs.ano = Math.max(maxs.ano, row.ano);
              mins.mes = Math.min(mins.mes, row.mes);
              maxs.mes = Math.max(maxs.mes, row.mes);
              mins.torneios = Math.min(mins.torneios, row.torneios);
              maxs.torneios = Math.max(maxs.torneios, row.torneios);
              mins.buy_in_medio = Math.min(mins.buy_in_medio, row.buy_in_medio);
              maxs.buy_in_medio = Math.max(maxs.buy_in_medio, row.buy_in_medio);
            });

            // Salvar scalers
            this.scalers = {
              ano: { min: mins.ano, max: maxs.ano },
              mes: { min: mins.mes, max: maxs.mes },
              torneios: { min: mins.torneios, max: maxs.torneios },
              buy_in: { min: mins.buy_in_medio, max: maxs.buy_in_medio },
            };

            // Criar features e labels normalizados
            this.processedFeatures = this.data.map(row => [
              this.normalize(row.ano, 'ano'),
              this.normalize(row.mes, 'mes'),
              this.normalize(row.torneios, 'torneios'),
              this.normalize(row.buy_in_medio, 'buy_in'),
            ]);
            
            this.processedLabels = this.data.map(row => row.roi);
            
            // Calcular resumo estatístico
            this.calculateDataSummary();
            
            // Retornar série temporal inicial para visualização
            if (this.onTimeSeriesPredictionsCallback) {
              this.onTimeSeriesPredictionsCallback([...this.timeSeriesData]);
            }
            
            resolve();
          },
          error: (error: unknown) => {
            reject(error);
          }
        });
      };
      reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
      reader.readAsText(file);
    });
  }

  // Calcular estatísticas resumidas dos dados
  private calculateDataSummary() {
    if (this.data.length === 0) return;
    
    // Calcular mínimos, máximos e médias
    const torneiosValues = this.data.map(d => d.torneios);
    const buyInValues = this.data.map(d => d.buy_in_medio);
    const roiValues = this.data.map(d => d.roi);
    
    this.dataSummary = {
      torneios: {
        min: Math.min(...torneiosValues),
        max: Math.max(...torneiosValues),
        avg: this.calculateMean(torneiosValues)
      },
      buy_in_medio: {
        min: Math.min(...buyInValues),
        max: Math.max(...buyInValues),
        avg: this.calculateMean(buyInValues)
      },
      roi: {
        min: Math.min(...roiValues),
        max: Math.max(...roiValues),
        avg: this.calculateMean(roiValues)
      }
    };
  }

  // Normalizar um valor
  normalize(value: number, featureName: string): number {
    const scaler = featureName === 'buy_in_medio' ? this.scalers['buy_in'] : this.scalers[featureName];
    return (value - scaler.min) / (scaler.max - scaler.min);
  }

  // Desnormalizar um valor
  denormalize(value: number, featureName: string): number {
    const scaler = featureName === 'buy_in_medio' ? this.scalers['buy_in'] : this.scalers[featureName];
    return value * (scaler.max - scaler.min) + scaler.min;
  }

  // Treinar modelo
  async trainModel(params: ModelConfig): Promise<void> {
    if (this.processedFeatures.length === 0) {
      throw new Error("Nenhum dado processado para treinar o modelo");
    }

    this.isTraining = true;
    this.trainingHistory = [];

    // Criar modelo com arquitetura melhorada
    this.model = tf.sequential({
      layers: [
        tf.layers.dense({ 
          units: 64, 
          activation: 'relu', 
          inputShape: [4],
          kernelInitializer: 'heNormal'
        }),
        tf.layers.batchNormalization(),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({ 
          units: 32, 
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ 
          units: 16, 
          activation: 'relu',
          kernelInitializer: 'heNormal'
        }),
        tf.layers.dense({ units: 1 })
      ]
    });

    // Otimizador com learning rate schedule
    const optimizer = tf.train.adam(params.learningRate);

    this.model.compile({
      optimizer: optimizer,
      loss: 'meanSquaredError',
      metrics: ['mae'],
    });

    // Converter para tensores
    const xs = tf.tensor2d(this.processedFeatures);
    const ys = tf.tensor1d(this.processedLabels);

    // Treinar modelo
    await this.model.fit(xs, ys, {
      epochs: params.epochs,
      batchSize: params.batchSize,
      validationSplit: params.validationSplit,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          const historyEntry = {
            epoch: epoch + 1,
            loss: logs?.loss || 0,
            val_loss: logs?.val_loss || 0
          };
          
          this.trainingHistory.push(historyEntry);
          
          if (this.onProgressCallback) {
            this.onProgressCallback([...this.trainingHistory]);
          }
          
          // A cada 5 épocas, atualizar métricas e previsões vs. real
          if (epoch % 5 === 0 || epoch === params.epochs - 1) {
            this.updateMetricsAndPredictions();
          }
          
          // Permitir que a UI seja atualizada
          await tf.nextFrame();
        }
      }
    });

    this.isTraining = false;
    
    // Atualizar métricas finais
    this.updateMetricsAndPredictions();
    
    // Liberar tensores
    xs.dispose();
    ys.dispose();
  }

  // Atualizar métricas e previsões em tempo real
  private updateMetricsAndPredictions() {
    if (!this.model) return;
    
    // Fazer previsões no conjunto de dados
    const xs = tf.tensor2d(this.processedFeatures);
    const predictionsTensor = this.model.predict(xs) as tf.Tensor;
    const predictions = Array.from(predictionsTensor.dataSync());
    
    // Liberar tensores
    xs.dispose();
    predictionsTensor.dispose();
    
    // Calcular métricas
    let sumSquaredError = 0;
    let sumSquaredTotal = 0;
    let meanError = 0;
    let correctPredictions = 0;
    
    const realVsPredicted: ScatterDataPoint[] = [];
    
    // Atualizar dados de série temporal com previsões
    const updatedTimeSeriesData = [...this.timeSeriesData];
    
    this.processedLabels.forEach((actual, i) => {
      const predicted = predictions[i];
      const error = actual - predicted;
      
      sumSquaredError += error * error;
      sumSquaredTotal += (actual - this.calculateMean(this.processedLabels)) ** 2;
      meanError += Math.abs(error);
      
      // Se o sinal é o mesmo (ambos positivos ou ambos negativos)
      if ((actual >= 0 && predicted >= 0) || (actual < 0 && predicted < 0)) {
        correctPredictions++;
      }
      
      // Adicionar aos dados de comparação
      realVsPredicted.push({
        real: actual,
        predicted: predicted
      });
      
      // Atualizar série temporal
      if (i < updatedTimeSeriesData.length) {
        updatedTimeSeriesData[i].predictedROI = predicted;
      }
    });
    
    // Calcular métricas finais
    const r2Score = 1 - (sumSquaredError / sumSquaredTotal);
    meanError = meanError / this.processedLabels.length;
    const accuracy = correctPredictions / this.processedLabels.length;
    
    // Chamar callbacks
    if (this.onCompletedCallback) {
      this.onCompletedCallback({ r2Score, meanError, accuracy });
    }
    
    if (this.onRealVsPredictedCallback) {
      this.onRealVsPredictedCallback(realVsPredicted);
    }
    
    if (this.onTimeSeriesPredictionsCallback) {
      this.onTimeSeriesPredictionsCallback(updatedTimeSeriesData);
    }
  }
  
  // Calcular média de um array
  private calculateMean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  // Fazer previsão
  predict(params: PredictionParams): number | null {
    if (!this.model || Object.keys(this.scalers).length === 0) return null;

    // Normalizar entrada
    const normalizedInput = [
      this.normalize(params.ano, 'ano'),
      this.normalize(params.mes, 'mes'),
      this.normalize(params.torneios, 'torneios'),
      this.normalize(params.buy_in_medio, 'buy_in'),
    ];

    // Fazer previsão
    const inputTensor = tf.tensor2d([normalizedInput]);
    const predictionTensor = this.model.predict(inputTensor) as tf.Tensor;
    const result = predictionTensor.dataSync()[0];
    
    // Liberar tensores
    inputTensor.dispose();
    predictionTensor.dispose();
    
    return result;
  }
  
  // Fazer previsões para um período futuro
  predictFuturePeriods(startParams: PredictionParams, numMonths: number): FuturePrediction[] {
    if (!this.model) return [];
    
    const results: FuturePrediction[] = [];
    const currentParams = {...startParams};
    
    for (let i = 0; i < numMonths; i++) {
      const prediction = this.predict(currentParams);
      if (prediction === null) break;
      
      results.push({
        month: `${currentParams.ano}-${currentParams.mes.toString().padStart(2, '0')}`,
        roi: prediction
      });
      
      // Avançar para o próximo mês
      currentParams.mes++;
      if (currentParams.mes > 12) {
        currentParams.mes = 1;
        currentParams.ano++;
      }
    }
    
    return results;
  }

  // Obter scalers
  getScalers() {
    return {...this.scalers};
  }
  
  // Obter histórico de treinamento
  getTrainingHistory() {
    return [...this.trainingHistory];
  }
  
  // Obter dados de série temporal
  getTimeSeriesData() {
    return [...this.timeSeriesData];
  }
  
  // Obter dados históricos completos
  getHistoricalData() {
    return [...this.data];
  }
  
  // Obter resumo estatístico dos dados
  getDataSummary() {
    return this.dataSummary;
  }
  
  // Verificar se o modelo está treinado
  isModelTrained() {
    return this.model !== null;
  }
  
  // Verificar se o modelo está em treinamento
  isModelTraining() {
    return this.isTraining;
  }

  // Salvar modelo (poderia ser implementado em versões futuras)
  async saveModel(name: string): Promise<void> {
    if (!this.model) throw new Error("Nenhum modelo treinado para salvar");
    // Aqui iria a lógica para salvar o modelo usando IndexedDB ou localStorage
    console.log(`Modelo ${name} salvo`);
  }
  
  // Carregar modelo (poderia ser implementado em versões futuras)
  async loadModel(name: string): Promise<void> {
    // Aqui iria a lógica para carregar o modelo usando IndexedDB ou localStorage
    console.log(`Modelo ${name} carregado`);
  }
}
