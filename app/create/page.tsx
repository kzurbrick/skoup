"use client";

import { useRouter } from "next/navigation";
import { type GenerateBookError } from "@/components/CreateForm";
import CreateWizard from "@/components/CreateWizard";
import type { Book } from "@/types/book";

const STORAGE_KEY = "bedtime-book:generated";
const ERROR_STORAGE_KEY = "bedtime-book:error";

export default function CreatePage() {
  const router = useRouter();

  const handleSuccess = (book: Book) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(book));
    router.push("/read");
  };

  const handleError = (err: GenerateBookError) => {
    sessionStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(err));
    router.push("/error");
  };

  return <CreateWizard onSuccess={handleSuccess} onError={handleError} />;
}
