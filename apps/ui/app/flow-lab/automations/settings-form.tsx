"use client";

import { PlusIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/registry/default/ui/badge";
import { Button } from "@/registry/default/ui/button";
import { Checkbox } from "@/registry/default/ui/checkbox";
import { CheckboxGroup } from "@/registry/default/ui/checkbox-group";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/registry/default/ui/field";
import { Fieldset, FieldsetLegend } from "@/registry/default/ui/fieldset";
import { Input } from "@/registry/default/ui/input";
import { Label } from "@/registry/default/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/registry/default/ui/number-field";
import { Radio, RadioGroup } from "@/registry/default/ui/radio-group";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/registry/default/ui/select";
import { Slider } from "@/registry/default/ui/slider";
import { Switch } from "@/registry/default/ui/switch";
import { Textarea } from "@/registry/default/ui/textarea";
import {
  type Condition,
  type FieldDef,
  type Option,
  operators,
  type Row,
  type Section,
  units,
} from "./kinds";

export type Values = Record<string, unknown>;

function SelectBox({
  options,
  value,
  onChange,
  label,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <Select
      items={options}
      onValueChange={(next) => onChange(String(next))}
      value={value}
    >
      <SelectTrigger aria-label={label} className="min-w-0">
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  );
}

function NumberBox({
  value,
  onChange,
  min,
  max,
  step,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}) {
  return (
    <NumberField
      max={max}
      min={min}
      onValueChange={(next) => onChange(next ?? 0)}
      step={step}
      value={value}
    >
      <NumberFieldGroup>
        <NumberFieldDecrement />
        <NumberFieldInput aria-label={label} />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  );
}

function TagsBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label: string;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const tag = draft.trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 ? (
        <ul aria-label={label} className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <Badge className="gap-1 pe-0.5" variant="outline">
                {tag}
                <button
                  aria-label={`Remove ${tag}`}
                  className="rounded-sm p-0.5 hover:bg-accent"
                  onClick={() => onChange(value.filter((item) => item !== tag))}
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <Input
          aria-label={`Add to ${label}`}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "Type and press Enter"}
          type="text"
          value={draft}
        />
        <Button onClick={add} variant="outline">
          Add
        </Button>
      </div>
    </div>
  );
}

