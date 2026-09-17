import { useMemo } from 'react';
import { Card } from '../ui';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { DiseaseTrends } from '../../types';
import type { ChartOptions } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface DiseaseTrendsChartProps {
  data: DiseaseTrends | null;
  loading?: boolean;
  error?: string | null;
}

export function DiseaseTrendsChart({ data, loading, error }: DiseaseTrendsChartProps) {
  const chartData = useMemo(() => {
    if (!data || !data.data || data.data.length === 0) return null;
    const labels = data.data.map((point) => {
      const date = new Date(point.date);
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    });
    const values = data.data.map((point) => point.cases);
    return {
      labels,
      datasets: [
        {
          label: `Cases - ${data.disease}`,
          data: values,
          borderColor: '#155e63',
          backgroundColor: 'rgba(21, 94, 99, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#155e63',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
        },
      ],
    };
  }, [data]);

  const options = useMemo<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#fff',
        bodyColor: '#e2e8f0',
        borderColor: '#334155',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `${value !== null ? value : 0} cases`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category',
        grid: {
          display: false,
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          maxTicksLimit: 10,
        },
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        grid: {
          color: '#e2e8f0',
        },
        ticks: {
          color: '#64748b',
          font: { size: 11 },
          stepSize: 1,
        },
        title: {
          display: true,
          text: 'Number of Cases',
          color: '#64748b',
          font: { size: 11, weight: 500 },
        },
      },
    },
  }), []);

  const locationLabel = useMemo(() => {
    if (!data) return 'Kerala (State)';
    if (data.taluk) return data.taluk;
    if (data.district) return data.district;
    return 'Kerala (State)';
  }, [data]);

  if (loading) {
    return (
      <Card padding="md">
        <div className="aspect-video flex items-center justify-center">
          <div className="text-center text-neutral-500">Loading disease trends...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card padding="md" variant="outlined">
        <div className="aspect-video flex items-center justify-center text-neutral-500">
          Failed to load disease trends: {error}
        </div>
      </Card>
    );
  }

  if (!data || !data.data || data.data.length === 0 || !chartData) {
    return (
      <Card padding="md">
        <div className="aspect-video flex items-center justify-center">
          <div className="text-center text-neutral-500">No disease trend data available for the selected filters.</div>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="mb-4">
        <h4 className="font-medium text-neutral-900 capitalize">{data.disease} Trends</h4>
        <p className="text-sm text-neutral-500">{locationLabel} · {data.data.length} data points</p>
      </div>
      <div className="aspect-video" style={{ minHeight: '300px' }}>
        <Line data={chartData} options={options} />
      </div>
    </Card>
  );
}