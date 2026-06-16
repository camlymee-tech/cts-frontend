// File: src/previews/HDNTVCPreview.jsx
import { fmtDate } from '../helpers';
import { HDNT_VC_ARTICLES } from '../data/hdntVCArticles';
import { PartyBlock } from './PartyBlock';
import { HDNTClause } from './HDNTClause';

export const HDNTVCPreview = ({ c, seller, customer }) => {
  // BÊN A = BÊN THUÊ DỊCH VỤ = Khách hàng | BÊN B = BÊN NHẬN DỊCH VỤ = CTS
  const ben_A = customer || {}, ben_B = seller || {};
  return (
    <div className="contract-paper">
      <div className="text-center mb-5">
        <div className="font-bold text-sm">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div className="font-bold text-sm">Độc lập – Tự do – Hạnh phúc</div>
        <div className="my-1">───────────────</div>
        <div className="text-sm italic mt-3">Hà Nội, {fmtDate(c.date)}</div>
        <div className="text-base font-bold mt-3 uppercase">Hợp Đồng Nguyên Tắc</div>
        <div className="text-sm italic">(Cung cấp dịch vụ Logistics)</div>
        <div className="text-sm">Số: <strong>{c.contractId}</strong></div>
      </div>

      <div className="mb-4 text-sm" style={{ textAlign: 'justify' }}>
        <div>Căn cứ Bộ luật Dân sự 2015 và các văn bản hướng dẫn thi hành;</div>
        <div>Căn cứ Luật Doanh nghiệp 2020 và các văn bản hướng dẫn thi hành;</div>
        <div>Căn cứ Luật Thương mại 2005 và các văn bản hướng dẫn thi hành;</div>
        <div>Căn cứ Luật Hải quan 2014 và các văn bản hướng dẫn thi hành;</div>
        <div>Căn cứ Luật Thuế xuất khẩu, thuế nhập khẩu và các văn bản hướng dẫn thi hành;</div>
        <div>Căn cứ vào các quy định pháp luật có liên quan;</div>
        <div>Theo nhu cầu thực tế và khả năng của Các Bên.</div>
      </div>

      <p className="mb-4 text-sm" style={{ textAlign: 'justify' }}>
        HỢP ĐỒNG NGUYÊN TẮC (CUNG CẤP DỊCH VỤ LOGISTICS) (sau đây gọi là "Hợp đồng"), được lập {fmtDate(c.date)}, tại Hà Nội giữa Các Bên sau đây:
      </p>

      <PartyBlock heading="BÊN THUÊ DỊCH VỤ (BÊN A)" p={ben_A} />
      <PartyBlock heading="BÊN NHẬN DỊCH VỤ (BÊN B)" p={ben_B} />

      <p className="mb-1 text-sm italic">Bên A và Bên B sau đây được gọi riêng là "mỗi Bên" và gọi chung là "các Bên".</p>
      <p className="mb-4 text-sm" style={{ textAlign: 'justify' }}>Sau khi thỏa thuận, các Bên thống nhất ký kết Hợp đồng nguyên tắc cung cấp dịch vụ logistics (sau đây gọi là "Hợp đồng") với các điều khoản và điều kiện như sau:</p>

      {HDNT_VC_ARTICLES.map((article, ai) => (
        <div key={ai} className="mb-3 text-sm">
          <div className="font-bold uppercase">Điều {ai + 1}: {article.title}</div>
          {article.lead && <div className="mt-1 italic" style={{ textAlign: 'justify' }}>{article.lead}</div>}
          <div className="mt-1">
            {article.clauses.map((clause, ci) => <HDNTClause key={ci} clause={clause} art={ai + 1} idx={ci} />)}
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-10 mt-10 text-center text-sm">
        <div>
          <div className="font-bold uppercase">Đại diện Bên A</div>
          <div className="text-xs">(Bên Thuê Dịch Vụ)</div>
          <div className="italic text-gray-500">(Ký tên, đóng dấu)</div>
          <div className="mt-24"></div>
        </div>
        <div>
          <div className="font-bold uppercase">Đại diện Bên B</div>
          <div className="text-xs">(Bên Nhận Dịch Vụ)</div>
          <div className="italic text-gray-500">(Ký tên, đóng dấu)</div>
          <div className="mt-24"></div>
        </div>
      </div>
    </div>
  );
};
