// File: src/pages/ApiKeyManager.jsx
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const ApiKeyManager = () => {
  const [oldKeyExists, setOldKeyExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    (async () => {
      const k = await api.get('api_key', true);
      setOldKeyExists(!!k);
      setLoading(false);
    })();
  }, []);

  const cleanupOldKey = async () => {
    if (!confirm('Xóa API Key cũ đang lưu trong database (không dùng nữa)? Việc này không ảnh hưởng tính năng AI đọc hóa đơn — tính năng đó giờ dùng Secret riêng trên Edge Function.')) return;
    setCleaning(true);
    try {
      await api.del('api_key', true);
      setOldKeyExists(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">🔑 API Key cho AI đọc hóa đơn <span className="text-sm font-normal text-gray-400">(Admin)</span></h2>
      <p className="text-sm text-gray-500 mb-4">
        API Key Anthropic giờ được cấu hình ở phía server (Supabase Edge Function), không còn lưu trong database của app nữa —
        nhờ vậy trình duyệt của nhân viên không bao giờ thấy được API Key.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2 mb-4">
        <div className="font-semibold">Cách cấu hình (chỉ cần làm 1 lần, ngoài app này):</div>
        <ol className="list-decimal list-inside space-y-1">
          <li>Vào <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="underline font-medium">console.anthropic.com</a> → tạo 1 API Key <strong>mới</strong> (nên tạo mới, không dùng lại key cũ vì key cũ đã từng lộ ra trình duyệt nhân viên).</li>
          <li>Vào Supabase Dashboard của project → mục <strong>Edge Functions</strong> → tab <strong>Secrets</strong> → thêm secret tên <code className="bg-blue-100 px-1 rounded">ANTHROPIC_API_KEY</code>, giá trị là key vừa tạo ở bước 1.</li>
          <li>Vẫn trong <strong>Edge Functions</strong> → bấm <strong>Deploy a new function</strong> → chọn <strong>Via Editor</strong> → dán nguyên nội dung file <code className="bg-blue-100 px-1 rounded">supabase/functions/read-invoice/index.ts</code> (đã có trong code) → Deploy. <span className="italic">(Hiện đang dùng function tên <code className="bg-blue-100 px-1 rounded">clever-handler</code> — nếu tạo function mới khác tên, báo lại để cập nhật code app theo.)</span></li>
          <li>Vào lại <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="underline font-medium">console.anthropic.com</a> → xóa (revoke) API Key <strong>cũ</strong> đã từng lộ, để chắc chắn không ai dùng lại được key đó nữa.</li>
        </ol>
      </div>

      {!loading && oldKeyExists && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm text-amber-900">
          <div className="font-semibold mb-1">⚠️ Vẫn còn API Key cũ lưu trong database (cách lưu cũ, không an toàn)</div>
          <p className="mb-3">Không còn được dùng nữa, nhưng nên xóa luôn cho sạch — vì key này đã từng bị mọi nhân viên xem được nên không an toàn để giữ lại.</p>
          <button onClick={cleanupOldKey} disabled={cleaning}
            className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 text-sm font-medium disabled:opacity-60">
            {cleaning ? 'Đang xóa...' : '🗑️ Xóa API Key cũ khỏi database'}
          </button>
        </div>
      )}
      {!loading && !oldKeyExists && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
          ✓ Database sạch — không còn API Key nào lưu trực tiếp trong app.
        </div>
      )}
    </div>
  );
};
