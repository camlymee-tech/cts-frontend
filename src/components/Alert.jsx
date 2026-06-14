// File: src/components/Alert.jsx
export const Alert = ({ type, children }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-700',
    warn: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    success: 'bg-green-50 border-green-200 text-green-700',
  };
  return (
    <div className={`border rounded p-3 text-sm mb-3 ${styles[type] || styles.info}`}>
      {children}
    </div>
  );
};
