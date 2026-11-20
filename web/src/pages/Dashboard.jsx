import HeroCard from '../components/dashboard/HeroCard.jsx';
import StatCards from '../components/dashboard/StatCards.jsx';
import Throughput from '../components/dashboard/Throughput.jsx';
import { ActivityCard, BreakdownCard, FocusCard, ProjectsCard } from '../components/dashboard/Widgets.jsx';
import ConnectionError from '../components/ui/ConnectionError.jsx';
import { RisePage } from '../components/ui/Motion.jsx';
import { useDashboard } from '../hooks/queries.js';

export default function Dashboard() {
  const { data, error, refetch, isError } = useDashboard();

  if (isError && !data) return <ConnectionError error={error} onRetry={refetch} />;

  return (
    <RisePage className="space-y-3.5">
      <div className="grid gap-3.5 lg:grid-cols-3">
        <HeroCard data={data} />
        <FocusCard data={data} />
      </div>
      <StatCards data={data} />
      <div className="grid gap-3.5 lg:grid-cols-3">
        <Throughput daily={data?.throughput.daily} />
        <ProjectsCard data={data} />
      </div>
      <div className="grid gap-3.5 lg:grid-cols-3">
        <ActivityCard />
        <BreakdownCard data={data} />
      </div>
    </RisePage>
  );
}
