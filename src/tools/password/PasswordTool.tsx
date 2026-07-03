import React from "react";
import {
    Alert,
    Box,
    Checkbox,
    Chip,
    FormControl,
    FormControlLabel,
    FormGroup,
    InputLabel,
    MenuItem,
    Select,
    Slider,
    Stack,
    Switch,
    TextField,
    Typography
} from "@mui/material";
import type {SelectChangeEvent} from "@mui/material/Select";
import {useTranslation} from "react-i18next";
import {copyText, downloadText} from "../shared/browser";
import {useLocalStorageState} from "../shared/hooks";
import {ActionRow, ToolHeader, ToolSurface} from "../shared/ToolScaffold";

const charGroups = {
    upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lower: "abcdefghijklmnopqrstuvwxyz",
    digits: "0123456789",
    symbols: "`~!@#$%^&*()-_=+\\|;:'\",<.>/?"
};

const confusingCharacters = new Set("1iIl|0oOQ`':;,.".split(""));
const passphraseWords = [
    "anchor", "apricot", "atlas", "bamboo", "beacon", "bison", "breeze", "cactus",
    "cedar", "citrus", "comet", "coral", "cricket", "delta", "dynamo", "ember",
    "falcon", "figment", "fjord", "galaxy", "garnet", "harbor", "hazel", "iris",
    "jacket", "jigsaw", "juniper", "kiwi", "lagoon", "lantern", "lemur", "lunar",
    "magnet", "marble", "meadow", "nebula", "nectar", "onyx", "otter", "panda",
    "pepper", "prairie", "quartz", "radar", "raven", "rocket", "saffron", "saturn",
    "shadow", "signal", "spruce", "summit", "tango", "temple", "thunder", "tundra",
    "velvet", "violet", "walnut", "willow", "yonder", "zephyr", "zigzag", "zircon"
];

type GenerationMode = "password" | "passphrase";
type CharClassKey = "upper" | "lower" | "digits" | "symbols";

const secureRandomIndex = (length: number) => {
    const values = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / length) * length;
    let value = 0;
    do {
        crypto.getRandomValues(values);
        value = values[0];
    } while (value >= limit);
    return value % length;
};

