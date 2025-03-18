'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ModelBackend } from '../lib/train';
import {
  TrainingHistory,
  PredictionParams,
  ModelMetrics,
  ScatterDataPoint,
  TimeSeriesDataPoint,
  FuturePrediction,
  ModelConfig,
  DataPoint,
  DataSummary
} from '../lib/types';
import {
  TrainingHistoryChart,
  TimeSeriesChart,
  RealVsPredictedChart,
  FuturePredictionsChart
} from '../lib/charts';

export default function HomePage() {
  // Estado para armazenar o backend
  const [backend] = useState<ModelBackend>(() => new ModelBackend());
  
  // Estados da UI
  const [file, setFile] = useState<File | null>(null);
  const [playerName, setPlayerName] = useState<string>("");
  const [isTraining, setIsTraining] = useState(false);
  const [trainingHistory, setTrainingHistory] = useState<TrainingHistory[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [realVsPredicted, setRealVsPredicted] = useState<ScatterDataPoint[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesDataPoint[]>([]);
  const [futurePredictions, setFuturePredictions] = useState<FuturePrediction[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [activeCardTab, setActiveCardTab] = useState<'config' | 'predict'>('config');
  const [historicalData, setHistoricalData] = useState<DataPoint[]>([]);
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  
  // Estados de configuração
  const [trainingParams, setTrainingParams] = useState<ModelConfig>({
    epochs: 150,
    batchSize: 32,
    learningRate: 0.001,
    validationSplit: 0.2,
  });
  const [predictionInputs, setPredictionInputs] = useState<PredictionParams>({
    ano: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    torneios: 100,
    buy_in_medio: 50,
  });
  const [numFutureMonths, setNumFutureMonths] = useState(6);

  // Calcular médias dos últimos 6 meses
  const recentAverages = useMemo(() => {
    if (!historicalData.length) return { torneios: 0, buyIn: 0 };
    
    const sixMonthsData = [...historicalData]
      .sort((a, b) => {
        // Ordenar por data decrescente
        const dateA = new Date(a.ano, a.mes - 1);
        const dateB = new Date(b.ano, b.mes - 1);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 6); // Pegar os 6 meses mais recentes (ou menos se não houver 6)
    
    const avgTorneios = sixMonthsData.reduce((sum, item) => sum + item.torneios, 0) / sixMonthsData.length;
    const avgBuyIn = sixMonthsData.reduce((sum, item) => sum + item.buy_in_medio, 0) / sixMonthsData.length;
    
    return { torneios: avgTorneios, buyIn: avgBuyIn };
  }, [historicalData]);

  // Registrar callbacks no mount
  useEffect(() => {
    backend.registerCallbacks({
      onProgress: (history) => setTrainingHistory(history),
      onCompleted: (metrics) => setMetrics(metrics),
      onRealVsPredicted: (data) => setRealVsPredicted(data),
      onTimeSeriesPredictions: (data) => setTimeSeriesData(data)
    });
  }, [backend]);

  // Atualizar inputs de previsão com as médias recentes quando disponíveis
  useEffect(() => {
    if (recentAverages.torneios > 0) {
      setPredictionInputs(prev => ({
        ...prev,
        torneios: Math.round(recentAverages.torneios),
        buy_in_medio: recentAverages.buyIn
      }));
    }
  }, [recentAverages]);

  // Manipulador para upload de arquivo
  const handleFileUpload = async (file: File) => {
    setFile(file);
    
    // Extrair nome do jogador do nome do arquivo
    const match = file.name.match(/resultado_roi_mensal_(.+)\.csv/i);
    if (match && match[1]) {
      setPlayerName(match[1]);
    }
    
    try {
      await backend.processCSV(file);
      // Obter dados históricos e resumo para a tabela
      setHistoricalData(backend.getHistoricalData());
      setDataSummary(backend.getDataSummary());
    } catch (error) {
      console.error("Erro ao processar CSV:", error);
      alert("Erro ao processar o arquivo CSV. Verifique o formato.");
    }
  };

  // Manipulador para treinamento
  const handleTrainModel = async () => {
    if (!file) return;
    
    setIsTraining(true);
    try {
      await backend.trainModel(trainingParams);
    } catch (error) {
      console.error("Erro no treinamento:", error);
      alert("Erro durante o treinamento do modelo.");
    } finally {
      setIsTraining(false);
      // Mudar para a aba de previsão após o treinamento
      setActiveCardTab('predict');
    }
  };

  // Manipulador para previsão
  const handlePredict = () => {
    const result = backend.predict(predictionInputs);
    setPrediction(result);
  };
  
  // Manipulador para previsão de períodos futuros
  const handlePredictFuture = () => {
    const results = backend.predictFuturePeriods(predictionInputs, numFutureMonths);
    setFuturePredictions(results);
  };

  // Formatador para valores numéricos
  const formatNumber = (value: number) => {
    if (value % 1 === 0) return value.toString();
    return value.toFixed(2);
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      <div className="container mx-auto px-4 py-6 flex-grow flex flex-col">
        <h1 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-500 to-indigo-600">
          Previsão de ROI para Poker
        </h1>
        
        {/* Modal de Upload */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-violet-500">
              <h2 className="text-xl font-bold mb-4 text-violet-300">Upload de Dados</h2>
              <p className="text-sm text-gray-300 mb-4">
                Selecione um arquivo CSV no formato:<br/>
                Nome do Jogador,Ano-Mês,Torneios,Buy_In_Medio,ROI_Medio
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                    setShowUploadModal(false);
                  }
                }}
                className="mb-4 w-full bg-gray-700 text-white border border-gray-600 rounded p-2"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Layout Principal - Grid de 3 colunas */}
        <div className="flex-grow grid grid-cols-12 gap-4 h-full">
          {/* Coluna 1: Card com abas para Configuração e Previsão */}
          <div className="col-span-4 flex flex-col">
            <div className="bg-gray-800 rounded-lg shadow-lg border-t border-purple-600 flex flex-col flex-grow">
              {/* Tabs do Card */}
              <div className="flex border-b border-gray-700">
                <button 
                  className={`flex-1 px-4 py-3 text-center ${activeCardTab === 'config' ? 'bg-violet-700 text-white' : 'text-gray-300 hover:bg-gray-750'}`}
                  onClick={() => setActiveCardTab('config')}
                >
                  Configuração do Modelo
                </button>
                <button 
                  className={`flex-1 px-4 py-3 text-center ${activeCardTab === 'predict' ? 'bg-violet-700 text-white' : 'text-gray-300 hover:bg-gray-750'}`}
                  onClick={() => setActiveCardTab('predict')}
                  disabled={!backend.isModelTrained()}
                >
                  Previsão de ROI
                </button>
              </div>
              
              {/* Conteúdo das Tabs */}
              <div className="p-4 flex-grow flex flex-col overflow-auto">
                {activeCardTab === 'config' && (
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-violet-300">Configuração</h2>
                      
                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded"
                      >
                        {file ? "Trocar Arquivo" : "Carregar CSV"}
                      </button>
                    </div>
                    
                    {file && (
                      <div className="mb-4 p-3 bg-gray-700 rounded">
                        <div className="font-medium text-violet-300">Arquivo: {file.name}</div>
                        {playerName && <div className="text-gray-300">Jogador: {playerName}</div>}
                      </div>
                    )}
                    
                    <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Épocas:</label>
                          <input
                            type="number"
                            min="10"
                            max="1000"
                            value={trainingParams.epochs}
                            onChange={(e) => setTrainingParams(p => ({ ...p, epochs: +e.target.value }))}
                            className="border bg-gray-700 border-gray-600 text-white p-2 rounded w-full"
                            disabled={isTraining}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Batch Size:</label>
                          <input
                            type="number"
                            min="8"
                            max="128"
                            value={trainingParams.batchSize}
                            onChange={(e) => setTrainingParams(p => ({ ...p, batchSize: +e.target.value }))}
                            className="border bg-gray-700 border-gray-600 text-white p-2 rounded w-full"
                            disabled={isTraining}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Taxa de Aprendizado:</label>
                          <input
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            max="0.1"
                            value={trainingParams.learningRate}
                            onChange={(e) => setTrainingParams(p => ({ ...p, learningRate: +e.target.value }))}
                            className="border bg-gray-700 border-gray-600 text-white p-2 rounded w-full"
                            disabled={isTraining}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Validação (%):</label>
                          <input
                            type="number"
                            step="0.05"
                            min="0.1"
                            max="0.5"
                            value={trainingParams.validationSplit}
                            onChange={(e) => setTrainingParams(p => ({ ...p, validationSplit: +e.target.value }))}
                            className="border bg-gray-700 border-gray-600 text-white p-2 rounded w-full"
                            disabled={isTraining}
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleTrainModel}
                        disabled={!file || isTraining}
                        className="bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800 text-white px-4 py-3 rounded w-full disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                      >
                        {isTraining ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Treinando ({trainingHistory.length}/{trainingParams.epochs})
                          </div>
                        ) : 'Treinar Modelo'}
                      </button>
                    </div>
                    
                    {/* Progresso do Treinamento (Só aparece durante ou após o treinamento) */}
                    {trainingHistory.length > 0 && (
                      <div className="mt-4">
                        <h2 className="text-lg font-bold mb-3 text-violet-300">Progresso do Treinamento</h2>
                        <TrainingHistoryChart data={trainingHistory} height={180} />
                        
                        {/* Métricas */}
                        {metrics && (
                          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                            <div className="p-2 bg-gray-700 rounded">
                              <div className="text-sm text-gray-300">R² Score</div>
                              <div className={`text-lg font-bold ${metrics.r2Score > 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                                {metrics.r2Score.toFixed(3)}
                              </div>
                            </div>
                            <div className="p-2 bg-gray-700 rounded">
                              <div className="text-sm text-gray-300">Erro Médio</div>
                              <div className="text-lg font-bold text-white">
                                {metrics.meanError.toFixed(2)}
                              </div>
                            </div>
                            <div className="p-2 bg-gray-700 rounded">
                              <div className="text-sm text-gray-300">Acurácia Dir.</div>
                              <div className={`text-lg font-bold ${metrics.accuracy > 0.7 ? 'text-green-400' : 'text-red-400'}`}>
                                {(metrics.accuracy * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {activeCardTab === 'predict' && (
                  <div className="flex flex-col h-full">
                    <h2 className="text-xl font-bold mb-4 text-violet-300">Previsão de ROI</h2>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Ano:</label>
                          <input
                            type="number"
                            min="2000"
                            max="2050"
                            value={predictionInputs.ano}
                            onChange={(e) => setPredictionInputs(p => ({...p, ano: +e.target.value}))}
                            className="border bg-gray-700 border-gray-600 text-white p-2 rounded w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Mês:</label>
                          <select
                            value={predictionInputs.mes}
                            onChange={(e) => setPredictionInputs(p => ({...p, mes: +e.target.value}))}
                            className="border bg-gray-700 border-gray-600 text-white p-2 rounded w-full"
                          >
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i+1} value={i+1}>{i+1}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Torneios Previstos:</label>
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            value={predictionInputs.torneios}
                            onChange={(e) => setPredictionInputs(p => ({...p, torneios: +e.target.value}))}
                            className="border bg-gray-700 border-gray-600 text-white p-2 rounded w-full"
                          />
                          <span className="text-xs text-gray-400">
                            Média últimos 6 meses: {formatNumber(recentAverages.torneios)}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-300">Buy-in Médio:</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={predictionInputs.buy_in_medio}
                            onChange={(e) => setPredictionInputs(p => ({...p, buy_in_medio: +e.target.value}))}
                            className="border bg-gray-700 border-gray-600 text-white p-2 rounded w-full"
                          />
                          <span className="text-xs text-gray-400">
                            Média últimos 6 meses: {formatNumber(recentAverages.buyIn)}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handlePredict}
                        disabled={!backend.isModelTrained()}
                        className="bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white px-4 py-2 rounded w-full disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                      >
                        Prever ROI
                      </button>

                      {prediction !== null && (
                        <div className="mt-4 p-4 bg-gray-700 rounded border border-gray-600">
                          <div className="text-center">
                            <h3 className="text-lg font-bold mb-2 text-violet-300">Resultado da Previsão</h3>
                            <div className={`text-3xl font-bold ${prediction > 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {prediction.toFixed(2)}%
                            </div>
                            <div className="mt-2 text-gray-300">
                              Ganho Estimado: {((prediction * predictionInputs.torneios * predictionInputs.buy_in_medio) / 100).toFixed(2)} unidades
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Previsão para Períodos Futuros */}
                      <div className="mt-4">
                        <h3 className="text-lg font-bold mb-2 text-violet-300">Previsão para Período Futuro</h3>
                        <div className="flex items-center space-x-4">
                          <div className="flex-grow">
                            <label className="block text-sm font-medium mb-1 text-gray-300">Número de Meses:</label>
                            <input
                              type="number"
                              min="2"
                              max="24"
                              value={numFutureMonths}
                              onChange={(e) => setNumFutureMonths(+e.target.value)}
                              className="border bg-gray-700 border-gray-600 text-white p-2 rounded w-full"
                            />
                          </div>
                          <div className="pt-6">
                            <button
                              onClick={handlePredictFuture}
                              disabled={!backend.isModelTrained()}
                              className="bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Prever
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Dados históricos abaixo do card principal */}
            {historicalData.length > 0 && (
              <div className="mt-4 bg-gray-800 p-4 rounded-lg shadow-lg border-t border-purple-600 h-52 overflow-auto">
                <h2 className="text-lg font-bold mb-2 text-violet-300">Dados Históricos Recentes</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-gray-700 text-white rounded-lg overflow-hidden text-sm">
                    <thead className="bg-gray-600">
                      <tr>
                        <th className="py-1 px-2 text-left">Mês</th>
                        <th className="py-1 px-2 text-right">Torneios</th>
                        <th className="py-1 px-2 text-right">Buy-in</th>
                        <th className="py-1 px-2 text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalData
                        .sort((a, b) => {
                          // Ordenar por data decrescente
                          const dateA = new Date(a.ano, a.mes - 1);
                          const dateB = new Date(b.ano, b.mes - 1);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .slice(0, 6) // Mostrar apenas os 6 meses mais recentes
                        .map((row, index) => (
                          <tr 
                            key={index} 
                            className={index % 2 === 0 ? 'bg-gray-700' : 'bg-gray-750'}
                          >
                            <td className="py-1 px-2 text-gray-300">{`${row.ano}-${row.mes.toString().padStart(2, '0')}`}</td>
                            <td className="py-1 px-2 text-right">{formatNumber(row.torneios)}</td>
                            <td className="py-1 px-2 text-right">{formatNumber(row.buy_in_medio)}</td>
                            <td className={`py-1 px-2 text-right ${row.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {formatNumber(row.roi)}%
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          
          {/* Coluna 2 e 3: Gráficos e resultados visuais */}
          <div className="col-span-8 grid grid-rows-2 gap-4">
            {/* Linha superior de gráficos */}
            <div className="flex gap-4">
              {/* Gráfico de Série Temporal */}
              {timeSeriesData.length > 0 && (
                <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-lg border-t border-purple-600">
                  <h2 className="text-lg font-bold mb-2 text-violet-300">Série Temporal de ROI</h2>
                  <TimeSeriesChart data={timeSeriesData} height={250} />
                </div>
              )}
              
              {/* Gráfico Real vs Predito */}
              {realVsPredicted.length > 0 && (
                <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-lg border-t border-purple-600">
                  <h2 className="text-lg font-bold mb-2 text-violet-300">Comparação de Predições</h2>
                  <RealVsPredictedChart data={realVsPredicted} height={250} />
                </div>
              )}
            </div>
            
            {/* Linha inferior de gráficos */}
            <div className="flex gap-4">
              {/* Previsões Futuras */}
              {futurePredictions.length > 0 && (
                <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-lg border-t border-purple-600">
                  <h2 className="text-lg font-bold mb-2 text-violet-300">Previsões Futuras</h2>
                  <FuturePredictionsChart data={futurePredictions} height={250} />
                </div>
              )}
              
              {/* Dados Completos ou Outro Conteúdo */}
              {dataSummary && (
                <div className="flex-1 bg-gray-800 p-4 rounded-lg shadow-lg border-t border-purple-600">
                  <h2 className="text-lg font-bold mb-2 text-violet-300">Resumo Estatístico</h2>
                  <div className="grid grid-cols-3 gap-3 text-center mt-4">
                    <div className="p-3 bg-gray-700 rounded">
                      <div className="text-sm text-gray-300">Torneios por Mês</div>
                      <div className="text-lg font-bold text-white">
                        {formatNumber(dataSummary.torneios.avg)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Min: {formatNumber(dataSummary.torneios.min)} - Max: {formatNumber(dataSummary.torneios.max)}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-700 rounded">
                      <div className="text-sm text-gray-300">Buy-in Médio</div>
                      <div className="text-lg font-bold text-white">
                        {formatNumber(dataSummary.buy_in_medio.avg)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Min: {formatNumber(dataSummary.buy_in_medio.min)} - Max: {formatNumber(dataSummary.buy_in_medio.max)}
                      </div>
                    </div>
                    <div className="p-3 bg-gray-700 rounded">
                      <div className="text-sm text-gray-300">ROI Médio</div>
                      <div className="text-lg font-bold text-white">
                        {formatNumber(dataSummary.roi.avg)}%
                      </div>
                      <div className="text-xs text-gray-400">
                        Min: {formatNumber(dataSummary.roi.min)}% - Max: {formatNumber(dataSummary.roi.max)}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Algum outro gráfico ou visualização poderia ir aqui */}
                  <div className="mt-6 flex justify-center items-center h-40 bg-gray-700 rounded border border-gray-600">
                    {playerName && (
                      <div className="text-center">
                        <h3 className="text-xl font-bold text-purple-300">{playerName}</h3>
                        <p className="text-gray-300 mt-2">
                          ROI Médio: <span className={dataSummary.roi.avg >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatNumber(dataSummary.roi.avg)}%
                          </span>
                        </p>
                        <p className="text-gray-300">
                          Volume Total: {historicalData.reduce((sum, item) => sum + (item.torneios * item.buy_in_medio), 0).toFixed(2)} unidades
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-center text-xs text-gray-400 mt-4">
          © 2025 Previsão de ROI para Poker | Desenvolvido com TensorFlow.js
        </div>
      </div>
    </div>
  );
}
