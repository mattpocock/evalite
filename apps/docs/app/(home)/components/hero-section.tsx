import Link from "next/link";
import { SiNpm, SiGithub } from "@icons-pack/react-simple-icons";
import { NpmInstallCopy } from "@/components/npm-install-copy";
import { buttonVariants } from "@/components/ui/button";
import { Browser } from "@/components/ui/browser";
import { cn } from "@/lib/cn";
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="flex flex-col lg:flex-row gap-6 lg:gap-4 py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-10 border-b border-border justify-center items-center">
      <div className="flex flex-col gap-6 w-full lg:w-[55%]">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center lg:text-left">
          The best way to evaluate AI-powered apps in TypeScript
        </h2>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border max-w-full sm:max-w-sm">
            <span className="font-mono text-xs sm:text-sm">npm i evalite</span>
            <div className="flex items-center gap-2 [&_svg]:size-4 sm:[&_svg]:size-5">
              <NpmInstallCopy />
              <div className="h-4 w-px bg-fd-foreground/30" />
              <Link href="https://www.npmjs.com/package/evalite">
                <SiNpm />
              </Link>
              <Link href="https://github.com/mattpocock/evalite">
                <SiGithub />
              </Link>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/docs" className="w-full sm:w-auto">
              <button
                className={cn(
                  buttonVariants({ color: "primary" }),
                  "rounded-none w-full sm:w-34"
                )}
              >
                Get Started
              </button>
            </Link>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 w-full lg:w-[45%]">
        <Browser>
          {/* Light mode image */}
          <Image
            src="/hero.png"
            alt="Evalite Screenshot"
            quality={100}
            width={500}
            height={350}
            style={{ width: "100%", height: "auto" }}
            className="dark:hidden"
          />
          {/* Dark mode image */}
          <Image
            src="/hero-dark.png"
            alt="Evalite Screenshot"
            quality={100}
            width={500}
            height={350}
            style={{ width: "100%", height: "auto" }}
            className="hidden dark:block"
          />
        </Browser>
      </div>
    </section>
  );
}
