import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FIELD_META: Record<
  string,
  {
    label: string;
    placeholder?: string;
    type?: "text" | "number" | "ip" | "mac" | "select" | "textarea" | "date";
    required?: boolean;
    options?: { value: string; label: string }[];
    pattern?: RegExp;
  }
> = {
  brand: {
    label: "Thương hiệu",
    placeholder: "VD: Dell, HP, Canon",
    required: true,
  },
  model: { label: "Model", placeholder: "VD: Latitude 5520" },
  serialNumber: { label: "Số serial", placeholder: "VD: ABC123456789" },

  ipAddress: {
    label: "Địa chỉ IP",
    placeholder: "VD: 192.168.1.100",
    type: "ip",
    pattern:
      /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  },
  macAddress: {
    label: "Địa chỉ MAC",
    placeholder: "VD: 00:11:22:33:44:55",
    type: "mac",
    pattern: /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/,
  },

  cpu: {
    label: "CPU",
    type: "select",
    placeholder: "Chọn CPU",
  },
  ram: {
    label: "RAM",
    type: "select",
    options: [
      { value: "8GB", label: "8GB" },
      { value: "16GB", label: "16GB" },
      { value: "32GB", label: "32GB" },
      { value: "64GB", label: "64GB" },
      { value: "128GB", label: "128GB" },
      { value: "256GB", label: "256GB" },
      { value: "512GB", label: "512GB" },
      { value: "1TB", label: "1TB" },
    ],
    placeholder: "Chọn RAM",
  },
  storage: {
    label: "Ổ cứng",
    type: "select",
    options: [
      { value: "256GB", label: "256GB" },
      { value: "512GB", label: "512GB" },
      { value: "1TB", label: "1TB" },
      { value: "2TB", label: "2TB" },
      { value: "4TB", label: "4TB" },
      { value: "8TB", label: "8TB" },
      { value: "16TB", label: "16TB" },
      { value: "32TB", label: "32TB" },
      { value: "64TB", label: "64TB" },
    ],
    placeholder: "Chọn ổ cứng",
  },
  gpu: {
    label: "VGA / GPU",
    type: "select",
    placeholder: "Chọn VGA/GPU",
  },
  os: {
    label: "Hệ điều hành",
    type: "select",
    options: [
      { value: "Windows 11", label: "Windows 11" },
      { value: "Windows 10", label: "Windows 10" },
      { value: "Windows 7", label: "Windows 7" },
    ],
    placeholder: "Chọn hệ điều hành",
  },

  resolution: { label: "Độ phân giải", placeholder: "VD: 2560x1440" },
  refreshRate: {
    label: "Tần số quét (Hz)",
    placeholder: "VD: 144",
    type: "number",
    pattern: /^\d+$/,
  },

  printTech: {
    label: "Công nghệ in",
    type: "select",
    options: [
      { value: "laser", label: "Laser" },
      { value: "inkjet", label: "Phun (Inkjet)" },
      { value: "thermal", label: "Nhiệt" },
    ],
  },
  paperSize: { label: "Khổ giấy", placeholder: "VD: A4, A3" },

  powerCapacity: { label: "Công suất/VA (UPS)", placeholder: "VD: 1500VA" },

  sipNumber: { label: "Số SIP (IP Phone)", placeholder: "VD: 1001" },
  firmware: { label: "Firmware", placeholder: "VD: v1.0.3" },

  vendor: { label: "Nhà cung cấp", placeholder: "VD: FPT, Viettel, nội bộ" },
  license: {
    label: "Windows bản quyền",
    type: "select",
    options: [
      { value: "licensed",   label: "Có (bản quyền)" },
      { value: "unlicensed", label: "Không (chưa kích hoạt)" },
    ],
    placeholder: "Chọn trạng thái",
  },
  
  description: {
    label: "Mô tả",
    type: "textarea",
    placeholder: "Mô tả chi tiết về thiết bị",
  },
};

const GROUPS = {
  common: ["brand", "model", "serialNumber"],
  network: ["ipAddress", "macAddress"],
  compute: ["cpu", "ram", "storage", "gpu", "os", "license"],
  display: ["resolution", "refreshRate"],
  print: ["printTech", "paperSize"],
  power: ["powerCapacity"],
  telephony: ["sipNumber", "firmware"],
  vendorDesc: ["vendor", "description"],
} as const;

