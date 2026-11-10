import getListingById from "@/actions/getListingById";
import getCurrentUser from "@/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import HomestayClient from "./HomestayClient";

interface IParams {
  id?: string;
}

const HomestayPage = async ({ params }: { params: Promise<IParams> }) => {
  const resolvedParams = await params;
  const listing = await getListingById({ listingId: resolvedParams.id });
  const currentUser = await getCurrentUser();

  if (!listing) {
    return (
      <ClientOnly>
        <div className="h-[60vh] flex flex-col gap-2 justify-center items-center">
          <div className="text-2xl font-bold">Homestay Not Found</div>
          <p className="font-light text-neutral-500">The property you are looking for does not exist.</p>
        </div>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <HomestayClient listing={listing} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default HomestayPage;
