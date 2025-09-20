import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const FIELD_META: Record<string, {
  label: string;
  placeholder?: string;
  type?: "text" | "number" | "ip" | "mac" | "select" | "textarea" | "date";
  required?: boolean;
  options?: { value: string; label: string }[];
  pattern?: RegExp;
}> = {
  brand: { label: "Thương hiệu", placeholder: "VD: Dell, HP, Canon", required: true },
  model: { label: "Model", placeholder: "VD: Latitude 5520" },
  serialNumber: { label: "Số serial", placeholder: "VD: ABC123456789" },

  ipAddress: {
    label: "Địa chỉ IP",
    placeholder: "VD: 192.168.1.100",
    type: "ip",
    pattern: /^(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)\.(25[0-5]|2[0-4]\d|[01]?\d\d?)$/,
  },
  macAddress: {
    label: "Địa chỉ MAC",
    placeholder: "VD: 00:11:22:33:44:55",
    type: "mac",
    pattern: /^(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/,
  },

  cpu: { label: "CPU", placeholder: "VD: Intel Core i7" },
  ram: { label: "RAM", placeholder: "VD: 16GB DDR4" },
  storage: { label: "Ổ cứng", placeholder: "VD: 512GB SSD" },
  os: { label: "Hệ điều hành", placeholder: "VD: Windows 11 Pro" },

  resolution: { label: "Độ phân giải", placeholder: "VD: 2560x1440" },
  refreshRate: { label: "Tần số quét (Hz)", placeholder: "VD: 144", type: "number", pattern: /^\d+$/ },

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
  description: { label: "Mô tả", type: "textarea", placeholder: "Mô tả chi tiết về thiết bị" },
};

const GROUPS = {
  common: ["brand", "model", "serialNumber"],
  network: ["ipAddress", "macAddress"],
  compute: ["cpu", "ram", "storage", "os"],
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

          if (meta.type === "select" && meta.options) {
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
                    {meta.options.map((op) => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          return (
            <div className="space-y-2" key={key}>
              <Label htmlFor={key}>
                {meta.label}
                {meta.required ? <span className="ml-1 text-destructive">*</span> : null}
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


