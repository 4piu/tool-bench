export const downloadText = (filename, text) => {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};

export const downloadBase64 = (filename, base64) => {
    const a = document.createElement("a");
    a.href = base64;
    a.download = filename;
    a.click();
};