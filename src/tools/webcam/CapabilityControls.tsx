import React from "react";
import {FormControlLabel, Slider, Stack, Switch, ToggleButton, ToggleButtonGroup, Typography} from "@mui/material";
import {useTranslation} from "react-i18next";

type NumericField = "zoom" | "focusDistance" | "exposureCompensation" | "exposureTime" | "iso"
    | "colorTemperature" | "brightness" | "contrast" | "saturation" | "sharpness" | "pan" | "tilt";
type ModeField = "focusMode" | "exposureMode" | "whiteBalanceMode";

const NUMERIC_FIELDS: NumericField[] = [
    "zoom", "focusDistance", "exposureCompensation", "exposureTime", "iso",
    "colorTemperature", "brightness", "contrast", "saturation", "sharpness", "pan", "tilt"
];
const MODE_FIELDS: ModeField[] = ["focusMode", "exposureMode", "whiteBalanceMode"];

type Props = {
    capabilities: MediaTrackCapabilities | null;
    settings: MediaTrackSettings | null;
    onApply: (patch: MediaTrackConstraintSet) => void;
};

const NumericControl = ({field, capabilities, settings, onApply}: {
    field: NumericField;
    capabilities: MediaTrackCapabilities;
    settings: MediaTrackSettings | null;
} & Pick<Props, "onApply">) => {
    const {t} = useTranslation();
    const range = capabilities[field];
    const draggingRef = React.useRef(false);
    const [value, setValue] = React.useState(() => (settings?.[field] as number | undefined) ?? range?.min ?? 0);

    React.useEffect(() => {
        if (draggingRef.current) return;
        const current = settings?.[field] as number | undefined;
        if (current !== undefined) setValue(current);
    }, [settings, field]);

    if (!range || range.min === undefined || range.max === undefined || range.min === range.max) return null;

    return (
        <Stack spacing={0.5}>
            <Typography variant="caption" color="text.secondary">{t(`webcam.capability.${field}`)}</Typography>
            <Slider
                size="small"
                value={value}
                min={range.min}
                max={range.max}
                step={(range.max - range.min) / 100 || undefined}
                onChange={(_, next) => {
                    draggingRef.current = true;
                    setValue(next as number);
                }}
                onChangeCommitted={(_, next) => {
                    draggingRef.current = false;
                    onApply({[field]: next as number});
                }}
                valueLabelDisplay="auto"
            />
        </Stack>
    );
};

const ModeControl = ({field, capabilities, settings, onApply}: {
    field: ModeField;
    capabilities: MediaTrackCapabilities;
    settings: MediaTrackSettings | null;
} & Pick<Props, "onApply">) => {
    const {t} = useTranslation();
    const options = capabilities[field];
    if (!options || options.length < 2) return null;
    const current = settings?.[field] as string | undefined;

    return (
        <Stack direction="row" spacing={1} sx={{alignItems: "center", flexWrap: "wrap"}}>
            <Typography variant="caption" color="text.secondary" sx={{minWidth: 96}}>{t(`webcam.capability.${field}`)}</Typography>
            <ToggleButtonGroup
                size="small"
                exclusive
                value={current ?? null}
                onChange={(_, next) => {
                    if (next) onApply({[field]: next});
                }}
            >
                {options.map(option => (
                    <ToggleButton key={option} value={option}>{option}</ToggleButton>
                ))}
            </ToggleButtonGroup>
        </Stack>
    );
};

export const CapabilityControls = ({capabilities, settings, onApply}: Props) => {
    const {t} = useTranslation();

    if (!capabilities) return null;

    const numericFields = NUMERIC_FIELDS.filter(field => capabilities[field]);
    const modeFields = MODE_FIELDS.filter(field => (capabilities[field]?.length ?? 0) >= 2);
    const hasTorch = capabilities.torch === true;

    if (!numericFields.length && !modeFields.length && !hasTorch) {
        return <Typography variant="body2" color="text.secondary">{t("webcam.noAdjustableSettings")}</Typography>;
    }

    return (
        <Stack spacing={1.5}>
            {modeFields.map(field => (
                <ModeControl key={field} field={field} capabilities={capabilities} settings={settings} onApply={onApply}/>
            ))}
            {numericFields.map(field => (
                <NumericControl key={field} field={field} capabilities={capabilities} settings={settings} onApply={onApply}/>
            ))}
            {hasTorch && (
                <FormControlLabel
                    control={<Switch checked={settings?.torch === true} onChange={(_, checked) => onApply({torch: checked})}/>}
                    label={t("webcam.capability.torch")}
                />
            )}
        </Stack>
    );
};
