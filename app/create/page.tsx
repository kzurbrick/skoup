"use client";

import { useRouter } from "next/navigation";
import CreateForm from "@/components/CreateForm";

const STORAGE_KEY = "bedtime-book:generated";

export default function CreatePage() {
  const router = useRouter();

  const handleSuccess = (book: { title: string; pages: { text: string }[] }) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(book));
    router.push("/read");
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-12 font-sans dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        <CreateForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
