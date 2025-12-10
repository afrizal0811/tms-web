import Tooltip from '@/components/Tooltip';
import { useLayoutEffect, useRef, useState } from 'react';

export default function TabButton({ children, isActive, onClick }) {
  const [isTruncated, setIsTruncated] = useState(false);
  const buttonRef = useRef(null);
  useLayoutEffect(() => {
    const element = buttonRef.current;
    if (element) {
      const isTextTruncated = element.scrollWidth > element.clientWidth;
      if (isTextTruncated !== isTruncated) {
        setIsTruncated(isTextTruncated);
      }
    }
  }, [children, isTruncated]);

  const buttonElement = (
    <button
      ref={buttonRef}
      onClick={onClick}
      className={`px-4 py-3 font-semibold text-sm truncate w-40 shrink-0 ${
        isActive
          ? 'border-b-2 border-sky-600 text-sky-600'
          : 'text-gray-500 hover:text-gray-700 opacity-40 cursor-pointer '
      }`}
    >
      {children}
    </button>
  );
  if (isTruncated) {
    return <Tooltip tooltipContent={children}>{buttonElement}</Tooltip>;
  }
  return buttonElement;
}
