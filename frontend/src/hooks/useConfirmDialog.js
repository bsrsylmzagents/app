import { useState, useRef } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const useConfirmDialog = () => {
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState(null);
  const resolveRef = useRef(null);

  const confirm = (config) => {
    return new Promise((resolve) => {
      setConfig(config);
      setOpen(true);
      resolveRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    if (resolveRef.current) {
      resolveRef.current(true);
    }
    setOpen(false);
    setConfig(null);
    resolveRef.current = null;
  };

  const handleCancel = () => {
    if (resolveRef.current) {
      resolveRef.current(false);
    }
    setOpen(false);
    setConfig(null);
    resolveRef.current = null;
  };

  const dialog = config ? (
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      {...config}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return {
    confirm,
    dialog
  };
};

export default useConfirmDialog;
export { useConfirmDialog };
