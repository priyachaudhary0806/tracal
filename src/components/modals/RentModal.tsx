"use client";

import { useState, useMemo } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useRentModal from "@/hooks/useRentModal";
import Modal from "./Modal";
import Input from "../inputs/Input";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { categories } from "../navbar/Categories";
import api from "@/lib/api";
import Cookies from "js-cookie";

enum STEPS {
  CATEGORY    = 0,
  LOCATION    = 1,
  INFO        = 2,
  IMAGES      = 3,
  DESCRIPTION = 4,
  PRICE       = 5,
}

const STEP_LABELS = ["Category", "Location", "Details", "Photos", "Description", "Price"];

const RentModal = () => {
  const router = useRouter();
  const rentModal = useRentModal();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(STEPS.CATEGORY);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FieldValues>({
    defaultValues: {
      category:       "",
      guestCount:     1,
      roomCount:      1,
      bathroomCount:  1,
      imageSrc:       "",
      price:          1,
      title:          "",
      description:    "",
      address:        "",   // single address field — matches backend HomestayModel.address
      phoneNumber:    "",
      whatsappNumber: "",
    },
  });

  const category      = watch("category");
  const currentImages = watch("imageSrc");

  const setCustomValue = (id: string, value: any) => {
    setValue(id, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  };

  const onBack = () => setStep((v) => v - 1);
  const onNext = () => setStep((v) => v + 1);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    try {
      const files = e.target.files;
      if (!files) return;
      const urls: string[] = [];
      const token = Cookies.get("token");
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        const res = await api.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        });
        urls.push(res.data.url);
      }
      const existing = currentImages ? currentImages.split(",") : [];
      setCustomValue("imageSrc", [...existing, ...urls].join(","));
      toast.success("Images uploaded successfully!");
    } catch {
      toast.error("Failed to upload images");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (step !== STEPS.PRICE) {
      return onNext();
    }

    // Validate price
    const priceVal = Number(data.price);
    if (!priceVal || priceVal <= 0) {
      toast.error("Please enter a valid price greater than ₹0");
      return;
    }

    // Validate address
    if (!data.address?.trim()) {
      toast.error("Please go back and enter your property address");
      return;
    }

    setIsLoading(true);
    const token = Cookies.get("token");
    if (!token) {
      toast.error("You must be logged in.");
      setIsLoading(false);
      return;
    }

    try {
      const meRes = await api.get(`/auth/me?token=${token}`);
      const user = meRes.data;

      const imageArray = typeof data.imageSrc === "string"
        ? data.imageSrc.split(",").map((u: string) => u.trim()).filter(Boolean)
        : [];

      const payload = {
        title:         data.title,
        description:   data.description,
        price:         priceVal,              // number, explicitly coerced
        category:      data.category,
        address:       data.address.trim(),   // single address field
        images:        imageArray,
        owner_name:    user.name,
        phone:         data.phoneNumber  || "000-000-0000",
        whatsapp:      data.whatsappNumber || data.phoneNumber || "000-000-0000",
        guestCount:    Number(data.guestCount),
        roomCount:     Number(data.roomCount),
        bathroomCount: Number(data.bathroomCount),
        email:         user.email,
        userId:        user.id,
      };

      await api.post("/homestays", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Listing created!");
      router.refresh();
      reset();
      setStep(STEPS.CATEGORY);
      rentModal.onClose();
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      toast.error(detail || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const actionLabel = useMemo(
    () => (step === STEPS.PRICE ? "Create Listing" : "Next"),
    [step],
  );
  const secondaryActionLabel = useMemo(
    () => (step === STEPS.CATEGORY ? undefined : "Back"),
    [step],
  );

  // Step progress bar
  const progressBar = (
    <div className="flex items-center gap-1 mb-2">
      {STEP_LABELS.map((label, idx) => (
        <div key={label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`h-1.5 w-full rounded-full transition-all ${
              idx <= step ? "bg-[var(--primary)]" : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
          <span
            className={`text-[9px] font-semibold uppercase tracking-wide hidden sm:block ${
              idx === step ? "text-[var(--primary)]" : "text-slate-400"
            }`}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );

  // ── Step 0: Category ──
  let bodyContent = (
    <div className="flex flex-col gap-6">
      {progressBar}
      <div>
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
          Which of these best describes your place?
        </div>
        <div className="font-light text-neutral-500 mt-1">Pick a category</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto pr-1">
        {categories.map((item) => (
          <div
            key={item.label}
            onClick={() => setCustomValue("category", item.label)}
            className={`rounded-xl border-2 p-4 flex flex-col gap-3 hover:border-[var(--primary)] dark:hover:border-[var(--primary)] transition cursor-pointer
              ${category === item.label
                ? "border-[var(--primary)] bg-orange-50 dark:bg-slate-800"
                : "border-neutral-200 dark:border-slate-800"}
            `}
          >
            <item.icon size={28} className={category === item.label ? "text-[var(--primary)]" : ""} />
            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Step 1: Location — single address field only ──
  if (step === STEPS.LOCATION) {
    bodyContent = (
      <div className="flex flex-col gap-6">
        {progressBar}
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Where is your place located?
          </div>
          <div className="font-light text-neutral-500 mt-1">
            Enter the full address — area, city, state, and country.
          </div>
        </div>
        <Input
          id="address"
          label="Full Address (e.g. Candolim, Goa, India)"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <p className="text-xs text-neutral-400">
          Include landmarks or the nearest town for better search visibility.
        </p>
      </div>
    );
  }

  // ── Step 2: Info ──
  if (step === STEPS.INFO) {
    bodyContent = (
      <div className="flex flex-col gap-6">
        {progressBar}
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Share some basics about your place
          </div>
          <div className="font-light text-neutral-500 mt-1">Capacity and contact details</div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Input id="guestCount"    label="Guests"    type="number" disabled={isLoading} register={register} errors={errors} required />
          <Input id="roomCount"     label="Rooms"     type="number" disabled={isLoading} register={register} errors={errors} required />
          <Input id="bathroomCount" label="Bathrooms" type="number" disabled={isLoading} register={register} errors={errors} required />
        </div>
        <hr className="border-slate-200 dark:border-slate-700" />
        <Input id="phoneNumber"    label="Host Phone Number" disabled={isLoading} register={register} errors={errors} required />
        <Input id="whatsappNumber" label="WhatsApp Number"   disabled={isLoading} register={register} errors={errors} />
      </div>
    );
  }

  // ── Step 3: Images ──
  if (step === STEPS.IMAGES) {
    bodyContent = (
      <div className="flex flex-col gap-6">
        {progressBar}
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Add photos of your place
          </div>
          <div className="font-light text-neutral-500 mt-1">
            Good photos make a big difference. Upload at least 3.
          </div>
        </div>
        <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 p-8 flex flex-col items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer">
          <span className="text-slate-500 text-sm mb-1">Click to select images</span>
          <span className="text-xs text-neutral-400">JPG, PNG, WEBP</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            disabled={isLoading}
            className="hidden"
          />
        </label>
        {currentImages && (
          <div className="flex flex-wrap gap-2 max-h-[180px] overflow-y-auto">
            {currentImages.split(",").filter(Boolean).map((img) => (
              <div key={img} className="relative group">
                <img src={img} alt="preview" className="w-20 h-20 object-cover rounded-lg shadow" />
                <button
                  type="button"
                  onClick={() => {
                    const remaining = currentImages.split(",").filter((i) => i !== img).join(",");
                    setCustomValue("imageSrc", remaining);
                  }}
                  className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Step 4: Description ──
  if (step === STEPS.DESCRIPTION) {
    bodyContent = (
      <div className="flex flex-col gap-6">
        {progressBar}
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Describe your place
          </div>
          <div className="font-light text-neutral-500 mt-1">
            A clear title and description help guests decide.
          </div>
        </div>
        <Input id="title"       label="Property Title" disabled={isLoading} register={register} errors={errors} required />
        <Input id="description" label="Description"    disabled={isLoading} register={register} errors={errors} required />
      </div>
    );
  }

  // ── Step 5: Price — fully separated, clearly labelled ──
  if (step === STEPS.PRICE) {
    bodyContent = (
      <div className="flex flex-col gap-6">
        {progressBar}
        <div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Set your nightly price
          </div>
          <div className="font-light text-neutral-500 mt-1">
            Enter the amount in Indian Rupees (₹). You can change it anytime.
          </div>
        </div>

        {/* Price input with ₹ prefix — fully separated from address */}
        <div className="flex flex-col gap-2">
          <label htmlFor="price" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Price per night (₹) <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-semibold text-lg pointer-events-none select-none">
              ₹
            </span>
            <input
              id="price"
              type="number"
              min={1}
              step={1}
              disabled={isLoading}
              {...register("price", {
                required: "Price is required",
                valueAsNumber: true,
                min: { value: 1, message: "Price must be at least ₹1" },
              })}
              className={`w-full pl-8 pr-4 py-3 border-2 rounded-lg outline-none transition bg-white dark:bg-slate-900 dark:text-white font-semibold text-lg
                ${errors.price
                  ? "border-rose-500 focus:border-rose-500"
                  : "border-slate-300 dark:border-slate-700 focus:border-[var(--primary)] dark:focus:border-[var(--primary)]"
                }
              `}
              placeholder="e.g. 2500"
            />
          </div>
          {errors.price && (
            <p className="text-rose-500 text-xs">{String(errors.price.message)}</p>
          )}
        </div>

        {/* Summary box — shows what was entered in previous steps */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-sm flex flex-col gap-1.5">
          <p className="font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Listing Summary</p>
          <p className="text-slate-600 dark:text-slate-400">
            <span className="font-medium">Category:</span> {watch("category") || <span className="italic text-neutral-400">not set</span>}
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            <span className="font-medium">Address:</span> {watch("address") || <span className="italic text-neutral-400">not set</span>}
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            <span className="font-medium">Title:</span> {watch("title") || <span className="italic text-neutral-400">not set</span>}
          </p>
        </div>

        <p className="text-xs text-neutral-400">
          Guests will see this price on the listing card and detail page.
        </p>
      </div>
    );
  }

  return (
    <Modal
      disabled={isLoading}
      isOpen={rentModal.isOpen}
      title="List your home"
      actionLabel={actionLabel}
      onSubmit={handleSubmit(onSubmit)}
      secondaryActionLabel={secondaryActionLabel}
      secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
      onClose={rentModal.onClose}
      body={bodyContent}
    />
  );
};

export default RentModal;