export const DEVICE_SPEC_PROFILE: Record<string, (keyof typeof GROUPS)[]> = {
  pc: ["common", "compute", "network", "vendorDesc"],
  laptop: ["common", "compute", "network", "vendorDesc"],
  server: ["common", "compute", "network", "vendorDesc"],

  camera: ["common", "network", "vendorDesc"],
  router: ["common", "network", "vendorDesc"],
  switch: ["common", "network", "vendorDesc"],

  printer: ["common", "print", "network", "vendorDesc"],
  monitor: ["common", "display", "vendorDesc"],

  ups: ["common", "power", "vendorDesc"],
  ip_phone: ["common", "telephony", "network", "vendorDesc"],

  sensor: ["common", "network", "vendorDesc"],
  other: ["common", "vendorDesc"],
};

type Option = { value: string; label: string };

export function getCpuOptionsByType(deviceType: string): Option[] {
  if (deviceType === "laptop") {
    return [
      { value: "intel-core-i3-u", label: "Intel Core i3 (U/P series)" },
      { value: "intel-core-i5-u", label: "Intel Core i5 (U/P series)" },
      { value: "intel-core-i7-u", label: "Intel Core i7 (U/P/H series)" },
      { value: "intel-core-ultra-5", label: "Intel Core Ultra 5" },
      { value: "intel-core-ultra-7", label: "Intel Core Ultra 7" },
      { value: "amd-ryzen-3u", label: "AMD Ryzen 3 (U series)" },
      { value: "amd-ryzen-5u", label: "AMD Ryzen 5 (U/HS series)" },
      { value: "amd-ryzen-7u", label: "AMD Ryzen 7 (U/HS/H series)" },
      { value: "amd-ryzen-ai-7", label: "AMD Ryzen AI 7" },
      { value: "other", label: "Khác (nhập tay)" },
    ];
  }

  return [
    { value: "intel-core-i3", label: "Intel Core i3" },
    { value: "intel-core-i5", label: "Intel Core i5" },
    { value: "intel-core-i7", label: "Intel Core i7" },
    { value: "intel-core-i9", label: "Intel Core i9" },
    { value: "intel-core-12th", label: "Intel Core Gen 12" },
    { value: "intel-core-13th", label: "Intel Core Gen 13" },
    { value: "intel-core-14th", label: "Intel Core Gen 14" },
    { value: "amd-ryzen-3", label: "AMD Ryzen 3" },
    { value: "amd-ryzen-5", label: "AMD Ryzen 5" },
    { value: "amd-ryzen-7", label: "AMD Ryzen 7" },
    { value: "amd-ryzen-9", label: "AMD Ryzen 9" },
    { value: "amd-ryzen-7000", label: "AMD Ryzen 7000 series" },
    { value: "other", label: "Khác (nhập tay)" },
  ];
}

