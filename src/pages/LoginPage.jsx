// File: src/pages/LoginPage.jsx
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export const LoginPage = () => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message);
    setLoading(false);
  };

  const register = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (err) {
      setError(err.message);
    } else if (!data.session) {
      setInfo('Đăng ký thành công! Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.');
      setMode('login');
    }
    // Nếu data.session tồn tại (auto-confirm), App.jsx sẽ tự chuyển trang khi session thay đổi.
    setLoading(false);
  };

  const isRegister = mode === 'register';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">📋</div>
          <h1 className="text-2xl font-bold text-gray-800">CTS Contracts</h1>
          <p className="text-gray-500 text-sm mt-1">CTS Logistics Vietnam</p>
        </div>

        <form onSubmit={isRegister ? register : login} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@cts.com"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
          )}
          {info && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">{info}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition"
          >
            {loading ? 'Đang xử lý...' : (isRegister ? 'Đăng ký' : 'Đăng nhập')}
          </button>
        </form>

        <div className="text-center mt-4 text-sm text-gray-500">
          {isRegister ? (
            <>Đã có tài khoản?{' '}
              <button onClick={() => { setMode('login'); setError(''); setInfo(''); }} className="text-blue-600 font-medium hover:underline">
                Đăng nhập
              </button>
            </>
          ) : (
            <>Chưa có tài khoản (dành cho Sale)?{' '}
              <button onClick={() => { setMode('register'); setError(''); setInfo(''); }} className="text-blue-600 font-medium hover:underline">
                Đăng ký
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
