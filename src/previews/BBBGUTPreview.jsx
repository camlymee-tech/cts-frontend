// File: src/previews/BBBGUTPreview.jsx
import { SignatureBlock } from './SignatureBlock';
import { fmtDate } from '../helpers';
import { ServiceFeeTable } from './ServiceFeeTable';

export const BBBGUTPreview = ({ c, seller, customer }) => {
  // BÊN ỦY THÁC = BÊN A = Khách hàng | BÊN NHẬN ỦY THÁC = BÊN B = CTS
  const ben_A = customer || {}, ben_B = seller || {};
  return (
    <div className="contract-paper">
      <div className="text-center mb-4">
        <div className="font-bold text-sm">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div className="font-bold text-sm">Độc lập – Tự do – Hạnh phúc</div>
        <div className="my-1">───────────────</div>
        <div className="text-base font-bold mt-3 uppercase">Biên Bản Bàn Giao, Nghiệm Thu<br />và Quyết Toán Giá Trị Thực Tế</div>
      </div>

      <div className="text-sm mb-2">
        <div>Theo Hợp đồng số: <strong>{c.relatedContracts?.hdnt_ut || '………………'}</strong></div>
        <div>Và đơn đặt hàng số: <strong>{c.relatedContracts?.ddh_ut || '………………'}</strong></div>
      </div>

      <p className="mb-3 text-sm">Căn cứ vào tình hình phát sinh thực tế. Hôm nay, {fmtDate(c.date)}, chúng tôi gồm:</p>

      <div className="mb-3 text-sm">
        <div className="font-bold">BÊN ỦY THÁC (BÊN A): <strong>{ben_A.companyName}</strong></div>
        <div>Địa chỉ: {ben_A.address}</div>
        <div>Mã số thuế: {ben_A.taxCode} &nbsp;|&nbsp; Điện thoại: {ben_A.phone}</div>
        <div>Email: {ben_A.email}</div>
        <div>Số tài khoản: {ben_A.bankAccount}{ben_A.bankName ? ` tại ${ben_A.bankName}` : ''}</div>
        <div>Người đại diện: <strong>{ben_A.representative}</strong> &nbsp;–&nbsp; Chức vụ: {ben_A.position}</div>
      </div>

      <div className="mb-3 text-sm">
        <div className="font-bold">BÊN NHẬN ỦY THÁC (BÊN B): <strong>{ben_B.companyName}</strong></div>
        <div>Địa chỉ: {ben_B.address}</div>
        <div>Mã số thuế: {ben_B.taxCode} &nbsp;|&nbsp; Điện thoại: {ben_B.phone}</div>
        <div>Email: {ben_B.email}</div>
        <div>Số tài khoản: {ben_B.bankAccount}{ben_B.bankName ? ` tại ${ben_B.bankName}` : ''}</div>
        <div>Người đại diện: <strong>{ben_B.representative}</strong> &nbsp;–&nbsp; Chức vụ: {ben_B.position}</div>
      </div>

      <p className="mb-3 text-sm">Hai bên tiến hành bàn giao hàng hóa, nghiệm thu và quyết toán giá trị dịch vụ thực tế với điều khoản sau:</p>

      <div className="mb-3 text-sm">
        <div className="font-bold uppercase">1. Hàng hóa bàn giao và giá trị dịch vụ quyết toán thực tế</div>
        <div className="mb-2">
          <div className="font-semibold mb-1">Hàng hóa bàn giao:</div>
          <div>– Số tờ khai hải quan: {c.declarationNo || '………'}</div>
          <div>– Số kiện/thùng: {c.packageInfo || '………'}</div>
          <div>– Thông tin khác: {c.otherInfo || '………'}</div>
        </div>
        <div className="font-semibold mb-1">Giá trị nghiệm thu, quyết toán:</div>
        <ServiceFeeTable goods={c.goods} feeLabel="Phí dịch vụ ủy thác nhập khẩu quyết toán trọn gói" totalLabel="Tổng cộng giá trị sau thuế" />
        <div className="text-xs text-gray-500 mt-1">Hóa đơn tiền hàng, thuế (nếu có): Theo tờ khai hải quan nhập khẩu.</div>
      </div>

      <div className="mb-5 text-sm">
        <div className="font-bold uppercase">2. Cam kết</div>
        <div style={{ textAlign: 'justify' }} className="mb-1">Hai bên cùng nhau xác nhận đã giao nhận đủ số lượng hàng hóa và giá trị nghiệm thu quyết toán dịch vụ tại điều 1, đáp ứng các điều kiện quy định theo hợp đồng/đơn đặt dịch vụ, cùng ký biên bản này để làm cơ sở hoàn thành trách nhiệm và quyền lợi của hai bên.</div>
        <div>Biên bản được lập thành 02 bản gốc có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</div>
      </div>

      <SignatureBlock marginTop="24px" leftTitle="Đại diện Bên Ủy Thác" rightTitle="Đại diện Bên Nhận Ủy Thác" />
    </div>
  );
};
