import { CircleCheckBig, CircleDot, Clock3, TriangleAlert } from 'lucide-react';
import { Sparkline } from '../ui/Charts.jsx';
import { Card, CountUp } from '../ui/Motion.jsx';
import { Skeleton } from '../ui/Overlay.jsx';
import { tr } from '../../lib/i18n.js';

function delta(series = []) {
  if (series.length < 2) return 0;
  return series[series.length - 1] - series[series.length - 2];
}

function StatCard({ icon: Icon, label, value, series, color, note }) {
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-center gap-2 text-[13px] text-muted">
        <span className="grid size-7 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {label}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        {value === undefined ? <Skeleton className="h-[30px] w-14" /> : <CountUp value={value} className="font-display text-[30px] leading-none font-bold" />}
        <Sparkline data={series} color={color} />
      </div>
      <p className="mt-2.5 text-xs text-faint">{note}</p>
    </Card>
  );
}

export default function StatCards({ data }) {
  const s = data?.stats;
  const spark = s?.spark ?? {};
  const openDelta = delta(spark.open);
  const doneYesterday = spark.done?.[5] ?? 0;
  const doneToday = spark.done?.[6] ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
      <StatCard
        icon={CircleDot}
        label={tr('Đang mở')}
        value={s?.open}
        series={spark.open}
        color="var(--accent-hi)"
        note={openDelta === 0 ? tr('Không đổi so với hôm qua') : tr('{delta} so với hôm qua', { delta: `${openDelta > 0 ? '+' : ''}${openDelta}` })}
      />
      <StatCard
        icon={Clock3}
        label={tr('Đến hạn hôm nay')}
        value={s?.dueToday}
        series={spark.dueToday}
        color="var(--warning)"
        note={tr('{n} việc trong 7 ngày tới', { n: data?.focus.week.length ?? 0 })}
      />
      <StatCard
        icon={TriangleAlert}
        label={tr('Trễ hạn')}
        value={s?.overdue}
        series={spark.overdue}
        color="var(--danger)"
        note={s?.overdue ? tr('Nên xử lý sớm nhé') : tr('Bạn đang theo kịp mọi deadline')}
      />
      <StatCard
        icon={CircleCheckBig}
        label={tr('Xong trong 7 ngày')}
        value={s?.done7}
        series={spark.done}
        color="var(--success)"
        note={tr('Hôm nay {doneToday}, hôm qua {doneYesterday}', { doneToday, doneYesterday })}
      />
    </div>
  );
}
