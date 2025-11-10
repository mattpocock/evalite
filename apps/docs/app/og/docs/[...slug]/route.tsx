import { redirect } from "next/navigation";

export const revalidate = false;

export async function GET() {
  redirect("/og-image.jpg");
}
