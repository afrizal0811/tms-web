'use client';
import { useLanguage } from '@/context/LanguageContext';
import { toastError } from '@/lib/toast';

export default function UploadArea({
  files = [],
  onUpdateFiles,
  accept = '.xlsx, .xls',
  multiple = true,
  validator,
  id = 'file-input',
}) {
  const { t } = useLanguage();

  const handleFileChange = async (e) => {
    const truncateFileName = (fileName) => {
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

      return nameWithoutExt.length > 15 ? `${nameWithoutExt.slice(0, 15)}...` : nameWithoutExt;
    };

    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    let validFiles = [];
    for (const f of selectedFiles) {
      if (validator) {
        const isContentValid = await validator(f);

        if (!isContentValid) {
          toastError(
            t('report.toast.invalid_file', {
              fileName: truncateFileName(f.name),
            })
          );
          continue;
        }
      }

      validFiles.push(f);
    }

    if (validFiles.length > 0) {
      const existingNames = new Set(files.map((f) => f.name));
      let hasDuplicate = false;

      const uniqueNewFiles = validFiles.filter((f) => {
        if (existingNames.has(f.name)) {
          hasDuplicate = true;
          return false;
        }
        existingNames.add(f.name);
        return true;
      });

      if (hasDuplicate) {
        toastError('Tidak bisa upload file yang sama');
      }

      if (uniqueNewFiles.length > 0) {
        onUpdateFiles([...files, ...uniqueNewFiles]);
      }
    }
    e.target.value = null;
  };

  const removeFile = (indexToRemove) => {
    onUpdateFiles(files.filter((_, index) => index !== indexToRemove));
  };

  const removeAllFiles = () => {
    onUpdateFiles([]);
  };

  return (
    <>
      {files.length === 0 ? (
        <div className="border-2 border-dashed border-sky-300 dark:border-sky-800 rounded-xl bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-950/50 transition-colors">
          <label
            htmlFor={id}
            className="cursor-pointer w-full flex flex-col items-center justify-center py-8 px-6 text-center gap-2 outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 text-sky-600 dark:text-sky-500"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>
            <p className="font-semibold text-slate-900 dark:text-slate-100 flex flex-wrap justify-center gap-x-1">
              <span className="text-sky-700 dark:text-sky-400">
                {t('report.manual.upload_title')}
              </span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              {t('report.manual.upload_subtitle')}
            </p>
          </label>
          <input
            id={id}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              File terpilih ({files.length})
            </span>
            <button
              type="button"
              onClick={removeAllFiles}
              className="text-xs font-semibold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 cursor-pointer"
            >
              Hapus Semua
            </button>
          </div>

          <div className="border-2 border-dashed border-sky-300 dark:border-sky-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 max-h-[212px] overflow-y-auto">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              <label
                htmlFor={id}
                className="aspect-square flex flex-col items-center justify-center border border-dashed border-sky-400 bg-sky-50/50 dark:bg-sky-950/20 hover:bg-sky-100 dark:hover:bg-sky-950/40 rounded-lg cursor-pointer transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-sky-600 dark:text-sky-400"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                <span className="text-[11px] font-medium text-sky-700 dark:text-sky-400 mt-1">
                  {t('common.button.btn_add')}
                </span>
              </label>

              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square flex flex-col items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2 shadow-sm text-center animate-in fade-in zoom-in-95 duration-150"
                >
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/80 dark:text-red-300 rounded-full p-1 shadow transition-colors cursor-pointer z-10"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-8 h-8 text-emerald-600 dark:text-emerald-500 mb-1 shrink-0"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>

                  <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 line-clamp-2 break-all px-1 leading-tight">
                    {file.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <input
            id={id}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileChange}
            className="sr-only"
          />
        </div>
      )}
    </>
  );
}
