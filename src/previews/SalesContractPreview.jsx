// File: src/previews/SalesContractPreview.jsx
import { fmtNum, amountToWordsEN } from '../helpers';

const fmtUSD = (n) => (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDMY = (d) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const cellLabel = { border: '1px solid #000', padding: '6px 10px', fontWeight: 'bold', fontSize: '12.5px', whiteSpace: 'nowrap', verticalAlign: 'top' };
const cellValue = { border: '1px solid #000', padding: '6px 10px', fontSize: '12.5px', verticalAlign: 'top' };
const cellValueBold = { ...cellValue, fontWeight: 'bold' };

const PartyTable = ({ heading, p }) => (
  <>
    <p className="font-bold text-xs mb-1">{heading}</p>
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
      <tbody>
        <tr>
          <td style={{ ...cellLabel, width: '8%' }}>Reg:</td>
          <td style={{ ...cellValueBold, width: '47%' }}>{p.name}</td>
          <td style={{ ...cellLabel, width: '18%' }}>Representative by:</td>
          <td style={{ ...cellValue, width: '27%' }}>{p.rep}</td>
        </tr>
        <tr>
          <td style={cellLabel}>Add:</td>
          <td style={cellValue}>{p.address}</td>
          <td style={cellLabel}>Position:</td>
          <td style={cellValue}>{p.position}</td>
        </tr>
      </tbody>
    </table>
  </>
);

// c = sales contract record (data phần jsonb)
export const SalesContractPreview = ({ c }) => {
  const items = c.items || [];
  const total = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
  const seller = c.seller || {};
  const buyer = c.buyer || {};

  return (
    <div className="contract-paper" style={{ fontFamily: "Georgia, 'Times New Roman', Times, serif" }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
        <tbody>
          <tr>
            <td style={{ border: '1.5px solid #000', padding: '14px 18px', width: '62%', verticalAlign: 'middle' }}>
              <div style={{ fontSize: '22px', fontWeight: 'bold', letterSpacing: '0.5px' }}>SALES CONTRACT</div>
            </td>
            <td style={{ border: '1.5px solid #000', padding: 0, width: '38%', verticalAlign: 'top' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 14px', fontWeight: 'bold', border: 'none', fontSize: '13px' }}>No:</td>
                    <td style={{ padding: '8px 14px', fontWeight: 'bold', textAlign: 'right', border: 'none', fontSize: '13px' }}>{c.contractNo || '________'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 14px', fontWeight: 'bold', border: 'none', borderTop: '1px solid #000', fontSize: '13px' }}>Date:</td>
                    <td style={{ padding: '8px 14px', fontWeight: 'bold', textAlign: 'right', border: 'none', borderTop: '1px solid #000', fontSize: '13px' }}>{fmtDMY(c.date)}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mb-4 text-xs">This agreement is drawn between the following parties:</p>

      <PartyTable heading="The Seller (Party A):" p={seller} />
      <PartyTable heading="The Buyer (Party B):" p={buyer} />

      <p className="text-xs mb-4 italic">
        In accordance with the seller's quotation, we are mutually agreed between two parties to sign this sales contract on the terms and conditions as following:
      </p>

      <p className="font-bold text-xs mb-2">1. Commodity - Specification - Quantity - Price:</p>
      <table className="w-full text-xs mb-2 border-collapse">
        <thead>
          <tr className="border-b border-t" style={{ borderColor: '#333' }}>
            <th className="py-1.5 text-left font-semibold">Item No.</th>
            <th className="py-1.5 text-left font-semibold">Description of commodity</th>
            <th className="py-1.5 text-left font-semibold">Origin</th>
            <th className="py-1.5 text-right font-semibold">Quantity</th>
            <th className="py-1.5 text-left font-semibold pl-2">Unit</th>
            <th className="py-1.5 text-right font-semibold">Unit price</th>
            <th className="py-1.5 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id || i} className="border-b" style={{ borderColor: '#ccc' }}>
              <td className="py-1.5">{i + 1}</td>
              <td className="py-1.5">{it.descriptionEN}</td>
              <td className="py-1.5">{it.origin}</td>
              <td className="py-1.5 text-right">{fmtNum(it.qty)}</td>
              <td className="py-1.5 pl-2">{it.unit}</td>
              <td className="py-1.5 text-right">${fmtUSD(it.unitPrice)}</td>
              <td className="py-1.5 text-right">${fmtUSD((Number(it.qty) || 0) * (Number(it.unitPrice) || 0))}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={6} className="py-1.5 text-right font-semibold">Total amount (USD)</td>
            <td className="py-1.5 text-right font-semibold">${fmtUSD(total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs mb-4">Say: {amountToWordsEN(total)}</p>

      <p className="text-xs mb-4">Quality: {c.quality}</p>

      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <p className="font-bold text-xs mb-1">2. Shipping terms:</p>
          <p className="text-xs mb-0.5">Shipping method: {c.shippingMethod}</p>
          <p className="text-xs mb-0.5">Shipping terms: {c.incoterms}</p>
          <p className="text-xs mb-0.5">Port of loading: {c.portLoading}</p>
          <p className="text-xs mb-0.5">Port of discharge: {c.portDischarge}</p>
          <p className="text-xs mb-0.5">Latest shipment date: {c.latestShipment}</p>
          <p className="text-xs">Notice of shipment: {c.noticeShipment}</p>
        </div>
        <div>
          <p className="font-bold text-xs mb-1">3. Packing:</p>
          <p className="text-xs">{c.packing}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-4">
        <div>
          <p className="font-bold text-xs mb-1">4. Payments:</p>
          <p className="text-xs mb-1">{c.paymentTerm}</p>
          <p className="text-xs mb-0.5">Bank: {c.bankName}</p>
          <p className="text-xs mb-0.5">Bank address: {c.bankAddress}</p>
          <p className="text-xs mb-0.5">Swift code: {c.swiftCode}</p>
          <p className="text-xs mb-0.5">Account number: {c.accountNumber}</p>
          <p className="text-xs mb-0.5">Beneficiary: {c.beneficiary}</p>
          <p className="text-xs">{c.feesNote}</p>
        </div>
        <div>
          <p className="font-bold text-xs mb-1">5. Required Documents:</p>
          <p className="text-xs mb-0.5">Commercial invoice and Packing list: 02 original sets</p>
          <p className="text-xs">Certificate of origin: 01 original set (issued by China Chamber of Commerce)</p>
        </div>
      </div>

      <p className="font-bold text-xs mb-1">6. Penalty - Arbitration:</p>
      <p className="text-xs mb-2">
        {c.penalty} Any dispute arising out of this contract shall be first amicably settled by parties. If agreeable result
        cannot be reached it shall be finally settled by the Vietnam International Arbitration Center at the Chamber of
        Commerce and Industry of Vietnam (VCCI). Decision reached by this arbitration shall be final and promptly accepted
        by all parties.
      </p>

      <table style={{ width: '100%', marginTop: '30px', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0 20px' }} className="text-sm">
              <div className="font-bold uppercase">SELLER/PARTY A</div>
              <div style={{ height: '96px' }}></div>
            </td>
            <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0 20px' }} className="text-sm">
              <div className="font-bold uppercase">BUYER/PARTY B</div>
              <div style={{ height: '96px' }}></div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
