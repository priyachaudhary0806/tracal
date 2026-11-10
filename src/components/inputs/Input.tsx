"use client";

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";

interface InputProps {
  id: string;
  label: string;
  type?: string;
  disabled?: boolean;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
}

const Input: React.FC<InputProps> = ({
  id,
  label,
  type = "text",
  disabled,
  required,
  register,
  errors,
}) => {
  const isNumber = type === "number";

  return (
    <div className="w-full relative">
      {/* For number inputs the label is always shown above the field (static),
          because browsers strip placeholder=" " from number inputs, breaking
          the floating-label CSS trick. */}
      {isNumber ? (
        <>
          <label
            htmlFor={id}
            className={`block text-sm font-semibold mb-1.5
              ${errors[id] ? "text-rose-500" : "text-slate-600 dark:text-slate-400"}
            `}
          >
            {label}
            {required && <span className="text-rose-400 ml-0.5">*</span>}
          </label>
          <input
            id={id}
            disabled={disabled}
            {...register(id, { required, valueAsNumber: true })}
            type="number"
            min={0}
            className={`w-full p-3 font-light bg-white dark:bg-slate-900 border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed dark:text-white
              ${errors[id]
                ? "border-rose-500 focus:border-rose-500"
                : "border-slate-300 dark:border-slate-700 focus:border-slate-800 dark:focus:border-slate-300"
              }
            `}
          />
          {errors[id] && (
            <p className="text-rose-500 text-xs mt-1">
              {String(errors[id]?.message || `${label} is required`)}
            </p>
          )}
        </>
      ) : (
        /* Text / email / password / tel — floating label pattern */
        <>
          <input
            id={id}
            disabled={disabled}
            {...register(id, { required })}
            placeholder=" "
            type={type}
            className={`peer w-full p-4 pt-6 font-light bg-white dark:bg-slate-900 border-2 rounded-md outline-none transition disabled:opacity-70 disabled:cursor-not-allowed dark:text-white
              ${errors[id]
                ? "border-rose-500 focus:border-rose-500"
                : "border-slate-300 dark:border-slate-700 focus:border-slate-800 dark:focus:border-slate-300"
              }
            `}
          />
          <label
            htmlFor={id}
            className={`absolute text-md duration-150 transform -translate-y-3 top-5 z-10 origin-[0] left-4
              peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0
              peer-focus:scale-75 peer-focus:-translate-y-4
              ${errors[id] ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}
            `}
          >
            {label}
          </label>
          {errors[id] && (
            <p className="text-rose-500 text-xs mt-1 pl-1">
              {String(errors[id]?.message || `${label} is required`)}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default Input;
