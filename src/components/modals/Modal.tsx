"use client";

import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  body?: React.ReactElement;
  footer?: React.ReactElement;
  actionLabel: string;
  disabled?: boolean;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  body,
  footer,
  actionLabel,
  disabled,
  secondaryAction,
  secondaryActionLabel,
}) => {
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (disabled) return;
    setShowModal(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [disabled, onClose]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    onSubmit();
  }, [disabled, onSubmit]);

  const handleSecondaryAction = useCallback(() => {
    if (disabled || !secondaryAction) return;
    secondaryAction();
  }, [disabled, secondaryAction]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none bg-neutral-800/70 backdrop-blur-sm">
      <div className="relative w-full md:w-4/6 lg:w-3/6 xl:w-2/5 my-6 mx-auto h-full lg:h-auto md:h-auto">
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
              className="h-full bg-white dark:bg-slate-900 border-x border-t border-slate-200 dark:border-slate-800 md:h-auto lg:h-auto md:rounded-2xl shadow-lg relative flex flex-col w-full outline-none focus:outline-none"
            >
              {/* HEADER */}
              <div className="flex items-center p-6 rounded-t justify-center relative border-b border-slate-200 dark:border-slate-800">
                <button
                  onClick={handleClose}
                  className="p-1 border-0 hover:opacity-70 transition absolute left-9 text-slate-800 dark:text-slate-200"
                >
                  <X size={18} />
                </button>
                <div className="text-lg font-bold text-slate-800 dark:text-slate-200">{title}</div>
              </div>

              {/* BODY */}
              <div className="relative p-6 flex-auto">{body}</div>

              {/* FOOTER */}
              <div className="flex flex-col gap-2 p-6">
                <div className="flex flex-row items-center gap-4 w-full">
                  {secondaryAction && secondaryActionLabel && (
                    <button
                      onClick={handleSecondaryAction}
                      disabled={disabled}
                      className="w-full text-center py-3 bg-white dark:bg-slate-900 border border-slate-800 dark:border-slate-200 text-slate-800 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition"
                    >
                      {secondaryActionLabel}
                    </button>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={disabled}
                    className="w-full text-center py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {actionLabel}
                  </button>
                </div>
                {footer}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Modal;
