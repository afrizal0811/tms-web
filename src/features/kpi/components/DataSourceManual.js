'use client';

import Accordion from '@/components/Accordion';
import Carousel from '@/components/Carousel';
import FileUploader from '@/components/FileUploader';
import BaseModal from '@/components/BaseModal';
import { useState } from 'react';
import { ROUTING_TUTORIAL_STEPS, TASK_TUTORIAL_STEPS } from '../constants/tutorialSteps';
import { validateRoutingFile, validateTaskFile } from '../excelValidator';

export default function DataSourceManual({
  routingFiles,
  setRoutingFiles,
  taskFiles,
  setTaskFiles,
  loading,
}) {
  const [openSection, setOpenSection] = useState(null);
  const [tutorialType, setTutorialType] = useState(null);

  const toggleSection = (section) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const hasAnyFiles = routingFiles.length > 0 || taskFiles.length > 0;

  const handleClearAllFiles = () => {
    setRoutingFiles([]);
    setTaskFiles([]);
  };

  return (
    <div className="flex flex-col gap-3">
      <BaseModal
        isOpen={!!tutorialType}
        onClose={() => setTutorialType(null)}
        title={`Tutorial Export Data ${tutorialType === 'routing' ? 'Routing' : 'Task'}`}
      >
        <Carousel
          items={tutorialType === 'routing' ? ROUTING_TUTORIAL_STEPS : TASK_TUTORIAL_STEPS}
        />
      </BaseModal>

      <div className="flex flex-col gap-3 mt-1">
        {hasAnyFiles && (
          <div className="flex justify-end -mb-1">
            <button
              type="button"
              onClick={handleClearAllFiles}
              disabled={loading}
              className="text-[11px] font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-md border border-red-200 transition-all flex items-center gap-1.5 outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Hapus Semua File
            </button>
          </div>
        )}

        <Accordion
          title="File Data Routing"
          isOpen={openSection === 'routing'}
          toggleOpen={() => toggleSection('routing')}
          hasFiles={routingFiles.length > 0}
          fileCount={routingFiles.length}
        >
          <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
            <FileUploader
              id="file-input-routing"
              files={routingFiles}
              onUpdateFiles={setRoutingFiles}
              validator={validateRoutingFile}
            />
          </div>
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTutorialType('routing');
              }}
              className="text-[11px] font-medium text-blue-500 hover:text-blue-700 flex items-center gap-1 hover:underline outline-none cursor-help"
            >
              Tutorial
            </button>
          </div>
        </Accordion>

        <Accordion
          title="File Data Task"
          isOpen={openSection === 'task'}
          toggleOpen={() => toggleSection('task')}
          hasFiles={taskFiles.length > 0}
          fileCount={taskFiles.length}
        >
          <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
            <FileUploader
              id="file-input-task"
              files={taskFiles}
              onUpdateFiles={setTaskFiles}
              validator={validateTaskFile}
            />
          </div>
          <div className="flex justify-end mt-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTutorialType('task');
              }}
              className="text-[11px] font-medium text-blue-500 hover:text-blue-700 flex items-center gap-1 hover:underline outline-none cursor-help"
            >
              Tutorial
            </button>
          </div>
        </Accordion>
      </div>
    </div>
  );
}
