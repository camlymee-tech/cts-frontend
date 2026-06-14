// File: src/previews/HDNTClause.jsx
export const HDNTClause = ({ clause, art, idx }) => {
  const text = typeof clause === 'string' ? clause : clause.text;
  const sub = typeof clause === 'object' ? clause.sub : null;
  return (
    <div className="mb-1.5">
      <div className="flex gap-2">
        <span className="font-semibold shrink-0">{art}.{idx + 1}.</span>
        <span style={{ textAlign: 'justify' }}>{text}</span>
      </div>
      {sub && (
        <div className="ml-7 mt-1 space-y-1">
          {sub.map((sItem, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0">–</span>
              <span style={{ textAlign: 'justify' }}>{sItem}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
