import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  projectId: '',
  assignedToId: '',
  priority: 'medium',
  statusId: '',
};

function unwrapResponse(response) {
  return response?.data?.data || response?.data || [];
}

export default function TasksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const canManageTasks = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role);

  const load = async () => {
    const [tasksRes, projectsRes, statusesRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/projects'),
      api.get('/task-statuses'),
    ]);

    setItems(unwrapResponse(tasksRes));
    setProjects(unwrapResponse(projectsRes));
    setStatuses(unwrapResponse(statusesRes));

    try {
      const usersRes = await api.get('/users?limit=100');
      setUsers(unwrapResponse(usersRes));
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (statuses.length && !form.statusId) {
      setForm((current) => ({ ...current, statusId: statuses[0].id }));
    }
  }, [statuses, form.statusId]);

  const resetForm = () => {
    setForm({
      ...EMPTY_FORM,
      statusId: statuses[0]?.id || '',
    });
  };

  const createTask = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await api.post('/tasks', form);
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear la tarea');
    } finally {
      setSaving(false);
    }
  };

  const updateTaskStatus = async (taskId, nextStatusId) => {
    const previousItems = items;
    const statusConfig = statuses.find((status) => status.id === nextStatusId);

    setItems((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: statusConfig?.code ?? task.status,
              statusId: nextStatusId,
              statusConfig: statusConfig ?? task.statusConfig,
            }
          : task,
      ),
    );

    try {
      await api.patch(`/tasks/${taskId}/status`, { statusId: nextStatusId });
    } catch {
      setItems(previousItems);
      setError('No se pudo actualizar el estado de la tarea');
    }
  };

  const groupedTasks = useMemo(() => {
    return statuses.reduce((acc, column) => {
      acc[column.id] = items.filter((item) => item.statusId === column.id);
      return acc;
    }, {});
  }, [items, statuses]);

  const getProjectName = (task) => task.project?.nombre || 'Sin proyecto';
  const getAssignedName = (task) => task.assignedTo?.nombre || 'Sin asignar';

  const handleDragStart = (taskId) => {
    setDraggingTaskId(taskId);
    setError('');
  };

  const handleDrop = async (statusId) => {
    if (!draggingTaskId) return;

    const task = items.find((item) => item.id === draggingTaskId);

    setDragOverColumn(null);
    setDraggingTaskId(null);

    if (!task || task.statusId === statusId) return;

    await updateTaskStatus(task.id, statusId);
  };

  const handleDeleteTask = async (task) => {
    const confirmed = window.confirm(`¿Eliminar la tarea \"${task.titulo}\"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/tasks/${task.id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar la tarea');
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setEditForm({
      titulo: task.titulo || '',
      descripcion: task.descripcion || '',
      projectId: task.projectId || task.project?.id || '',
      assignedToId: task.assignedToId || task.assignedTo?.id || '',
      priority: task.priority || 'medium',
      statusId: task.statusId || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;

    try {
      await api.patch(`/tasks/${editingTask.id}`, editForm);
      setEditingTask(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar la tarea');
    }
  };

  return (
    <div>
      <PageHeader
        title="Tablero de tareas"
        subtitle="Arrastra cada tarjeta entre carriles, edita en modal y elimina con la equis"
      />

      <div className="tasks-layout">
        <form className="card task-form-card" onSubmit={createTask}>
          <h3>Nueva tarea</h3>

          <label>Título</label>
          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ej. Integrar módulo de reportes"
          />

          <label>Descripción</label>
          <textarea
            rows="4"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Detalle breve de la tarea"
          />

          <label>Proyecto</label>
          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          >
            <option value="">Seleccione</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.nombre}
              </option>
            ))}
          </select>

          <label>Asignado a</label>
          <select
            value={form.assignedToId}
            onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
          >
            <option value="">Seleccione</option>
            {users.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>

          <label>Estado inicial</label>
          <select
            value={form.statusId}
            onChange={(e) => setForm({ ...form, statusId: e.target.value })}
          >
            <option value="">Seleccione</option>
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.nombre}
              </option>
            ))}
          </select>

          <label>Prioridad</label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>

          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar tarea'}
          </button>
        </form>

        <section className="kanban-wrapper">
          <div className="kanban-board dynamic-board" style={{ gridTemplateColumns: `repeat(${Math.max(statuses.length, 1)}, minmax(260px, 1fr))` }}>
            {statuses.map((column) => (
              <div
                key={column.id}
                className={`kanban-column ${dragOverColumn === column.id ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverColumn(column.id);
                }}
                onDragLeave={() => {
                  if (dragOverColumn === column.id) {
                    setDragOverColumn(null);
                  }
                }}
                onDrop={() => handleDrop(column.id)}
              >
                <div className="kanban-column-header">
                  <div>
                    <h3>{column.nombre}</h3>
                    <p>{groupedTasks[column.id]?.length || 0} tareas</p>
                  </div>
                  <span className="status-pill" style={{ background: column.color || '#64748b' }}>
                    {column.code}
                  </span>
                </div>

                <div className="kanban-column-body">
                  {(groupedTasks[column.id] || []).map((item) => (
                    <article
                      key={item.id}
                      className={`task-card ${draggingTaskId === item.id ? 'dragging' : ''}`}
                      draggable
                      onDragStart={() => handleDragStart(item.id)}
                      onDragEnd={() => {
                        setDraggingTaskId(null);
                        setDragOverColumn(null);
                      }}
                    >
                      <div className="task-card-actions">
                        <span className={`priority-chip priority-${item.priority || 'medium'}`}>
                          {item.priority || 'medium'}
                        </span>
                        <div className="card-icon-actions">
                          <button
                            type="button"
                            className="icon-button"
                            title="Editar"
                            onClick={() => openEditModal(item)}
                          >
                            ✎
                          </button>
                          {canManageTasks && (
                            <button
                              type="button"
                              className="icon-button danger"
                              title="Eliminar"
                              onClick={() => handleDeleteTask(item)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      <h4>{item.titulo}</h4>
                      <p className="muted task-description">
                        {item.descripcion || 'Sin descripción'}
                      </p>

                      <div className="task-meta-grid">
                        <div>
                          <span className="task-meta-label">Proyecto</span>
                          <strong>{getProjectName(item)}</strong>
                        </div>
                        <div>
                          <span className="task-meta-label">Responsable</span>
                          <strong>{getAssignedName(item)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}

                  {groupedTasks[column.id]?.length === 0 && (
                    <div className="kanban-empty">
                      Suelta aquí una tarea o crea una nueva.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {editingTask && (
        <div className="modal-backdrop" onClick={() => setEditingTask(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar tarea</h3>
              <button type="button" className="icon-button" onClick={() => setEditingTask(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <label>Título</label>
              <input
                value={editForm.titulo}
                onChange={(e) => setEditForm({ ...editForm, titulo: e.target.value })}
              />

              <label>Descripción</label>
              <textarea
                rows="4"
                value={editForm.descripcion}
                onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
              />

              <label>Proyecto</label>
              <select
                value={editForm.projectId}
                onChange={(e) => setEditForm({ ...editForm, projectId: e.target.value })}
              >
                <option value="">Seleccione</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.nombre}
                  </option>
                ))}
              </select>

              <label>Asignado a</label>
              <select
                value={editForm.assignedToId}
                onChange={(e) => setEditForm({ ...editForm, assignedToId: e.target.value })}
              >
                <option value="">Seleccione</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nombre}
                  </option>
                ))}
              </select>

              <label>Estado</label>
              <select
                value={editForm.statusId}
                onChange={(e) => setEditForm({ ...editForm, statusId: e.target.value })}
              >
                <option value="">Seleccione</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.nombre}
                  </option>
                ))}
              </select>

              <label>Prioridad</label>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setEditingTask(null)}>
                  Cancelar
                </button>
                <button type="submit">Guardar cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
