import { formatDistance } from "date-fns";
import { useEffect, useState } from "react";

const ONE_MINUTE = 60_000;

export const LiveDate = (props: { date: string; className?: string }) => {
  const [, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, ONE_MINUTE);
    return () => clearInterval(interval);
  }, []);

  const utcDateRaw = props.date.endsWith("Z") ? props.date : props.date + "Z";
  const utcDate = new Date(utcDateRaw);

  return (
    <span className={props.className}>
      {formatDistance(utcDate, new Date(), {
        addSuffix: true,
      })}
    </span>
  );
};
