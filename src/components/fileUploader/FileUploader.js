import { useLanguage } from '@/context/LanguageContext';
import Accordion from '../Accordion';
import Carousel from '../Carousel';
import UploadArea from './UploadArea';
import { tutorialData } from './helper/tutorialData';
import { validateRoutingFile, validateTaskFile } from './helper/validator';

export default function FileUploader({ labelKey, files, onUpdateFiles, inputId, tutorialKey = 'routing' }) {
  const { t } = useLanguage();
  const validator = tutorialKey === 'routing' ? validateRoutingFile : validateTaskFile;
  return (
    <div className="flex flex-col gap-4">
      <span className="font-bold text-sm text-slate-800 dark:text-slate-200 block border-b pb-1">
        {t('common.upload')} {` `} {t(`common.${labelKey}`)}
      </span>
      <UploadArea files={files} onUpdateFiles={onUpdateFiles} validator={validator} id={inputId} />
      {tutorialData(t)[tutorialKey] && (
        <Accordion title={`Tutorial ${t(`common.${labelKey}`)}`} className="mt-2">
          <Carousel items={tutorialData(t)[tutorialKey]} />
        </Accordion>
      )}
    </div>
  );
}