export function getGpuOptionsByType(deviceType: string): Option[] {
  const common = [
    { value: "integrated-intel-uhd", label: "Intel UHD (tích hợp)" },
    { value: "integrated-intel-iris-xe", label: "Intel Iris Xe (tích hợp)" },
    { value: "integrated-amd-radeon", label: "AMD Radeon (tích hợp)" },
  ];

  const laptop = [
    { value: "nvidia-rtx-3050", label: "NVIDIA GeForce RTX 3050 (Laptop)" },
    { value: "nvidia-rtx-3060", label: "NVIDIA GeForce RTX 3060 (Laptop)" },
    { value: "nvidia-rtx-4050", label: "NVIDIA GeForce RTX 4050 (Laptop)" },
    { value: "nvidia-rtx-4060", label: "NVIDIA GeForce RTX 4060 (Laptop)" },
    { value: "amd-rx-6600m", label: "AMD Radeon RX 6600M (Laptop)" },
    { value: "amd-rx-7600m", label: "AMD Radeon RX 7600M (Laptop)" },
  ];

  const desktop = [
    { value: "nvidia-gtx-1650", label: "NVIDIA GeForce GTX 1650" },
    { value: "nvidia-rtx-2060", label: "NVIDIA GeForce RTX 2060" },
    { value: "nvidia-rtx-3060", label: "NVIDIA GeForce RTX 3060" },
    { value: "nvidia-rtx-3070", label: "NVIDIA GeForce RTX 3070" },
    { value: "nvidia-rtx-4060", label: "NVIDIA GeForce RTX 4060" },
    { value: "nvidia-rtx-4070", label: "NVIDIA GeForce RTX 4070" },
    { value: "amd-rx-6600", label: "AMD Radeon RX 6600" },
    { value: "amd-rx-6700xt", label: "AMD Radeon RX 6700 XT" },
    { value: "amd-rx-7600", label: "AMD Radeon RX 7600" },
    { value: "amd-rx-7700xt", label: "AMD Radeon RX 7700 XT" },
  ];

  if (deviceType === "laptop") {
    return [...common, ...laptop, { value: "other", label: "Khác (nhập tay)" }];
  }

  if (deviceType === "pc" || deviceType === "server") {
    return [...common, ...desktop, { value: "other", label: "Khác (nhập tay)" }];
  }

  // For other device types, return common options only
  return [...common, { value: "other", label: "Khác (nhập tay)" }];
}

export function getFieldsForType(type: string): string[] {
  const groups = DEVICE_SPEC_PROFILE[type] ?? DEVICE_SPEC_PROFILE.other;
  const fields = groups.flatMap((g) => GROUPS[g]);
  return Array.from(new Set(fields));
}

export function SpecEditor({
  type,
  specifications,
  onChange,
}: {
  type: string;
  specifications: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}) {
  const fields = getFieldsForType(type);

  const handleChange = (key: string, value: string) => {
    const meta = FIELD_META[key];
    if (meta?.pattern && value) {
      // Placeholder for validation UI if needed later
    }
    onChange({ ...specifications, [key]: value });
  };

  return (
    <div className="col-span-2 space-y-4 border-t pt-4">
      <div className="grid grid-cols-2 gap-4">
        {fields.map((key) => {
          const meta = FIELD_META[key];
          if (!meta) return null;

          if (meta.type === "textarea") {
            return (
              <div className="space-y-2 col-span-2" key={key}>
                <Label htmlFor={key}>{meta.label}</Label>
                <Textarea
                  id={key}
                  value={specifications?.[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={meta.placeholder}
                />
              </div>
            );
          }

          if (meta.type === "select") {
            const dynamicOptions =
              key === "cpu" 
                ? getCpuOptionsByType(type) 
                : key === "gpu"
                ? getGpuOptionsByType(type)
                : meta.options || [];

            return (
              <div className="space-y-2" key={key}>
                <Label htmlFor={key}>{meta.label}</Label>
                <Select
                  value={specifications?.[key] || ""}
                  onValueChange={(v) => handleChange(key, v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={meta.placeholder || "Chọn"} />
                  </SelectTrigger>
                  <SelectContent>
                    {dynamicOptions.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {key === "cpu" && specifications?.[key] === "other" && (
                  <Input
                    className="mt-2"
                    placeholder="Nhập model CPU (vd: Core i5-12400F)"
                    value={specifications?.cpu_other || ""}
                    onChange={(e) =>
                      onChange({ ...specifications, cpu_other: e.target.value })
                    }
                  />
                )}

                {key === "gpu" && specifications?.[key] === "other" && (
                  <Input
                    className="mt-2"
                    placeholder="Nhập model GPU (vd: RTX 4080 Super)"
                    value={specifications?.gpu_other || ""}
                    onChange={(e) =>
                      onChange({ ...specifications, gpu_other: e.target.value })
                    }
                  />
                )}
              </div>
            );
          }

          return (
            <div className="space-y-2" key={key}>
              <Label htmlFor={key}>
                {meta.label}
                {meta.required ? (
                  <span className="ml-1 text-destructive">*</span>
                ) : null}
              </Label>
              <Input
                id={key}
                inputMode={meta.type === "number" ? "numeric" : "text"}
                value={specifications?.[key] || ""}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder={meta.placeholder}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
