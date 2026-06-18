// File: src/previews/SignatureBlock.jsx
// Bảng 2 cột chữ ký — dùng <table> thay vì CSS grid/flex.
// Lý do: khi xuất file Word, thư viện chuyển đổi không hiểu được CSS grid/flex hiện đại,
// nhưng hiểu rất tốt cấu trúc <table>, nên 2 khung chữ ký sẽ luôn nằm ngang cạnh nhau
// dù xem trên web, in, hay mở bằng Word.
export const SignatureBlock = ({ leftTitle, leftSub, rightTitle, rightSub, marginTop = '40px' }) => (
  <table style={{ width: '100%', marginTop, borderCollapse: 'collapse' }}>
    <tbody>
      <tr>
        <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0 20px' }} className="text-sm">
          {leftTitle && (
            <>
              <div className="font-bold uppercase">{leftTitle}</div>
              {leftSub && <div className="text-xs">{leftSub}</div>}
              <div className="italic text-gray-500">(Ký tên, đóng dấu)</div>
              <div style={{ height: '96px' }}></div>
            </>
          )}
        </td>
        <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0 20px' }} className="text-sm">
          <div className="font-bold uppercase">{rightTitle}</div>
          {rightSub && <div className="text-xs">{rightSub}</div>}
          <div className="italic text-gray-500">(Ký tên, đóng dấu)</div>
          <div style={{ height: '96px' }}></div>
        </td>
      </tr>
    </tbody>
  </table>
);
