// File: src/utils/textNormalize.js
// Tien ich chuan hoa chu tieng Viet (bo dau, viet thuong) -- tach rieng khoi customerExcel.js vi
// file do co import 'xlsx' (~140KB gzip); nhieu noi (helpers.js, cac trang Tao hop dong...) chi can
// normalizeText de so khop chuoi, khong nen phai tai kem thu vien Excel chi vi viec nay.
export const removeDiacritics = (str = '') =>
  String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

export const normalizeText = (str = '') =>
  removeDiacritics(str).toLowerCase().replace(/[^a-z0-9]/g, '');
