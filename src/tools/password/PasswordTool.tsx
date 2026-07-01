import React from "react";
import {
    Alert,
    Box,
    Checkbox,
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

const PasswordTool = () => {
    const [mode, setMode] = useLocalStorageState<GenerationMode>("password.mode", "password");
    const [length, setLength] = useLocalStorageState("password.length", 20);
    const [count, setCount] = useLocalStorageState("password.count", 1);
    const [upper, setUpper] = useLocalStorageState("password.upper", true);
    const [lower, setLower] = useLocalStorageState("password.lower", true);
    const [digits, setDigits] = useLocalStorageState("password.digits", true);
    const [symbols, setSymbols] = useLocalStorageState("password.symbols", false);
    const [avoidConfusing, setAvoidConfusing] = useLocalStorageState("password.avoidConfusing", false);
    const [wordCount, setWordCount] = useLocalStorageState("password.wordCount", 5);
    const [separator, setSeparator] = useLocalStorageState("password.separator", "-");
    const [capitalizeWords, setCapitalizeWords] = useLocalStorageState("password.capitalizeWords", false);
    const [appendNumber, setAppendNumber] = useLocalStorageState("password.appendNumber", true);
    const [passwords, setPasswords] = React.useState<string[]>([]);
    const selectedGroups = [
        upper && charGroups.upper,
        lower && charGroups.lower,
        digits && charGroups.digits,
        symbols && charGroups.symbols
    ].filter(Boolean) as string[];
    const source = selectedGroups
        .join("")
        .split("")
        .filter(char => !avoidConfusing || !confusingCharacters.has(char))
        .join("");
    const invalid = selectedGroups.length === 0 || source.length === 0;
    const entropy = mode === "passphrase"
        ? Math.round(wordCount * Math.log2(passphraseWords.length) + (appendNumber ? Math.log2(10) : 0))
        : invalid ? 0 : Math.round(length * Math.log2(source.length));
    const output = passwords.join("\n");

    const generateOne = () => {
        const required = selectedGroups.map(group => {
            const usable = group.split("").filter(char => !avoidConfusing || !confusingCharacters.has(char)).join("");
            return usable[secureRandomIndex(usable.length)];
        });
        const rest = Array.from({length: Math.max(0, length - required.length)}, () => source[secureRandomIndex(source.length)]);
        return required.concat(rest).sort(() => crypto.getRandomValues(new Uint32Array(1))[0] - 0x80000000).join("");
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
        if (mode === "password" && invalid) return;
        setPasswords(Array.from({length: count}, mode === "passphrase" ? generatePassphrase : generateOne));
    };

    React.useEffect(generate, []);

    return (
        <ToolSurface>
            <ToolHeader title="Password Generator" description="Generate client-side passwords with Web Crypto randomness."/>
            <Stack spacing={3}>
                <FormControl>
                    <InputLabel>Mode</InputLabel>
                    <Select value={mode} label="Mode" onChange={(event: SelectChangeEvent) => setMode(event.target.value as GenerationMode)}>
                        <MenuItem value="password">Password</MenuItem>
                        <MenuItem value="passphrase">Passphrase</MenuItem>
                    </Select>
                </FormControl>
                {mode === "password" ? (
                    <>
                        <Box>
                            <Typography gutterBottom>Length: {length}</Typography>
                            <Slider value={length} min={6} max={128} onChange={(_, value) => setLength(value as number)}/>
                        </Box>
                        <FormGroup>
                            <FormControlLabel control={<Checkbox checked={upper} onChange={event => setUpper(event.target.checked)}/>} label="Uppercase"/>
                            <FormControlLabel control={<Checkbox checked={lower} onChange={event => setLower(event.target.checked)}/>} label="Lowercase"/>
                            <FormControlLabel control={<Checkbox checked={digits} onChange={event => setDigits(event.target.checked)}/>} label="Digits"/>
                            <FormControlLabel control={<Checkbox checked={symbols} onChange={event => setSymbols(event.target.checked)}/>} label="Symbols"/>
                            <FormControlLabel control={<Switch checked={avoidConfusing} onChange={event => setAvoidConfusing(event.target.checked)}/>} label="Avoid confusing characters"/>
                        </FormGroup>
                    </>
                ) : (
                    <>
                        <Box>
                            <Typography gutterBottom>Words: {wordCount}</Typography>
                            <Slider value={wordCount} min={3} max={10} step={1} onChange={(_, value) => setWordCount(value as number)}/>
                        </Box>
                        <TextField label="Separator" value={separator} onChange={event => setSeparator(event.target.value)}/>
                        <FormGroup>
                            <FormControlLabel control={<Switch checked={capitalizeWords} onChange={event => setCapitalizeWords(event.target.checked)}/>} label="Capitalize words"/>
                            <FormControlLabel control={<Switch checked={appendNumber} onChange={event => setAppendNumber(event.target.checked)}/>} label="Append one digit"/>
                        </FormGroup>
                    </>
                )}
                <TextField
                    label="Batch count"
                    type="number"
                    value={count}
                    slotProps={{htmlInput: {min: 1, max: 100}}}
                    onChange={event => setCount(Math.max(1, Math.min(100, Number(event.target.value) || 1)))}
                />
                {mode === "password" && invalid && <Alert severity="error">Select at least one usable character class.</Alert>}
                {(mode === "passphrase" || !invalid) && <Alert severity={entropy >= 80 ? "success" : entropy >= 60 ? "info" : "warning"}>Estimated entropy: {entropy} bits</Alert>}
                <ActionRow
                    onRefresh={generate}
                    onCopy={() => copyText(output)}
                    onDownload={() => downloadText("passwords.txt", output)}
                />
                <TextField label="Password output" value={output} multiline minRows={Math.min(10, Math.max(3, count))} fullWidth slotProps={{htmlInput: {readOnly: true}}}/>
            </Stack>
        </ToolSurface>
    );
};

export default PasswordTool;
