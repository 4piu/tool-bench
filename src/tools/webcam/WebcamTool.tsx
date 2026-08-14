import React from "react";
import AppsIcon from "@mui/icons-material/Apps";
import VideocamIcon from "@mui/icons-material/Videocam";
import {Alert, Box, Container, Tab, Tabs, Typography} from "@mui/material";
import {useTranslation} from "react-i18next";
import {useLocalStorageState} from "../shared/hooks";
import {CameraGrid} from "./CameraGrid";
import {CameraView} from "./CameraView";
import {useCameraDevices} from "./useCameraDevices";

type SupportState = "checking" | "unsupported" | "insecure" | "ready";
type Mode = "single" | "grid";

const WebcamTool = () => {
    const {t} = useTranslation();
    const [supportState, setSupportState] = React.useState<SupportState>("checking");
    const [mode, setMode] = useLocalStorageState<Mode>("webcam.mode", "single");
    const [selectedDeviceId, setSelectedDeviceId] = useLocalStorageState<string | null>("webcam.selectedDeviceId", null);
    const {devices, refresh} = useCameraDevices();

    React.useEffect(() => {
        if (!window.isSecureContext) setSupportState("insecure");
        else if (!navigator.mediaDevices?.getUserMedia) setSupportState("unsupported");
        else setSupportState("ready");
    }, []);

    return (
        <Box sx={{flex: 1, display: "flex", flexDirection: "column"}}>
            <Container maxWidth="xl" sx={{py: 3, flex: 1, display: "flex", flexDirection: "column", minHeight: 0}}>
                <Box sx={{mb: 2}}>
                    <Typography variant="h4" component="h1" gutterBottom>{t("webcam.title")}</Typography>
                    <Typography color="text.secondary">{t("webcam.description")}</Typography>
                </Box>

                {supportState === "insecure" && <Alert severity="warning" sx={{mb: 2}}>{t("webcam.insecureContext")}</Alert>}
                {supportState === "unsupported" && <Alert severity="error" sx={{mb: 2}}>{t("webcam.cameraUnsupported")}</Alert>}

                {supportState === "ready" && (
                    <Box sx={{flex: 1, display: "flex", flexDirection: "column", minHeight: 0}}>
                        <Tabs value={mode} onChange={(_, value: Mode) => setMode(value)} sx={{mb: 2, borderBottom: 1, borderColor: "divider"}}>
                            <Tab value="single" icon={<VideocamIcon/>} iconPosition="start" label={t("webcam.singleTab")}/>
                            <Tab value="grid" icon={<AppsIcon/>} iconPosition="start" label={t("webcam.gridTab")}/>
                        </Tabs>

                        {mode === "single" ? (
                            <CameraView
                                deviceId={selectedDeviceId}
                                devices={devices}
                                onDeviceChange={setSelectedDeviceId}
                                onActive={refresh}
                            />
                        ) : (
                            <CameraGrid devices={devices} onActive={refresh}/>
                        )}
                    </Box>
                )}
            </Container>
        </Box>
    );
};

export default WebcamTool;
