import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout.shared";
import { BookOpen } from "lucide-react";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <HomeLayout
      {...baseOptions()}
      links={[
        {
          label: "Docs",
          icon: <BookOpen />,
          text: "Docs",
          url: "/docs",
        },
      ]}
    >
      {children}
    </HomeLayout>
  );
}
