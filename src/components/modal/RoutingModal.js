import BaseModal from '@/components/BaseModal';
import Button from '@/components/Button';

export default function RoutingModal({ isOpen, onClose, onPartial, onFull }) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Route Transaction" maxWidth="max-w-sm">
      <div className="p-4 flex flex-col gap-6">
        <p className="text-sm text-center text-slate-700 dark:text-slate-300">
          Pilih tipe laporan transaksi rute yang ingin diunduh:
        </p>
        <div className="flex flex-row justify-center gap-4">
          <Button text="Partial" onClick={onPartial} width="w-28" />
          <Button text="Full" onClick={onFull} width="w-28" />
        </div>
      </div>
    </BaseModal>
  );
}
