"use client";

import { useState, useMemo, useEffect } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useEditModal from "@/hooks/useEditModal";
import Modal from "./Modal";
import Input from "../inputs/Input";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { categories } from "../navbar/Categories";
import api from "@/lib/api";
import Cookies from "js-cookie";

enum STEPS {
  CATEGORY = 0,
  LOCATION = 1,
  INFO = 2,
  IMAGES = 3,
  DESCRIPTION = 4,
  PRICE = 5,
}

const EditModal = () => {
  const router = useRouter();
  const editModal = useEditModal();
  const listing = editModal.listing;
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
      category: "",
      locationValue: "",
      guestCount: 1,
      roomCount: 1,
      bathroomCount: 1,
      imageSrc: "",
      price: 1,
      title: "",
      description: "",
      address: "",
      phoneNumber: "",
      whatsappNumber: "",
    },
  });

  useEffect(() => {
    if (listing) {
      reset({
        category:       listing.category || "",
        guestCount:     listing.guestCount || 1,
        roomCount:      listing.roomCount || 1,
        bathroomCount:  listing.bathroomCount || 1,
        imageSrc:       (listing.images || []).join(","),
        price:          listing.price || 1,
        title:          listing.title || "",
        description:    listing.description || "",
        address:        listing.address || "",   // single field
        phoneNumber:    listing.phone || "",
        whatsappNumber: listing.whatsapp || "",
      });
      setStep(STEPS.CATEGORY);
    }
  }, [listing, reset]);

  const category = watch("category");
  const currentImages = watch("imageSrc");

  const setCustomValue = (id: string, value: any) => {
    setValue(id, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const onBack = () => {
    setStep((value) => value - 1);
  };

  const onNext = () => {
    setStep((value) => value + 1);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    try {
      const files = e.target.files;
      if (!files) return;
      const urls: string[] = [];
      
      const token = Cookies.get('token');
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        const res = await api.post("/upload", formData, {
          headers: { 
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`
          }
        });
        urls.push(res.data.url);
      }
      
      const existing = currentImages ? currentImages.split(",") : [];
      setCustomValue("imageSrc", [...existing, ...urls].join(","));
      toast.success("Images uploaded successfully!");
    } catch (e) {
      toast.error("Failed to upload images");
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (step !== STEPS.PRICE) {
      return onNext();
    }

    setIsLoading(true);

    const imageArray = typeof data.imageSrc === "string" 
      ? data.imageSrc.split(",").map((url: string) => url.trim()).filter((url: string) => url !== "")
      : [];

    const token = Cookies.get('token');
    if (!token) {
       toast.error("You must be logged in.");
       setIsLoading(false);
       return;
    }
    
    try {
        const payload = {
            title: data.title,
            description: data.description,
            price: Number(data.price),
            category: data.category,
            address: data.address.trim(),   // single address field
            images: imageArray,
            owner_name: listing.owner_name || "Tracal Host",
            phone: data.phoneNumber || "000-000-0000",
            whatsapp: data.whatsappNumber || data.phoneNumber || "000-000-0000",
            guestCount: Number(data.guestCount),
            roomCount: Number(data.roomCount),
            bathroomCount: Number(data.bathroomCount),
            email: listing.email || "host@tracal.com",
            userId: listing.userId
        };

        await api.put(`/homestays/${listing.id || listing._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });

        toast.success("Listing updated!");
        router.refresh();
        editModal.onClose();
    } catch (error) {
        toast.error("Something went wrong.");
    } finally {
        setIsLoading(false);
    }
  };

  const actionLabel = useMemo(() => {
    if (step === STEPS.PRICE) {
      return "Save Changes";
    }
    return "Next";
  }, [step]);

  const secondaryActionLabel = useMemo(() => {
    if (step === STEPS.CATEGORY) {
      return undefined;
    }
    return "Back";
  }, [step]);

  let bodyContent = (
    <div className="flex flex-col gap-8">
      <div className="text-start">
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">Which of these best describes your place?</div>
        <div className="font-light text-neutral-500 mt-2">Pick a category</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto">
        {categories.map((item) => (
          <div
            key={item.label}
            onClick={() => setCustomValue("category", item.label)}
            className={`rounded-xl border-2 p-4 flex flex-col gap-3 hover:border-[var(--primary)] dark:hover:border-[var(--primary)] transition cursor-pointer
              ${category === item.label ? "border-[var(--primary)] bg-orange-50 dark:bg-slate-800" : "border-neutral-200 dark:border-slate-800"}
            `}
          >
            <item.icon size={30} className={category === item.label ? "text-[var(--primary)]" : ""} />
            <div className="font-semibold text-slate-800 dark:text-slate-200">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (step === STEPS.LOCATION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <div className="text-start">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">Where is your place located?</div>
          <div className="font-light text-neutral-500 mt-2">Update the full address — area, city, state, and country.</div>
        </div>
        <Input id="address" label="Full Address (e.g. Candolim, Goa, India)" disabled={isLoading} register={register} errors={errors} required />
      </div>
    );
  }

  if (step === STEPS.INFO) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <div className="text-start">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">Share some basics about your place</div>
          <div className="font-light text-neutral-500 mt-2">What amenities do you have?</div>
        </div>
        <Input id="guestCount" label="Number of guests" type="number" disabled={isLoading} register={register} errors={errors} required />
        <Input id="roomCount" label="Number of rooms" type="number" disabled={isLoading} register={register} errors={errors} required />
        <Input id="bathroomCount" label="Number of bathrooms" type="number" disabled={isLoading} register={register} errors={errors} required />
        <hr />
        <Input id="phoneNumber" label="Host Phone Number" disabled={isLoading} register={register} errors={errors} required />
        <Input id="whatsappNumber" label="WhatsApp Number" disabled={isLoading} register={register} errors={errors} required />
      </div>
    );
  }

  if (step === STEPS.IMAGES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <div className="text-start">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">Add photos of your place</div>
          <div className="font-light text-neutral-500 mt-2">Upload images to show your place to guests.</div>
        </div>
        <div className="border border-dashed border-slate-300 dark:border-slate-700 p-8 flex flex-col items-center justify-center rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition">
           <input type="file" multiple accept="image/*" onChange={handleImageUpload} disabled={isLoading} className="cursor-pointer" />
        </div>
        {currentImages && (
           <div className="flex flex-wrap gap-2 mt-4 max-h-[200px] overflow-y-auto">
               {currentImages.split(",").map((img: string) => (
                  <div key={img} className="relative group">
                    <img src={img} alt="uploaded preview" className="w-20 h-20 object-cover rounded shadow" />
                    <button 
                      type="button" 
                      onClick={() => {
                        const remaining = currentImages.split(",").filter((i: string) => i !== img).join(",");
                        setCustomValue("imageSrc", remaining);
                      }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow"
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

  if (step === STEPS.DESCRIPTION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <div className="text-start">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">How would you describe your place?</div>
          <div className="font-light text-neutral-500 mt-2">Short and sweet works best!</div>
        </div>
        <Input id="title" label="Title" disabled={isLoading} register={register} errors={errors} required />
        <Input id="description" label="Description" disabled={isLoading} register={register} errors={errors} required />
      </div>
    );
  }

  if (step === STEPS.PRICE) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <div className="text-start">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">Update your nightly price</div>
          <div className="font-light text-neutral-500 mt-2">Enter the amount in Indian Rupees (₹).</div>
        </div>
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
            <p className="text-rose-500 text-xs">{String(errors.price?.message)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Modal
      disabled={isLoading}
      isOpen={editModal.isOpen}
      title="Edit Listing"
      actionLabel={actionLabel}
      onSubmit={handleSubmit(onSubmit)}
      secondaryActionLabel={secondaryActionLabel}
      secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
      onClose={editModal.onClose}
      body={bodyContent}
    />
  );
};

export default EditModal;
