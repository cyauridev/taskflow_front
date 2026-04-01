import { useEffect, useState } from 'react';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const EMPTY_USER = {
  nombre: '',
  email: '',
  password: '',
  role: 'DEVELOPER',
  avatarUrl: '',
};

function unwrapResponse(response) {
  return response?.data?.data || response?.data || [];
}

export default function UsersPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_USER);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_USER);
  const [error, setError] = useState('');

  const isAdmin = user?.role === 'ADMIN';

  const loadUsers = async () => {
    try {
      const res = await api.get('/users?limit=100');
      setItems(unwrapResponse(res));
    } catch (err) {
      setItems([]);
      setError(err.response?.data?.message || 'No se pudieron cargar los usuarios');
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/users', form);
      setForm(EMPTY_USER);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo crear el usuario');
    }
  };

  const openEdit = (item) => {
    setEditingUser(item);
    setEditForm({
      nombre: item.nombre || '',
      email: item.email || '',
      password: '',
      role: item.role || 'DEVELOPER',
      avatarUrl: item.avatarUrl || '',
    });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

    const payload = { ...editForm };
    if (!payload.password) delete payload.password;

    try {
      await api.patch(`/users/${editingUser.id}`, payload);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo actualizar el usuario');
    }
  };

  const removeUser = async (item) => {
    const confirmed = window.confirm(`¿Eliminar al usuario \"${item.nombre}\"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/users/${item.id}`);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo eliminar el usuario');
    }
  };

  return (
    <div>
      <PageHeader title="Usuarios" subtitle="CRUD visual para administradores" />

      {error && <p className="error">{error}</p>}

      {isAdmin && (
        <form className="card user-form-card" onSubmit={createUser}>
          <h3>Nuevo usuario</h3>
          <div className="grid two-cols">
            <div>
              <label>Nombre</label>
              <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            </div>
            <div>
              <label>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label>Contraseña</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <label>Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="ADMIN">ADMIN</option>
                <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                <option value="DEVELOPER">DEVELOPER</option>
              </select>
            </div>
          </div>
          <button type="submit">Crear usuario</button>
        </form>
      )}

      <div className="card users-table-card">
        <div className="users-table">
          <div className="users-table-head users-table-row">
            <span>Nombre</span>
            <span>Email</span>
            <span>Rol</span>
            <span>Acciones</span>
          </div>

          {items.map((item) => (
            <div className="users-table-row" key={item.id}>
              <span>{item.nombre}</span>
              <span>{item.email}</span>
              <span><span className="badge">{item.role}</span></span>
              <span className="users-actions">
                {isAdmin ? (
                  <>
                    <button type="button" className="small-button" onClick={() => openEdit(item)}>Editar</button>
                    <button type="button" className="small-button danger-button" onClick={() => removeUser(item)}>Eliminar</button>
                  </>
                ) : (
                  <span className="muted">Solo lectura</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar usuario</h3>
              <button type="button" className="icon-button" onClick={() => setEditingUser(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={saveEdit}>
              <label>Nombre</label>
              <input value={editForm.nombre} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} />

              <label>Email</label>
              <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />

              <label>Rol</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                <option value="ADMIN">ADMIN</option>
                <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                <option value="DEVELOPER">DEVELOPER</option>
              </select>

              <label>Nueva contraseña (opcional)</label>
              <input type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setEditingUser(null)}>
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
