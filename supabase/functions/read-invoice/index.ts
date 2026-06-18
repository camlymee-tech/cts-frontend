// supabase/functions/read-invoice/index.ts
// Edge Function: đọc hóa đơn VAT / đơn hàng USD bằng AI.
// API Key (ANTHROPIC_API_KEY) chỉ nằm ở đây (server), KHÔNG bao giờ gửi về trình duyệt người dùng.
// Không phụ thuộc thư viện ngoài (jsr:@supabase/supabase-js) — tự gọi thẳng Supabase Auth REST API
// để kiểm tra đăng nhập, giảm điểm có thể lỗi khi khởi động function.
// Deploy: Supabase Dashboard → Edge Functions → function "clever-handler" → tab Code → dán nguyên file này → Deploy updates.
// Cấu hình: Edge Functions → Secrets → ANTHROPIC_API_KEY = <API key thật>.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// tongCongInHoaDon: tổng cộng/thành tiền sau cùng IN SẴN trên hóa đơn gốc (nếu đọc được) —
// dùng để đối chiếu lại với tổng do AI tự cộng từ các dòng hàng, phát hiện sai sót khi ảnh mờ/nghiêng.
const PROMPTS: Record<string, string> = {
  vat:
    'Đây là hóa đơn VAT. Trích xuất danh sách hàng hóa và trả về JSON đúng định dạng:\n' +
    '{"goods":[{"stt":1,"tenHang":"...","dvt":"...","soLuong":0,"donGia":0,"thanhTien":0,"vatRate":8}],"tongCongInHoaDon":0}\n' +
    'tongCongInHoaDon là số tiền tổng cộng/thanh toán sau cùng được IN SẴN trên hóa đơn (đã gồm thuế, nếu có) — để null nếu không thấy rõ trên hóa đơn. ' +
    'Chỉ trả JSON, không thêm chữ nào khác.',
  goods_usd:
    'Đây là đơn hàng / invoice từ nhà cung cấp nước ngoài, đơn giá tính bằng USD. Trích xuất danh sách hàng hóa và trả về JSON đúng định dạng:\n' +
    '{"goods":[{"stt":1,"tenHang":"...","dvt":"...","soLuong":0,"donGia":0,"thanhTien":0}],"tongCongInHoaDon":0}\n' +
    'donGia và thanhTien là số USD (có thể có phần thập phân). tongCongInHoaDon là tổng cộng USD IN SẴN trên đơn hàng/invoice (nếu có) — để null nếu không thấy rõ. ' +
    'Chỉ trả JSON, không thêm chữ nào khác.',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    // 1. Chỉ cho phép user đã đăng nhập hợp lệ của app gọi vào — không cho gọi ẩn danh từ ngoài.
    //    Gọi trực tiếp Supabase Auth REST API (không qua thư viện ngoài) để kiểm tra token.
    const authHeader = req.headers.get('Authorization') || '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader, apikey: supabaseAnonKey! },
    });
    if (!userRes.ok) {
      return json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn. Vui lòng tải lại trang và đăng nhập lại.' }, 401);
    }
    const user = await userRes.json();
    if (!user?.id) {
      return json({ error: 'Chưa đăng nhập hoặc phiên đã hết hạn. Vui lòng tải lại trang và đăng nhập lại.' }, 401);
    }

    // 2. Đọc dữ liệu ảnh/PDF gửi lên từ trình duyệt.
    const { imageBase64, mediaType, mode } = await req.json();
    if (!imageBase64 || !mediaType) {
      return json({ error: 'Thiếu dữ liệu ảnh/file gửi lên.' }, 400);
    }
    const prompt = PROMPTS[mode] || PROMPTS.vat;

    // 3. API Key chỉ đọc từ biến môi trường (Secret) của Supabase — không lưu, không trả về client.
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return json({ error: 'Server chưa cấu hình ANTHROPIC_API_KEY. Vào Supabase Dashboard → Edge Functions → Secrets để thêm.' }, 500);
    }

    const isPdf = mediaType === 'application/pdf';
    const fileBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: imageBase64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } };

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000, // tăng từ 1500 → 4000 để đỡ bị cắt giữa với hóa đơn nhiều dòng hàng
        messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: prompt }] }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return json({ error: 'Lỗi gọi AI (' + aiRes.status + '): ' + errText.slice(0, 300) }, 502);
    }

    const aiData = await aiRes.json();
    const txt = aiData.content?.[0]?.text || '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) {
      return json({ error: 'Không đọc được phản hồi AI.' }, 502);
    }

    let parsed;
    try {
      parsed = JSON.parse(m[0]);
    } catch {
      return json({ error: 'Phản hồi AI không đúng định dạng JSON (có thể do hóa đơn quá nhiều dòng bị cắt giữa). Vui lòng thử lại hoặc nhập tay.' }, 502);
    }

    return json(parsed);
  } catch (err) {
    return json({ error: (err as Error).message || 'Lỗi không xác định.' }, 500);
  }
});
