"use client";

import { useCallback, useState, useEffect } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useRegisterModal from "@/hooks/useRegisterModal";
import useLoginModal from "@/hooks/useLoginModal";
import Modal from "./Modal";
import Input from "../inputs/Input";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Cookies from "js-cookie";
import { Eye, EyeOff, AlertCircle, RefreshCw } from "lucide-react";

const LoginModal = () => {
  const router = useRouter();
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    setIsResending(true);
    try {
      const res = await api.post("/auth/resend-verification", { email: unverifiedEmail });
      toast.success(res.data?.message || "Verification link sent! Please check your email.");
      setResendCooldown(60);
    } catch (err: any) {
      const detail = err.response?.data?.detail || "Failed to resend verification email.";
      toast.error(detail);
    } finally {
      setIsResending(false);
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    // Reset unverified state on new submission
    setUnverifiedEmail(null);

    // Client-side validation
    if (!data.email?.trim()) {
      setError("email", { message: "Email is required" });
      return;
    }
    if (!data.password?.trim()) {
      setError("password", { message: "Password is required" });
      return;
    }

    setIsLoading(true);

    api.post("/auth/login", data)
      .then((response) => {
        setIsLoading(false);
        const token = response.data.access_token;
        Cookies.set("token", token, { expires: 7 }); // Store JWT for 7 days
        toast.success("Welcome back!");
        router.refresh();
        loginModal.onClose();
      })
      .catch((error) => {
        setIsLoading(false);
        const detail = error.response?.data?.detail;
        const status = error.response?.status;

        if (status === 403 || (detail && detail.toLowerCase().includes("not verified"))) {
          setUnverifiedEmail(data.email.trim());
          toast.error(detail || "Email is not verified.");
        } else if (detail === "Incorrect email or password") {
          toast.error("Incorrect email or password. Please try again.");
        } else if (error.response?.status === 422) {
          toast.error("Please enter a valid email address.");
        } else {
          toast.error(detail || "Something went wrong. Please try again.");
        }
      });
  };

  const toggle = useCallback(() => {
    setUnverifiedEmail(null);
    loginModal.onClose();
    registerModal.onOpen();
  }, [loginModal, registerModal]);

  const bodyContent = (
    <div className="flex flex-col gap-4">
      <div className="text-start">
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">Welcome back</div>
        <div className="font-light text-neutral-500 mt-2">Login to your account</div>
      </div>

      {/* Unverified account warning and resend option */}
      {unverifiedEmail && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
            <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
              <span className="font-semibold">Email Not Verified:</span> An activation link was sent to <strong>{unverifiedEmail}</strong>. Please check your inbox (and spam folder) or request a new link below.
            </div>
          </div>
          <button
            type="button"
            disabled={isResending || resendCooldown > 0}
            onClick={handleResendVerification}
            className="mt-1 self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60 transition"
          >
            {isResending ? (
              <>
                <RefreshCw className="animate-spin" size={14} />
                Resending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend link in ${resendCooldown}s`
            ) : (
              "Resend Verification Email"
            )}
          </button>
        </div>
      )}

      <Input
        id="email"
        label="Email"
        type="email"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      {/* Password field with visibility toggle */}
      <div className="relative">
        <Input
          id="password"
          label="Password"
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
          <span>First time using Tracal?</span>
          <button
            type="button"
            onClick={toggle}
            className="text-slate-800 dark:text-slate-200 cursor-pointer hover:underline font-bold"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={loginModal.isOpen}
      title="Login"
      actionLabel={isLoading ? "Logging in…" : "Continue"}
      onClose={loginModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
};

export default LoginModal;
