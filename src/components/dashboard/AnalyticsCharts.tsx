import { TenderWithRequirements, tenderStatusLabels, TenderStatus } from '@/types/tender';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Building2, Trophy } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  go_ahead: '#2563eb',
  in_progress: '#f59e0b',
  completed: '#16a34a',
  submitted: '#6b7280',
  cancelled: '#ef4444',
  rejected: '#f97316',
  drafting: '#8b5cf6',
  review: '#06b6d4',
};

const DEPARTMENT_COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6'];

interface Props {
  tenders: TenderWithRequirements[];
}

export function StatusPieChart({ tenders }: Props) {
  const byStatus = tenders.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(byStatus).map(([status, count]) => ({
    name: tenderStatusLabels[status as TenderStatus] || status,
    value: count,
    fill: STATUS_COLORS[status] || '#6b7280',
  }));

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <PieChartIcon className="h-4 w-4" />
          Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DepartmentBarChart({ tenders }: Props) {
  const byDept = tenders.reduce((acc, t) => {
    const dept = t.department || 'Unassigned';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.entries(byDept)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Tenders by Department
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function WinLossChart({ tenders }: Props) {
  const submitted = tenders.filter(t => t.status === 'submitted' || t.status === 'completed');
  const won = submitted.filter(t => t.successful === true).length;
  const lost = submitted.filter(t => t.successful === false).length;
  const pending = submitted.filter(t => t.successful === null).length;

  const data = [
    { name: 'Won', value: won, fill: '#16a34a' },
    { name: 'Lost', value: lost, fill: '#ef4444' },
    { name: 'Pending', value: pending, fill: '#f59e0b' },
  ].filter(d => d.value > 0);

  const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4" />
          Win / Loss Rate
          {winRate !== null && (
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {winRate}% win rate
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
            No outcome data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function MonthlyTrendChart({ tenders }: Props) {
  const last6Months: { month: string; count: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const count = tenders.filter(t => t.created_at.startsWith(monthKey)).length;
    last6Months.push({ month: label, count });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Tenders Created (Last 6 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={last6Months} margin={{ left: -10, right: 10 }}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(220, 70%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
