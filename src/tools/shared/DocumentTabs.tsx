import React from "react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import {v4 as uuidV4} from "uuid";
import {Box, IconButton, Stack, Tab, Tabs, Tooltip} from "@mui/material";
import {useLocalStorageState} from "./hooks";

export type TabDocument<T> = T & { id: string; name: string };

export const useDocumentTabs = <T extends object,>(storageKey: string, createDocument: () => T) => {
    const makeDocument = React.useCallback((name: string): TabDocument<T> => ({id: uuidV4(), name, ...createDocument()}), []);
    const initialDocuments = React.useMemo(() => [makeDocument("Untitled 1")], []);
    const [documents, setDocuments] = useLocalStorageState<Array<TabDocument<T>>>(`${storageKey}.documents`, initialDocuments);
    const [activeId, setActiveId] = useLocalStorageState(`${storageKey}.active`, initialDocuments[0].id);

    const activeDocument = documents.find(doc => doc.id === activeId) ?? documents[0];

    React.useEffect(() => {
        if (!documents.some(doc => doc.id === activeId) && documents.length) {
            setActiveId(documents[0].id);
        }
    }, [documents, activeId, setActiveId]);

    const addDocument = () => {
        const doc = makeDocument(`Untitled ${documents.length + 1}`);
        setDocuments([...documents, doc]);
        setActiveId(doc.id);
        return doc.id;
    };

    const closeDocument = (id: string) => {
        const next = documents.filter(doc => doc.id !== id);
        if (!next.length) {
            const fresh = makeDocument("Untitled 1");
            setDocuments([fresh]);
            setActiveId(fresh.id);
            return;
        }
        setDocuments(next);
        if (activeId === id) setActiveId(next[0].id);
    };

    const closeAll = () => {
        const fresh = makeDocument("Untitled 1");
        setDocuments([fresh]);
        setActiveId(fresh.id);
    };

    const renameDocument = (id: string, name: string) => {
        setDocuments(documents.map(doc => doc.id === id ? {...doc, name} : doc));
    };

    const updateDocument = (id: string, patch: Partial<T>) => {
        setDocuments(documents.map(doc => doc.id === id ? {...doc, ...patch} : doc));
    };

    return {
        documents,
        activeId: activeDocument.id,
        activeDocument,
        setActiveId,
        addDocument,
        closeDocument,
        closeAll,
        renameDocument,
        updateDocument
    } as const;
};

export const DocumentTabsBar = <T extends object,>({documents, activeId, onSelect, onAdd, onClose, onCloseAll}: {
    documents: Array<TabDocument<T>>;
    activeId: string;
    onSelect: (id: string) => void;
    onAdd: () => void;
    onClose: (id: string) => void;
    onCloseAll: () => void;
}) => (
    <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
        <Tabs
            value={activeId}
            onChange={(_, value) => onSelect(value)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{flex: 1, minHeight: 0, borderBottom: 1, borderColor: "divider"}}
        >
            {documents.map(doc => (
                <Tab
                    key={doc.id}
                    value={doc.id}
                    sx={{minHeight: 40, py: 0.5, textTransform: "none"}}
                    label={
                        <Stack direction="row" spacing={0.75} sx={{alignItems: "center"}}>
                            <Box component="span">{doc.name}</Box>
                            {documents.length > 1 && (
                                <CloseIcon
                                    fontSize="inherit"
                                    onClick={event => {
                                        event.stopPropagation();
                                        onClose(doc.id);
                                    }}
                                    sx={{fontSize: 16, opacity: 0.6, "&:hover": {opacity: 1}}}
                                />
                            )}
                        </Stack>
                    }
                />
            ))}
        </Tabs>
        <Tooltip title="New tab">
            <IconButton size="small" onClick={onAdd}><AddIcon fontSize="small"/></IconButton>
        </Tooltip>
        <Tooltip title="Close all tabs">
            <IconButton size="small" onClick={onCloseAll}><CloseIcon fontSize="small"/></IconButton>
        </Tooltip>
    </Stack>
);
