import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts';
import { TrainingHistory, ScatterDataPoint, TimeSeriesDataPoint, FuturePrediction } from './types';

// Formatar valores numéricos
const formatValue = (value: number) => Number(value).toFixed(2);

// Custom tooltip para o gráfico de treinamento
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TrainingTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-3 rounded shadow-lg border border-violet-600">
        <p className="font-medium text-violet-400">Época {label}</p>
        <p className="text-sm">
          <span className="text-purple-300">Treino:</span> {formatValue(payload[0].value)}
        </p>
        <p className="text-sm">
          <span className="text-teal-300">Validação:</span> {formatValue(payload[1].value)}
        </p>
      </div>
    );
  }
  return null;
};

// Custom tooltip para o gráfico de ROI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ROITooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-3 rounded shadow-lg border border-violet-600">
        <p className="font-medium text-violet-400">{label}</p>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm">
            <span className={entry.name === "ROI Real" ? "text-purple-300" : "text-teal-300"}>
              {entry.name}:
            </span>{' '}
            {formatValue(entry.value)}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Custom tooltip para o gráfico de dispersão
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 text-white p-3 rounded shadow-lg border border-violet-600">
        <p className="text-sm">
          <span className="text-purple-300">ROI Real:</span> {formatValue(data.real)}%
        </p>
        <p className="text-sm">
          <span className="text-teal-300">ROI Previsto:</span> {formatValue(data.predicted)}%
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Erro: {formatValue(Math.abs(data.real - data.predicted))}%
        </p>
      </div>
    );
  }
  return null;
};

// Custom tooltip para o gráfico de previsões futuras
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FuturePredictionTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 text-white p-3 rounded shadow-lg border border-violet-600">
        <p className="font-medium text-violet-400">{label}</p>
        <p className="text-sm">
          <span className="text-teal-300">ROI Previsto:</span> {formatValue(payload[0].value)}%
        </p>
      </div>
    );
  }
  return null;
};

// Gráfico de histórico de treinamento
export const TrainingHistoryChart: React.FC<{ data: TrainingHistory[]; height?: number }> = ({
  data,
  height = 240
}) => {
  return (
    <div className="h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ right: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="epoch" 
            label={{ value: 'Época', position: 'insideBottomRight', offset: -5, fill: '#bbb' }}
            stroke="#aaa"
          />
          <YAxis 
            label={{ value: 'Perda', angle: -90, position: 'insideLeft', fill: '#bbb' }}
            stroke="#aaa"
          />
          <Tooltip content={TrainingTooltip} />
          <Legend wrapperStyle={{ paddingTop: 10 }} />
          <Line 
            type="monotone" 
            dataKey="loss" 
            name="Treino" 
            stroke="#9d4edd" 
            dot={false} 
            strokeWidth={2.5}
            animationDuration={300}
          />
          <Line 
            type="monotone" 
            dataKey="val_loss" 
            name="Validação" 
            stroke="#06d6a0" 
            dot={false} 
            strokeWidth={2.5}
            animationDuration={300}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico de ROI real vs previsto (séries temporais)
export const TimeSeriesChart: React.FC<{ data: TimeSeriesDataPoint[]; height?: number }> = ({
  data,
  height = 240
}) => {
  const hasPrediçãoData = data.some(item => item.predictedROI !== undefined);
  
  return (
    <div className="h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ right: 30, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="month" 
            label={{ value: 'Mês', position: 'insideBottomRight', offset: -5, fill: '#bbb' }}
            stroke="#aaa"
          />
          <YAxis 
            label={{ value: 'ROI (%)', angle: -90, position: 'insideLeft', fill: '#bbb' }}
            stroke="#aaa"
          />
          <Tooltip content={ROITooltip} />
          <Legend wrapperStyle={{ paddingTop: 10 }} />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          <Line 
            type="monotone" 
            dataKey="realROI" 
            name="ROI Real" 
            stroke="#9d4edd" 
            dot={{ r: 4, strokeWidth: 1 }} 
            strokeWidth={2.5}
            animationDuration={300}
          />
          {hasPrediçãoData && (
            <Line 
              type="monotone" 
              dataKey="predictedROI" 
              name="ROI Previsto" 
              stroke="#06d6a0" 
              dot={{ r: 4, strokeWidth: 1 }} 
              strokeWidth={2.5}
              animationDuration={300}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico de ROI real vs previsto (dispersão)
export const RealVsPredictedChart: React.FC<{ data: ScatterDataPoint[]; height?: number }> = ({
  data,
  height = 240
}) => {
  // Encontrar min e max para definir o domínio
  const allValues = data.flatMap(d => [d.real, d.predicted]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const domain = [Math.min(min - 5, -5), Math.max(max + 5, 5)]; // Adiciona margem
  
  return (
    <div className="h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            type="number" 
            dataKey="real" 
            name="ROI Real" 
            domain={domain}
            label={{ value: 'ROI Real (%)', position: 'insideBottomRight', offset: -5, fill: '#bbb' }}
            stroke="#aaa"
          />
          <YAxis 
            type="number" 
            dataKey="predicted" 
            name="ROI Previsto" 
            domain={domain}
            label={{ value: 'ROI Previsto (%)', angle: -90, position: 'insideLeft', fill: '#bbb' }}
            stroke="#aaa"
          />
          <ReferenceLine x={0} stroke="#666" />
          <ReferenceLine y={0} stroke="#666" />
          <ReferenceLine y="x" stroke="#ff7300" strokeDasharray="3 3" />
          <Tooltip content={ScatterTooltip} />
          <Scatter 
            name="ROI Comparação" 
            data={data} 
            fill="#9d4edd"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { cx = 0, cy = 0 } = props;
              return (
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r={5} 
                  strokeWidth={1}
                  stroke="#fff"
                  fill="#9d4edd"
                  fillOpacity={0.8}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

// Gráfico de previsões futuras
export const FuturePredictionsChart: React.FC<{ data: FuturePrediction[]; height?: number }> = ({
  data,
  height = 240
}) => {
  return (
    <div className="h-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          <defs>
            <linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9d4edd" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#9d4edd" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="month" 
            label={{ value: 'Mês', position: 'insideBottomRight', offset: -5, fill: '#bbb' }}
            stroke="#aaa"
          />
          <YAxis 
            label={{ value: 'ROI (%)', angle: -90, position: 'insideLeft', fill: '#bbb' }}
            stroke="#aaa"
          />
          <Tooltip content={FuturePredictionTooltip} />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey="roi" 
            name="ROI Previsto" 
            stroke="#9d4edd" 
            fillOpacity={1} 
            fill="url(#colorRoi)" 
            strokeWidth={2.5}
            dot={{ fill: '#9d4edd', r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}; 