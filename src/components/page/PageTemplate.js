'use client';

import BodyCard from '@/components/card/BodyCard';
import HeaderCard from '@/components/card/HeaderCard';

export default function PageTemplate({
  title,
  subtitle,
  headerItems = [],
  activeTabId,
  onTabClick,
  tabs,
  isLoading = false,
  isEmpty = false,
  emptyMessage,
  footer,
  className = 'w-full max-w-none px-4 sm:px-6 pb-2 h-full flex flex-col',
  bodyProps = {},
  children,
}) {
  return (
    <div className={className}>
      <HeaderCard title={title} subtitle={subtitle} items={headerItems} />
      <BodyCard
        activeTabId={activeTabId}
        onTabClick={onTabClick}
        tabs={tabs}
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyMessage={emptyMessage}
        footer={footer}
        {...bodyProps}
      >
        {children}
      </BodyCard>
    </div>
  );
}
