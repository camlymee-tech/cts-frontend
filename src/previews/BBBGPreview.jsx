// File: src/previews/BBBGPreview.jsx
import { fmtDate, calcTotals, fmtNum, numberToWords } from '../helpers';
import { GoodsTablePrint } from './GoodsTablePrint';

export const BBBGPreview = ({ c, seller, customer }) => {
  // BÊN MUA = BÊN A = Khách hàng | BÊN BÁN = BÊN B = CTS
  const ben_A = customer || {}, ben_B = seller || {};
  const { total } = calcTotals(c.goods);
  return (
    <div className="contract-paper">
      <div className="text-center mb-4">
        <div className="font-bold text-sm">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div className="font-bold text-sm">Độc lập – Tự do – Hạnh phúc</div>
        <div className="my-1">───────────────</div>
        <div className="text-base font-bold mt-3 uppercase">Biên Bản Bàn Giao, Nghiệm Thu<br />và Quyết Toán Giá Trị Thực Tế</div>
      </div>

      <div className="text-sm mb-2">
        <div>Theo Hợp đồng số: <strong>{c.relatedContracts?.hdnt || '………………'}</strong></div>
        <div>Đơn đặt hàng số: <strong>{c.relatedContracts?.ddh || '………………'}</strong></div>
      </div>

      <p className="mb-3 text-sm">Căn cứ vào tình hình phát sinh thực tế. Hôm nay, {fmtDate(c.date)}, chúng tôi gồm:</p>

      <div className="mb-3 text-sm">
        <div className="font-bold">BÊN MUA (BÊN A): <strong>{ben_A.companyName}</strong></div>
        <div>Địa chỉ: {ben_A.address}</div>
        <div>Mã số thuế: {ben_A.taxCode} &nbsp;|&nbsp; Điện thoại: {ben_A.phone}</div>
        <div>Email nhận hồ sơ: {ben_A.email}</div>
        <div>Số tài khoản: {ben_A.bankAccount}{ben_A.bankName ? ` tại ${ben_A.bankName}` : ''}</div>
        <div>Người đại diện: <strong>{ben_A.representative}</strong> &nbsp;–&nbsp; Chức vụ: {ben_A.position}</div>
      </div>

      <div className="mb-3 text-sm">
        <div className="font-bold">BÊN BÁN (BÊN B): <strong>{ben_B.companyName}</strong></div>
        <div>Địa chỉ: {ben_B.address}</div>
        <div>Mã số thuế: {ben_B.taxCode} &nbsp;|&nbsp; Điện thoại: {ben_B.phone}</div>
        <div>Email nhận hồ sơ: {ben_B.email}</div>
        <div>Số tài khoản: {ben_B.bankAccount}{ben_B.bankName ? ` tại ${ben_B.bankName}` : ''}</div>
        <div>Người đại diện: <strong>{ben_B.representative}</strong> &nbsp;–&nbsp; Chức vụ: {ben_B.position}</div>
      </div>

      <p className="mb-3 text-sm">Hai bên tiến hành bàn giao, nghiệm thu và quyết toán giá trị thực tế với điều khoản sau:</p>

      <div className="mb-3 text-sm">
        <div className="font-bold uppercase">1. Hàng hóa bàn giao và giá trị quyết toán thực tế</div>
        <GoodsTablePrint goods={c.goods} finalLabel="Tổng cộng giá trị sau thuế:" />
        <div><strong>Giá trị bên B xuất hoá đơn cho bên A:</strong> {fmtNum(total)} đồng</div>
        <div><strong>Bằng chữ:</strong> {numberToWords(total)}</div>
      </div>

      <div className="mb-5 text-sm">
        <div className="font-bold uppercase">2. Cam kết</div>
        <div style={{ textAlign: 'justify' }} className="mb-1">Hai bên cùng nhau xác nhận đã giao nhận đủ số lượng hàng hóa và nghiệm thu quyết toán giá trị thực tế tại điều 1, đáp ứng các điều kiện quy định theo hợp đồng/đơn đặt hàng, cùng ký biên bản này để làm cơ sở hoàn thành trách nhiệm và quyền lợi theo hợp đồng/đơn đặt hàng của hai bên.</div>
        <div>Biên bản được lập thành 02 bản gốc có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</div>
      </div>

      <div className="grid grid-cols-2 gap-10 mt-6 text-center text-sm">
        <div>
          <div className="font-bold uppercase">Đại diện Bên Mua (Bên A)</div>
          <div className="italic text-gray-500">(Ký tên, đóng dấu)</div>
          <div className="mt-24"></div>
        </div>
        <div>
          <div className="font-bold uppercase">Đại diện Bên Bán (Bên B)</div>
          <div className="italic text-gray-500">(Ký tên, đóng dấu)</div>
          <div className="mt-24"></div>
        </div>
      </div>
    </div>
  );
};
