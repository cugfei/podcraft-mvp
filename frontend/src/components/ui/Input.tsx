"use client";

import * as React from "react";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import Select, { SelectProps } from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Slider, { SliderProps } from "@mui/material/Slider";
import Switch, { SwitchProps } from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

/** Styled text input. */
export function Input(props: TextFieldProps) {
  return <TextField fullWidth size="small" {...props} />;
}

interface LabeledSelectProps<T> extends Omit<SelectProps<T>, "label"> {
  label: string;
  options: { value: T; label: string }[];
}

/** Select dropdown with label and options array. */
export function LabeledSelect<T extends string | number>({
  label,
  options,
  ...selectProps
}: LabeledSelectProps<T>) {
  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select label={label} {...selectProps}>
        {options.map((opt) => (
          <MenuItem key={String(opt.value)} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

interface LabeledSliderProps extends Omit<SliderProps, "onChange"> {
  label: string;
  unit?: string;
  onChange?: (value: number) => void;
}

/** Slider with label and current value display. */
export function LabeledSlider({ label, unit = "", onChange, ...sliderProps }: LabeledSliderProps) {
  const [value, setValue] = React.useState<number>(
    typeof sliderProps.value === "number" ? sliderProps.value : (sliderProps.defaultValue as number) ?? 0
  );

  const handleChange = (_: Event, newValue: number | number[]) => {
    const v = Array.isArray(newValue) ? newValue[0] : newValue;
    setValue(v);
    onChange?.(v);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={600}>
          {value}{unit}
        </Typography>
      </Box>
      <Slider
        {...sliderProps}
        value={value}
        onChange={handleChange}
        size="small"
      />
    </Box>
  );
}

interface ToggleProps extends Omit<SwitchProps, "onChange"> {
  label: string;
  onChange?: (checked: boolean) => void;
}

/** Toggle switch with label. */
export function Toggle({ label, onChange, ...switchProps }: ToggleProps) {
  return (
    <FormControlLabel
      control={
        <Switch
          {...switchProps}
          onChange={(e, checked) => onChange?.(checked)}
          size="small"
        />
      }
      label={<Typography variant="body2">{label}</Typography>}
    />
  );
}
