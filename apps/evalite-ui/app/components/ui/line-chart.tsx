"use client";

import { Area, AreaChart } from "recharts";

import { Fragment } from "react/jsx-runtime";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "~/components/ui/chart";
import { LiveDate } from "./live-date";

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function MyLineChart(props: {
  data: { date: string; score: number }[];
  onDotClick: (props: { date: string }) => void;
}) {
  const getWidthClass = () => {
    const count = props.data.length;
    if (count <= 2) return "max-w-[10ch]";
    if (count === 3) return "max-w-[20ch]";
    if (count === 4) return "max-w-[30ch]";
    if (count === 5) return "max-w-[40ch]";
    if (count === 6) return "max-w-[50ch]";
    if (count === 7) return "max-w-[60ch]";
    if (count === 8) return "max-w-[70ch]";
    if (count === 9) return "max-w-[80ch]";
    return "max-w-[90ch]"; // 10+
  };

  return (
    <ChartContainer
      config={chartConfig}
      className={`h-24 overflow-visible ${getWidthClass()} -mb-6 w-full`}
    >
      <AreaChart
        accessibilityLayer
        data={props.data.map((s) => ({
          ...s,
          score: Math.round(s.score * 100),
        }))}
        margin={{
          top: 8,
          bottom: 8,
          left: 8,
          right: 8,
        }}
      >
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(l, p) => <LiveDate date={p[0]?.payload?.date} />}
            />
          }
        />
        <Area
          isAnimationActive={false}
          dataKey="score"
          type="linear"
          className="--var"
          strokeWidth={1}
          activeDot={({ payload, key, ...dotProps }) => {
            const onClick = () => {
              props.onDotClick({ date: payload.date });
            };
            return (
              <Fragment key={key}>
                <circle
                  {...dotProps}
                  key={key}
                  r={6}
                  stroke="var(--chart-1)"
                  cx={dotProps.cx}
                  cy={dotProps.cy}
                  onClick={onClick}
                />

                <circle
                  cx={dotProps.cx}
                  cy={dotProps.cy}
                  // Make it so you can click anywhere on the chart
                  // when hovering the correct day
                  r={2000}
                  onClick={onClick}
                  fill="transparent"
                ></circle>
              </Fragment>
            );
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
