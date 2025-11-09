"use client";

import { motion, useAnimationFrame, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface Testimonial {
  id: number;
  name: string;
  content: string;
  avatar?: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Pontus Abrahamsson",
    avatar:
      "https://pbs.twimg.com/profile_images/1755611130368770048/JwLEqyeo_400x400.jpg",
    content:
      "If you're building an AI assistant, test with Evalite: - Write evals - Run a local server on localhost - Capture traces and more.",
  },
  {
    id: 2,
    name: "Alex Rivera",
    avatar:
      "https://pbs.twimg.com/profile_images/1330495170287169537/fX2ugXxX_400x400.jpg",
    content:
      "Evalite is great for writing lightweight evals, especially for generateObject / generateText calls.",
  },
  {
    id: 3,
    name: "sockthedev",
    avatar:
      "https://pbs.twimg.com/profile_images/1569584517161324544/po3hKnjN_400x400.jpg",
    content:
      "evalite is incredible for helping to iterate and improve your prompts for ai workflows. i was able to make insane gains on the security and dependability of my prompts for something really critical to the business. so nice to gain confidence. fantastic stuff @mattpocockuk",
  },
  {
    id: 4,
    name: "Alexander Hirdman",
    avatar:
      "https://pbs.twimg.com/profile_images/1951566988934893568/GOtdBhrb_400x400.jpg",
    content:
      "Finally got to implement some evals with @mattpocockuk evalite. So good, now I don’t know how I managed without it. Simple but powerful.",
  },
];

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="shrink-0 w-[280px] sm:w-[320px] md:w-[400px] mx-2 sm:mx-4">
      <div className="border border-border bg-fd-background p-4 sm:p-6 h-full">
        <div className="flex flex-col justify-between gap-4 h-full">
          <p className="text-fd-muted-foreground leading-relaxed line-clamp-3 text-sm sm:text-base">
            "{testimonial.content}"
          </p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-fd-primary/10 flex items-center justify-center shrink-0">
              {testimonial.avatar ? (
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  width={40}
                  height={40}
                  className="rounded-full w-full h-full"
                />
              ) : (
                <span className="text-xs sm:text-sm font-semibold text-fd-primary">
                  {testimonial.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs sm:text-sm truncate">
                {testimonial.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TestimonialRow({
  testimonials,
  direction,
}: {
  testimonials: Testimonial[];
  direction: "left" | "right";
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [singleRowWidth, setSingleRowWidth] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const firstX = useMotionValue(0);
  const secondX = useMotionValue(0);
  const positionsRef = useRef<[number, number]>([0, 0]);
  const durationInSeconds = 30;

  useEffect(() => {
    const element = trackRef.current;
    if (!element) {
      return;
    }

    const measure = () => {
      const width = element.scrollWidth;
      setSingleRowWidth(width);
    };

    measure();
    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("resize", measure);
    };
  }, [testimonials.length]);

  useEffect(() => {
    if (!singleRowWidth) {
      return;
    }

    const initialPositions: [number, number] =
      direction === "left" ? [0, singleRowWidth] : [0, -singleRowWidth];

    positionsRef.current = initialPositions;
    firstX.set(initialPositions[0]);
    secondX.set(initialPositions[1]);
  }, [singleRowWidth, direction, firstX, secondX]);

  useAnimationFrame((_, delta) => {
    if (isPaused || !singleRowWidth) {
      return;
    }

    const deltaInSeconds = delta / 1000;
    const speed = singleRowWidth / durationInSeconds;
    const velocity = (direction === "left" ? -1 : 1) * speed;

    let [first, second] = positionsRef.current;

    first += velocity * deltaInSeconds;
    second += velocity * deltaInSeconds;

    if (direction === "left") {
      if (first <= -singleRowWidth) {
        first = second + singleRowWidth;
      } else if (second <= -singleRowWidth) {
        second = first + singleRowWidth;
      }
    } else {
      if (first >= singleRowWidth) {
        first = second - singleRowWidth;
      } else if (second >= singleRowWidth) {
        second = first - singleRowWidth;
      }
    }

    positionsRef.current = [first, second];
    firstX.set(first);
    secondX.set(second);
  });

  return (
    <div
      className="relative overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <motion.div
        ref={trackRef}
        className="flex gap-8 px-4 w-max"
        style={{ x: firstX }}
      >
        {testimonials.map((testimonial) => (
          <TestimonialCard
            key={`primary-${testimonial.id}`}
            testimonial={testimonial}
          />
        ))}
      </motion.div>
      <motion.div
        aria-hidden
        className="flex gap-8 px-4 w-max absolute top-0 left-0"
        style={{ x: secondX }}
      >
        {testimonials.map((testimonial) => (
          <TestimonialCard
            key={`secondary-${testimonial.id}`}
            testimonial={testimonial}
          />
        ))}
      </motion.div>
    </div>
  );
}

export function TestimonialsSection() {
  return (
    <section className="flex flex-col gap-6 sm:gap-8 py-12 sm:py-16 lg:py-24 border-b border-border w-full overflow-hidden">
      <div className="flex flex-col items-center justify-center gap-2 px-4 sm:px-6 lg:px-10">
        <h2 className="text-3xl sm:text-4xl font-semibold text-center">
          Loved by developers
        </h2>
        <p className="text-fd-muted-foreground text-center max-w-2xl text-sm sm:text-base">
          See what developers are saying about Evalite
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <TestimonialRow testimonials={testimonials} direction="left" />
      </div>
    </section>
  );
}