function ConditionsBox({
  value,
  onChange,
  fields,
}: {
  value: Condition[];
  onChange: (value: Condition[]) => void;
  fields: Option[];
}) {
  const update = (index: number, patch: Partial<Condition>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="flex flex-col gap-2">
      {value.map((row, index) => (
        <div
          className="grid grid-cols-[1fr_8rem_6rem_auto] items-center gap-2 max-sm:grid-cols-[1fr_auto] max-sm:rounded-lg max-sm:border max-sm:p-2"
          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id in this demo
          key={index}
        >
          <SelectBox
            label={`Condition ${index + 1} field`}
            onChange={(field) => update(index, { field })}
            options={fields}
            value={row.field}
          />
          <div className="max-sm:order-3 max-sm:col-span-2">
            <SelectBox
              label={`Condition ${index + 1} test`}
              onChange={(operator) => update(index, { operator })}
              options={operators}
              value={row.operator}
            />
          </div>
          <Input
            aria-label={`Condition ${index + 1} value`}
            className="max-sm:order-4 max-sm:col-span-2"
            onChange={(event) => update(index, { value: event.target.value })}
            type="text"
            value={row.value}
          />
          <Button
            aria-label={`Remove condition ${index + 1}`}
            className="max-sm:order-2"
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            size="icon-sm"
            variant="ghost"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        className="self-start"
        onClick={() =>
          onChange([
            ...value,
            { field: fields[0]?.value ?? "", operator: "is", value: "" },
          ])
        }
        size="sm"
        variant="outline"
      >
        <PlusIcon aria-hidden="true" />
        Add condition
      </Button>
    </div>
  );
}

function RowsBox({
  value,
  onChange,
  keyLabel,
  valueLabel,
}: {
  value: Row[];
  onChange: (value: Row[]) => void;
  keyLabel: string;
  valueLabel: string;
}) {
  const update = (index: number, patch: Partial<Row>) =>
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_1fr_2rem] gap-2 text-muted-foreground text-xs">
        <span>{keyLabel}</span>
        <span>{valueLabel}</span>
      </div>
      {value.map((row, index) => (
        <div
          className="grid grid-cols-[1fr_1fr_2rem] items-center gap-2"
          // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id in this demo
          key={index}
        >
          <Input
            aria-label={`${keyLabel} ${index + 1}`}
            onChange={(event) => update(index, { key: event.target.value })}
            type="text"
            value={row.key}
          />
          <Input
            aria-label={`${valueLabel} ${index + 1}`}
            onChange={(event) => update(index, { value: event.target.value })}
            type="text"
            value={row.value}
          />
          <Button
            aria-label={`Remove row ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            size="icon-sm"
            variant="ghost"
          >
            <XIcon aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button
        className="self-start"
        onClick={() => onChange([...value, { key: "", value: "" }])}
        size="sm"
        variant="outline"
      >
        <PlusIcon aria-hidden="true" />
        Add row
      </Button>
    </div>
  );
}

function SliderBox({
  field,
  value,
  onChange,
}: {
  field: Extract<FieldDef, { type: "slider" }>;
  value: number | number[];
  onChange: (value: number | number[]) => void;
}) {
  const values = Array.isArray(value) ? value : [value];
  const suffix = field.suffix ?? "";
  return (
    <Field>
      <div className="flex w-full items-center justify-between">
        <FieldLabel>{field.label}</FieldLabel>
        <span className="text-muted-foreground text-sm tabular-nums">
          {values.map((v) => `${v}${suffix}`).join(" – ")}
        </span>
      </div>
      <Slider
        max={field.max}
        min={field.min}
        onValueChange={(next) =>
          onChange(Array.isArray(next) ? [...next] : (next as number))
        }
        step={field.step ?? 1}
        value={value}
      />
    </Field>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const legendId = useId();
  switch (field.type) {
    case "text":
      return (
        <Field>
          <FieldLabel>{field.label}</FieldLabel>
          <Input
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.placeholder}
            type="text"
            value={String(value ?? "")}
          />
          {field.description ? (
            <FieldDescription>{field.description}</FieldDescription>
          ) : null}
        </Field>
      );
    case "textarea":
      return (
        <Field>
          <FieldLabel>{field.label}</FieldLabel>
          <Textarea
            onChange={(event) => onChange(event.target.value)}
            value={String(value ?? "")}
          />
          {field.description ? (
            <FieldDescription>{field.description}</FieldDescription>
          ) : null}
        </Field>
      );
    case "number":
      return (
        <Field>
          <FieldLabel>{field.label}</FieldLabel>
          <NumberBox
            max={field.max}
            min={field.min}
            onChange={onChange}
            step={field.step}
            value={Number(value ?? 0)}
          />
          {field.description ? (
            <FieldDescription>{field.description}</FieldDescription>
          ) : null}
        </Field>
      );
    case "select":
      return (
        <Field>
          <FieldLabel>{field.label}</FieldLabel>
          <SelectBox
            onChange={onChange}
            options={field.options}
            value={String(value ?? "")}
          />
          {field.description ? (
            <FieldDescription>{field.description}</FieldDescription>
          ) : null}
        </Field>
      );
    case "radio":
      return (
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="font-medium text-sm" id={legendId}>
            {field.label}
          </FieldsetLegend>
          <RadioGroup
            aria-labelledby={legendId}
            onValueChange={(next) => onChange(String(next))}
            value={String(value ?? "")}
          >
            {field.options.map((option) => (
              <Label key={option.value}>
                <Radio value={option.value} />
                {option.label}
              </Label>
            ))}
          </RadioGroup>
        </Fieldset>
      );
    case "checkboxes":
      return (
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="font-medium text-sm" id={legendId}>
            {field.label}
          </FieldsetLegend>
          <CheckboxGroup
            aria-labelledby={legendId}
            className="grid grid-cols-2 gap-x-4 gap-y-2 max-sm:grid-cols-1"
            onValueChange={(next) => onChange(next)}
            value={(value as string[]) ?? []}
          >
            {field.options.map((option) => (
              <Label key={option.value}>
                <Checkbox value={option.value} />
                {option.label}
              </Label>
            ))}
          </CheckboxGroup>
        </Fieldset>
      );
    case "switch":
      return (
        <div className="flex flex-col gap-1">
          <Label>
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(checked) => onChange(checked)}
            />
            {field.label}
          </Label>
          {field.description ? (
            <p className="ps-11 text-muted-foreground text-xs">
              {field.description}
            </p>
          ) : null}
        </div>
      );
    case "slider":
      return (
        <SliderBox
          field={field}
          onChange={onChange}
          value={(value as number | number[]) ?? field.default}
        />
      );
    case "duration": {
      const duration =
        (value as { amount: number; unit: string }) ?? field.default;
      return (
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="font-medium text-sm" id={legendId}>
            {field.label}
          </FieldsetLegend>
          <div className="grid grid-cols-2 gap-2">
            <NumberBox
              label={`${field.label}, amount`}
              min={0}
              onChange={(amount) => onChange({ ...duration, amount })}
              value={duration.amount}
            />
            <SelectBox
              label={`${field.label}, unit`}
              onChange={(unit) => onChange({ ...duration, unit })}
              options={units}
              value={duration.unit}
            />
          </div>
        </Fieldset>
      );
    }
    case "conditions":
      return (
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="font-medium text-sm">
            {field.label}
          </FieldsetLegend>
          <ConditionsBox
            fields={field.fields}
            onChange={onChange}
            value={(value as Condition[]) ?? field.default}
          />
        </Fieldset>
      );
    case "rows":
      return (
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="font-medium text-sm">
            {field.label}
          </FieldsetLegend>
          <RowsBox
            keyLabel={field.keyLabel}
            onChange={onChange}
            value={(value as Row[]) ?? field.default}
            valueLabel={field.valueLabel}
          />
        </Fieldset>
      );
    case "tags":
      return (
        <Fieldset className="flex flex-col gap-2">
          <FieldsetLegend className="font-medium text-sm">
            {field.label}
          </FieldsetLegend>
          <TagsBox
            label={field.label}
            onChange={onChange}
            placeholder={field.placeholder}
            value={(value as string[]) ?? field.default}
          />
        </Fieldset>
      );
  }
}

export function SettingsSection({
  section,
  values,
  onChange,
}: {
  section: Section;
  values: Values;
  onChange: (id: string, value: unknown) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="font-medium text-muted-foreground text-xs">
        {section.title}
      </h3>
      {section.fields.map((field) => (
        <FieldControl
          field={field}
          key={field.id}
          onChange={(value) => onChange(field.id, value)}
          value={values[field.id]}
        />
      ))}
    </section>
  );
}
