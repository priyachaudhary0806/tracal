"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";

import Container from "@/components/Container";
import useEditModal from "@/hooks/useEditModal";
import api from "@/lib/api";
import Cookies from "js-cookie";

interface PropertiesClientProps {
  listings: any[];
  currentUser: any;
}

const PropertiesClient: React.FC<PropertiesClientProps> = ({
  listings,
  currentUser,
}) => {
  const router = useRouter();
  const editModal = useEditModal();
  const [deletingId, setDeletingId] = useState("");

  const onDelete = useCallback(
    (id: string) => {
      if (confirm("Are you sure you want to delete this listing?")) {
        setDeletingId(id);
        const token = Cookies.get("token");

        api
          .delete(`/homestays/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then(() => {
            toast.success("Listing deleted");
            router.refresh();
          })
          .catch((error) => {
            toast.error(error?.response?.data?.detail || "Something went wrong.");
          })
          .finally(() => {
            setDeletingId("");
          });
      }
    },
    [router]
  );

  return (
    <Container>
      <div className="pt-8 pb-16">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          My Properties
        </h1>
        <p className="font-light text-neutral-500 mt-2">
          Manage and edit your uploaded homestay listings.
        </p>

        {listings.length === 0 ? (
          <div className="h-[40vh] flex flex-col gap-2 justify-center items-center bg-slate-50 dark:bg-slate-900 rounded-xl mt-8">
            <div className="text-xl text-slate-800 dark:text-slate-200 font-bold">
              No properties found
            </div>
            <div className="font-light text-neutral-500">
              Looks like you haven't uploaded any homestays yet.
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {listings.map((listing) => {
              const imageSrc =
                (listing.images && listing.images[0]) ||
                "/images/placeholder.jpg";

              return (
                <div key={listing.id || listing._id} className="col-span-1 group">
                  <div className="flex flex-col gap-2 w-full">
                    <div 
                      onClick={() => router.push(`/homestays/${listing.id || listing._id}`)}
                      className="aspect-square w-full relative overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer"
                    >
                      <img
                        src={imageSrc}
                        alt="Listing"
                        className="object-cover h-full w-full group-hover:scale-110 transition shrink-0 bg-slate-200 dark:bg-slate-800"
                      />
                    </div>
                    <div className="font-bold text-lg text-slate-800 dark:text-slate-200 mt-2 truncate">
                      {listing.title}
                    </div>
                    <div className="font-light text-neutral-500 truncate">
                      {listing.address} • {listing.category}
                    </div>
                    <div className="flex flex-row items-center gap-1 font-semibold text-[var(--secondary)]">
                      ₹ {listing.price} <span className="font-light text-slate-500 dark:text-slate-400 text-sm">/ night</span>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      <button
                        onClick={() => router.push(`/host`)}
                        className="w-full py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 text-[var(--secondary)] dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-lg transition font-bold text-xs cursor-pointer text-center flex items-center justify-center gap-1.5"
                      >
                        ✨ AI Host Insights
                      </button>
                      <div className="flex flex-row items-center gap-2">
                        <button
                          onClick={() => editModal.onOpen(listing)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition font-semibold text-xs cursor-pointer text-center"
                        >
                          Edit
                        </button>
                        <button
                          disabled={deletingId === (listing.id || listing._id)}
                          onClick={() => onDelete(listing.id || listing._id)}
                          className="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition font-semibold text-xs cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
};

export default PropertiesClient;
