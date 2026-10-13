import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Satellite, Cpu } from "lucide-react";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-gray-100 p-4 rounded-2xl shadow-xl font-geist min-w-[160px]">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">{`Tempo: ${label}s`}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-xs font-semibold text-gray-600">
                {entry.name}:
              </span>
              <span
                className="text-sm font-black"
                style={{ color: entry.color }}
              >
                {entry.value?.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function Chart({ title, color, children, height = 180 }) {
  const keys = React.Children.toArray(children.props.children)
    .map((child) => child.props?.dataKey)
    .filter(Boolean);
  if (
    !children.props.data.some((row) =>
      keys.some((key) => Number.isFinite(row[key])),
    )
  )
    return null;
  return (
    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col gap-4">
      <h4
        className="text-[10px] font-black uppercase tracking-[0.2em]"
        style={{ color }}
      >
        {title}
      </h4>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function useDownsampledData(data) {
  return useMemo(() => {
    if (!data || data.length === 0) return [];
    const MAX_POINTS = 1200;
    if (data.length <= MAX_POINTS) return data;
    const step = Math.ceil(data.length / MAX_POINTS);
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }, [data]);
}

const axis = {
  stroke: "transparent",
  tick: { fill: "#9ca3af", fontSize: 10, fontWeight: 500 },
  tickMargin: 8,
};

const grid = (
  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
);

export function GpsCharts({ data, onHoverData }) {
  const chartData = useDownsampledData(data);

  if (!chartData.length) return null;

  const handleMouseMove = (state) => {
    if (state?.activePayload?.length > 0 && onHoverData) {
      onHoverData(state.activePayload[0].payload);
    }
  };
  const handleMouseLeave = () => onHoverData && onHoverData(null);

  const shared = {
    data: chartData,
    syncId: "sessionSync",
    syncMethod: "value",
    margin: { top: 5, right: 8, left: -12, bottom: 0 },
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
  };

  const xAxis = (
    <XAxis
      {...axis}
      dataKey="timestamp_s"
      type="number"
      domain={["dataMin", "dataMax"]}
      unit="s"
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-brand/10 p-2 rounded-xl text-brand">
          <Satellite size={20} />
        </div>
        <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
          Prestazioni GPS
        </h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Chart title="Velocità (nodi)" color="#822433" height={220}>
          <LineChart {...shared}>
            {grid}
            {xAxis}
            <YAxis {...axis} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="speed_knots"
              name="Speed"
              stroke="#822433"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
              activeDot={{
                r: 6,
                fill: "#822433",
                strokeWidth: 2,
                stroke: "#fff",
              }}
            />
          </LineChart>
        </Chart>
        <Chart title="Altitudine GPS (m)" color="#2563eb" height={220}>
          <LineChart {...shared}>
            {grid}
            {xAxis}
            <YAxis {...axis} domain={["auto", "auto"]} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="altitude_m"
              name="Altitude"
              stroke="#2563eb"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
              activeDot={{
                r: 6,
                fill: "#2563eb",
                strokeWidth: 2,
                stroke: "#fff",
              }}
            />
          </LineChart>
        </Chart>
      </div>
    </div>
  );
}

export function ImuCharts({ data }) {
  const chartData = useDownsampledData(data);

  if (!chartData.length) return null;

  const shared = {
    data: chartData,
    syncId: "sessionSync",
    syncMethod: "value",
    margin: { top: 5, right: 8, left: -12, bottom: 0 },
  };

  const xAxis = (
    <XAxis
      {...axis}
      dataKey="timestamp_s"
      type="number"
      domain={["dataMin", "dataMax"]}
      unit="s"
    />
  );

  return (
    <div className="space-y-12">
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-brand/10 p-2 rounded-xl text-brand">
            <Cpu size={20} />
          </div>
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
            Assetto e sensori IMU
          </h3>
        </div>

        {/* Attitude Section */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2 italic">
            — Orientamento e assetto —
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Chart title="Pitch (°)" color="#822433" height={180}>
              <LineChart {...shared}>
                {grid}
                {xAxis}
                <YAxis {...axis} domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="pitch_deg"
                  name="Pitch"
                  stroke="#822433"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </Chart>
            <Chart title="Roll (°)" color="#f59e0b" height={180}>
              <LineChart {...shared}>
                {grid}
                {xAxis}
                <YAxis {...axis} domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="roll_deg"
                  name="Roll"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </Chart>
            <Chart title="Heading (°)" color="#10b981" height={180}>
              <LineChart {...shared}>
                {grid}
                {xAxis}
                <YAxis {...axis} domain={[0, 360]} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="yaw_deg"
                  name="Heading"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </Chart>
          </div>
        </div>
      </div>

      {/* Acceleration Section */}
      <div className="space-y-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2 italic">
          — Accelerazione (g) —
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Chart title="Accel X" color="#6366f1" height={160}>
            <LineChart {...shared}>
              {grid}
              {xAxis}
              <YAxis {...axis} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="acc_x"
                name="X"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </Chart>
          <Chart title="Accel Y" color="#a855f7" height={160}>
            <LineChart {...shared}>
              {grid}
              {xAxis}
              <YAxis {...axis} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="acc_y"
                name="Y"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </Chart>
          <Chart title="Vertical G (Z)" color="#822433" height={160}>
            <LineChart {...shared}>
              {grid}
              {xAxis}
              <YAxis {...axis} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="stepAfter"
                dataKey="acc_z"
                name="Z"
                stroke="#822433"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </Chart>
        </div>
      </div>

      {/* Gyroscope Section */}
      <div className="space-y-4">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] px-2 italic">
          — Velocità angolare (°/s) —
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Chart title="Gyro X" color="#64748b" height={140}>
            <LineChart {...shared}>
              {grid}
              {xAxis}
              <YAxis {...axis} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="gyro_x"
                name="X"
                stroke="#64748b"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </Chart>
          <Chart title="Gyro Y" color="#64748b" height={140}>
            <LineChart {...shared}>
              {grid}
              {xAxis}
              <YAxis {...axis} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="gyro_y"
                name="Y"
                stroke="#64748b"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </Chart>
          <Chart title="Gyro Z" color="#64748b" height={140}>
            <LineChart {...shared}>
              {grid}
              {xAxis}
              <YAxis {...axis} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="gyro_z"
                name="Z"
                stroke="#64748b"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </Chart>
        </div>
      </div>
    </div>
  );
}
