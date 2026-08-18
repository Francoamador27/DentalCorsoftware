import { useState, useEffect } from 'react';
import clienteAxios from '../../../config/axios';

const SmtpClinica = () => {
    const [form, setForm] = useState({
        host: '',
        port: '',
        username: '',
        password: '',
        encryption: 'tls',
        from_email: '',
        from_name: '',
    });
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    const [err, setErr] = useState(null);

    const [testEmail, setTestEmail] = useState('');
    const [testing, setTesting] = useState(false);
    const [testMsg, setTestMsg] = useState(null);
    const [testErr, setTestErr] = useState(null);

    useEffect(() => {
        clienteAxios.get('/api/tenant-smtp')
            .then(({ data }) => {
                setForm({
                    host: data.host || '',
                    port: data.port != null ? String(data.port) : '',
                    username: data.username || '',
                    password: '',
                    encryption: data.encryption || 'tls',
                    from_email: data.from_email || '',
                    from_name: data.from_name || '',
                });
            })
            .catch(() => setErr('No se pudo cargar la configuración SMTP.'))
            .finally(() => setLoading(false));
    }, []);

    const smtpPayload = () => ({
        host: form.host || null,
        port: form.port ? Number(form.port) : null,
        username: form.username || null,
        password: form.password || null,
        encryption: form.encryption,
        from_email: form.from_email || null,
        from_name: form.from_name || null,
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg(null);
        setErr(null);

        try {
            setSaving(true);
            await clienteAxios.put('/api/tenant-smtp', smtpPayload());
            setMsg('Configuración SMTP guardada.');
            setForm(f => ({ ...f, password: '' }));
        } catch {
            setErr('No se pudo guardar la configuración SMTP.');
        } finally {
            setSaving(false);
        }
    };

    const handleTest = async () => {
        setTestMsg(null);
        setTestErr(null);

        if (!testEmail.trim()) {
            setTestErr('Ingresá un email para enviar la prueba.');
            return;
        }

        try {
            setTesting(true);
            const { data } = await clienteAxios.post('/api/tenant-smtp/test', {
                ...smtpPayload(),
                email: testEmail.trim(),
            });
            setTestMsg(data?.message || 'Email de prueba enviado correctamente.');
        } catch (error) {
            setTestErr(error?.response?.data?.message || 'No se pudo enviar el email de prueba.');
        } finally {
            setTesting(false);
        }
    };

    if (loading) return <p className="text-sm text-slate-500">Cargando...</p>;

    return (
        <div className="space-y-8">
        <form onSubmit={handleSubmit} className="space-y-5">
            {msg && <div className="text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded text-sm">{msg}</div>}
            {err && <div className="text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded text-sm">{err}</div>}

            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Host</label>
                    <input
                        type="text"
                        value={form.host}
                        onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                        placeholder="smtp.tu-dominio.com"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Puerto</label>
                    <input
                        type="number"
                        value={form.port}
                        onChange={e => setForm(f => ({ ...f, port: e.target.value }))}
                        placeholder="587"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                    <input
                        type="text"
                        value={form.username}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                        placeholder="usuario@tu-dominio.com"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                    <div className="flex">
                        <input
                            type={showPass ? 'text' : 'password'}
                            value={form.password}
                            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                            placeholder="••••••••"
                            className="w-full border border-slate-300 rounded-l-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <button type="button" onClick={() => setShowPass(s => !s)}
                            className="px-3 border border-l-0 border-slate-300 rounded-r-lg text-sm text-slate-600 hover:bg-slate-50">
                            {showPass ? 'Ocultar' : 'Ver'}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Si lo dejás vacío, se mantiene la actual.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Encriptación</label>
                    <select
                        value={form.encryption}
                        onChange={e => setForm(f => ({ ...f, encryption: e.target.value }))}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                        <option value="none">Sin encriptación</option>
                        <option value="ssl">SSL (465)</option>
                        <option value="tls">TLS (587)</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email remitente</label>
                    <input
                        type="email"
                        value={form.from_email}
                        onChange={e => setForm(f => ({ ...f, from_email: e.target.value }))}
                        placeholder="no-reply@clinica.com"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre remitente</label>
                    <input
                        type="text"
                        value={form.from_name}
                        onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))}
                        placeholder="Clínica Dental Sur"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>
            </div>

            <button
                type="submit"
                disabled={saving}
                className={`px-5 py-2.5 rounded-lg text-white text-sm font-semibold ${saving ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {saving ? 'Guardando…' : 'Guardar SMTP'}
            </button>
        </form>

        <div className="pt-6 border-t border-slate-200" data-tour="smtp-test">
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Probar configuración</h3>
            <p className="text-xs text-slate-500 mb-3">
                Enviá un email de prueba para verificar que el SMTP funciona. Usa los datos que tengas
                escritos arriba, aunque todavía no los hayas guardado.
            </p>

            {testMsg && <div className="text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded text-sm mb-3">{testMsg}</div>}
            {testErr && <div className="text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded text-sm mb-3">{testErr}</div>}

            <div className="flex flex-wrap gap-2">
                <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="tu-email@ejemplo.com"
                    className="flex-1 min-w-[220px] border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold ${testing ? 'bg-slate-200 text-slate-500' : 'bg-white text-blue-700 border border-blue-300 hover:bg-blue-50'}`}
                >
                    {testing ? 'Enviando…' : 'Enviar test'}
                </button>
            </div>
        </div>
        </div>
    );
};

export default SmtpClinica;
