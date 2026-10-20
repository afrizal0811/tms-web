import { useLanguage } from '@/context/LanguageContext';
import Accordion from '../Accordion';
import Carousel from '../Carousel';
import UploadArea from './UploadArea';
import { tutorialData } from './helper/tutorialData';
import { validateRoutingFile, validateTaskFile } from './helper/validator';

export default function FileUploader({
  labelKey,
  title,
  files,
  onUpdateFiles,
  inputId,
  tutorialKey,
  validator: customValidator,
  multiple = true,
  accept = '.xlsx, .xls',
}) {
  const { t } = useLanguage();
  const defaultValidator = tutorialKey === 'routing' ? validateRoutingFile : validateTaskFile;
  const validator = customValidator || defaultValidator;

  const headerTitle =
    title || (labelKey ? `${t('common.upload')} ${t(`common.${labelKey}`)}` : t('common.upload'));

  return (
    <div className="flex flex-col gap-4">
      {headerTitle && (
        <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block border-b pb-1">
          {headerTitle}
        </span>
      )}
      <UploadArea
        files={files}
        onUpdateFiles={onUpdateFiles}
        validator={validator}
        id={inputId}
        multiple={multiple}
        accept={accept}
      />
      {tutorialKey && tutorialData(t)[tutorialKey] && (
        <Accordion title={`Tutorial ${t(`common.${labelKey}`)}`} className="mt-2">
          <Carousel items={tutorialData(t)[tutorialKey]} noLoop={true} />
        </Accordion>
      )}
    </div>
  );
}
