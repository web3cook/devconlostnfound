import type { Metadata } from "next";
import { ItemForm } from "@/components/item-form";

export const metadata: Metadata = { title: "Log found item" };

export default function NewItemPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">Info Desk</p>
      <h1 className="mt-1 text-3xl font-extrabold">Log a found item</h1>
      <p className="mt-2 text-sm text-muted">
        After saving, write the reference number (e.g. F-0042) on a tag and attach it to the item.
      </p>
      <div className="mt-6">
        <ItemForm />
      </div>
    </div>
  );
}
