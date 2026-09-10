'use client';

import FileUploader from '@/components/fileUploader/FileUploader';
import Modal from '@/components/modal/Modal';
import { useLanguage } from '@/context/LanguageContext';

export default function ManualUploadModal({
  isOpen,
  onClose,
  isLoading,
  onDownload,
  routingFiles,
  setRoutingFiles,
  deliveryFiles,
  setDeliveryFiles,
}) {
  const { t } = useLanguage();
  const isEmptyUploadedFile = routingFiles.length === 0 || deliveryFiles.length === 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setRoutingFiles([]);
        setDeliveryFiles([]);
      }}
      title={t('common.upload')}
      maxWidth="max-w-7xl w-[95%]"
      footer={
        <button
          onClick={onDownload}
          disabled={isEmptyUploadedFile || isLoading}
          className={`w-full sm:w-auto min-w-[150px] ml-auto px-4 py-2 rounded-md font-medium text-white ${
            isEmptyUploadedFile || isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-sky-600 hover:bg-sky-700'
          }`}
        >
          {isLoading ? t('common.loading') : t('common.download')}
        </button>
      }
    >
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative p-2">
          <FileUploader
            labelKey="routing"
            files={routingFiles}
            onUpdateFiles={setRoutingFiles}
            inputId="routing-file-input"
            tutorialKey="routing"
          />
          <div className="hidden md:block absolute top-0 bottom-0 left-1/2 border-l border-dashed border-slate-300 dark:border-slate-700 -translate-x-1/2" />
          <FileUploader
            labelKey="task"
            files={deliveryFiles}
            onUpdateFiles={setDeliveryFiles}
            inputId="delivery-file-input"
            tutorialKey="task"
          />
        </div>
      </div>
    </Modal>
  );
}
