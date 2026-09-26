import Image from "next/image";
import { RegistrationForm } from "@/components/registration-form";
import { DEFAULT_PACKAGE, isPackageCode } from "@/lib/catalog";

// ?paket=<kode> dipakai kartu harga di landing page untuk menautkan langsung ke
// paket tertentu. Kode yang tidak dikenal jatuh ke paket default.
export default async function Page({ searchParams }: { searchParams: Promise<{ paket?: string }> }) {
  const { paket } = await searchParams;
  const packageCode = paket && isPackageCode(paket) ? paket : DEFAULT_PACKAGE;

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-background p-4 py-10 sm:py-14">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image
            src="/aerologic-text.webp"
            alt="AeroLogic"
            width={140}
            height={37}
            className="mb-3 h-[28px] w-auto object-contain"
            priority
          />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Market intelligence untuk keputusan trading yang lebih baik.
          </p>
        </div>

        <RegistrationForm packageCode={packageCode} />
      </div>
    </div>
  );
}
