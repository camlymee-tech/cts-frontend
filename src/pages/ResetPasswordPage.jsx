// File: src/pages/ResetPasswordPage.jsx
// Hiện ra khi người dùng bấm vào link "đặt lại mật khẩu" trong email (Supabase tự đăng nhập tạm bằng
// 1 session đặc biệt kiểu PASSWORD_RECOVERY, App.jsx phát hiện qua onAuthStateChange và hiện trang này
// thay vì vào thẳng app, bắt phải đặt mật khẩu mới xong mới thôi).
import { useState } from 'react';
import { supabase } from '../lib/supabase';

export const ResetPasswordPage = ({ onDone }) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự.');
    if (password !== confirm) return setError('Hai mật khẩu nhập lại không khớp nhau.');
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setTimeout(() => onDone?.(), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-3xl mb-2">🔑</div>
          <h1 className="text-2xl font-bold text-gray-800">Đặt mật khẩu mới</h1>
          <p className="text-gray-500 text-sm mt-1">Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 text-sm text-center">
            ✓ Đặt mật khẩu mới thành công! Đang chuyển vào hệ thống...
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu mới</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nhập lại mật khẩu mới</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-60 transition"
            >
              {loading ? 'Đang lưu...' : 'Xác nhận mật khẩu mới'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
