import { useState } from 'react';

export default function JsonTree({
  data,
  label = null,
  isLast = true,
  defaultOpen = false,
  expandAll = false,
}) {
  const [isOpen, setIsOpen] = useState(expandAll || defaultOpen);
  const isObject = data !== null && typeof data === 'object';

  if (!isObject) {
    const isStr = typeof data === 'string';
    return (
      <div className="pl-4">
        {label !== null && <span className="text-sky-300">&quot;{label}&quot;: </span>}
        <span className={isStr ? 'text-emerald-400' : 'text-amber-400'}>
          {isStr ? `"${data}"` : String(data)}
        </span>
        {!isLast && <span className="text-slate-500">,</span>}
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const brackets = isArray ? ['[', ']'] : ['{', '}'];
  const keys = isArray ? Object.keys(data) : Object.keys(data).sort();
  const empty = keys.length === 0;

  return (
    <div className={label !== null ? 'pl-4' : ''}>
      <div
        onClick={() => !empty && setIsOpen(!isOpen)}
        className={`flex items-start ${!empty ? 'cursor-pointer hover:bg-slate-800/50 w-fit pr-1 rounded select-none' : ''}`}
      >
        {label !== null && <span className="text-sky-300 mr-1">&quot;{label}&quot;:</span>}
        {!empty && (
          <span className="text-slate-500 mx-1 text-[10px] mt-[3px] shrink-0">
            {isOpen ? '▼' : '▶'}
          </span>
        )}
        <span className="text-slate-300">{brackets[0]}</span>
        {!isOpen && !empty && <span className="text-slate-500 px-1">...</span>}
        {!isOpen && (
          <span className="text-slate-300">
            {brackets[1]}
            {!isLast && <span className="text-slate-500">,</span>}
          </span>
        )}
      </div>
      {isOpen && !empty && (
        <div>
          {keys.map((k, i) => (
            <JsonTree
              key={k}
              label={isArray ? null : k}
              data={data[k]}
              isLast={i === keys.length - 1}
              expandAll={expandAll}
            />
          ))}
          <div className="pl-4 text-slate-300">
            {brackets[1]}
            {!isLast && <span className="text-slate-500">,</span>}
          </div>
        </div>
      )}
    </div>
  );
}
