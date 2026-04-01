import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

export default function DashboardPage() {
  const [data, setData] = useState({ byStatus: {}, upcoming: [], recent: [] });

  useEffect(() => {
    api.get('/dashboard/summary').then((response) => {
      setData(response.data.data || response.data);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Resumen general del trabajo" />

      <section className="grid stats-grid">
        {Object.entries(data.byStatus || {}).map(([status, count]) => (
          <article className="card stat-card" key={status}>
            <h3>{status}</h3>
            <strong>{count}</strong>
          </article>
        ))}
      </section>

      <section className="grid two-cols">
        <div className="card">
          <h3>Próximas a vencer</h3>
          <ul>
            {data.upcoming?.map((task) => (
              <li key={task.id}>{task.titulo}</li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3>Actividad reciente</h3>
          <ul>
            {data.recent?.map((task) => (
              <li key={task.id}>{task.titulo}</li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
