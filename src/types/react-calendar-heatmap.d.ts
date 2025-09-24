declare module "react-calendar-heatmap" {
  import * as React from "react";
  interface Value {
    date: string | Date;
    count?: number;
  }
  interface Props {
    startDate?: Date | string;
    endDate?: Date | string;
    values?: Value[];
    classForValue?: (value: Value) => string | undefined;
    tooltipDataAttrs?: (value: Value) => Record<string, string>;
    showMonthLabels?: boolean;
    gutterSize?: number;
  }
  const CalendarHeatmap: React.ComponentType<Props>;
  export default CalendarHeatmap;
}