const secureShuffle = <T,>(items: T[]) => {
    const array = [...items];
    for (let i = array.length - 1; i > 0; i--) {
        const j = secureRandomIndex(i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const dedupeConsecutive = (chars: string[], source: string) => {
    const result = [...chars];
    for (let i = 1; i < result.length; i++) {
        if (result[i] !== result[i - 1]) continue;
        const swapIndex = result.findIndex((char, index) => index > i && char !== result[i - 1] && char !== result[i + 1]);
        if (swapIndex !== -1) {
            [result[i], result[swapIndex]] = [result[swapIndex], result[i]];
            continue;
        }
        let candidate = result[i];
        let attempts = 0;
        while (candidate === result[i - 1] && attempts < 20) {
            candidate = source[secureRandomIndex(source.length)];
            attempts++;
        }
        result[i] = candidate;
    }
    return result;
};

const PasswordTool = () => {
    const {t} = useTranslation();
    const [mode, setMode] = useLocalStorageState<GenerationMode>("password.mode", "password");
    const [length, setLength] = useLocalStorageState("password.length", 20);
    const [count, setCount] = useLocalStorageState("password.count", 1);
    const [upper, setUpper] = useLocalStorageState("password.upper", true);
    const [lower, setLower] = useLocalStorageState("password.lower", true);
    const [digits, setDigits] = useLocalStorageState("password.digits", true);
    const [symbols, setSymbols] = useLocalStorageState("password.symbols", false);
    const [avoidConfusing, setAvoidConfusing] = useLocalStorageState("password.avoidConfusing", false);
    const [noRepeatConsecutive, setNoRepeatConsecutive] = useLocalStorageState("password.noRepeatConsecutive", false);
    const [minUpper, setMinUpper] = useLocalStorageState("password.minUpper", 1);
    const [minLower, setMinLower] = useLocalStorageState("password.minLower", 1);
    const [minDigits, setMinDigits] = useLocalStorageState("password.minDigits", 1);
    const [minSymbols, setMinSymbols] = useLocalStorageState("password.minSymbols", 1);
    const [wordCount, setWordCount] = useLocalStorageState("password.wordCount", 5);
    const [separator, setSeparator] = useLocalStorageState("password.separator", "-");
    const [capitalizeWords, setCapitalizeWords] = useLocalStorageState("password.capitalizeWords", false);
    const [appendNumber, setAppendNumber] = useLocalStorageState("password.appendNumber", true);
    const [passwords, setPasswords] = React.useState<string[]>([]);
    const usableChars = (chars: string) => chars.split("").filter(char => !avoidConfusing || !confusingCharacters.has(char)).join("");
    const classConfig: Array<{key: CharClassKey; enabled: boolean; chars: string; min: number; setMin: (value: number) => void}> = [
        {key: "upper", enabled: upper, chars: charGroups.upper, min: minUpper, setMin: setMinUpper},
        {key: "lower", enabled: lower, chars: charGroups.lower, min: minLower, setMin: setMinLower},
        {key: "digits", enabled: digits, chars: charGroups.digits, min: minDigits, setMin: setMinDigits},
        {key: "symbols", enabled: symbols, chars: charGroups.symbols, min: minSymbols, setMin: setMinSymbols}
    ];
    const selectedClasses = classConfig.filter(cls => cls.enabled);
    const source = selectedClasses.map(cls => usableChars(cls.chars)).join("");
    const requiredTotal = selectedClasses.reduce((sum, cls) => sum + Math.max(1, cls.min), 0);
    const invalid = selectedClasses.length === 0 || source.length === 0;
    const policyExceedsLength = !invalid && requiredTotal > length;
    const entropy = mode === "passphrase"
        ? Math.round(wordCount * Math.log2(passphraseWords.length) + (appendNumber ? Math.log2(10) : 0))
        : invalid ? 0 : Math.round(length * Math.log2(source.length));
    const output = passwords.join("\n");

    const generateOne = () => {
        const required = selectedClasses.flatMap(cls => {
            const usable = usableChars(cls.chars);
            return Array.from({length: Math.max(1, cls.min)}, () => usable[secureRandomIndex(usable.length)]);
        });
        const rest = Array.from({length: Math.max(0, length - required.length)}, () => source[secureRandomIndex(source.length)]);
        let chars = secureShuffle(required.concat(rest));
        if (noRepeatConsecutive) chars = dedupeConsecutive(chars, source);
        return chars.join("");
    };

    const generatePassphrase = () => {
        const words = Array.from({length: wordCount}, () => {
            const word = passphraseWords[secureRandomIndex(passphraseWords.length)];
            return capitalizeWords ? `${word[0].toUpperCase()}${word.slice(1)}` : word;
        });
        const suffix = appendNumber ? String(secureRandomIndex(10)) : "";
        return `${words.join(separator)}${suffix}`;
    };

    const generate = () => {
        if (mode === "password" && (invalid || policyExceedsLength)) return;
        setPasswords(Array.from({length: count}, mode === "passphrase" ? generatePassphrase : generateOne));
    };

    React.useEffect(generate, []);

    return (
        <ToolSurface>
            <ToolHeader title={t("password.title")} description={t("password.description")}/>
            <Stack spacing={3}>
                <FormControl>
                    <InputLabel>{t("password.mode.label")}</InputLabel>
                    <Select value={mode} label={t("password.mode.label")} onChange={(event: SelectChangeEvent) => setMode(event.target.value as GenerationMode)}>
                        <MenuItem value="password">{t("password.mode.password")}</MenuItem>
                        <MenuItem value="passphrase">{t("password.mode.passphrase")}</MenuItem>
                    </Select>
                </FormControl>
                {mode === "password" ? (
                    <>
                        <Box>
                            <Typography gutterBottom>{t("password.length", {length})}</Typography>
                            <Slider value={length} min={6} max={128} onChange={(_, value) => setLength(value as number)}/>
                        </Box>
                        <FormGroup>
                            {classConfig.map(cls => (
                                <Stack key={cls.key} direction="row" spacing={2} sx={{alignItems: "center"}}>
                                    <FormControlLabel
                                        sx={{flex: 1}}
                                        control={<Checkbox checked={cls.enabled} onChange={event => {
                                            if (cls.key === "upper") setUpper(event.target.checked);
                                            if (cls.key === "lower") setLower(event.target.checked);
                                            if (cls.key === "digits") setDigits(event.target.checked);
                                            if (cls.key === "symbols") setSymbols(event.target.checked);
                                        }}/>}
                                        label={t(`password.class.${cls.key}`)}
                                    />
                                    {cls.enabled && (
                                        <TextField
                                            label={t("password.minCount")}
                                            type="number"
                                            size="small"
                                            value={cls.min}
                                            sx={{width: 110}}
                                            slotProps={{htmlInput: {min: 1, max: 10}}}
                                            onChange={event => cls.setMin(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
                                        />
                                    )}
                                </Stack>
                            ))}
                            <FormControlLabel control={<Switch checked={avoidConfusing} onChange={event => setAvoidConfusing(event.target.checked)}/>} label={t("password.avoidConfusing")}/>
                            <FormControlLabel control={<Switch checked={noRepeatConsecutive} onChange={event => setNoRepeatConsecutive(event.target.checked)}/>} label={t("password.avoidRepeat")}/>
                        </FormGroup>
                        {!invalid && (
                            <Stack direction="row" spacing={1} sx={{flexWrap: "wrap"}} useFlexGap>
                                <Chip size="small" label={t("password.policy.length", {length})}/>
                                {selectedClasses.map(cls => (
                                    <Chip key={cls.key} size="small" label={t("password.policy.class", {count: Math.max(1, cls.min), label: t(`password.class.${cls.key}`)})}/>
                                ))}
                                {avoidConfusing && <Chip size="small" label={t("password.policy.noConfusing")}/>}
                                {noRepeatConsecutive && <Chip size="small" label={t("password.policy.noRepeat")}/>}
                            </Stack>
                        )}
                        {policyExceedsLength && (
                            <Alert severity="error">
                                {t("password.policyExceeds", {count: requiredTotal})}
                            </Alert>
                        )}
                    </>
                ) : (
                    <>
                        <Box>
                            <Typography gutterBottom>{t("password.words", {count: wordCount})}</Typography>
                            <Slider value={wordCount} min={3} max={10} step={1} onChange={(_, value) => setWordCount(value as number)}/>
                        </Box>
                        <TextField label={t("password.separator")} value={separator} onChange={event => setSeparator(event.target.value)}/>
                        <FormGroup>
                            <FormControlLabel control={<Switch checked={capitalizeWords} onChange={event => setCapitalizeWords(event.target.checked)}/>} label={t("password.capitalizeWords")}/>
                            <FormControlLabel control={<Switch checked={appendNumber} onChange={event => setAppendNumber(event.target.checked)}/>} label={t("password.appendNumber")}/>
                        </FormGroup>
                    </>
                )}
                <TextField
                    label={t("password.batchCount")}
                    type="number"
                    value={count}
                    slotProps={{htmlInput: {min: 1, max: 100}}}
                    onChange={event => setCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
                />
                {mode === "password" && invalid && <Alert severity="error">{t("password.invalidClasses")}</Alert>}
                {(mode === "passphrase" || !invalid) && <Alert severity={entropy >= 80 ? "success" : entropy >= 60 ? "info" : "warning"}>{t("password.entropy", {entropy})}</Alert>}
                <ActionRow
                    onRefresh={generate}
                    onCopy={() => copyText(output)}
                    onDownload={() => downloadText("passwords.txt", output)}
                />
                <TextField label={t("password.output")} value={output} multiline minRows={Math.min(10, Math.max(3, count))} fullWidth slotProps={{htmlInput: {readOnly: true}}}/>
            </Stack>
        </ToolSurface>
    );
};

export default PasswordTool;
