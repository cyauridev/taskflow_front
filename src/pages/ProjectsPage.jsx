import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const EMPTY_PROJECT = {
  nombre: '',
  descripcion: '',
  ownerId: '',
  status: 'active',
};

function unwrapResponse(response) {
  return response?.data?.data || response?.data || [];
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_PROJECT);
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_PROJECT);
  const [error, setError] = useState('');

  const canManageProjects = ['ADMIN', 'PROJECT_MANAGER'].includes(user?.role);
  const isAdmin = user?.role === 'ADMIN';

  const loadProjects = async () => {
    try {
      const res = await api.get('/projects');
      setItems(unwrapResponse(res));
    } catch (err) {
      setItems([]);
      setError(err.response?.data?.message || 'No se pudieron cargar los proyectos');
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get('/users?limit=100');
      setUsers(unwrapResponse(res));
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, []);

  const resetForm = () => {
    setForm({
      ...EMPTY_PROJECT,
      ownerId: isAdmin ? '' : user?.id || '',
    });
  };

  useEffect(() => {
    resetForm();
  }, [isAdmin, user?.id]);

  const ownersMap = useMemo(() => {
    return users.reduce((acc, item) => {
      acc[item.id] = item.nombre;
      return acc;
    }, {});
  }, [users]);

  const createProject = async (e) => {
    e.preventDefault();
    setError('');

    const payload = { ...form };
    if (!isAdmin) delete payload.ownerId;
    if (!payload.status) payload.status = 'active';

    try {
      await api.post('/projects', payload);
      resetForm();
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear el proyecto');
    }
  };

  const openEdit = (item) => {
    setEditingProject(item);
    setEditForm({
      nombre: item.nombre || '',
      descripcion: item.descripcion || '',
      ownerId: item.ownerId || item.owner?.id || '',
      status: item.status || 'active',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingProject) return;

    const payload = { ...editForm };
    if (!isAdmin) delete payload.ownerId;

    try {
      await api.patch(`/projects/${editingProject.id}`, payload);
      setEditingProject(null);
      await loadProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar el proyecto');
    }
  };

  const removeProject = async (item) => {
    const confirmed = window.confirm(`¿Eliminar el proyecto \"${item.nombre}\"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/projects/${item.id}`);
      await loadProjects();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'No se pudo eliminar el proyecto. Verifica si aún tiene tareas activas.',
      );
    }
  };

  const getOwnerName = (item) => item.owner?.nombre || ownersMap[item.ownerId] || 'Sin responsable';

  return (
    <div>
      <PageHeader title="Projects" subtitle="Se agregó el CRUD completo sin quitar el resto del sistema" />

      {error && <p className="error">{error}</p>}

      {canManageProjects && (
        <form className="card user-form-card" onSubmit={createProject}>
          <h3>Nuevo proyecto</h3>
          <div className="grid two-cols">
            <div>
              <label>Nombre</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej. Plataforma de reportes"
              />
            </div>
            <div>
              <label>Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div className="project-form-full">
              <label>Descripción</label>
              <textarea
                rows="4"
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Detalle general del proyecto"
              />
            </div>
            {isAdmin && (
              <div>
                <label>Responsable</label>
                <select
                  value={form.ownerId}
                  onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                >
                  <option value="">Seleccione</option>
                  {users.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button type="submit">Crear proyecto</button>
        </form>
      )}

      <div className="card users-table-card">
        <div className="users-table projects-table">
          <div className="users-table-head users-table-row projects-table-row">
            <span>Nombre</span>
            <span>Descripción</span>
            <span>Responsable</span>
            <span>Estado</span>
            <span>Tareas</span>
            <span>Acciones</span>
          </div>

          {items.map((item) => (
            <div className="users-table-row projects-table-row" key={item.id}>
              <span><strong>{item.nombre}</strong></span>
              <span>{item.descripcion}</span>
              <span>{getOwnerName(item)}</span>
              <span><span className="badge">{item.status}</span></span>
              <span>{item.tasks?.length || 0}</span>
              <span className="users-actions">
                {canManageProjects ? (
                  <>
                    <button type="button" className="small-button" onClick={() => openEdit(item)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="small-button danger-button"
                      onClick={() => removeProject(item)}
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <span className="muted">Solo lectura</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {editingProject && (
        <div className="modal-backdrop" onClick={() => setEditingProject(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar proyecto</h3>
              <button type="button" className="icon-button" onClick={() => setEditingProject(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={saveEdit}>
              <label>Nombre</label>
              <input
                value={editForm.nombre}
                onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              />

              <label>Descripción</label>
              <textarea
                rows="4"
                value={editForm.descripcion}
                onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
              />

              <label>Estado</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>

              {isAdmin && (
                <>
                  <label>Responsable</label>
                  <select
                    value={editForm.ownerId}
                    onChange={(e) => setEditForm({ ...editForm, ownerId: e.target.value })}
                  >
                    <option value="">Seleccione</option>
                    {users.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setEditingProject(null)}>
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
