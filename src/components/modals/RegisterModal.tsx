"use client";

import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useRegisterModal from "@/hooks/useRegisterModal";
import useLoginModal from "@/hooks/useLoginModal";
import Modal from "./Modal";
import Input from "../inputs/Input";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FieldValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    // Client-side validation
    if (!data.name?.trim()) {
      setError("name", { message: "Name is required" });
      return;
    }
    if (!data.email?.trim()) {
      setError("email", { message: "Email is required" });
      return;
    }
    if (!data.password || data.password.length < 6) {
      setError("password", { message: "Password must be at least 6 characters" });
      return;
    }

    setIsLoading(true);

    api.post("/auth/signup", {
      name: data.name.trim(),
      email: data.email.trim().toLowerCase(),
      password: data.password,
    })
      .then(() => {
        toast.success("Account created! A verification link has been sent to your email. Please verify before logging in.", { duration: 6000 });
        registerModal.onClose();
        loginModal.onOpen();
      })
      .catch((error) => {
        setIsLoading(false);
        const detail = error.response?.data?.detail;
        if (detail === "Email already registered") {
          setError("email", { message: "This email is already registered" });
          toast.error("This email is already registered.");
        } else if (error.response?.status === 422) {
          toast.error("Please check your inputs and try again.");
        } else {
          toast.error(detail || "Something went wrong. Please try again.");
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const toggle = useCallback(() => {
    registerModal.onClose();
    loginModal.onOpen();
  }, [loginModal, registerModal]);

  const bodyContent = (
    <div className="flex flex-col gap-4">
      <div className="text-start">
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">Welcome to Tracal</div>
        <div className="font-light text-neutral-500 mt-2">Create your free account</div>
      </div>
      <Input
        id="name"
        label="Full Name"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="email"
        label="Email Address"
        type="email"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      {/* Password with toggle */}
      <div className="relative">
        <Input
          id="password"
          label="Password (min. 6 characters)"
          type={showPassword ? "text" : "password"}
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-4 mt-3">
      <hr className="border-slate-200 dark:border-slate-800" />
      <div className="text-neutral-500 text-center mt-2 font-light">
        <div className="flex justify-center items-center gap-2">
          <span>Already have an account?</span>
          <button
            type="button"
            onClick={toggle}
            className="text-slate-800 dark:text-slate-200 cursor-pointer hover:underline font-bold"
          >
            Log in
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={registerModal.isOpen}
      title="Register"
      actionLabel={isLoading ? "Creating account…" : "Create Account"}
      onClose={registerModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
};

export default RegisterModal;
